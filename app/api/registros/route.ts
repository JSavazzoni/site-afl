export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// FUNÇÃO PARA BUSCAR REGISTROS (Ajustada para mostrar arquivados também)
export async function GET() {
  try {
    const registros = await prisma.registro.findMany({
      where: {
        status: {
          in: ['APROVADO', 'ARQUIVADO', 'PENDENTE']
        }
      },
      orderBy: {
        criado_em: 'desc'
      }
    });
    return NextResponse.json(registros);
  } catch (error) {
    console.error("Erro ao buscar registros:", error);
    return NextResponse.json([], { status: 500 });
  }
}

// FUNÇÃO PARA POSTAR NOVOS REGISTROS
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      tipo, vendedorId, cliente, item, valorNumerico, recebidoNumerico, 
      vendedorNome, cashbackExtra, recrutadoId, dataVencimento 
    } = body;

    // Criar o registro no banco de dados
    const novoRegistro = await prisma.registro.create({
      data: {
        tipo: tipo || 'VENDA',
        discordId: vendedorId || recrutadoId, // ID de quem fez a ação
        nome: vendedorNome,
        cliente: cliente || 'N/A',
        item: item || 'N/A',
        valor: valorNumerico || 0,
        valorRecebido: recebidoNumerico || 0,
        cashbackExtra: cashbackExtra || 0,
        recrutadoId: recrutadoId || null,
        status: 'PENDENTE', // Todos entram para análise do ADM
        dataVencimento: dataVencimento || null,
      }
    });

    return NextResponse.json(novoRegistro);
  } catch (error) {
    console.error("Erro ao criar registro:", error);
    return NextResponse.json({ error: "Erro ao processar registro" }, { status: 500 });
  }
}