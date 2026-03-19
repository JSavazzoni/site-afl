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

    // 1. VARREDURA DE INSERÇÃO E ATUALIZAÇÃO (Lê o Discord inteiro)
    for (const dMember of discordMembers) {
      const resolvedRole = resolveHighestRole(dMember.roles);
      
      if (resolvedRole) {
        const resolvedName = dMember.nick || dMember.user.global_name || dMember.user.username;
        const resolvedAvatar = dMember.user.avatar 
          ? `https://cdn.discordapp.com/avatars/${dMember.user.id}/${dMember.user.avatar}.png?size=256` 
          : null;

        const dbMember = members.find((m: any) => m.discordId === dMember.user.id);

        if (dbMember) {
          // Membro já existe: Verifica se algo mudou
          let requiresUpdate = false;
          const payload: any = {};

          if (dbMember.name !== resolvedName || dbMember.avatar !== resolvedAvatar) {
            payload.name = resolvedName;
            payload.avatar = resolvedAvatar;
            requiresUpdate = true;

            // Se o nome mudou, altera nos registros antigos também
            if (dbMember.name !== resolvedName) {
              await prisma.record.updateMany({
                where: { discordId: dbMember.discordId },
                data: { name: resolvedName }
              });
            }
          }

          if (dbMember.role !== resolvedRole || dbMember.panelRole !== resolvedRole) {
            payload.role = resolvedRole;
            payload.panelRole = resolvedRole;
            requiresUpdate = true;
          }

          if (requiresUpdate) {
            await prisma.member.update({
              where: { discordId: dbMember.discordId },
              data: payload
            });
          }
        } else {
          // MEMBRO NOVO: Cria imediatamente no banco de dados
          await prisma.member.create({
            data: {
              discordId: dMember.user.id,
              name: resolvedName,
              avatar: resolvedAvatar,
              role: resolvedRole,
              panelRole: resolvedRole
            }
          });
        }
      }
    }

    // 2. VARREDURA DE REMOÇÃO (Lê o banco e chuta quem perdeu o cargo)
    for (const dbMember of members) {
      const dMember = discordMembers.find((dm: any) => dm.user.id === dbMember.discordId);
      const resolvedRole = dMember ? resolveHighestRole(dMember.roles) : null;

      if (!resolvedRole) {
        const fallbackRole = dbMember.panelRole || dbMember.role || "";
        if (!fallbackRole.includes("Ex-Membro")) {
          await prisma.member.update({
            where: { discordId: dbMember.discordId },
            data: {
              role: "Ex-Membro",
              panelRole: "Ex-Membro"
            }
          });
        }
      }
    }

    // Retorna a lista atualizada
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