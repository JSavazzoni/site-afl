import { prisma } from '@/lib/prisma';

export class MemberRepository {
  async findAll() {
    return prisma.member.findMany();
  }

  async findByDiscordId(discordId: string) {
    return prisma.member.findUnique({
      where: { discordId }
    });
  }

  async upsertSalesData(discordId: string, name: string, amount: number, receivedAmount: number, extraCashback: number) {
    return prisma.member.upsert({
      where: { discordId },
      update: {
        sales: { increment: amount },
        receivedValue: { increment: receivedAmount },
        extraCashback: { increment: extraCashback },
        name
      },
      create: {
        discordId,
        name,
        role: "Membro AFL",
        sales: amount,
        receivedValue: receivedAmount,
        extraCashback,
        paidCashback: 0
      }
    });
  }

  async upsertRecruitmentData(discordId: string, name: string, quantity: number, extraCashback: number) {
    return prisma.member.upsert({
      where: { discordId },
      update: {
        recruitments: { increment: quantity },
        extraCashback: { increment: extraCashback },
        name
      },
      create: {
        discordId,
        name,
        role: "Membro AFL",
        recruitments: quantity,
        extraCashback,
        paidCashback: 0,
        sales: 0,
        receivedValue: 0
      }
    });
  }

  async incrementExtraCashback(discordId: string, name: string, extraCashback: number) {
    return prisma.member.upsert({
      where: { discordId },
      update: {
        extraCashback: { increment: extraCashback },
        name,
      },
      create: {
        discordId,
        name,
        role: "Membro AFL",
        extraCashback,
        paidCashback: 0,
        sales: 0,
        receivedValue: 0,
        recruitments: 0,
      },
    });
  }

  async incrementPaidCashback(discordId: string, name: string, paidCashback: number) {
    return prisma.member.upsert({
      where: { discordId },
      update: {
        paidCashback: { increment: paidCashback },
        name,
      },
      create: {
        discordId,
        name,
        role: "Membro AFL",
        extraCashback: 0,
        paidCashback,
        sales: 0,
        receivedValue: 0,
        recruitments: 0,
      },
    });
  }

  async resetAllCounters() {
    return prisma.member.updateMany({
      data: {
        sales: 0,
        receivedValue: 0,
        recruitments: 0,
        extraCashback: 0,
        paidCashback: 0
      }
    });
  }
}