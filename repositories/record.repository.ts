import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export class RecordRepository {
  async findAllActive() {
    return prisma.record.findMany({
      where: { 
        status: { in: ['APROVADO', 'ARQUIVADO', 'PENDENTE'] } 
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findById(id: string) {
    return prisma.record.findUnique({ 
      where: { id } 
    });
  }

  async create(data: Prisma.RecordCreateInput) {
    return prisma.record.create({ data });
  }

  async updateStatus(id: string, status: string, evaluatedBy: string) {
    return prisma.record.update({
      where: { id },
      data: { status, evaluatedBy }
    });
  }

  async updatePayment(id: string, receivedAmount: number, dueDate: string) {
    return prisma.record.update({
      where: { id },
      data: { receivedAmount, dueDate }
    });
  }

  async delete(id: string) {
    return prisma.record.delete({
      where: { id }
    });
  }

  async archiveCurrentMonth(currentMonthPrefix: string) {
    const start = new Date(`${currentMonthPrefix}-01T00:00:00-03:00`);
    const [year, month] = currentMonthPrefix.split('-').map(Number);
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const end = new Date(`${nextYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00-03:00`);

    return prisma.record.updateMany({
      where: {
        status: 'APROVADO',
        createdAt: {
          gte: start,
          lt: end,
        },
      },
      data: { status: 'ARQUIVADO' },
    });
  }

  /** Arquiva tudo aprovado antes do início do mês corrente (Brasília). */
  async archiveBefore(monthStartUtc: Date) {
    return prisma.record.updateMany({
      where: {
        status: 'APROVADO',
        createdAt: { lt: monthStartUtc },
      },
      data: { status: 'ARQUIVADO' },
    });
  }

  async countApprovedBefore(monthStartUtc: Date) {
    return prisma.record.count({
      where: {
        status: 'APROVADO',
        createdAt: { lt: monthStartUtc },
      },
    });
  }

  async restoreArchived() {
    return prisma.record.updateMany({
      where: { status: 'ARQUIVADO' },
      data: { status: 'APROVADO' }
    });
  }
}