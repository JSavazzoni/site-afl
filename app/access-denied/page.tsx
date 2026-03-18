"use client";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { signOut } from "next-auth/react";

export default function AccessDenied() {
  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 selection:bg-red-500 font-sans relative overflow-hidden">
      {/* Luz de fundo vermelha */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-red-500/5 rounded-full blur-[120px] pointer-events-none"></div>
      
      <div className="bg-[#0a0a0a] border border-red-500/20 p-12 rounded-[3rem] w-full max-w-md shadow-2xl relative z-10 flex flex-col items-center text-center animate-in slide-in-from-bottom-10 duration-500">
        <div className="p-5 bg-red-500/10 text-red-500 rounded-3xl mb-8">
          <ShieldAlert size={48} strokeWidth={2.5} />
        </div>
        
        <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white mb-4">
          Acesso Negado
        </h1>
        <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest leading-relaxed mb-10">
          Você não possui os cargos necessários no servidor do Discord para acessar o painel.
        </p>

        <div className="w-full space-y-4">
          <button 
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full flex items-center justify-center gap-3 bg-red-600 hover:bg-red-500 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-[10px] transition-all shadow-[0_10px_20px_rgba(220,38,38,0.2)] active:scale-95"
          >
            <ArrowLeft size={16} />
            Voltar e Tentar Novamente
          </button>
        </div>
      </div>
    </div>
  );
}