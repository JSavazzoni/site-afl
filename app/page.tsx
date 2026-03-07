"use client";
import React, { useEffect, useState, useCallback } from 'react';
import { signIn, useSession, SessionProvider, signOut } from "next-auth/react";
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

  // Função que faz o "Batimento Cardíaco" da Segurança
  const validarSeguranca = useCallback(async () => {
    if (status === "authenticated" && session?.user) {
      try {
        const user = session.user as any;
        const discordId = user.id;

        // VAI NO BANCO A CADA 5 SEGUNDOS (Ignora cache)
        const res = await fetch(`/api/equipe?v=${Date.now()}`, { cache: 'no-store' });
        
        if (res.ok) {
          const equipeDB = await res.json();
          
          // Procura se a pessoa AINDA existe na lista oficial da equipe
          const membroAtivo = equipeDB.find((m: any) => String(m.discordId) === String(discordId));

          if (membroAtivo) {
            // ✅ PASSOU NA SEGURANÇA: Ele está na equipe!
            
            // O Raio-X do Admin: Procura o ID do Cargo de Admin em qualquer lugar do perfil dele
            const adminId = process.env.DISCORD_ADMIN_ROLE_ID || "SEM_ID";
            const stringUser = JSON.stringify(user);
            const stringDB = JSON.stringify(membroAtivo);
            
            const ehAdmin = stringUser.includes(adminId) || 
                            stringDB.includes(adminId) || 
                            user.isAdmin === true || 
                            membroAtivo.cargoPainel === 'Master AFL';

            setIsUserAdmin(ehAdmin);
            setAutorizado(true);
            setVerificando(false);
          } else {
            // ❌ EXPULSO AO VIVO: Se o cara perdeu o cargo/saiu da equipe, o site chuta ele na hora
            setAutorizado(false);
            setVerificando(false);
            // Destrói o cookie de login e joga pro acesso negado
            signOut({ callbackUrl: '/acesso-negado' }); 
          }
        }
      } catch (error) {
        console.error("Falha na segurança ao vivo");
      }
    } else if (status === "unauthenticated") {
      setVerificando(false);
      setAutorizado(false);
    }
  }, [session, status]);

  // Efeito que cria o loop infinito para manter o site "Ao Vivo"
  useEffect(() => {
    // Roda a primeira vez na hora
    validarSeguranca();
    
    // Fica rodando de 5 em 5 segundos
    let interval: any;
    if (status === "authenticated") {
      interval = setInterval(validarSeguranca, 5000);
    }
    
    // Limpa o loop quando fecha o site
    return () => clearInterval(interval);
  }, [validarSeguranca, status]);

  // 1. TELA DE CARREGAMENTO SEGURO
  if (status === "loading" || (status === "authenticated" && verificando)) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="animate-spin text-yellow-400" size={48} />
      </div>
    );
  }

  // 2. TELA DO PAINEL (Acesso Confirmado e Administrador Validado)
  // Obs: O `key` força o painel a recarregar as abas de admin na hora se ele ganhar/perder o cargo
  if (status === "authenticated" && autorizado) {
    return <Painel key={String(isUserAdmin)} userSession={session} initialIsAdmin={isUserAdmin} />;
  }

  // 3. TELA DE LOGIN (Não está logado)
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

      {/* FOOTER DESENVOLVIDO POR VZ */}
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