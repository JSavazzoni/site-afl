/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Importando a matemática exata do Dashboard para não dar diferença de 1 centavo
const getGrossValue = (r: any) => Number(r.amount ?? r.valor ?? 0);
const getNetValue = (r: any) => Number(r.receivedAmount ?? r.valorRecebido ?? 0);
const getBonusValue = (r: any) => Number(r.extraCashback ?? r.cashbackExtra ?? 0);
const getPaidValue = (r: any) => Number(r.amount ?? r.valor ?? 0);

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

const isInstallmentPayment = (itemName: string) => {
  return (itemName || '').toUpperCase().includes('PAGAMENTO DE PARCELA');
};

const getCashbackPercentage = (role: string) => { 
  const rates: Record<string, number> = { 
    'Resp.Vendas': 0.15, 'Master AFL': 0.12, 'Resp.AFL': 0.10, 
    'Auxiliar AFL': 0.09, 'Lider AFL': 0.08, 'Sub-Lider AFL': 0.07, 'Membro AFL': 0.06 
  };
  return rates[role || 'Membro AFL'] || 0.06;
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
    const ROLES_HIERARCHY = ["Resp.Vendas", "Master AFL", "Resp.AFL", "Auxiliar AFL", "Lider AFL", "Sub-Lider AFL", "Membro AFL"];

    // 1. MONTANDO A GAVETA DA EQUIPE
    const team = members
      .filter((m: any) => ROLES_HIERARCHY.includes(m.panelRole || m.role))
      .map((member: any) => {
        const actualRole = member.panelRole || member.role || 'Membro AFL';
        const commissionRate = getCashbackPercentage(actualRole);

        const memberRecords = records.filter((r: any) => String(r.discordId) === String(member.discordId));

        const currentMonthRecords = memberRecords.filter((r: any) => {
           const dateStr = r.createdAt?.toISOString() || r.criado_em?.toISOString() || '';
           return dateStr.startsWith(currentMonthString);
        });

        const grossSales = currentMonthRecords
          .filter((r: any) => (r.type === 'VENDA' || r.tipo === 'VENDA' || (!r.type && !r.tipo)) && !(r.item || '').toUpperCase().includes('DÍVIDA ANTIGA') && !isInstallmentPayment(r.item))
          .reduce((acc: number, r: any) => acc + getGrossValue(r), 0);

        const netSales = currentMonthRecords
          .filter((r: any) => (r.type === 'VENDA' || r.tipo === 'VENDA' || (!r.type && !r.tipo)) && !isInstallmentPayment(r.item))
          .reduce((acc: number, r: any) => acc + getNetValue(r), 0);

        const netInstallments = currentMonthRecords
          .filter((r: any) => isInstallmentPayment(r.item))
          .reduce((acc: number, r: any) => acc + (getGrossValue(r) || getNetValue(r) || getBonusValue(r)), 0);

        const totalNet = netSales + netInstallments;

        const activeRecords = memberRecords.filter((r: any) => r.status === 'APROVADO');

        const activeNetSales = activeRecords
          .filter((r: any) => (r.type === 'VENDA' || r.tipo === 'VENDA' || (!r.type && !r.tipo)) && !isInstallmentPayment(r.item))
          .reduce((acc: number, r: any) => acc + getNetValue(r), 0);

        const activeNetInstallments = activeRecords
          .filter((r: any) => isInstallmentPayment(r.item))
          .reduce((acc: number, r: any) => acc + (getGrossValue(r) || getNetValue(r) || getBonusValue(r)), 0);

        const activeNet = activeNetSales + activeNetInstallments;

        const activeBonus = activeRecords
          .filter((r: any) => (r.type === 'CORRIDINHA' || r.tipo === 'CORRIDINHA'))
          .reduce((acc: number, r: any) => acc + getBonusValue(r), 0);

        const activePaid = activeRecords
          .filter((r: any) => (r.type === 'SAQUE' || r.tipo === 'SAQUE'))
          .reduce((acc: number, r: any) => acc + getPaidValue(r), 0);

        const finalBalance = (activeNet * commissionRate) + activeBonus - activePaid;

        return {
          name: member.name || member.nome,
          role: actualRole,
          grossSales: grossSales,
          netSales: totalNet,
          bonus: activeBonus,
          paid: activePaid,
          balance: finalBalance
        };
      })
      .sort((a: any, b: any) => b.grossSales - a.grossSales);

    // 2. MONTANDO A GAVETA DO EXTRATO GERAL
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

    // 3. ENVIANDO A ESTRUTURA EXATA QUE O SCRIPT ESPERA
    return NextResponse.json({
      team: team,
      records: formattedRecords
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}