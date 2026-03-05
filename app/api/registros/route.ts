export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 1. PUXA OS DADOS DO BANCO (Mantém o site sempre atualizado e conectado)
export async function GET() {
  try {
    const registros = await prisma.registro.findMany({
      orderBy: { criado_em: 'desc' }
    });
    return NextResponse.json(registros);
  } catch (error) {
    console.error("Erro ao buscar registros:", error);
    return NextResponse.json({ error: "Erro ao buscar dados do banco" }, { status: 500 });
  }
}

// 2. RECEBE DADOS DO PAINEL, SALVA NO BANCO E MANDA PRA PLANILHA
export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    const isAutoAprovado = body.tipo === 'SAQUE' || body.tipo === 'CORRIDINHA';
    const statusFinal = isAutoAprovado ? 'APROVADO' : 'PENDENTE';

    // A. SALVA NO BANCO DE DADOS (Prisma)
    const novoRegistro = await prisma.registro.create({
      data: {
        tipo: body.tipo || 'VENDA',
        discordId: body.vendedorId,
        nome: body.vendedorNome || 'Sistema',
        cliente: body.cliente || '-',
        cpfEmail: body.cpfEmail || '-',
        item: body.item || '-',
        valor: Number(body.valorNumerico) || 0,
        valorRecebido: Number(body.recebidoNumerico) || 0,
        valorPagamento: body.pagamento || '-',
        idDiscordAvancado: body.idDiscordAvancado || '-',
        recrutadoId: body.recrutadoId || '-',
        quantidade: Number(body.quantidade) || 1, // <--- O ERRO ESTAVA AQUI! AGORA É NUMBER.
        cashbackExtra: Number(body.cashbackExtra) || 0,
        dataVencimento: body.dataVencimento || '',
        status: statusFinal
      }
    });

    // B. SE FOR SAQUE OU CORRIDINHA, ATUALIZA O SALDO DO MEMBRO NA HORA NO BANCO
    if (isAutoAprovado && body.vendedorId) {
      if (body.tipo === 'SAQUE') {
        await prisma.membro.update({
          where: { discordId: body.vendedorId },
          data: { cashbackPago: { increment: Number(body.valorNumerico) } }
        });
      } else if (body.tipo === 'CORRIDINHA') {
        await prisma.membro.update({
          where: { discordId: body.vendedorId },
          data: { cashbackExtra: { increment: Number(body.cashbackExtra) } }
        });
      }
    }

    // C. DISPARA PARA A PLANILHA DO GOOGLE (Webhook)
    if (process.env.GOOGLE_SHEETS_WEBHOOK_URL) {
       try {
          await fetch(process.env.GOOGLE_SHEETS_WEBHOOK_URL, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({
                dataAprovacao: new Date().toLocaleString('pt-BR'),
                vendedor: body.vendedorNome || "-",
                tipo: body.tipo || "VENDA",
                cliente: body.cliente || "-",
                documento: body.cpfEmail || "-",
                item: body.item || "-",
                valorTotal: Number(body.valorNumerico) || 0,
                valorRecebido: Number(body.recebidoNumerico) || 0,
                metodoPagamento: body.pagamento || "-",
                status: statusFinal,
                corridinha: Number(body.cashbackExtra) || 0
             })
          });
       } catch (sheetError) {
          console.error("Aviso: Google Sheets demorou a responder, mas o banco salvou.", sheetError);
       }
    }

    return NextResponse.json({ success: true, registro: novoRegistro });

  } catch (error) {
    console.error("Erro fatal no POST:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}