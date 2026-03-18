import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const resolveHighestRole = (discordRoles: string[]) => {
  const hierarchy = [
    { id: process.env.ROLE_RESP_VENDAS, name: "Resp.Vendas" },
    { id: process.env.ROLE_MASTER, name: "Master AFL" },
    { id: process.env.ROLE_RESP_AFL, name: "Resp.AFL" },
    { id: process.env.ROLE_AUXILIAR, name: "Auxiliar AFL" },
    { id: process.env.ROLE_LIDER, name: "Lider AFL" },
    { id: process.env.ROLE_SUB_LIDER, name: "Sub-Lider AFL" },
    { id: process.env.ROLE_MEMBRO, name: "Membro AFL" }
  ];

  for (const role of hierarchy) {
    if (role.id && discordRoles.includes(role.id)) {
      return role.name;
    }
  }
  
  return null;
};

export async function GET() {
  try {
    const members = await prisma.member.findMany();
    const token = process.env.DISCORD_BOT_TOKEN;
    const guild = process.env.DISCORD_GUILD_ID;

    if (!token || !guild) {
      return NextResponse.json(members);
    }

    const request = await fetch(`https://discord.com/api/v10/guilds/${guild}/members?limit=1000`, {
      headers: { Authorization: `Bot ${token}` },
      cache: 'no-store'
    });

    if (!request.ok) {
      return NextResponse.json(members);
    }

    const discordMembers = await request.json();

    for (const member of members) {
      const remoteMember = discordMembers.find((dm: any) => dm.user.id === member.discordId);
      let requiresUpdate = false;
      const payload: any = {};

      if (remoteMember) {
        const resolvedName = remoteMember.nick || remoteMember.user.global_name || remoteMember.user.username;
        const resolvedAvatar = remoteMember.user.avatar 
          ? `https://cdn.discordapp.com/avatars/${remoteMember.user.id}/${remoteMember.user.avatar}.png?size=256` 
          : null;

        if (member.name !== resolvedName || member.avatar !== resolvedAvatar) {
          payload.name = resolvedName;
          payload.avatar = resolvedAvatar;
          requiresUpdate = true;

          if (member.name !== resolvedName) {
            await prisma.record.updateMany({
              where: { discordId: member.discordId },
              data: { name: resolvedName }
            });
          }
        }

        const resolvedRole = resolveHighestRole(remoteMember.roles);

        if (resolvedRole) {
          if (member.role !== resolvedRole || member.panelRole !== resolvedRole) {
            payload.role = resolvedRole;
            payload.panelRole = resolvedRole;
            requiresUpdate = true;
          }
        } else {
          const fallbackRole = member.panelRole || member.role || "";
          if (!fallbackRole.includes("Ex-Membro")) {
            payload.role = "Ex-Membro";
            payload.panelRole = "Ex-Membro";
            requiresUpdate = true;
          }
        }
      } else {
        const fallbackRole = member.panelRole || member.role || "";
        if (!fallbackRole.includes("Ex-Membro")) {
          payload.role = "Ex-Membro";
          payload.panelRole = "Ex-Membro";
          requiresUpdate = true;
        }
      }

      if (requiresUpdate) {
        await prisma.member.update({
          where: { discordId: member.discordId },
          data: payload
        });
      }
    }

    const updatedMembers = await prisma.member.findMany();
    return NextResponse.json(updatedMembers);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const result = await prisma.member.upsert({
      where: { discordId: payload.discordId },
      update: { ...payload },
      create: { ...payload }
    });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}