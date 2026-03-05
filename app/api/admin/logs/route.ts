export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// LISTAR TODOS OS LOGS
export async function GET() {
  try {
    const logs = await prisma.registro.findMany({
      orderBy: { criado_em: 'desc' },
    });
    return NextResponse.json(logs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETAR E CORRIGIR SALDO
export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    const registro = await prisma.registro.findUnique({ where: { id } });

    if (!registro) return NextResponse.json({ error: "Registro não encontrado" }, { status: 404 });

    // ESTORNO AUTOMÁTICO: Se o registro tinha dono, tira o valor do saldo dele
    if (registro.discordId) {
      await prisma.membro.update({
        where: { discordId: registro.discordId },
        data: {
          vendas: { decrement: Number(registro.valor) || 0 },
          valorRecebido: { decrement: Number(registro.valorRecebido) || 0 },
          cashbackExtra: { decrement: Number(registro.cashbackExtra) || 0 },
        }
      });
    }

    await prisma.registro.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}