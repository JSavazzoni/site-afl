"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Wallet, TrendingUp, Zap, Banknote, History, Clock, AlertCircle, LogOut, ShieldCheck, CheckCircle2
} from 'lucide-react';
import { signOut } from "next-auth/react";

// --- CONFIGURAÇÕES E AUXILIARES ---
const formatMoney = (val: any) => Number(val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function PortalAgente({ userSession }: any) {
  const [registros, setRegistros] = useState<any[]>([]);
  const [meuPerfil, setMeuPerfil] = useState<any>(null);

  // Define o mês atual
  const dataAtual = new Date();
  const mesAtualStr = `${dataAtual.getFullYear()}-${String(dataAtual.getMonth() + 1).padStart(2, '0')}`;

  const getCashback = (cargo: string) => { 
    const r: any = { 'Resp.Vendas': 0.15, 'Master AFL': 0.12, 'Resp.AFL': 0.10, 'Auxiliar AFL': 0.09, 'Lider AFL': 0.08, 'Sub-Lider AFL': 0.07, 'Membro AFL': 0.06 };
    return r[cargo || 'Membro AFL'] || 0.06;
  };

  // --- SINCRONIZAÇÃO DE DADOS ---
  const pulse = useCallback(async () => {
    const v = Date.now(); 
    try {
      const [resE, resR] = await Promise.all([
        fetch(`/api/equipe?v=${v}`, { cache: 'no-store' }),
        fetch(`/api/registros?v=${v}`, { cache: 'no-store' })
      ]);
      
      if (resE.ok) {
        const equipe = await resE.json();
        // Puxa apenas o perfil do agente logado
        const eu = equipe.find((m: any) => String(m.discordId) === String(userSession?.user?.id));
        if (eu) setMeuPerfil(eu);
      }
      
      if (resR.ok) {
        const todosRegs = await resR.json();
        // Filtra apenas os registros dele
        const meusRegs = todosRegs.filter((r: any) => String(r.discordId) === String(userSession?.user?.id));
        setRegistros(meusRegs);
      }
    } catch (e) { console.error(e); }
  }, [userSession]);

  useEffect(() => { 
    pulse(); 
    const timer = setInterval(pulse, 5000); 
    return () => clearInterval(timer); 
  }, [pulse]);

  // --- CÁLCULOS BLINDADOS (Idênticos ao Admin) ---
  const cargoReal = meuPerfil?.cargoPainel || meuPerfil?.cargo || 'Membro AFL';
  const perc = getCashback(cargoReal);

  // 1. Dados do Mês Atual (Para as caixinhas)
  const regsMes = registros.filter(r => (r.status === 'APROVADO' || r.status === 'ARQUIVADO') && r.criado_em && r.criado_em.startsWith(mesAtualStr));
  const brutoMes = regsMes.filter(r => (r.tipo === 'VENDA' || !r.tipo) && !(r.item || '').toUpperCase().includes('DÍVIDA ANTIGA')).reduce((a, r) => a + (Number(r.valor) || 0), 0);
  const liqMes = regsMes.filter(r => (r.tipo === 'VENDA' || !r.tipo)).reduce((a, r) => a + (Number(r.valorRecebido) || 0), 0);
  
  // 2. Saldo Ativo Total a Receber
  const regsAtivos = registros.filter(r => r.status === 'APROVADO');
  const ativoLiq = regsAtivos.filter(r => (r.tipo === 'VENDA' || !r.tipo)).reduce((a, r) => a + (Number(r.valorRecebido) || 0), 0);
  const ativoExtra = regsAtivos.filter(r => r.tipo === 'CORRIDINHA').reduce((a, r) => a + (Number(r.cashbackExtra) || 0), 0);
  const ativoPago = regsAtivos.filter(r => r.tipo === 'SAQUE').reduce((a, r) => a + (Number(r.valor) || 0), 0);
  
  const saldoReal = (ativoLiq * perc) + ativoExtra - ativoPago;

  // 3. Extrato e Pendências
  const extrato = regsMes.filter(r => !(r.item || '').toUpperCase().includes('SALDO RETIDO')).sort((a,b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime());
  const pendencias = registros.filter(r => (r.status === 'APROVADO' || r.status === 'ARQUIVADO') && (r.tipo === 'VENDA' || !r.tipo) && Number(r.valorRecebido) < Number(r.valor));

  return (
    <div className="flex flex-col min-h-screen bg-[#050505] text-white font-sans selection:bg-yellow-400 overflow-x-hidden">
      
      {/* CSS DA SCROLLBAR PREMIUM */}
      <style dangerouslySetInnerHTML={{__html: `
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: #050505; border-left: 1px solid rgba(255,255,255,0.02); }
        ::-webkit-scrollbar-thumb { background: #1a1a1a; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #facc15; }
      `}} />

      {/* HEADER LUXUOSO */}
      <header className="bg-[#0a0a0a] border-b border-white/5 px-8 lg:px-16 py-8 flex flex-col md:flex-row items-center justify-between gap-6 relative z-10 shadow-2xl">
         <div className="flex items-center gap-6">
            <img src={userSession?.user?.image || `https://ui-avatars.com/api/?name=${userSession?.user?.name}&background=EAB308&color=000&bold=true`} className="w-20 h-20 lg:w-24 lg:h-24 rounded-[2rem] border-4 border-yellow-400 shadow-[0_0_40px_rgba(250,204,21,0.2)]" alt="" />
            <div>
               <h1 className="text-4xl lg:text-5xl font-black uppercase italic tracking-tighter leading-none">{userSession?.user?.name}</h1>
               <div className="flex items-center gap-3 mt-3">
                  <span className="bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 font-black uppercase tracking-[0.3em] text-[10px] lg:text-xs px-4 py-1.5 rounded-xl">
                     {cargoReal} • {(perc * 100).toFixed(0)}%
                  </span>
                  <span className="text-zinc-600 font-bold uppercase text-[10px] tracking-widest flex items-center gap-1"><ShieldCheck size={14}/> Portal do Agente</span>
               </div>
            </div>
         </div>
         
         <button onClick={() => signOut()} className="px-8 py-4 bg-white/5 border border-white/10 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-500 rounded-[1.5rem] text-[10px] lg:text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3 text-zinc-400 group">
            <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" /> DESCONECTAR
         </button>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 p-8 lg:p-16 max-w-7xl mx-auto w-full space-y-12 lg:space-y-16 animate-in fade-in slide-in-from-bottom-6 duration-700">
        
        {/* CARDS SUPERIORES */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
           
           {/* CAIXA DE SALDO - GIGANTE E DESTAQUE */}
           <div className="lg:col-span-3 bg-gradient-to-br from-green-500/10 to-[#0a0a0a] border border-green-500/20 p-12 lg:p-16 rounded-[3rem] lg:rounded-[4rem] shadow-[0_20px_60px_rgba(34,197,94,0.05)] relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-12 text-green-500/5 group-hover:scale-110 transition-transform duration-700"><Wallet size={180}/></div>
              <p className="text-xs lg:text-sm text-green-500 font-black uppercase mb-4 tracking-[0.4em] italic relative z-10 flex items-center gap-3"><Zap size={18}/> SALDO LÍQUIDO DISPONÍVEL</p>
              <h2 className="text-7xl lg:text-9xl font-mono italic text-green-400 font-black relative z-10 tracking-tighter whitespace-nowrap truncate drop-shadow-2xl">
                 R$ {formatMoney(saldoReal)}
              </h2>
           </div>

           {/* CAIXAS SECUNDÁRIAS */}
           <div className="bg-white/[0.02] border border-white/5 p-10 rounded-[2.5rem] lg:rounded-[3rem] relative overflow-hidden group hover:border-white/10 transition-all">
              <div className="absolute top-6 right-6 text-white/5 group-hover:scale-110 transition-transform"><TrendingUp size={40}/></div>
              <p className="text-[10px] lg:text-xs text-zinc-500 font-black uppercase mb-3 tracking-[0.3em] italic">SUA PRODUÇÃO (MÊS)</p>
              <p className="text-4xl lg:text-5xl font-mono text-white italic font-black whitespace-nowrap truncate">R$ {formatMoney(brutoMes)}</p>
           </div>

           <div className="bg-blue-500/5 border border-blue-500/10 p-10 rounded-[2.5rem] lg:rounded-[3rem] relative overflow-hidden group hover:border-blue-500/20 transition-all">
              <div className="absolute top-6 right-6 text-blue-500/10 group-hover:scale-110 transition-transform"><Zap size={40}/></div>
              <p className="text-[10px] lg:text-xs text-blue-500 font-black uppercase mb-3 tracking-[0.3em] italic">BÔNUS EXTRAS REBIDOS</p>
              <p className="text-4xl lg:text-5xl font-mono text-blue-400 italic font-black whitespace-nowrap truncate">+R$ {formatMoney(ativoExtra)}</p>
           </div>

           <div className="bg-red-500/5 border border-red-500/10 p-10 rounded-[2.5rem] lg:rounded-[3rem] relative overflow-hidden group hover:border-red-500/20 transition-all">
              <div className="absolute top-6 right-6 text-red-500/10 group-hover:scale-110 transition-transform"><Banknote size={40}/></div>
              <p className="text-[10px] lg:text-xs text-red-500 font-black uppercase mb-3 tracking-[0.3em] italic">VALOR JÁ RETIRADO</p>
              <p className="text-4xl lg:text-5xl font-mono text-red-400 italic font-black whitespace-nowrap truncate">-R$ {formatMoney(ativoPago)}</p>
           </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
           
           {/* EXTRATO RECENTE */}
           <section className="space-y-8">
              <h3 className="text-2xl lg:text-3xl font-black uppercase italic text-white flex items-center gap-4 tracking-[0.2em]"><History size={28} className="text-yellow-400"/> SEU EXTRATO</h3>
              
              <div className="bg-[#0a0a0a] border border-white/5 rounded-[3rem] p-6 space-y-3 max-h-[500px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                 {extrato.length === 0 && <p className="text-center py-10 text-zinc-600 font-black uppercase tracking-widest text-sm">Sem registros no mês</p>}
                 {extrato.map((r: any) => (
                    <div key={r.id} className="flex justify-between items-center bg-black p-6 lg:p-8 rounded-[2rem] border border-white/5 hover:border-white/10 transition-all">
                       <div>
                          <p className={`font-black text-sm lg:text-base uppercase italic mb-1.5 ${r.tipo === 'CORRIDINHA' ? 'text-blue-400' : r.tipo === 'SAQUE' ? 'text-red-400' : 'text-white'}`}>{r.item || r.tipo}</p>
                          <p className="text-[10px] text-zinc-600 tracking-[0.2em] uppercase italic">{new Date(r.criado_em).toLocaleDateString('pt-BR')} • {r.cliente || 'SISTEMA'}</p>
                       </div>
                       <div className="text-right">
                          <p className={`font-mono text-xl lg:text-2xl font-black italic ${r.tipo === 'SAQUE' ? 'text-red-500' : 'text-green-500'}`}>{r.tipo === 'SAQUE' ? '-' : '+'} R$ {formatMoney(r.valor || r.cashbackExtra)}</p>
                          {r.status === 'PENDENTE' && <span className="text-[8px] bg-yellow-400/10 text-yellow-400 px-2 py-1 rounded-md uppercase font-black tracking-widest mt-2 inline-block">Em Análise</span>}
                       </div>
                    </div>
                 ))}
              </div>
           </section>

           {/* COBRANÇAS PENDENTES (Clientes deles) */}
           <section className="space-y-8">
              <h3 className="text-2xl lg:text-3xl font-black uppercase italic text-white flex items-center gap-4 tracking-[0.2em]"><Clock size={28} className="text-red-500"/> SUAS COBRANÇAS</h3>
              
              <div className="space-y-5">
                 {pendencias.length === 0 && (
                    <div className="bg-green-500/5 border border-green-500/20 rounded-[3rem] p-12 text-center">
                       <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4 opacity-50"/>
                       <p className="text-green-500 font-black uppercase tracking-[0.3em] text-sm">Sua carteira está limpa</p>
                    </div>
                 )}
                 {pendencias.map(r => (
                    <div key={r.id} className="bg-[#0a0a0a] border border-red-500/20 p-8 lg:p-10 rounded-[3rem] relative overflow-hidden group">
                       <div className="absolute -top-4 -right-4 p-6 text-red-500/5 group-hover:text-red-500/10 transition-colors"><AlertCircle size={80}/></div>
                       <div className="relative z-10 flex flex-col sm:flex-row justify-between gap-6">
                          <div>
                             <h4 className="text-2xl text-white italic font-black uppercase mb-2 tracking-tighter">{r.cliente}</h4>
                             <p className="text-[10px] text-zinc-400 uppercase tracking-widest mb-4">{r.item}</p>
                             <span className="text-yellow-400 bg-yellow-400/10 px-3 py-1.5 rounded-lg border border-yellow-400/20 text-[10px] font-black tracking-[0.2em]">VENCE: {r.dataVencimento?.split('-').reverse().join('/') || 'A COMBINAR'}</span>
                          </div>
                          <div className="text-left sm:text-right">
                             <p className="text-[10px] text-zinc-600 font-black uppercase mb-1 tracking-[0.2em] italic">FALTA RECEBER</p>
                             <p className="text-3xl font-mono text-red-500 font-black italic">R$ {formatMoney(Number(r.valor) - Number(r.valorRecebido))}</p>
                          </div>
                       </div>
                    </div>
                 ))}
              </div>
           </section>

        </div>
      </main>
      
      <footer className="text-center p-8 pointer-events-none opacity-10">
         <p className="text-[9px] font-black uppercase tracking-[1.5em] text-white italic">AFL OS Premium • Agente</p>
      </footer>
    </div>
  );
}