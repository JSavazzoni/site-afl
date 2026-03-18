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
    return prisma.record.updateMany({
      where: {
        status: 'APROVADO',
        createdAt: {
          gte: new Date(`${currentMonthPrefix}-01T00:00:00.000Z`),
          lt: new Date(`${currentMonthPrefix}-31T23:59:59.999Z`)
        }
      },
      data: { status: 'ARQUIVADO' }
    });
  }

  async restoreArchived() {
    return prisma.record.updateMany({
      where: { status: 'ARQUIVADO' },
      data: { status: 'APROVADO' }
    });
  }
}