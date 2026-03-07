export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const hierarchy = [
  { id: process.env.ROLE_RESP_VENDAS, name: 'Resp.Vendas' },
  { id: process.env.ROLE_MASTER, name: 'Master AFL' },
  { id: process.env.ROLE_RESP_AFL, name: 'Resp.AFL' },
  { id: process.env.ROLE_AUXILIAR, name: 'Auxiliar AFL' },
  { id: process.env.ROLE_LIDER, name: 'Lider AFL' },
  { id: process.env.ROLE_SUB_LIDER, name: 'Sub-Lider AFL' },
  { id: process.env.ROLE_MEMBRO, name: 'Membro AFL' }
];

export async function GET() {
  try {
    const discordRes = await fetch(`https://discord.com/api/v10/guilds/${process.env.DISCORD_GUILD_ID}/members?limit=1000`, {
      headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
      cache: 'no-store' 
    });

    if (!discordRes.ok) return NextResponse.json({ error: "Erro na API do Discord" }, { status: 500 });
    
    const discordMembers = await discordRes.json();
    const dbMembers = await prisma.membro.findMany();
    const equipeFormatada = [];

    // Pegamos o ID de Admin da sua variável de ambiente
    const adminRoleId = process.env.DISCORD_ADMIN_ROLE_ID;

    for (const member of discordMembers) {
      if (member.user?.bot) continue;

      let cargoPainel = null;
      for (const roleDef of hierarchy) {
        if (roleDef.id && member.roles.includes(roleDef.id)) {
          cargoPainel = roleDef.name;
          break; 
        }
      }

      // SÓ ENTRA NO SITE SE TIVER UM CARGO DA HIERARQUIA
      if (cargoPainel) {
        const dbData = dbMembers.find((db: any) => String(db.discordId) === String(member.user.id));
        
        // VERIFICAÇÃO DE ADMIN AO VIVO
        const ehAdmin = (adminRoleId && member.roles.includes(adminRoleId)) || cargoPainel === 'Master AFL';

        equipeFormatada.push({
          discordId: String(member.user.id),
          nome: member.nick || member.user.global_name || member.user.username,
          avatar: member.user.avatar ? `https://cdn.discordapp.com/avatars/${member.user.id}/${member.user.avatar}.png` : 'https://cdn.discordapp.com/embed/avatars/0.png',
          cargoPainel: cargoPainel,
          // AQUI ESTÁ O CARIMBO QUE O SITE VAI LER:
          isAdminRealTime: ehAdmin, 
          vendas: dbData ? Number(dbData.vendas) : 0,
          valorRecebido: dbData ? Number(dbData.valorRecebido) : 0, 
          cashbackExtra: dbData ? Number(dbData.cashbackExtra) : 0,
          cashbackPago: dbData ? Number(dbData.cashbackPago) : 0
        });
      }
    }

    return NextResponse.json(equipeFormatada);
  } catch (error) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}