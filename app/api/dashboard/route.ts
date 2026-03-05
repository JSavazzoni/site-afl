export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const TAXAS: any = { 'Resp.Vendas': 0.15, 'Master AFL': 0.12, 'Resp.AFL': 0.10, 'Auxiliar AFL': 0.09, 'Lider AFL': 0.08, 'Sub-Lider AFL': 0.07, 'Membro AFL': 0.06 };

export async function GET() {
  try {
    const membros = await prisma.membro.findMany({ orderBy: { vendas: 'desc' } });
    const logs = await prisma.registro.findMany({ where: { status: 'APROVADO' }, orderBy: { criado_em: 'desc' }, take: 100 });
    // NOVO: Puxando as pendências para você aprovar
    const pendentes = await prisma.registro.findMany({ where: { status: 'PENDENTE' }, orderBy: { criado_em: 'desc' } });

    let totalBruto = 0; let totalLiquido = 0; let totalPagar = 0;

    const equipeProcessada = membros.map(m => {
      const cargo = m.cargo || "Membro AFL";
      const taxa = TAXAS[cargo] || 0.06;
      const rec = Number(m.valorRecebido) || 0;
      const extra = Number(m.cashbackExtra) || 0;
      const pago = Number(m.cashbackPago) || 0;
      
      const bruto = (rec * taxa);
      const aReceber = Math.max(0, bruto + extra - pago);

      totalBruto += Number(m.vendas) || 0;
      totalPagar += aReceber;
      totalLiquido += (rec - aReceber);

      return {
        id: m.discordId, nome: m.nome, cargo: cargo,
        vendas: Number(m.vendas) || 0, recebido: rec, bruto: bruto,
        corridinha: extra, pago: pago, aReceber: aReceber
      };
    });

    return NextResponse.json({
      metricas: { bruto: totalBruto, liquido: totalLiquido, aPagar: totalPagar },
      equipe: equipeProcessada, logs, pendentes
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Erro no motor", detalhe: error.message }, { status: 500 });
  }
}