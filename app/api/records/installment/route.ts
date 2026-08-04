import { NextResponse } from 'next/server';
import { getCurrentAccess } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getRemainingDebt, roundMoney } from '@/lib/finance';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const access = await getCurrentAccess();
    if (!access.session || !access.isAdmin) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 });
    }

    const { recordId, paidAmount, nextDueDate } = await req.json();
    const payment = roundMoney(Number(paidAmount));

    if (!Number.isFinite(payment) || payment <= 0) {
      return NextResponse.json({ error: 'Informe um valor de pagamento válido.' }, { status: 400 });
    }

    const originalRecord = await prisma.record.findUnique({
      where: { id: recordId }
    });

    if (!originalRecord) {
      return NextResponse.json({ error: 'Registro de venda não encontrado.' }, { status: 404 });
    }

    const remaining = getRemainingDebt(originalRecord);
    if (payment > remaining + 0.001) {
      return NextResponse.json({ error: `Pagamento maior que o saldo em aberto (R$ ${remaining.toFixed(2)}).` }, { status: 400 });
    }

    const newReceivedAmount = roundMoney((originalRecord.receivedAmount || 0) + payment);
    const stillPending = newReceivedAmount < (originalRecord.amount || 0);

    if (stillPending && !nextDueDate) {
      return NextResponse.json({ error: 'Informe o novo vencimento da pendência.' }, { status: 400 });
    }

    await prisma.record.update({
      where: { id: recordId },
      data: {
        receivedAmount: newReceivedAmount,
        dueDate: stillPending ? (nextDueDate || null) : null
      }
    });

    await prisma.record.create({
      data: {
        discordId: originalRecord.discordId,
        name: originalRecord.name,
        type: "VENDA",
        item: `PAGAMENTO DE PARCELA: ${originalRecord.item || "N/A"}`,
        client: originalRecord.client,
        amount: payment,
        receivedAmount: payment,
        status: "APROVADO",
        createdBy: "Sistema",
        evaluatedBy: "Sistema Automático"
      }
    });

    if (originalRecord.discordId) {
      await prisma.member.updateMany({
        where: { discordId: originalRecord.discordId },
        data: { receivedValue: { increment: payment } },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Falha ao registrar pagamento.' }, { status: 500 });
  }
}
