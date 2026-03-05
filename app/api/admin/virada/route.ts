export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const TAXAS: any = { 'Resp.Vendas': 0.15, 'Master AFL': 0.12, 'Resp.AFL': 0.10, 'Auxiliar AFL': 0.09, 'Lider AFL': 0.08, 'Sub-Lider AFL': 0.07, 'Membro AFL': 0.06 };

function toNumber(val: any) {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  return parseFloat(String(val).replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
}

export async function POST() {
  try {
    const membros = await prisma.membro.findMany();
    
    // Puxa apenas o que está aprovado e ativo hoje
    const registros = await prisma.registro.findMany({ 
      where: { status: 'APROVADO' } 
    });

    // 1. ZERAR MEMBROS E SALVAR O SALDO NO BANCO
    for (const m of membros) {
      const cargo = m.cargo || "Membro AFL";
      const taxa = TAXAS[cargo] || 0.06;
      
      const rec = Number(m.valorRecebido) || 0;
      const extra = Number(m.cashbackExtra) || 0;
      const pago = Number(m.cashbackPago) || 0;
      
      // Calcula o exato valor que o cara tem na carteira
      const saldoRestante = Math.max(0, (rec * taxa) + extra - pago);

      // Zera o membro na tabela
      await prisma.membro.update({
        where: { discordId: m.discordId },
        data: {
          vendas: 0,
          valorRecebido: 0,
          recrutamentos: 0,
          cashbackPago: 0,
          cashbackExtra: 0 // Zera aqui, porque o Auditor vai puxar do registro abaixo!
        }
      });

      // Cria um registro de "Corridinha" para o Auditor somar como Saldo Inicial
      if (saldoRestante > 0) {
        await prisma.registro.create({
          data: {
            discordId: m.discordId,
            nome: m.nome,
            tipo: 'CORRIDINHA',
            item: 'Saldo Retido (Mês Anterior)',
            cashbackExtra: Number(saldoRestante.toFixed(2)),
            valor: 0,
            valorRecebido: 0,
            status: 'APROVADO',
            cliente: 'SISTEMA AFL'
          }
        });
      }
    }

    // 2. ARQUIVAR PASSADO E RECRIAR DÍVIDAS
    for (const r of registros) {
      const vTot = toNumber(r.valor) || toNumber((r as any).financeiro);
      const vRec = toNumber(r.valorRecebido) || vTot;
      const faltaPagar = vTot - vRec;

      // Se for uma VENDA com pendência (cliente devendo), cria um registro novo só pro restante!
      if ((r.tipo === 'VENDA' || !r.tipo) && faltaPagar > 0.01) {
        await prisma.registro.create({
          data: {
            discordId: r.discordId,
            nome: r.nome,
            tipo: 'VENDA',
            cliente: r.cliente,
            item: `[Dívida Antiga] ${r.item || 'Venda'}`,
            valor: Number(faltaPagar.toFixed(2)),
            valorRecebido: 0,
            status: 'APROVADO',
            dataVencimento: r.dataVencimento
          }
        });
      }

      // Muda o status do antigo para ARQUIVADO para o Auditor ignorar!
      await prisma.registro.update({
        where: { id: r.id },
        data: { status: 'ARQUIVADO' }
      });
    }

    return NextResponse.json({ success: true, message: "Mês virado! Auditoria ajustada e saldos protegidos." });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}