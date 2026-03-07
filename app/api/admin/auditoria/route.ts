export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // 1. Puxa a verdade absoluta: todos os registros que contam dinheiro (Aprovados e Arquivados)
    const registros = await prisma.registro.findMany({ 
      where: { 
        status: { in: ['APROVADO', 'ARQUIVADO'] } 
      } 
    });
    
    const membros = await prisma.membro.findMany();

    // 2. Passa um pente fino membro por membro
    for (const membro of membros) {
      // Pega todo o histórico de transações desse membro específico
      const historico = registros.filter(r => String(r.discordId) === String(membro.discordId));
      
      let vTot = 0; 
      let vRec = 0; 
      let vExtra = 0; 
      let vPago = 0;

      // Faz a matemática do zero baseada nos registros puros
      for (const r of historico) {
        if (r.tipo === 'VENDA' || !r.tipo) {
          vTot += Number(r.valor) || 0;
          vRec += Number(r.valorRecebido) || 0;
        } else if (r.tipo === 'CORRIDINHA') {
          vExtra += Number(r.cashbackExtra) || 0;
        } else if (r.tipo === 'SAQUE') {
          vPago += Number(r.valor) || 0;
        }
      }

      // 3. Atualiza o banco de dados do membro com os valores cravados
      await prisma.membro.update({
        where: { discordId: membro.discordId },
        data: {
          vendas: vTot,
          valorRecebido: vRec,
          cashbackExtra: vExtra,
          cashbackPago: vPago
        }
      });
    }

    return NextResponse.json({ message: "AUDITORIA CONCLUÍDA! Todos os saldos foram recalculados e alinhados perfeitamente." });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}