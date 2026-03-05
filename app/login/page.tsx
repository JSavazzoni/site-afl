"use client"; // Isso diz ao Next.js que este componente usa botões interativos no navegador

import { signIn } from "next-auth/react";
import { FaDiscord } from 'react-icons/fa';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Efeito visual de fundo */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/20 blur-[120px] rounded-full pointer-events-none"></div>
      
      <div className="bg-zinc-900/60 p-10 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-md text-center max-w-md w-full relative z-10">
        <h1 className="text-3xl font-extrabold text-zinc-100 mb-2">Acesso Restrito</h1>
        <p className="text-zinc-400 mb-8 text-sm">Faça login com sua conta do Discord para acessar o painel da equipe.</p>
        
        {/* Usamos a função signIn no onClick, que manda pro Discord e depois devolve pra tela inicial (/) */}
        <button 
          onClick={() => signIn('discord', { callbackUrl: '/' })}
          className="w-full flex items-center justify-center gap-3 bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40"
        >
          <FaDiscord size={24} />
          Entrar com Discord
        </button>
      </div>
    </div>
  );
}