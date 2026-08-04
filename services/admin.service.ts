import { RecordRepository } from '@/repositories/record.repository';
import { MemberRepository } from '@/repositories/member.repository';
import { getBrasiliaMonthKey, getBrasiliaMonthStartUtc } from '@/lib/brasilia';
import {
  computeCashbackCarryAmount,
  computeMissingCashbackBalance,
  isInstallmentPayment,
  roundMoney,
} from '@/lib/finance';
import { prisma } from '@/lib/prisma';

type CarryForwardDraft = {
  discordId: string;
  name: string;
  type: 'CORRIDINHA' | 'SAQUE';
  item: string;
  amount: number;
  receivedAmount: number;
  extraCashback: number;
};

export class AdminService {
  private recordRepository: RecordRepository;
  private memberRepository: MemberRepository;

  constructor() {
    this.recordRepository = new RecordRepository();
    this.memberRepository = new MemberRepository();
  }

  async deleteLog(id: string) {
    if (!id) throw new Error('InvalidId');
    return this.recordRepository.delete(id);
  }

  private buildCarryDraft(
    discordId: string,
    name: string,
    amount: number,
  ): CarryForwardDraft | null {
    if (amount > 0.01) {
      return {
        discordId,
        name,
        type: 'CORRIDINHA',
        item: 'SALDO RETIDO (MÊS ANTERIOR)',
        amount: 0,
        receivedAmount: 0,
        extraCashback: roundMoney(amount),
      };
    }

    if (amount < -0.01) {
      return {
        discordId,
        name,
        type: 'SAQUE',
        item: 'DÍVIDA RETIDA (MÊS ANTERIOR)',
        amount: roundMoney(Math.abs(amount)),
        receivedAmount: 0,
        extraCashback: 0,
      };
    }

    return null;
  }

  private async createCarryForwards(carryForwards: CarryForwardDraft[], evaluatedBy: string) {
    for (const carry of carryForwards) {
      await prisma.record.create({
        data: {
          discordId: carry.discordId,
          name: carry.name,
          type: carry.type,
          item: carry.item,
          client: 'SISTEMA AFL',
          amount: carry.amount,
          receivedAmount: carry.receivedAmount,
          extraCashback: carry.extraCashback,
          status: 'APROVADO',
          createdBy: 'Sistema',
          evaluatedBy,
        },
      });
    }
  }

  /**
   * Fecha o mês anterior (Brasília):
   * 1) preserva saldo de cashback não sacado como SALDO RETIDO / DÍVIDA RETIDA
   * 2) arquiva APROVADO anteriores ao mês atual
   * 3) recalcula contadores a partir do que continua ativo
   */
  async executeMonthRollover(now: Date = new Date()) {
    const monthKey = getBrasiliaMonthKey(now);
    const monthStartUtc = getBrasiliaMonthStartUtc(now);

    const members = await this.memberRepository.findAll();
    const approvedRecords = await prisma.record.findMany({
      where: { status: 'APROVADO' },
    });

    const carryForwards: CarryForwardDraft[] = [];

    for (const member of members) {
      if (!member.discordId) continue;

      const memberRecords = approvedRecords.filter(
        (record) => String(record.discordId) === String(member.discordId),
      );
      if (memberRecords.length === 0) continue;

      const role = member.panelRole || member.role || 'Membro AFL';
      const carry = computeCashbackCarryAmount(memberRecords, role, monthStartUtc, monthKey);
      const draft = this.buildCarryDraft(member.discordId, member.name, carry);
      if (draft) carryForwards.push(draft);
    }

    const archived = await this.recordRepository.archiveBefore(monthStartUtc);
    await this.createCarryForwards(carryForwards, 'Virada de mês');
    await this.rebuildMemberCountersFromApproved();

    return {
      monthKey,
      monthStartUtc: monthStartUtc.toISOString(),
      archivedCount: archived.count,
      carryForwardCount: carryForwards.length,
    };
  }

  /**
   * Repara saldos zerados por viradas antigas (sem SALDO RETIDO).
   * Idempotente: compara histórico econômico com saldo ativo e só cria o que falta.
   */
  async repairWipedCashbackBalances(now: Date = new Date()) {
    const monthKey = getBrasiliaMonthKey(now);
    const members = await this.memberRepository.findAll();
    const records = await prisma.record.findMany({
      where: { status: { in: ['APROVADO', 'ARQUIVADO'] } },
    });

    const carryForwards: CarryForwardDraft[] = [];
    let repairedAmount = 0;

    for (const member of members) {
      if (!member.discordId) continue;

      const memberRecords = records.filter(
        (record) => String(record.discordId) === String(member.discordId),
      );
      if (memberRecords.length === 0) continue;

      const role = member.panelRole || member.role || 'Membro AFL';
      const missing = computeMissingCashbackBalance(memberRecords, role, monthKey);
      const draft = this.buildCarryDraft(member.discordId, member.name, missing);
      if (!draft) continue;

      carryForwards.push(draft);
      repairedAmount = roundMoney(repairedAmount + missing);
    }

    await this.createCarryForwards(carryForwards, 'Reparo de cashback');
    await this.rebuildMemberCountersFromApproved();

    return {
      monthKey,
      repairedMembers: carryForwards.length,
      repairedAmount,
    };
  }

  async rebuildMemberCountersFromApproved() {
    await this.memberRepository.resetAllCounters();

    const approved = await prisma.record.findMany({
      where: { status: 'APROVADO' },
    });

    const totals = new Map<
      string,
      {
        name: string;
        sales: number;
        receivedValue: number;
        recruitments: number;
        extraCashback: number;
        paidCashback: number;
      }
    >();

    for (const record of approved) {
      if (!record.discordId) continue;

      const current = totals.get(record.discordId) || {
        name: record.name || 'Agente',
        sales: 0,
        receivedValue: 0,
        recruitments: 0,
        extraCashback: 0,
        paidCashback: 0,
      };

      current.name = record.name || current.name;
      const type = String(record.type || 'VENDA').toUpperCase();
      const amount = Number(record.amount) || 0;
      const received = Number(record.receivedAmount) || 0;
      const extra = Number(record.extraCashback) || 0;

      if (type === 'VENDA' || !record.type) {
        if (isInstallmentPayment(record.item)) {
          // Parcela já está refletida no receivedAmount da venda pai.
        } else {
          current.sales += amount;
          current.receivedValue += received;
        }
      } else if (type === 'CORRIDINHA') {
        current.extraCashback += extra;
      } else if (type === 'SAQUE') {
        current.paidCashback += amount;
      } else if (type === 'RECRUTAMENTO') {
        current.recruitments += Number(record.quantity) || 1;
        current.extraCashback += extra;
      }

      totals.set(record.discordId, current);
    }

    for (const [discordId, values] of totals) {
      await prisma.member.updateMany({
        where: { discordId },
        data: {
          name: values.name,
          sales: values.sales,
          receivedValue: values.receivedValue,
          recruitments: values.recruitments,
          extraCashback: values.extraCashback,
          paidCashback: values.paidCashback,
        },
      });
    }

    return { membersUpdated: totals.size };
  }

  async runSystemAudit() {
    return this.recordRepository.restoreArchived();
  }
}
