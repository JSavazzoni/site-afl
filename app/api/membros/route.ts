import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  const session: any = await getServerSession(authOptions);
  const adminRoleId = process.env.DISCORD_ADMIN_ROLE_ID;

  // Trava de segurança: Só o Admin edita
  if (!session?.user?.roles?.includes(adminRoleId)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { discordId, nome, vendas, recrutamentos } = await req.json();

  // No MongoDB, o upsert usa o campo único 'discordId'
  const membro = await prisma.membro.upsert({
    where: { discordId: discordId },
    update: { 
      nome: nome,
      vendas: parseFloat(vendas), 
      recrutamentos: parseInt(recrutamentos) 
    },
    create: { 
      discordId: discordId, 
      nome: nome, 
      vendas: parseFloat(vendas), 
      recrutamentos: parseInt(recrutamentos) 
    },
  });

  return NextResponse.json(membro);
}