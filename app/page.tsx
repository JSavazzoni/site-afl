"use client";
import React from 'react';
import { signIn } from "next-auth/react";
import { UsersRound, Lock } from 'lucide-react';

export default function LoginScreen() {
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