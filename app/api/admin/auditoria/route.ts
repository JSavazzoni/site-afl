export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: Request) {
  try {
    // 1. Volta tudo o que foi "Arquivado" para "Aprovado" (Desfaz a virada burra)
    await prisma.registro.updateMany({
      where: { status: 'ARQUIVADO' },
      data: { status: 'APROVADO' }
    });

    // 2. Apaga os registros de "Saldo Retido" duplicados que o sistema criou na virada
    await prisma.registro.deleteMany({
      where: { item: { contains: 'SALDO RETIDO' } }
    });

    const registros = await prisma.registro.findMany({
      where: { status: 'APROVADO' }
    });
    const membros = await prisma.membro.findMany();

    const relatorio = [];

    for (const membro of membros) {
      const history = registros.filter(r => String(r.discordId) === String(membro.discordId));
      
      let vTot = 0; let vRec = 0; let vExtra = 0; let vPago = 0;

      for (const r of history) {
        if (r.tipo === 'VENDA' || !r.tipo) {
          vTot += Number(r.valor) || 0;
          vRec += Number(r.valorRecebido) || 0;
        } else if (r.tipo === 'CORRIDINHA') {
          vExtra += Number(r.cashbackExtra) || 0;
        } else if (r.tipo === 'SAQUE') {
          vPago += Number(r.valor) || 0;
        }
      }

      // Atualiza o membro com a verdade absoluta do banco
      await prisma.membro.update({
        where: { discordId: membro.discordId },
        data: {
          vendas: vTot,
          valorRecebido: vRec,
          cashbackExtra: vExtra,
          cashbackPago: vPago
        }
      });
      relatorio.push({ nome: membro.nome, status: "RESTAURADO" });
    }

    return NextResponse.json({ message: "SISTEMA RESTAURADO!", detalhes: relatorio });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}