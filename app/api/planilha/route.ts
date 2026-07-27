/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ROLES_HIERARCHY } from '@/lib/roles';
import {
  computeMemberFinance,
  getBonusValue,
  getGrossValue,
  getNetValue,
  getPaidValue,
} from '@/lib/finance';

export const dynamic = 'force-dynamic';

const getDisplayItemName = (record: any) => {
  if ((record.type === 'CORRIDINHA' || record.tipo === 'CORRIDINHA') && (!record.item || record.item === 'N/A')) return 'BÔNUS: CORRIDINHA MALUCA';
  if ((record.type === 'SAQUE' || record.tipo === 'SAQUE') && (!record.item || record.item === 'N/A')) return 'PAGAMENTO REALIZADO';
  return record.item !== 'N/A' ? record.item : (record.type || record.tipo);
};

const getDisplayClientName = (record: any) => {
  if ((record.type === 'CORRIDINHA' || record.tipo === 'CORRIDINHA') && (!record.client && !record.cliente || record.client === 'N/A' || record.cliente === 'N/A')) return 'EQUIPE AFL';
  if ((record.type === 'SAQUE' || record.tipo === 'SAQUE') && (!record.client && !record.cliente || record.client === 'N/A' || record.cliente === 'N/A')) return 'FINANCEIRO AFL';
  return (record.client && record.client !== 'N/A') ? record.client : (record.cliente && record.cliente !== 'N/A') ? record.cliente : 'SISTEMA';
};

export async function GET() {
  try {
    const members = await prisma.member.findMany();
    const records = await prisma.record.findMany({
      where: {
        status: { in: ['APROVADO', 'ARQUIVADO'] }
      },
      orderBy: { createdAt: 'desc' }
    });

    const currentDate = new Date();
    const currentMonthString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

    const team = members
      .filter((m: any) => ROLES_HIERARCHY.includes(m.panelRole || m.role))
      .map((member: any) => {
        const actualRole = member.panelRole || member.role || 'Membro AFL';
        const memberRecords = records.filter((r: any) => String(r.discordId) === String(member.discordId));
        const finance = computeMemberFinance(memberRecords, actualRole, currentMonthString);

        return {
          name: member.name || member.nome,
          role: actualRole,
          grossSales: finance.grossSales,
          netSales: finance.totalNet,
          bonus: finance.activeBonus,
          paid: finance.activePaid,
          balance: finance.finalBalance
        };
      })
      .sort((a: any, b: any) => b.grossSales - a.grossSales);

    const formattedRecords = records.map((r: any) => {
      const type = r.type || r.tipo || 'VENDA';
      const itemName = getDisplayItemName(r);
      const clientName = getDisplayClientName(r);
      const amount = getGrossValue(r) || getNetValue(r) || getBonusValue(r) || getPaidValue(r);

      return {
        date: r.createdAt?.toISOString() || r.criado_em?.toISOString(),
        name: r.name || r.nome,
        type: type,
        item: `${clientName} | ${itemName}`,
        amount: amount,
        status: r.status
      };
    });

    return NextResponse.json({
      team: team,
      records: formattedRecords
    });

  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Falha ao gerar planilha.' }, { status: 500 });
  }
}
