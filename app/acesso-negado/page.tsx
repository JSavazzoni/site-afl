"use client";
import React from 'react';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { signOut } from "next-auth/react";

export default function AcessoNegado() {
  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center relative overflow-hidden text-white selection:bg-red-500">
      
      {/* Luz de Fundo de Bloqueio */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] md:w-[800px] md:h-[800px] bg-red-500/5 rounded-full blur-[100px] pointer-events-none"></div>

      <main className="relative z-10 flex flex-col items-center animate-in slide-in-from-bottom-10 duration-700 px-6">
        <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-full text-red-500 shadow-[0_0_60px_rgba(239,68,68,0.15)] mb-8">
          <ShieldAlert size={56} className="md:w-[72px] md:h-[72px]" />
        </div>
        
        <h1 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter mb-4 text-center leading-none">
          ACESSO <span className="text-red-500">NEGADO</span>
        </h1>
        
        <p className="text-zinc-500 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] mb-12 text-center max-w-md leading-relaxed">
          Você não possui vínculo ou cargo na equipe AFL. Contate a administração caso isso seja um erro.
        </p>

        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="flex items-center justify-center gap-4 bg-white/5 border border-white/10 hover:bg-white/10 text-white px-8 py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-xs transition-all hover:scale-105 active:scale-95 w-full sm:w-auto group"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          VOLTAR PARA O INÍCIO
        </button>
      </main>

      {/* FOOTER DESENVOLVIDO POR VZ */}
      <footer className="absolute bottom-8 flex flex-col items-center pointer-events-none opacity-40">
         <p className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.4em] text-zinc-500 italic mb-2 text-center">
            © {new Date().getFullYear()} AFL PAINEL • TODOS OS DIREITOS RESERVADOS
         </p>
         <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.5em] text-white italic text-center">
            DESENVOLVIDO POR <span className="text-red-500">{'</>'} VZ</span>
         </p>
      </footer>
    </div>
  );
}