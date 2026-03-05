export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../[...nextauth]/route"; // IMPORTA A CHAVE

export async function GET() {
  try {
    // PUXA A SESSÃO COM O ID
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Não logado" }, { status: 403 });
    }

    const userId = (session as any).user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Falha ao identificar ID" }, { status: 403 });
    }

    const discordRes = await fetch(`https://discord.com/api/v10/guilds/${process.env.DISCORD_GUILD_ID}/members/${userId}`, {
      headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
      next: { revalidate: 0 } 
    });

    if (!discordRes.ok) {
       if (discordRes.status === 404) {
          return NextResponse.json({ error: "Não está no servidor" }, { status: 403 });
       }
       return NextResponse.json({ isAdmin: false, temp: true }, { status: 200 });
    }

    const member = await discordRes.json();
    
    const hierarchyIds = [
      process.env.DISCORD_ADMIN_ROLE_ID,
      process.env.ROLE_RESP_VENDAS,
      process.env.ROLE_MASTER,
      process.env.ROLE_RESP_AFL,
      process.env.ROLE_AUXILIAR,
      process.env.ROLE_LIDER,
      process.env.ROLE_SUB_LIDER,
      process.env.ROLE_MEMBRO
    ].filter(Boolean);

    const adminIds = [
      process.env.DISCORD_ADMIN_ROLE_ID,
      process.env.ROLE_RESP_VENDAS,
      process.env.ROLE_MASTER
    ].filter(Boolean);

    const hasAccess = member.roles.some((role: string) => hierarchyIds.includes(role));
    const isAdmin = member.roles.some((role: string) => adminIds.includes(role));

    if (!hasAccess) {
       return NextResponse.json({ error: "Sem permissão na AFL" }, { status: 403 });
    }

    return NextResponse.json({ isAdmin, hasAccess: true }, { status: 200 });

  } catch (e) {
    return NextResponse.json({ isAdmin: false, temp: true }, { status: 200 });
  }
}