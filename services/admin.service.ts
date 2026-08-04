import { RecordRepository } from '@/repositories/record.repository';
import { MemberRepository } from '@/repositories/member.repository';
import { getBrasiliaMonthKey, getBrasiliaMonthStartUtc } from '@/lib/brasilia';
import { isInstallmentPayment } from '@/lib/finance';
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
   * Fecha o mês anterior (Brasília): arquiva APROVADO com createdAt < início do mês atual
   * e recalcula contadores a partir dos registros ainda ativos.
   * Idempotente — pode rodar várias vezes no mesmo mês.
   */
  async executeMonthRollover(now: Date = new Date()) {
    const monthKey = getBrasiliaMonthKey(now);
    const monthStartUtc = getBrasiliaMonthStartUtc(now);

    const archived = await this.recordRepository.archiveBefore(monthStartUtc);
    await this.rebuildMemberCountersFromApproved();

    return {
      monthKey,
      monthStartUtc: monthStartUtc.toISOString(),
      archivedCount: archived.count,
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
          // Não soma de novo nos contadores.
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
