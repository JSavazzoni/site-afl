export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET: Para você ver TUDO o que tem na tabela de registros sem frescura
export async function GET() {
  try {
    const todosRegistros = await prisma.registro.findMany({
      orderBy: { criado_em: 'desc' }
    });
    return NextResponse.json(todosRegistros);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE: Para você apagar as corridinhas fantasmas do Maximus
export async function DELETE(req: Request) {
  try {
    const { id } = await req.json(); // Você vai mandar o ID que aparece no site ou no log

    // 1. Busca o registro antes de apagar para saber quanto subtrair
    const reg = await prisma.registro.findUnique({ where: { id } });
    if (!reg) return NextResponse.json({ error: "Registro não existe" }, { status: 404 });

    // 2. Apaga o registro
    await prisma.registro.delete({ where: { id } });

    // 3. SE era uma corridinha, a gente precisa tirar o valor do saldo do Membro
    if (reg.discordId && reg.tipo === 'CORRIDINHA') {
      await prisma.membro.update({
        where: { discordId: reg.discordId },
        data: {
          cashbackExtra: { decrement: Number(reg.cashbackExtra) || 0 }
        }
      });
    }

    return NextResponse.json({ success: true, msg: "Apagado e Saldo Corrigido!" });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}