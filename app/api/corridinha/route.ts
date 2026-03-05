export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { discordId, nome, valor, motivo, adminNome } = body;

    if (!discordId || !valor) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
    }

    const valorNum = Number(valor);

    // 1. CRIA O REGISTRO (HISTÓRICO)
    // Isso garante que a Corridinha apareça no extrato do site
    const novoRegistro = await prisma.registro.create({
      data: {
        discordId: discordId,
        nome: nome || "Membro Desconhecido",
        tipo: 'CORRIDINHA',
        item: motivo || 'Bônus de Corridinha',
        valor: 0, // Valor da venda é 0
        valorRecebido: 0,
        cashbackExtra: valorNum, // O dinheiro entra aqui
        status: 'APROVADO', // Corridinha já nasce aprovada
        criado_em: new Date()
      }
    });

    // 2. O PULO DO GATO: UPSERT NO MEMBRO
    // Se o Maximus não existir, o 'create' entra em ação. 
    // Se ele já existir, o 'update' apenas soma o bônus.
    await prisma.membro.upsert({
      where: { discordId: discordId },
      update: {
        cashbackExtra: { increment: valorNum },
        nome: nome // Atualiza o nome para o mais recente do Discord
      },
      create: {
        discordId: discordId,
        nome: nome || "Novo Membro",
        cargo: "Membro AFL", // Cargo padrão inicial
        vendas: 0,
        valorRecebido: 0,
        cashbackExtra: valorNum,
        cashbackPago: 0
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: `Bônus de R$ ${valorNum.toFixed(2)} postado para ${nome}!` 
    });

  } catch (error: any) {
    console.error("Erro ao postar Corridinha:", error);
    return NextResponse.json({ 
      error: "Erro ao processar bônus", 
      detalhe: error.message 
    }, { status: 500 });
  }
}