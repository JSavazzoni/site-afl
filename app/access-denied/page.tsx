"use client";

import { ArrowLeft, ShieldAlert } from "lucide-react";
import { signOut } from "next-auth/react";

export default function AccessDenied() {
  return (
    <div className="relative flex min-h-[calc(100dvh-89px)] flex-1 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(192,53,58,0.12),transparent_34%),linear-gradient(180deg,#f7f8fa_0%,#eef1f5_100%)]" />

      <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-89px)] w-full max-w-lg flex-1 items-center px-6 py-12">
        <div className="fade-up surface w-full rounded-[28px] p-8 text-center sm:p-10">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--danger-soft)] text-[var(--danger)]">
            <ShieldAlert size={28} />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--ink)]">Acesso negado</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">
            Sua conta Discord não possui os cargos necessários para entrar no AFL Painel.
          </p>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--ink)] px-5 py-4 text-sm font-semibold text-white transition hover:bg-black active:scale-[0.99]"
          >
            <ArrowLeft size={16} />
            Voltar ao login
          </button>
        </div>
      </div>
    </div>
  );
}
