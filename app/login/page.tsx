"use client";
import { signIn } from "next-auth/react";
import { UsersRound, LogIn } from "lucide-react";

export default function Login() {
  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 selection:bg-yellow-400 font-sans relative overflow-hidden">
      {/* Luz de fundo amarela */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-yellow-400/5 rounded-full blur-[120px] pointer-events-none"></div>
      
      <div className="bg-[#0a0a0a] border border-white/5 p-12 rounded-[3rem] w-full max-w-md shadow-2xl relative z-10 flex flex-col items-center text-center animate-in zoom-in-95 duration-500">
        <div className="p-5 bg-yellow-400 rounded-3xl text-black shadow-[0_0_40px_rgba(250,204,21,0.3)] mb-8">
          <UsersRound size={48} strokeWidth={2.5} />
        </div>
        
        <h1 className="text-4xl font-black uppercase italic tracking-tighter text-white mb-2">
          AFL<span className="text-yellow-400 ml-1">PAINEL</span>
        </h1>
        
        <p className="text-zinc-500 text-[11px] font-black uppercase tracking-[0.3em] mb-12 italic">
          Acesso restrito a membros
        </p>

        <button 
          onClick={() => signIn("discord", { callbackUrl: "/" })}
          className="w-full flex items-center justify-center gap-4 bg-[#5865F2] hover:bg-[#4752C4] text-white font-black py-5 rounded-2xl uppercase tracking-widest text-xs transition-all shadow-[0_10px_20px_rgba(88,101,242,0.2)] active:scale-95"
        >
          <LogIn size={18} />
          Entrar com Discord
        </button>
      </div>
    </div>
  );
}