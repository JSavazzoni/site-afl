import { RecordRepository } from '@/repositories/record.repository';
import { MemberRepository } from '@/repositories/member.repository';
import { getBrasiliaMonthKey, getBrasiliaMonthStartUtc } from '@/lib/brasilia';
import { computeCashbackCarryAmount, isInstallmentPayment, roundMoney } from '@/lib/finance';
import { prisma } from '@/lib/prisma';

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

    const carryForwards: Array<{
      discordId: string;
      name: string;
      type: 'CORRIDINHA' | 'SAQUE';
      item: string;
      amount: number;
      receivedAmount: number;
      extraCashback: number;
    }> = [];

    for (const member of members) {
      if (!member.discordId) continue;

      const memberRecords = approvedRecords.filter(
        (record) => String(record.discordId) === String(member.discordId),
      );
      if (memberRecords.length === 0) continue;

      const role = member.panelRole || member.role || 'Membro AFL';
      const carry = computeCashbackCarryAmount(memberRecords, role, monthStartUtc, monthKey);

      if (carry > 0.01) {
        carryForwards.push({
          discordId: member.discordId,
          name: member.name,
          type: 'CORRIDINHA',
          item: 'SALDO RETIDO (MÊS ANTERIOR)',
          amount: 0,
          receivedAmount: 0,
          extraCashback: roundMoney(carry),
        });
      } else if (carry < -0.01) {
        carryForwards.push({
          discordId: member.discordId,
          name: member.name,
          type: 'SAQUE',
          item: 'DÍVIDA RETIDA (MÊS ANTERIOR)',
          amount: roundMoney(Math.abs(carry)),
          receivedAmount: 0,
          extraCashback: 0,
        });
      }
    }

    const archived = await this.recordRepository.archiveBefore(monthStartUtc);

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
          evaluatedBy: 'Virada de mês',
        },
      });
    }

    await this.rebuildMemberCountersFromApproved();

    return {
      monthKey,
      monthStartUtc: monthStartUtc.toISOString(),
      archivedCount: archived.count,
      carryForwardCount: carryForwards.length,
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
