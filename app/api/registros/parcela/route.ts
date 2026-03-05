export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { registroId, valorPago, proximaData } = body; // Agora recebe a próxima data!

    const registroOrig = await prisma.registro.findUnique({ where: { id: registroId } });
    if (!registroOrig) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

    const valorNumerico = Number(valorPago);

    // 1. Atualiza a dívida original e, se tiver próxima parcela, joga a data pra frente!
    await prisma.registro.update({
      where: { id: registroId },
      data: { 
         valorRecebido: { increment: valorNumerico },
         ...(proximaData ? { dataVencimento: proximaData } : {}) // Inteligência da nova data
      }
    });

    // 2. Aumenta o saldo do Vendedor (Destrava o cashback dele proporcional à parcela)
    if (registroOrig.discordId) {
       await prisma.membro.update({
          where: { discordId: registroOrig.discordId },
          data: { valorRecebido: { increment: valorNumerico } }
       });
    }

    // 3. Cria o comprovante oficial da parcela
    const comprovanteParcela = await prisma.registro.create({
       data: {
         nome: registroOrig.nome,
         discordId: registroOrig.discordId,
         tipo: 'PARCELA',
         cliente: registroOrig.cliente,
         item: `Pagamento de Parcela: ${registroOrig.item}`,
         valor: valorNumerico,
         valorRecebido: valorNumerico,
         status: 'APROVADO'
       }
    });

    // Envia o comprovante pro Google Sheets
    if (process.env.GOOGLE_SHEETS_WEBHOOK_URL) {
       try {
          await fetch(process.env.GOOGLE_SHEETS_WEBHOOK_URL, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({
                dataAprovacao: new Date().toLocaleString('pt-BR'),
                vendedor: comprovanteParcela.nome,
                tipo: 'PARCELA PAGA',
                cliente: comprovanteParcela.cliente,
                documento: '-', item: comprovanteParcela.item,
                valorTotal: comprovanteParcela.valor, valorRecebido: comprovanteParcela.valorRecebido,
                metodoPagamento: '-', status: 'APROVADO'
             })
          });
       } catch (e) {}
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}