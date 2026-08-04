"use client";

import { signIn } from "next-auth/react";
import { LogIn, ShieldCheck } from "lucide-react";
import SiteFooter from "../SiteFooter";

export default function Login() {
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <div className="relative flex flex-1 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(200,155,12,0.18),transparent_32%),linear-gradient(135deg,#10131a_0%,#1a1f2a_48%,#0f1218_100%)]" />
        <div className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-[rgba(200,155,12,0.12)] blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-[rgba(255,255,255,0.04)] blur-3xl" />

        <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 items-center px-6 py-12 lg:px-10">
          <div className="grid w-full gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <section className="fade-up text-white">
              <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 backdrop-blur">
                <ShieldCheck size={16} className="text-[var(--brand)]" />
                Acesso exclusivo da equipe AFL
              </div>
              <h1 className="max-w-xl text-5xl font-semibold tracking-tight text-white sm:text-6xl">
                AFL <span className="text-[var(--brand)]">Painel</span>
              </h1>
              <p className="mt-5 max-w-lg text-base leading-7 text-white/65">
                Controle vendas, comissões e aprovações em um ambiente limpo, organizado e feito para o dia a dia da operação.
              </p>
            </section>

            <section className="fade-up surface rounded-[28px] p-8 text-center sm:p-10">
              <div className="brand-mark mx-auto mb-6">
                <span className="text-sm font-bold tracking-wide">AFL</span>
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-[var(--ink)]">Entrar no painel</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--ink-soft)]">
                Use sua conta Discord com cargo válido para continuar.
              </p>

              <button
                onClick={() => signIn("discord", { callbackUrl: "/" })}
                className="mt-8 flex w-full items-center justify-center gap-3 rounded-2xl bg-[#5865F2] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[#4752C4] active:scale-[0.99]"
              >
                <LogIn size={18} />
                Entrar com Discord
              </button>

              <p className="mt-6 text-xs leading-5 text-[var(--ink-faint)]">
                Sem cargo autorizado no servidor, o acesso será bloqueado automaticamente.
              </p>
            </section>
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
