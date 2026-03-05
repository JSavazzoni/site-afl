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
      // Ajuste para usar 'cargo' (Imagem 90b428)
      const taxa = TAXAS[m.cargo] || 0.06;
      const rec = Number(m.valorRecebido) || 0;
      const extra = Number(m.cashbackExtra) || 0;
      const pago = Number(m.cashbackPago) || 0;
      const saldoRestante = Math.max(0, (rec * taxa) + extra - pago);

      // Limpa os números do membro para o novo mês
      await prisma.membro.update({
        where: { discordId: m.discordId },
        data: { vendas: 0, valorRecebido: 0, recrutamentos: 0, cashbackPago: 0, cashbackExtra: 0 }
      });

      // Cria o registro de Saldo (Removido nomeVendedor - Imagem 90b447)
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

    // Arquiva os registros antigos
    for (const r of registros) {
      await prisma.registro.update({
        where: { id: r.id },
        data: { status: 'ARQUIVADO' }
      });
    }

    return NextResponse.json({ success: true, message: "Mês virado com sucesso!" });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}