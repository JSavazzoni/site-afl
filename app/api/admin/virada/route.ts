export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const TAXAS: any = { 'Resp.Vendas': 0.15, 'Master AFL': 0.12, 'Resp.AFL': 0.10, 'Auxiliar AFL': 0.09, 'Lider AFL': 0.08, 'Sub-Lider AFL': 0.07, 'Membro AFL': 0.06 };

export async function POST() {
  try {
    const membros = await prisma.membro.findMany();

    await Promise.all(membros.map(async (m) => {
      const cargo = m.cargo || "Membro AFL";
      const taxa = TAXAS[cargo] || 0.06;
      
      const rec = Number(m.valorRecebido) || 0;
      const extra = Number(m.cashbackExtra) || 0;
      const pago = Number(m.cashbackPago) || 0;
      
      // Calcula o exato valor que o cara tem na carteira hoje
      const saldoRestante = Math.max(0, (rec * taxa) + extra - pago);

      // O PULO DO GATO: Zera tudo de venda, mas joga o saldo dele pro mês que vem como "Extra"
      await prisma.membro.update({
        where: { discordId: m.discordId },
        data: {
          vendas: 0,
          valorRecebido: 0,
          recrutamentos: 0,
          cashbackPago: 0,
          cashbackExtra: saldoRestante // O dinheiro dele fica salvo aqui!
        }
      });
    }));

    return NextResponse.json({ success: true, message: "Mês virado com sucesso! Saldo preservado, vendas zeradas." });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}