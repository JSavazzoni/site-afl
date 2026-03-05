export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CARGOS_ORDEM = [
  { id: "1473824631491268770", nome: "Resp.Vendas", taxa: 0.15 },
  { id: "1473824631491268767", nome: "Master AFL", taxa: 0.12 },
  { id: "1473824631491268766", nome: "Resp.AFL", taxa: 0.10 },
  { id: "1473824631491268765", nome: "Auxiliar AFL", taxa: 0.09 },
  { id: "1473824631491268764", nome: "Lider AFL", taxa: 0.08 },
  { id: "1473824631491268763", nome: "Sub-Lider AFL", taxa: 0.07 },
  { id: "1474642291594629131", nome: "Membro AFL", taxa: 0.06 }
];

export async function GET() {
  try {
    const membrosNoBanco = await prisma.membro.findMany();
    const token = process.env.DISCORD_BOT_TOKEN;
    const guildId = process.env.DISCORD_GUILD_ID;

    const membrosSincronizados = await Promise.all(membrosNoBanco.map(async (m) => {
      let nomeAtual = m.nome;
      let cargoAtual = m.cargo || "Membro AFL";
      let taxaFinal = 0.06;

      if (token && guildId && m.discordId) {
        try {
          const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${m.discordId}`, {
            headers: { Authorization: `Bot ${token}` },
            next: { revalidate: 0 }
          });

          if (response.ok) {
            const data = await response.json();
            
            // PEGA O NOME (Prioriza o Apelido no servidor, depois Global Name, depois Username)
            const novoNome = data.nick || data.user.global_name || data.user.username;
            
            // BUSCA O CARGO MAIS ALTO
            const roles = data.roles as string[];
            const cargoEncontrado = CARGOS_ORDEM.find(c => roles.includes(c.id));
            
            const novoCargo = cargoEncontrado ? cargoEncontrado.nome : cargoAtual;
            taxaFinal = cargoEncontrado ? cargoEncontrado.taxa : 0.06;

            // ATUALIZAÇÃO EM MASSA: Se nome ou cargo mudaram
            if (novoNome !== m.nome || novoCargo !== m.cargo) {
              // 1. Atualiza a ficha do Membro
              await prisma.membro.update({
                where: { discordId: m.discordId },
                data: { nome: novoNome, cargo: novoCargo }
              });

              // 2. Atualiza TODOS os registros de vendas antigos com o nome novo
              await prisma.registro.updateMany({
                where: { discordId: m.discordId },
                data: { nome: novoNome }
              });

              nomeAtual = novoNome;
              cargoAtual = novoCargo;
            }
          }
        } catch (e) { console.error(`Erro no Discord ID ${m.discordId}`); }
      }

      // Cálculo matemático cravado
      const rec = Number(m.valorRecebido) || 0;
      const extra = Number(m.cashbackExtra) || 0;
      const pago = Number(m.cashbackPago) || 0;
      const bruto = Math.round((rec * taxaFinal) * 100) / 100;

      return {
        nome: nomeAtual,
        cargo: cargoAtual,
        vendas: Number(m.vendas) || 0,
        recebido: rec,
        bruto: bruto,
        corridinha: extra,
        pago: pago,
        aReceber: Math.round((bruto + extra - pago) * 100) / 100
      };
    }));

    // Pega os registros incluindo o ID único do banco (_id)
    const registros = await prisma.registro.findMany({
      where: { status: 'APROVADO' },
      orderBy: { criado_em: 'desc' }
    });

    return NextResponse.json({ registros, membros: membrosSincronizados });
  } catch (error: any) {
    return NextResponse.json({ error: "Erro interno", msg: error.message }, { status: 500 });
  }
}