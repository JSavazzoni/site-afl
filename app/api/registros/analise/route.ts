export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { registroId, acao } = body;

    if (!registroId || !acao) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    const registro = await prisma.registro.findUnique({
      where: { id: registroId }
    });

    if (!registro) {
      return NextResponse.json({ error: "Registro não encontrado" }, { status: 404 });
    }

    // --- REPROVAR ---
    if (acao === 'REPROVAR') {
      await prisma.registro.update({
        where: { id: registroId },
        data: { status: 'REPROVADO' }
      });
      return NextResponse.json({ success: true, message: "Reprovado com sucesso" });
    }

    // --- APROVAR ---
    if (acao === 'APROVAR') {
      await prisma.registro.update({
        where: { id: registroId },
        data: { status: 'APROVADO' }
      });

      const valNum = Number(registro.valor) || 0;
      const recNum = Number(registro.valorRecebido) || valNum;
      const extra = Number(registro.cashbackExtra) || 0;

      if (registro.discordId) {
        // Lógica de UPSERT para Vendas
        if (registro.tipo === 'VENDA' || !registro.tipo) {
          await prisma.membro.upsert({
            where: { discordId: registro.discordId },
            update: {
              vendas: { increment: valNum },
              valorRecebido: { increment: recNum },
              cashbackExtra: { increment: extra },
              nome: registro.nome || undefined // Atualiza o nome se mudou
            },
            create: {
              discordId: registro.discordId,
              nome: registro.nome || "Novo Membro",
              cargo: "Membro AFL",
              vendas: valNum,
              valorRecebido: recNum,
              cashbackExtra: extra,
              cashbackPago: 0
            }
          });
        } 
        // Lógica de UPSERT para Recrutamento
        else if (registro.tipo === 'RECRUTAMENTO') {
          const qtd = Number(registro.quantidade) || 1;
          await prisma.membro.upsert({
            where: { discordId: registro.discordId },
            update: {
              recrutamentos: { increment: qtd },
              cashbackExtra: { increment: extra },
              nome: registro.nome || undefined
            },
            create: {
              discordId: registro.discordId,
              nome: registro.nome || "Novo Membro",
              cargo: "Membro AFL",
              recrutamentos: qtd,
              cashbackExtra: extra,
              cashbackPago: 0,
              vendas: 0,
              valorRecebido: 0
            }
          });
        }
      }

      // Webhook para a Planilha
      if (process.env.GOOGLE_SHEETS_WEBHOOK_URL) {
        try {
          await fetch(process.env.GOOGLE_SHEETS_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              dataAprovacao: new Date().toLocaleString('pt-BR'),
              vendedor: registro.nome || registro.discordId || "-",
              tipo: registro.tipo || "VENDA",
              cliente: registro.cliente || "-",
              documento: registro.cpfEmail || "-",
              item: registro.item || "-",
              valorTotal: valNum,
              valorRecebido: recNum,
              metodoPagamento: registro.valorPagamento || "-",
              status: 'APROVADO',
              corridinha: extra 
            })
          });
        } catch (sheetError) {
          console.error("Erro no Webhook:", sheetError);
        }
      }

      return NextResponse.json({ success: true, message: "Aprovado com sucesso" });
    }

    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });

  } catch (error) {
    console.error("Erro fatal no POST Analise:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}