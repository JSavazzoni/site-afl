import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const records = await prisma.record.findMany({
      where: {
        status: { in: ['APROVADO', 'ARQUIVADO'] }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Colocamos o (record: any) aqui para o TypeScript parar de bloquear a leitura do banco antigo
    const payload = records.map((record: any) => {
      const type = record.type ?? record.tipo ?? 'VENDA';
      const isBonus = type === 'CORRIDINHA';
      const isWithdrawal = type === 'SAQUE';

      const grossValue = Number(record.amount ?? record.valor ?? 0);
      const netValue = Number(record.receivedAmount ?? record.valorRecebido ?? 0);
      const bonusValue = Number(record.extraCashback ?? record.cashbackExtra ?? 0);

      let clientName = record.client ?? record.cliente;
      let itemName = record.item;

      if (isBonus) {
        clientName = clientName && clientName !== 'N/A' ? clientName : 'EQUIPE AFL';
        itemName = itemName && itemName !== 'N/A' ? itemName : 'BÔNUS: CORRIDINHA MALUCA';
      } else if (isWithdrawal) {
        clientName = clientName && clientName !== 'N/A' ? clientName : 'FINANCEIRO AFL';
        itemName = itemName && itemName !== 'N/A' ? itemName : 'PAGAMENTO REALIZADO';
      } else {
        clientName = clientName && clientName !== 'N/A' ? clientName : 'SISTEMA';
      }

      return {
        id: record.id,
        date: record.createdAt ?? record.criado_em,
        agent: record.name ?? record.nome,
        client: clientName,
        item: itemName,
        type: type,
        grossValue: isBonus ? bonusValue : grossValue,
        netValue: netValue,
        status: record.status
      };
    });

    return NextResponse.json(payload);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}