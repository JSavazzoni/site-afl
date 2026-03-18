import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const getHighestRole = (discordRoles: string[]) => {
  if (discordRoles.includes(process.env.ROLE_RESP_VENDAS || '')) return "Resp.Vendas";
  if (discordRoles.includes(process.env.ROLE_MASTER || '')) return "Master AFL";
  if (discordRoles.includes(process.env.ROLE_RESP_AFL || '')) return "Resp.AFL";
  if (discordRoles.includes(process.env.ROLE_AUXILIAR || '')) return "Auxiliar AFL";
  if (discordRoles.includes(process.env.ROLE_LIDER || '')) return "Lider AFL";
  if (discordRoles.includes(process.env.ROLE_SUB_LIDER || '')) return "Sub-Lider AFL";
  if (discordRoles.includes(process.env.ROLE_MEMBRO || '')) return "Membro AFL";
  return null;
};

export async function GET() {
  try {
    let members = await prisma.member.findMany();
    
    const botToken = process.env.DISCORD_BOT_TOKEN;
    const guildId = process.env.DISCORD_GUILD_ID;

    if (botToken && guildId) {
      const membersRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members?limit=1000`, {
        headers: { Authorization: `Bot ${botToken}` },
        cache: 'no-store'
      });

      if (membersRes.ok) {
        const discordMembers = await membersRes.json();
        
        for (let i = 0; i < members.length; i++) {
          const dbMember = members[i];
          const dMember = discordMembers.find((dm: any) => dm.user.id === dbMember.discordId);

          let updated = false;
          let updateData: any = {};

          if (dMember) {
            const newName = dMember.nick || dMember.user.global_name || dMember.user.username;
            const newAvatar = dMember.user.avatar 
              ? `https://cdn.discordapp.com/avatars/${dMember.user.id}/${dMember.user.avatar}.png?size=256` 
              : null;

            if (dbMember.name !== newName || dbMember.avatar !== newAvatar) {
              updateData.name = newName;
              updateData.avatar = newAvatar;
              updated = true;
              members[i].name = newName;
              members[i].avatar = newAvatar;
            }

            const highestRole = getHighestRole(dMember.roles);

            if (highestRole) {
              if (dbMember.role !== highestRole || dbMember.panelRole !== highestRole) {
                updateData.role = highestRole;
                updateData.panelRole = highestRole;
                updated = true;
                members[i].role = highestRole;
                members[i].panelRole = highestRole;
              }
            } else {
              const cargoReal = dbMember.panelRole || dbMember.role || "";
              if (!cargoReal.includes("Ex-Membro")) {
                updateData.role = "Ex-Membro";
                updateData.panelRole = "Ex-Membro";
                updated = true;
                members[i].role = "Ex-Membro";
                members[i].panelRole = "Ex-Membro";
              }
            }
          } else {
            const cargoReal = dbMember.panelRole || dbMember.role || "";
            if (!cargoReal.includes("Ex-Membro")) {
              updateData.role = "Ex-Membro";
              updateData.panelRole = "Ex-Membro";
              updated = true;
              members[i].role = "Ex-Membro";
              members[i].panelRole = "Ex-Membro";
            }
          }

          if (updated) {
            await prisma.member.update({
              where: { discordId: dbMember.discordId },
              data: updateData
            });
          }
        }
      }
    }

    return NextResponse.json(members);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await prisma.member.upsert({
      where: { discordId: body.discordId },
      update: { ...body },
      create: { ...body }
    });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}