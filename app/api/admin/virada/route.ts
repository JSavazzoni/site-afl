export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const TAXAS: any = { 'Resp.Vendas': 0.15, 'Master AFL': 0.12, 'Resp.AFL': 0.10, 'Auxiliar AFL': 0.09, 'Lider AFL': 0.08, 'Sub-Lider AFL': 0.07, 'Membro AFL': 0.06 };

export async function POST() {
  try {
    const membros = await prisma.membro.findMany();
    const registros = await prisma.registro.findMany({ where: { status: 'APROVADO' } });

    for (const m of membros) {
      // Correção da Imagem 90b428: Usando 'cargo' em vez de 'cargoPainel'
      const taxa = TAXAS[m.cargo] || 0.06;
      const rec = Number(m.valorRecebido) || 0;
      const extra = Number(m.cashbackExtra) || 0;
      const pago = Number(m.cashbackPago) || 0;
      const saldoRestante = Math.max(0, (rec * taxa) + extra - pago);

      // Zera as estatísticas do mês para o novo mês
      await prisma.membro.update({
        where: { discordId: m.discordId },
        data: { vendas: 0, valorRecebido: 0, recrutamentos: 0, cashbackPago: 0, cashbackExtra: 0 }
      });

      // Cria o Saldo Retido. Correção da Imagem 90b447: Removido 'nomeVendedor'
      if (saldoRestante > 0.01) {
        await prisma.registro.create({
          data: {
            discordId: m.discordId,
            nome: m.nome,
            tipo: 'CORRIDINHA',
            item: 'SALDO RETIDO (MÊS ANTERIOR)',
            cashbackExtra: Number(saldoRestante.toFixed(2)),
            valor: 0,
            valorRecebido: 0,
            status: 'APROVADO',
            cliente: 'SISTEMA AFL'
          }
        });
      }
    }

    // Move os registros do mês anterior para o arquivo
    for (const r of registros) {
      await prisma.registro.update({
        where: { id: r.id },
        data: { status: 'ARQUIVADO' }
      });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}