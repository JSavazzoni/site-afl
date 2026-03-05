export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const registros = await prisma.registro.findMany({
      where: { status: { in: ['APROVADO', 'ARQUIVADO', 'PENDENTE'] } },
      orderBy: { criado_em: 'desc' }
    });
    return NextResponse.json(registros);
  } catch (error) {
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const novo = await prisma.registro.create({
      data: {
        tipo: body.tipo || 'VENDA',
        discordId: body.vendedorId || body.recrutadoId || body.membroSaqueId,
        nome: body.vendedorNome || body.cliente || 'Sistema',
        cliente: body.cliente || 'N/A',
        item: body.item || 'N/A',
        valor: Number(body.valorNumerico) || 0,
        valorRecebido: Number(body.recebidoNumerico) || 0,
        cashbackExtra: Number(body.cashbackExtra) || 0,
        status: 'PENDENTE',
        dataVencimento: body.dataVencimento || null
      }
    });
    return NextResponse.json(novo);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}