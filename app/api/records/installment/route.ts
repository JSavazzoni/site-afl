import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { recordId, paidAmount, nextDueDate } = await req.json();

    const originalRecord = await prisma.record.findUnique({
      where: { id: recordId }
    });

    if (!originalRecord) {
      throw new Error("Record not found");
    }

    const newReceivedAmount = (originalRecord.receivedAmount || 0) + paidAmount;
    
    await prisma.record.update({
      where: { id: recordId },
      data: {
        receivedAmount: newReceivedAmount,
        dueDate: nextDueDate || null
      }
    });

    await prisma.record.create({
      data: {
        discordId: originalRecord.discordId,
        name: originalRecord.name,
        type: "PARCELA",
        item: `PAGAMENTO DE PARCELA: ${originalRecord.item || "N/A"}`,
        client: originalRecord.client,
        amount: paidAmount,
        receivedAmount: paidAmount,
        status: "APROVADO",
        createdBy: "System",
        evaluatedBy: "System"
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}