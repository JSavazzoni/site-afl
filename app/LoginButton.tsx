"use client";
import { signIn } from "next-auth/react";

export default function LoginButton() {
  return (
    <button 
      onClick={() => signIn('discord', { callbackUrl: '/' })} 
      className="flex items-center justify-center gap-3 w-full bg-yellow-400 text-black font-black p-5 rounded-2xl uppercase tracking-widest hover:bg-yellow-500 transition-all shadow-[0_0_20px_rgba(250,204,21,0.1)] hover:-translate-y-1"
    >
      LOGIN DISCORD
    </button>
  );
}