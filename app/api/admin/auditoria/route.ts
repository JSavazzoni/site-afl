export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function toNumber(val: any) {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  return parseFloat(String(val).replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const fixar = url.searchParams.get('fix') === 'true';

    const registros = await prisma.registro.findMany({
      where: { status: { in: ['APROVADO', 'APROVAR'] } }
    });
    const membros = await prisma.membro.findMany();

    if (fixar) {
        await prisma.registro.updateMany({ where: { status: 'APROVAR' }, data: { status: 'APROVADO' } });
        await prisma.registro.updateMany({ where: { status: 'REPROVAR' }, data: { status: 'REPROVADO' } });
    }

    const relatorio = [];

    for (const membro of membros) {
      let cVendas = 0; let cRec = 0; let cRecrut = 0; let cExtra = 0; let cPago = 0;
      const history = registros.filter(r => String(r.discordId) === String(membro.discordId) || String(r.recrutadoId) === String(membro.discordId));

      for (const r of history) {
        const vTot = toNumber(r.valor) || toNumber((r as any).financeiro);
        const vRec = toNumber(r.valorRecebido) || vTot;
        const ext = toNumber(r.cashbackExtra);

        if (r.tipo === 'VENDA' || !r.tipo) {
          if (String(r.discordId) === String(membro.discordId)) { cVendas += vTot; cRec += vRec; cExtra += ext; }
        } else if (r.tipo === 'RECRUTAMENTO') {
           if (String(r.discordId) === String(membro.discordId)) { cRecrut += toNumber(r.quantidade) || 1; cExtra += ext; }
        } else if (r.tipo === 'SAQUE') {
           if (String(r.discordId) === String(membro.discordId) || String(r.recrutadoId) === String(membro.discordId)) cPago += vTot;
        } else if (r.tipo === 'CORRIDINHA') {
           // A MÁGICA TÁ AQUI: Agora o robô devolve o dinheiro da Corridinha!
           if (String(r.discordId) === String(membro.discordId)) cExtra += ext; 
        }
      }

      cVendas = Number(cVendas.toFixed(2)); cRec = Number(cRec.toFixed(2)); cExtra = Number(cExtra.toFixed(2)); cPago = Number(cPago.toFixed(2));

      if (fixar) {
        await prisma.membro.update({
          where: { discordId: membro.discordId },
          data: { vendas: cVendas, valorRecebido: cRec, recrutamentos: cRecrut, cashbackExtra: cExtra, cashbackPago: cPago }
        });
      }
      relatorio.push({ nome: membro.nome, restaurado: { vendas: cVendas, bonus_corridinha: cExtra } });
    }
    return NextResponse.json({ STATUS: "SISTEMA FINANCEIRO RESTAURADO COM SUCESSO!", DETALHES: relatorio });
  } catch (e) { return NextResponse.json({ error: "Erro interno" }, { status: 500 }); }
}