"use client";
import React, { useEffect, useState, useCallback } from 'react';
import { signIn, useSession, SessionProvider, signOut } from "next-auth/react";
import { UsersRound, Lock, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Painel from './Painel'; 

function ConteudoPrincipal() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [verificando, setVerificando] = useState(true);
  const [autorizado, setAutorizado] = useState(false);
  const [isUserAdmin, setIsUserAdmin] = useState(false);

  const validarSeguranca = useCallback(async () => {
    if (status === "authenticated" && session?.user) {
      try {
        const user = session.user as any;
        const discordId = user.id;

        // VALIDAÇÃO AO VIVO (Batimento Cardíaco)
        const res = await fetch(`/api/equipe?v=${Date.now()}`, { cache: 'no-store' });
        
        if (res.ok) {
          const equipeDB = await res.json();
          const membroAtivo = equipeDB.find((m: any) => String(m.discordId) === String(discordId));

          if (membroAtivo) {
            // ✅ MEMBRO NA EQUIPE
            
            // BUSCA PELO CARGO DE ADMIN (Usando a sua variável com o prefixo obrigatório)
            const adminId = process.env.NEXT_PUBLIC_DISCORD_ADMIN_ROLE_ID;
            
            // Raio-X nos dados do Discord e do Banco
            const dadosSessao = JSON.stringify(user).toUpperCase();
            const dadosBanco = JSON.stringify(membroAtivo).toUpperCase();
            const cargoNome = (membroAtivo.cargoPainel || membroAtivo.cargo || "").toUpperCase();

            const ehAdmin = 
              (adminId && (dadosSessao.includes(adminId) || dadosBanco.includes(adminId))) ||
              cargoNome.includes("MASTER") || 
              cargoNome.includes("ADMIN") ||
              user.isAdmin === true;

            setIsUserAdmin(ehAdmin);
            setAutorizado(true);
            setVerificando(false);
          } else {
            // ❌ EX-MEMBRO: Expulsa na hora
            setAutorizado(false);
            signOut({ callbackUrl: '/acesso-negado' }); 
          }
        }
      } catch (error) {
        console.error("Erro na segurança em tempo real");
      }
    } else if (status === "unauthenticated") {
      setVerificando(false);
      setAutorizado(false);
    }
  }, [session, status]);

  useEffect(() => {
    validarSeguranca();
    let interval: any;
    if (status === "authenticated") {
      interval = setInterval(validarSeguranca, 5000);
    }
    return () => clearInterval(interval);
  }, [validarSeguranca, status]);

  if (status === "loading" || (status === "authenticated" && verificando)) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="animate-spin text-yellow-400" size={48} />
      </div>
    );
  }

  if (status === "authenticated" && autorizado) {
    return <Painel key={String(isUserAdmin)} userSession={session} initialIsAdmin={isUserAdmin} />;
  }

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center relative overflow-hidden text-white selection:bg-yellow-400">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-yellow-500/5 rounded-full blur-[100px] pointer-events-none"></div>
      <main className="relative z-10 flex flex-col items-center animate-in zoom-in-95 duration-700 px-6">
        <div className="p-5 md:p-6 bg-yellow-400 rounded-3xl text-black shadow-[0_0_60px_rgba(250,204,21,0.2)] mb-8">
          <UsersRound size={48} />
        </div>
        <h1 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter mb-4 text-center leading-none">
          AFL<span className="text-yellow-400 ml-2">PAINEL</span>
        </h1>
        <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.4em] mb-12 text-center">Acesso Restrito</p>
        <button onClick={() => signIn('discord')} className="flex items-center justify-center gap-4 bg-[#5865F2] hover:bg-[#4752C4] text-white px-8 py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-xs transition-all hover:scale-105 shadow-[0_15px_40px_rgba(88,101,242,0.3)] group">
          <Lock size={20} className="group-hover:-translate-y-0.5 transition-transform" /> ENTRAR COM DISCORD
        </button>
      </main>
      <footer className="absolute bottom-8 flex flex-col items-center pointer-events-none opacity-40">
         <p className="text-[8px] font-black uppercase tracking-[0.4em] text-zinc-500 italic mb-2 text-center">© {new Date().getFullYear()} AFL PAINEL • TODOS OS DIREITOS RESERVADOS</p>
         <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.5em] text-white italic text-center">DESENVOLVIDO POR <span className="text-yellow-400">{'</>'} VZ</span></p>
      </footer>
    </div>
  );
}

export default function Page() {
  return (
    <SessionProvider>
      <ConteudoPrincipal />
    </SessionProvider>
  );
}