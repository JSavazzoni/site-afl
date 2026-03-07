"use client";
import React, { useEffect, useState } from 'react';
import { signIn, useSession, SessionProvider } from "next-auth/react";
import { UsersRound, Lock, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Painel from './Painel'; 

function ConteudoPrincipal() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // Estados para controlar a Validação Ao Vivo
  const [verificando, setVerificando] = useState(true);
  const [autorizado, setAutorizado] = useState(false);
  const [isUserAdmin, setIsUserAdmin] = useState(false);

  useEffect(() => {
    async function validarSeguranca() {
      // Só faz a verificação se a pessoa passou do login do Discord
      if (status === "authenticated" && session?.user) {
        try {
          const user = session.user as any;
          const discordId = user.id; // Pega o ID único e imutável do Discord

          // VALIDAÇÃO AO VIVO: Pergunta pro banco de dados quem é a equipe real agora
          const res = await fetch('/api/equipe', { cache: 'no-store' });
          
          if (res.ok) {
            const equipeDB = await res.json();
            
            // Procura se o cara que logou realmente existe na lista da sua equipe
            const membroAtivo = equipeDB.find((m: any) => String(m.discordId) === String(discordId));

            if (membroAtivo) {
              // ✅ PASSOU NA SEGURANÇA: Ele está na equipe!
              
              // Puxa o cargo atualizado dele direto do banco pra evitar burlar pelo cookie
              const cargoReal = membroAtivo.cargoPainel || membroAtivo.cargo || user.cargo;
              
              // Verifica se ele tem permissão de Admin (Pela Variável ou pelo nome do cargo)
              const ehAdmin = cargoReal === process.env.NEXT_PUBLIC_DISCORD_ADMIN_ROLE_ID || 
                              cargoReal === 'Master AFL' || 
                              user.isAdmin === true;
              
              setIsUserAdmin(ehAdmin);
              setAutorizado(true);
            } else {
              // ❌ BARRADO: Ele logou no Discord, mas NÃO é da equipe (Invasor ou Ex-membro)
              setAutorizado(false);
              router.push('/acesso-negado');
            }
          } else {
            // Se a API falhar, bloqueia por segurança
            router.push('/acesso-negado');
          }
        } catch (error) {
          router.push('/acesso-negado');
        } finally {
          setVerificando(false);
        }
      } else if (status === "unauthenticated") {
        // Se nem logado no Discord ele está, para de carregar e mostra a tela de login
        setVerificando(false);
      }
    }

    validarSeguranca();
  }, [session, status, router]);

  // 1. TELA DE CARREGAMENTO SEGURO (Enquanto checa o banco de dados)
  if (status === "loading" || verificando) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="animate-spin text-yellow-400" size={48} />
      </div>
    );
  }

  // 2. TELA DO PAINEL (Acesso 100% Confirmado e Autorizado)
  if (status === "authenticated" && autorizado) {
    return <Painel userSession={session} initialIsAdmin={isUserAdmin} />;
  }

  // 3. TELA DE LOGIN (Não tem sessão ativa no navegador)
  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center relative overflow-hidden text-white selection:bg-yellow-400">
      
      {/* Luz de Fundo Premium */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] md:w-[800px] md:h-[800px] bg-yellow-500/5 rounded-full blur-[100px] md:blur-[120px] pointer-events-none"></div>

      <main className="relative z-10 flex flex-col items-center animate-in zoom-in-95 duration-700 px-6">
        <div className="p-5 md:p-6 bg-yellow-400 rounded-3xl text-black shadow-[0_0_60px_rgba(250,204,21,0.2)] mb-8">
          <UsersRound size={48} className="md:w-[56px] md:h-[56px]" />
        </div>
        
        <h1 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter mb-4 text-center leading-none">
          AFL<span className="text-yellow-400 ml-2">PAINEL</span>
        </h1>
        
        <p className="text-zinc-500 text-[10px] md:text-xs font-black uppercase tracking-[0.4em] mb-12 text-center max-w-sm">
          Acesso Restrito
        </p>

        <button
          onClick={() => signIn('discord')}
          className="flex items-center justify-center gap-4 bg-[#5865F2] hover:bg-[#4752C4] text-white px-8 py-5 md:px-10 md:py-6 rounded-[1.5rem] font-black uppercase tracking-widest text-xs md:text-sm transition-all hover:scale-105 active:scale-95 shadow-[0_15px_40px_rgba(88,101,242,0.3)] w-full sm:w-auto group"
        >
          <Lock size={20} className="group-hover:-translate-y-0.5 transition-transform" />
          ENTRAR COM DISCORD
        </button>
      </main>

      {/* FOOTER DA TELA DE LOGIN */}
      <footer className="absolute bottom-8 flex flex-col items-center pointer-events-none opacity-40">
         <p className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.4em] text-zinc-500 italic mb-2 text-center">
            © {new Date().getFullYear()} AFL PAINEL • TODOS OS DIREITOS RESERVADOS
         </p>
         <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.5em] text-white italic text-center">
            DESENVOLVIDO POR <span className="text-yellow-400">{'</>'} VZ</span>
         </p>
      </footer>
    </div>
  );
}

// O ENVELOPE DE SESSÃO
export default function Page() {
  return (
    <SessionProvider>
      <ConteudoPrincipal />
    </SessionProvider>
  );
}