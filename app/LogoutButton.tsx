"use client";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
  return (
    <button 
      onClick={() => signOut()} 
      className="flex items-center justify-center gap-3 w-full bg-zinc-900 text-white font-black p-5 rounded-2xl uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all border border-zinc-800"
    >
      <LogOut size={20} /> SAIR E TENTAR NOVAMENTE
    </button>
  );
}