import { getServerSession } from "next-auth/next";
import { authOptions } from "./api/auth/[...nextauth]/route";
import Painel from "./Painel";
import LoginButton from "./LoginButton";
import LogoutButton from "./LogoutButton";
import { ShieldAlert } from "lucide-react";

export default async function Page() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return (
      <div className="flex min-h-screen bg-[#050505] items-center justify-center p-4 selection:bg-yellow-400/30">
        <div className="bg-[#0a0a0a] border border-white/5 p-12 rounded-[3.5rem] shadow-2xl text-center max-w-sm w-full relative overflow-hidden group">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-yellow-400 shadow-[0_0_30px_#facc15]"></div>
          <h1 className="text-5xl font-black italic text-white uppercase tracking-tighter mb-2 mt-4">
            EQUIPE<span className="text-yellow-400">AFL</span>
          </h1>
          <p className="text-zinc-600 text-[10px] uppercase tracking-[0.3em] font-black mb-10">Acesso Restrito</p>
          <LoginButton />
        </div>
      </div>
    );
  }

  // AQUI ESTÁ A CORREÇÃO DO TYPESCRIPT (O "as any" força a leitura do ID)
  const userId = (session as any).user?.id;
  let hasAccess = false;
  let isAdmin = false;
  let erroAcesso = "NÃO FOI POSSÍVEL OBTER SEU ID DO DISCORD.";

  if (userId) {
    try {
      const res = await fetch(`https://discord.com/api/v10/guilds/${process.env.DISCORD_GUILD_ID}/members/${userId}`, {
        headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
        next: { revalidate: 0 }
      });

      if (res.ok) {
        const member = await res.json();
        
        const hierarchyIds = [
          process.env.DISCORD_ADMIN_ROLE_ID,
          process.env.ROLE_RESP_VENDAS, process.env.ROLE_MASTER, process.env.ROLE_RESP_AFL,
          process.env.ROLE_AUXILIAR, process.env.ROLE_LIDER, process.env.ROLE_SUB_LIDER, process.env.ROLE_MEMBRO
        ].filter(Boolean);

        const adminIds = [
          process.env.DISCORD_ADMIN_ROLE_ID,
          process.env.ROLE_RESP_VENDAS, process.env.ROLE_MASTER
        ].filter(Boolean);

        hasAccess = member.roles.some((role: string) => hierarchyIds.includes(role));
        isAdmin = member.roles.some((role: string) => adminIds.includes(role));
        
        if (!hasAccess) erroAcesso = "VOCÊ NÃO POSSUI NENHUM CARGO DA HIERARQUIA AFL.";
      } else {
        erroAcesso = "VOCÊ NÃO ESTÁ NO SERVIDOR DO DISCORD.";
      }
    } catch (e) {
      erroAcesso = "ERRO DE COMUNICAÇÃO COM O DISCORD.";
    }
  }

  if (!hasAccess) {
    return (
      <div className="flex min-h-screen bg-[#050505] items-center justify-center p-4">
        <div className="bg-[#0a0a0a] border border-red-900/30 p-12 rounded-[3.5rem] text-center max-w-sm w-full relative shadow-[0_0_50px_rgba(239,68,68,0.05)]">
          <div className="flex justify-center mb-6 text-red-500"><ShieldAlert size={64} strokeWidth={1.5} /></div>
          <h2 className="text-3xl font-black italic text-white uppercase mb-4 tracking-tighter">ACESSO NEGADO</h2>
          <p className="text-red-400 text-[10px] font-black uppercase mb-10 p-4 bg-red-500/5 rounded-2xl border border-red-500/10">{erroAcesso}</p>
          <LogoutButton />
        </div>
      </div>
    );
  }

  return <Painel initialIsAdmin={isAdmin} userSession={session} />;
}