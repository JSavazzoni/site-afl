"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { 
  LayoutDashboard, Trophy, PlusCircle, ShieldCheck, TrendingUp, Users, 
  LogOut, UsersRound, X, History, CheckCircle2, Database, Clock, 
  ShoppingCart, UserPlus, Zap, Banknote, AlertCircle, Trash2, ShieldAlert, Archive
} from 'lucide-react';
import { signOut } from "next-auth/react";

// --- CONFIGURAÇÕES GLOBAIS ---
const HIERARQUIA = ["Resp.Vendas", "Master AFL", "Resp.AFL", "Auxiliar AFL", "Lider AFL", "Sub-Lider AFL", "Membro AFL"];
const formatMoney = (val: any) => Number(val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatMes = (yyyyMM: string) => {
  if (!yyyyMM) return '';
  const [y, m] = yyyyMM.split('-');
  const mesesNome = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  return `${mesesNome[parseInt(m) - 1]} ${y}`;
};

export default function Painel({ initialIsAdmin, userSession }: any) {
  const [activeTab, setActiveTab] = useState('inicio');
  const [selectedCargo, setSelectedCargo] = useState('Todos');
  const [registros, setRegistros] = useState<any[]>([]);
  const [equipe, setEquipe] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(initialIsAdmin || false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  
  const [membroSelecionado, setMembroSelecionado] = useState<any>(null);
  const [modalParcela, setModalParcela] = useState<any>(null);
  const [valorParcela, setValorParcela] = useState('');
  const [proximoVencimento, setProximoVencimento] = useState('');
  const [mesBackup, setMesBackup] = useState('');
  
  const [form, setForm] = useState({ 
    tipo: 'VENDA', vendedorId: '', cliente: '', item: '', 
    valor: '', valorRecebido: '', recrutadoId: '', dataVencimento: '', membroSaqueId: ''
  });

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };
  const dataAtual = new Date();
  const mesAtualStr = `${dataAtual.getFullYear()}-${String(dataAtual.getMonth() + 1).padStart(2, '0')}`;

  const getCashback = (cargo: string) => { 
    const r: any = { 'Resp.Vendas': 0.15, 'Master AFL': 0.12, 'Resp.AFL': 0.10, 'Auxiliar AFL': 0.09, 'Lider AFL': 0.08, 'Sub-Lider AFL': 0.07, 'Membro AFL': 0.06 };
    return r[cargo || 'Membro AFL'] || 0.06;
  };

  const pulse = useCallback(async () => {
    const v = Date.now(); 
    try {
      const [resE, resR] = await Promise.all([
        fetch(`/api/equipe?v=${v}`, { cache: 'no-store' }),
        fetch(`/api/registros?v=${v}`, { cache: 'no-store' })
      ]);
      if (resE.ok) setEquipe(await resE.json());
      if (resR.ok) setRegistros(await resR.json());
    } catch {}
  }, []);

  useEffect(() => { pulse(); const timer = setInterval(pulse, 5000); return () => clearInterval(timer); }, [pulse]);

  useEffect(() => {
    if (registros.length > 0 && !mesBackup) {
      const d = new Date(registros[0].criado_em);
      setMesBackup(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
  }, [registros, mesBackup]);

  // --- CÁLCULO DE DADOS PURO E BLINDADO (Igual a Auditoria) ---
  const equipeProcessada = equipe.map(m => {
    const cargoReal = m.cargoPainel || m.cargo || 'Membro AFL';
    const perc = getCashback(cargoReal);

    const regsMes = registros.filter(r => 
        String(r.discordId) === String(m.discordId) && 
        (r.status === 'APROVADO' || r.status === 'ARQUIVADO') && 
        r.criado_em && r.criado_em.startsWith(mesAtualStr)
    );

    // Matemática 100% Baseada no Banco (Sem filtros ocultos)
    const bruto = regsMes.filter(r => r.tipo === 'VENDA' || !r.tipo).reduce((a, r) => a + (Number(r.valor) || 0), 0);
    const liq = regsMes.filter(r => r.tipo === 'VENDA' || !r.tipo).reduce((a, r) => a + (Number(r.valorRecebido) || 0), 0);
    const corridinhas = regsMes.filter(r => r.tipo === 'CORRIDINHA').reduce((a, r) => a + (Number(r.cashbackExtra) || 0), 0);
    const pago = regsMes.filter(r => r.tipo === 'SAQUE').reduce((a, r) => a + (Number(r.valor) || 0), 0);

    // Saldo Real 100% Espelhado na Auditoria Vitalícia
    const regsAtivos = registros.filter(r => String(r.discordId) === String(m.discordId) && r.status === 'APROVADO');
    const ativoLiq = regsAtivos.filter(r => r.tipo === 'VENDA' || !r.tipo).reduce((a, r) => a + (Number(r.valorRecebido) || 0), 0);
    const ativoExtra = regsAtivos.filter(r => r.tipo === 'CORRIDINHA').reduce((a, r) => a + (Number(r.cashbackExtra) || 0), 0);
    const ativoPago = regsAtivos.filter(r => r.tipo === 'SAQUE').reduce((a, r) => a + (Number(r.valor) || 0), 0);
    
    const saldoReal = (ativoLiq * perc) + ativoExtra - ativoPago;

    return { ...m, cargoReal, bruto, liq, corridinhas, pago, saldoReal };
  }).sort((a, b) => b.bruto - a.bruto);

  const equipeFiltrada = selectedCargo === 'Todos' ? equipeProcessada : equipeProcessada.filter(m => m.cargoReal === selectedCargo);
  const modalMember = membroSelecionado ? equipeProcessada.find(m => m.discordId === membroSelecionado.discordId) || membroSelecionado : null;
  
  const aguardando = registros.filter(r => r.status === 'PENDENTE');
  const pendencias = registros.filter(r => (r.status === 'APROVADO' || r.status === 'ARQUIVADO') && (r.tipo === 'VENDA' || !r.tipo) && Number(r.valorRecebido) < Number(r.valor));
  
  const muralMes = registros.filter(r => 
    (r.status === 'APROVADO' || r.status === 'ARQUIVADO') && 
    r.criado_em && r.criado_em.startsWith(mesAtualStr)
  ).sort((a,b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime());

  const mesesDisponiveis = Array.from(new Set(registros.map(r => r.criado_em?.substring(0, 7)))).filter(Boolean).sort().reverse();
  const registrosDoMesBackup = registros.filter(r => r.criado_em?.startsWith(mesBackup));
  const backupBruto = registrosDoMesBackup.filter(r => r.tipo === 'VENDA' || !r.tipo).reduce((a,r)=>a+Number(r.valor), 0);
  const backupLiquido = registrosDoMesBackup.filter(r => r.tipo === 'VENDA' || !r.tipo).reduce((a,r)=>a+Number(r.valorRecebido), 0);

  // --- AÇÕES DO PAINEL ---
  const handleEnviar = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    const valLimpo = parseFloat(form.valor.replace(',', '.')) || 0;
    const recLimpo = form.valorRecebido ? parseFloat(form.valorRecebido.replace(',', '.')) : valLimpo;
    const m = equipe.find((m: any) => String(m.discordId) === String(form.vendedorId || form.recrutadoId || form.membroSaqueId));

    const payload = { 
      ...form, 
      valorNumerico: form.tipo === 'CORRIDINHA' ? 0 : valLimpo,
      recebidoNumerico: form.tipo === 'CORRIDINHA' ? 0 : recLimpo,
      cashbackExtra: form.tipo === 'CORRIDINHA' ? valLimpo : 0,
      vendedorNome: m?.nome 
    };

    const res = await fetch('/api/registros', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (res.ok) {
      setForm({ tipo: 'VENDA', vendedorId: '', cliente: '', item: '', valor: '', valorRecebido: '', recrutadoId: '', dataVencimento: '', membroSaqueId: '' });
      showToast("REGISTRO POSTADO COM SUCESSO!");
      pulse();
    }
    setLoading(false);
  };

  const decidir = async (id: string, acao: 'APROVAR' | 'REPROVAR') => {
    await fetch('/api/registros/analise', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ registroId: id, acao }) });
    pulse(); 
  };

  const deletarLog = async (id: string) => {
    if (!confirm("ATENÇÃO: Deletar permanentemente?")) return;
    await fetch('/api/admin/logs', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    pulse();
  };

  const virarMes = async () => {
    if (!confirm("ALERTA: Isso irá arquivar o mês. Apenas use no 1º dia do mês.")) return;
    setLoading(true);
    await fetch('/api/admin/virada', { method: 'POST' });
    showToast("MÊS FECHADO!");
    pulse();
    setLoading(false);
  };

  const forcarAuditoria = async () => {
    if (!confirm("RESTAURAR SISTEMA: Recalcular banco e voltar vendas?")) return;
    setLoading(true);
    await fetch('/api/admin/auditoria');
    showToast("SISTEMA RESTAURADO!");
    pulse();
    setLoading(false);
  };

  const handlePagarParcela = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    const v = parseFloat(valorParcela.replace(',', '.')) || 0;
    await fetch('/api/registros/parcela', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ registroId: modalParcela.id, valorPago: v, proximaData: proximoVencimento }) });
    setModalParcela(null); setValorParcela(''); pulse();
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen bg-[#050505] text-white font-sans selection:bg-yellow-400 overflow-hidden">
      
      <style dangerouslySetInnerHTML={{__html: `
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: #050505; border-left: 1px solid rgba(255,255,255,0.02); }
        ::-webkit-scrollbar-thumb { background: #1a1a1a; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #facc15; }
      `}} />

      {toast && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-10">
          <div className="bg-yellow-400 text-black px-8 py-4 rounded-2xl font-black shadow-2xl flex items-center gap-3 text-xs uppercase tracking-widest italic border-4 border-black/10">
            <CheckCircle2 size={20} /> {toast}
          </div>
        </div>
      )}

      {/* SIDEBAR */}
      <aside className="w-72 border-r border-white/5 bg-[#0a0a0a] p-8 flex flex-col z-50">
        <div className="flex items-center gap-4 mb-10 font-black italic text-2xl uppercase tracking-tighter">
          <div className="p-2.5 bg-yellow-400 rounded-xl text-black shadow-[0_0_25px_#facc15]"><UsersRound size={24}/></div>
          AFL<span className="text-yellow-400 ml-1">PAINEL</span>
        </div>
        
        <nav className="flex-1 space-y-2">
          <NavItem label="DASHBOARD" icon={<LayoutDashboard size={18}/>} active={activeTab === 'inicio'} onClick={() => setActiveTab('inicio')} />
          <NavItem label="RANKING" icon={<Trophy size={18}/>} active={activeTab === 'ranking'} onClick={() => setActiveTab('ranking')} />
          <NavItem label="EFETIVO" icon={<Users size={18}/>} active={activeTab === 'equipe'} onClick={() => setActiveTab('equipe')} />
          <NavItem label="MURAL" icon={<History size={18}/>} active={activeTab === 'gestao'} onClick={() => setActiveTab('gestao')} />
          
          {isAdmin && (
            <div className="pt-6 mt-6 border-t border-white/5 space-y-2">
              <NavItem label="POSTAR" icon={<PlusCircle size={18}/>} active={activeTab === 'registrar'} onClick={() => setActiveTab('registrar')} color="text-yellow-400" />
              
              <button onClick={() => setActiveTab('pendencias')} className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all ${activeTab === 'pendencias' ? 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 shadow-sm' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}>
                <div className="flex items-center gap-4"><Clock size={18}/> <span className="font-black text-[11px] tracking-widest uppercase">PENDÊNCIAS</span></div>
                {pendencias.length > 0 && <span className="bg-red-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-lg shadow-red-600/40">{pendencias.length}</span>}
              </button>

              <button onClick={() => setActiveTab('admin')} className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all ${activeTab === 'admin' ? 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 shadow-sm' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}>
                <div className="flex items-center gap-4"><ShieldCheck size={18}/> <span className="font-black text-[11px] tracking-widest uppercase text-yellow-400">APROVAÇÕES</span></div>
                {aguardando.length > 0 && <span className="bg-yellow-400 text-black text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-lg shadow-yellow-400/20">{aguardando.length}</span>}
              </button>

              <NavItem label="ADMINISTRAÇÃO" icon={<ShieldAlert size={18}/>} active={activeTab === 'admin_zone'} onClick={() => setActiveTab('admin_zone')} color="text-red-500" />
              <NavItem label="HISTÓRICO" icon={<Archive size={18}/>} active={activeTab === 'historico_backup'} onClick={() => setActiveTab('historico_backup')} color="text-zinc-400" />
            </div>
          )}
        </nav>
        <button onClick={() => signOut()} className="p-5 mt-6 text-zinc-600 font-black text-[11px] uppercase hover:text-red-500 border border-white/5 bg-black rounded-2xl flex justify-center gap-3 w-full transition-all group hover:bg-white/5">
            <LogOut size={16} className="group-hover:-translate-x-1 transition-transform"/> DESCONECTAR
        </button>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <main className="flex-1 p-10 lg:p-14 overflow-y-auto bg-[#050505] relative">
        <header className="mb-14 flex justify-between items-end border-b border-white/5 pb-8">
          <div>
            <h2 className="text-4xl lg:text-5xl font-black uppercase italic tracking-tighter leading-none text-white">
                {activeTab === 'inicio' ? "VISÃO GERAL" : activeTab === 'admin_zone' ? "ZONA ADMIN" : activeTab.replace('_', ' ')}
            </h2>
            <div className="h-1.5 w-24 bg-yellow-400 mt-6 shadow-[0_0_20px_#facc15]"></div>
          </div>
          <div className="flex items-center gap-4 bg-[#0a0a0a] p-3 pl-5 rounded-[1.5rem] border border-white/5 shadow-md">
             <div className="text-right">
                <p className="text-xs font-black uppercase italic text-white tracking-tight">{userSession?.user?.name}</p>
                <p className="text-[9px] font-bold text-yellow-400 uppercase tracking-[0.2em] mt-1 opacity-80">{isAdmin ? 'ADMINISTRADOR' : 'AGENTE AFL'}</p>
             </div>
             <img src={userSession?.user?.image || `https://ui-avatars.com/api/?name=${userSession?.user?.name}&background=EAB308&color=000&bold=true`} className="w-12 h-12 rounded-[1rem] border-2 border-yellow-400/30 shadow-md" alt="" />
          </div>
        </header>

        {/* DASHBOARD */}
        {activeTab === 'inicio' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 animate-in fade-in slide-in-from-bottom-6 duration-500">
             <StatCard title="VALOR BRUTO (MÊS)" value={equipeProcessada.reduce((a,m)=>a+m.bruto,0)} icon={<TrendingUp size={32}/>} type="money" />
             <StatCard title="VALOR LÍQUIDO (CAIXA)" value={equipeProcessada.reduce((a,m)=>a+m.liq,0)} icon={<Zap size={32}/>} type="money" highlight />
             <StatCard title="MEMBROS ATIVOS" value={equipe.length} icon={<Users size={32}/>} />
          </div>
        )}

        {/* RANKING */}
        {activeTab === 'ranking' && (
          <div className="bg-[#0a0a0a] border border-white/5 rounded-[2rem] overflow-hidden shadow-xl animate-in fade-in duration-500">
             <table className="w-full text-left font-black uppercase">
               <thead className="bg-yellow-400 text-black text-[11px] tracking-[0.2em]">
                 <tr><th className="px-8 py-5">RANK</th><th className="px-8 py-5 text-center">AGENTE</th><th className="px-8 py-5 text-right">PRODUÇÃO (MÊS)</th></tr>
               </thead>
               <tbody className="divide-y divide-white/5">
                 {equipeProcessada.map((m, i) => (
                   <tr key={m.discordId} className="hover:bg-white/[0.02] transition-all group">
                     <td className="px-8 py-6 italic text-3xl text-zinc-700 group-hover:text-yellow-400/30 transition-colors w-24">{i + 1}º</td>
                     <td className="px-8 py-6 flex items-center justify-center gap-4 text-lg text-white italic tracking-tight"><img src={m.avatar || `https://ui-avatars.com/api/?name=${m.nome}&background=EAB308&color=000&bold=true`} className="w-10 h-10 rounded-xl" alt=""/> {m.nome}</td>
                     <td className="px-8 py-6 text-right text-yellow-400 text-2xl font-mono italic">R$ {formatMoney(m.bruto)}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>
        )}

        {/* EFETIVO */}
        {activeTab === 'equipe' && (
          <div className="animate-in fade-in duration-500">
             <div className="flex gap-3 mb-8 overflow-x-auto pb-4 no-scrollbar">
                {['Todos', ...HIERARQUIA].map(c => (
                  <button key={c} onClick={() => setSelectedCargo(c)} className={`px-6 py-3 rounded-full text-[11px] font-black uppercase transition-all whitespace-nowrap tracking-widest ${selectedCargo === c ? 'bg-yellow-400 text-black shadow-[0_0_15px_rgba(250,204,21,0.3)]' : 'bg-[#0a0a0a] text-zinc-500 border border-white/5 hover:text-white hover:bg-white/5'}`}>{c}</button>
                ))}
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {equipeFiltrada.map(m => (
                  <div key={m.discordId} onClick={() => setMembroSelecionado(m)} className="bg-[#0a0a0a] p-8 rounded-[2rem] border border-white/5 hover:border-yellow-400/40 cursor-pointer shadow-lg group transition-all hover:-translate-y-1">
                    <div className="flex items-center gap-5 mb-6">
                        <img src={m.avatar || `https://ui-avatars.com/api/?name=${m.nome}&background=EAB308&color=000&bold=true`} className="w-16 h-16 rounded-[1.2rem] border-2 border-zinc-800 group-hover:border-yellow-400 transition-colors shadow-md" alt="" />
                        <div className="flex-1 min-w-0">
                            <h4 className="font-black uppercase text-white text-xl truncate tracking-tight">{m.nome}</h4>
                            <p className="text-[9px] text-yellow-400 font-bold mt-1 italic tracking-[0.2em] opacity-90 truncate">{m.cargoReal}</p>
                        </div>
                    </div>
                    
                    <div className="pt-6 border-t border-white/5 space-y-3 text-[10px] font-black uppercase tracking-widest">
                       <div className="flex justify-between text-zinc-500"><span>BRUTO:</span><span className="text-white font-mono text-sm">R$ {formatMoney(m.bruto)}</span></div>
                       <div className="flex justify-between text-green-500/80"><span>LÍQUIDO:</span><span className="text-green-400 font-mono text-sm">R$ {formatMoney(m.liq)}</span></div>
                       <div className="flex justify-between text-yellow-400 bg-yellow-400/5 px-3 py-3 rounded-xl mt-4 border border-yellow-400/10 items-center"><span>SALDO:</span><span className="font-mono text-base">R$ {formatMoney(m.saldoReal)}</span></div>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {/* MURAL */}
        {activeTab === 'gestao' && (
           <div className="bg-[#0a0a0a] border border-white/5 rounded-[2rem] overflow-hidden shadow-xl animate-in fade-in duration-500">
              <div className="overflow-x-auto">
                 <table className="w-full text-left font-black uppercase text-[11px] tracking-widest whitespace-nowrap min-w-max">
                   <thead className="bg-white/5 text-zinc-500 border-b border-white/5">
                     <tr><th className="px-8 py-5">MEMBRO</th><th className="px-8 py-5">TIPO</th><th className="px-8 py-5">CLIENTE / ITEM</th><th className="px-8 py-5 text-right">VALOR</th><th className="px-8 py-5 text-right">DATA</th></tr>
                   </thead>
                   <tbody className="divide-y divide-white/5">
                     {muralMes.map((r: any) => (
                       <tr key={r.id} className="hover:bg-white/[0.02] transition-colors group">
                         <td className="px-8 py-5 text-white text-xs italic group-hover:text-yellow-400 transition-colors">{r.nome}</td>
                         <td className="px-8 py-5">
                            <span className={`px-3 py-1.5 rounded-lg text-[9px] border ${r.tipo === 'SAQUE' ? 'text-red-500 border-red-500/20 bg-red-500/5' : r.tipo === 'CORRIDINHA' ? 'text-blue-400 border-blue-400/20 bg-blue-400/5' : 'text-yellow-400 border-yellow-400/20 bg-yellow-400/5'}`}>
                                {r.tipo || 'VENDA'}
                            </span>
                         </td>
                         <td className="px-8 py-5 text-zinc-400 italic text-xs max-w-[250px] truncate">{r.cliente || r.item || '-'}</td>
                         <td className={`px-8 py-5 font-mono text-sm text-right whitespace-nowrap ${r.tipo === 'SAQUE' ? 'text-red-500' : 'text-green-500'}`}>{r.tipo === 'SAQUE' ? '-' : '+'} R$ {formatMoney(r.valor || r.cashbackExtra)}</td>
                         <td className="px-8 py-5 text-zinc-600 text-[10px] text-right">{new Date(r.criado_em).toLocaleDateString('pt-BR')}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
              </div>
           </div>
        )}

        {/* POSTAR */}
        {activeTab === 'registrar' && (
          <div className="max-w-3xl mx-auto animate-in zoom-in-95 duration-300">
             <div className="flex gap-2 p-1.5 bg-[#0a0a0a] rounded-[1.5rem] mb-8 border border-white/5 shadow-lg">
                {[{id:'VENDA', label:'VENDA', icon:<ShoppingCart size={16}/>}, {id:'CORRIDINHA', label:'BÔNUS', icon:<Zap size={16}/>}, {id:'SAQUE', label:'PAGAMENTO', icon:<Banknote size={16}/>}].map(t => (
                  <button key={t.id} onClick={() => setForm({...form, tipo: t.id})} className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl text-[11px] font-black tracking-[0.2em] transition-all ${form.tipo === t.id ? 'bg-yellow-400 text-black shadow-md' : 'text-zinc-600 hover:text-white'}`}>{t.icon}{t.label}</button>
                ))}
             </div>
             <form onSubmit={handleEnviar} className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] p-10 shadow-2xl space-y-6">
                <div className="space-y-3">
                  <label className="text-[11px] uppercase text-yellow-400 font-black tracking-widest ml-3">AGENTE RESPONSÁVEL</label>
                  <select value={form.vendedorId || form.recrutadoId || form.membroSaqueId} onChange={e => setForm({...form, vendedorId: e.target.value, recrutadoId: e.target.value, membroSaqueId: e.target.value})} className="w-full bg-black border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-yellow-400 font-black uppercase text-sm appearance-none cursor-pointer shadow-inner" required>
                    <option value="">Selecione na equipe...</option>
                    {equipeProcessada.map(m => <option key={m.discordId} value={m.discordId}>{m.nome} ({m.cargoReal})</option>)}
                  </select>
                </div>
                
                {form.tipo === 'VENDA' && (
                  <div className="space-y-6 animate-in fade-in duration-500">
                    <InputField label="CLIENTE (NOME / ID)" value={form.cliente} onChange={(v:any)=>setForm({...form, cliente: v})} placeholder="Ex: Lucas | 4116" />
                    <InputField label="ITEM COMPRADO" value={form.item} onChange={(v:any)=>setForm({...form, item: v})} placeholder="Ex: Farm de Dinheiro" />
                    <div className="grid grid-cols-2 gap-5">
                      <InputField label="VALOR TOTAL (R$)" type="number" value={form.valor} onChange={(v:any)=>setForm({...form, valor: v})} placeholder="0,00" />
                      <InputField label="VALOR RECEBIDO (R$)" type="number" value={form.valorRecebido} onChange={(v:any)=>setForm({...form, valorRecebido: v})} placeholder="0,00" />
                    </div>
                    <InputField label="DATA VENCIMENTO (OPCIONAL)" type="date" value={form.dataVencimento} onChange={(v:any)=>setForm({...form, dataVencimento: v})} required={false} />
                  </div>
                )}

                {form.tipo === 'CORRIDINHA' && <div className="animate-in slide-in-from-top-4 duration-300"><InputField label="VALOR DO BÔNUS (R$)" type="number" value={form.valor} onChange={(v:any)=>setForm({...form, valor: v})} placeholder="Ex: 50,00" /></div>}
                {form.tipo === 'SAQUE' && <div className="animate-in slide-in-from-top-4 duration-300"><InputField label="DINHEIRO TRANSFERIDO (R$)" type="number" value={form.valor} onChange={(v:any)=>setForm({...form, valor: v})} placeholder="Valor pago no Pix" /></div>}

                <button disabled={loading} className="w-full bg-yellow-400 text-black font-black py-5 rounded-2xl uppercase tracking-[0.3em] text-sm shadow-lg mt-8 hover:bg-yellow-300 transition-all active:scale-95">
                  {loading ? 'PROCESSANDO...' : 'ENVIAR REGISTRO'}
                </button>
             </form>
          </div>
        )}

        {/* PENDENCIAS */}
        {activeTab === 'pendencias' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
             {pendencias.length === 0 && <div className="col-span-full py-32 text-center"><p className="text-zinc-700 font-black uppercase text-lg tracking-[0.4em] italic">Nenhuma cobrança ativa</p></div>}
             {pendencias.map(r => (
               <div key={r.id} className="bg-[#0a0a0a] p-8 rounded-[2rem] border border-red-500/20 shadow-lg flex flex-col justify-between group relative overflow-hidden transition-all hover:border-red-500/40 hover:-translate-y-1">
                  <div className="absolute -top-4 -right-4 p-6 text-red-500/5 group-hover:text-red-500/10 transition-colors"><AlertCircle size={80}/></div>
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-6 border-b border-white/5 pb-6">
                       <h4 className="text-2xl text-white italic font-black uppercase truncate pr-4 tracking-tighter">{r.cliente}</h4>
                       <span className="bg-red-500 text-white text-[10px] px-3 py-1.5 rounded-lg font-black tracking-widest shadow-md whitespace-nowrap flex-shrink-0 ml-2">FALTA R$ {formatMoney(Number(r.valor) - Number(r.valorRecebido))}</span>
                    </div>
                    <div className="space-y-2 mb-8 text-[11px] font-black uppercase text-zinc-500 tracking-widest">
                       <p>AGENTE: <span className="text-zinc-100 ml-2">{r.nome}</span></p>
                       <p>PRODUTO: <span className="text-zinc-100 ml-2 truncate inline-block max-w-[150px] align-bottom">{r.item}</span></p>
                       <p className="mt-4 pt-2">VENCIMENTO: <span className="text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded-md border border-yellow-400/20">{r.dataVencimento?.split('-').reverse().join('/') || 'A COMBINAR'}</span></p>
                    </div>
                  </div>
                  <button onClick={() => setModalParcela(r)} className="w-full bg-green-500 text-black font-black py-4 rounded-xl uppercase text-[11px] tracking-widest hover:bg-green-400 shadow-md relative z-10 transition-all active:scale-95">RECEBER PAGAMENTO</button>
               </div>
             ))}
          </div>
        )}

        {/* APROVACOES */}
        {activeTab === 'admin' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
             {aguardando.length === 0 && <div className="col-span-full py-32 text-center"><p className="text-zinc-700 font-black uppercase text-lg tracking-[0.4em] italic">Fila limpa</p></div>}
             {aguardando.map(r => (
               <div key={r.id} className="bg-[#0a0a0a] p-8 rounded-[2rem] border border-yellow-400/20 shadow-lg flex flex-col justify-between">
                  <div>
                     <h4 className="text-2xl text-white italic font-black uppercase mb-2 truncate tracking-tighter">{r.nome}</h4>
                     <p className="text-yellow-400 text-[10px] font-black uppercase mb-6 tracking-[0.2em] bg-yellow-400/10 inline-block px-3 py-1.5 rounded-lg">{r.tipo} • R$ {formatMoney(r.valor || r.cashbackExtra)}</p>
                     <div className="space-y-1.5 mb-8 text-[10px] font-black uppercase text-zinc-500">
                        <p>CLIENTE: <span className="text-zinc-300 truncate inline-block max-w-[150px] align-bottom">{r.cliente}</span></p>
                        <p>ITEM: <span className="text-zinc-300 truncate inline-block max-w-[150px] align-bottom">{r.item}</span></p>
                     </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => decidir(r.id, 'APROVAR')} className="flex-1 bg-yellow-400 text-black font-black py-3.5 rounded-xl uppercase text-[10px] hover:bg-yellow-300 shadow-md transition-all">APROVAR</button>
                    <button onClick={() => decidir(r.id, 'REPROVAR')} className="px-5 py-3.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl hover:bg-red-500 hover:text-white transition-all"><X size={18}/></button>
                  </div>
               </div>
             ))}
          </div>
        )}

        {/* ADMIN ZONE */}
        {activeTab === 'admin_zone' && (
           <div className="space-y-10 animate-in fade-in duration-500">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-red-500/5 border border-red-500/20 p-10 rounded-[2.5rem] shadow-lg relative overflow-hidden group">
                   <div className="absolute top-0 right-0 p-8 text-red-500/5"><Archive size={80}/></div>
                   <h3 className="text-3xl font-black italic text-white mb-4 tracking-tighter">VIRADA DE MÊS</h3>
                   <p className="text-zinc-500 mb-8 text-xs font-bold uppercase tracking-widest leading-relaxed">Arquiva as vendas e zera contadores. USE APENAS NO DIA 1º.</p>
                   <button onClick={virarMes} disabled={loading} className="w-full bg-red-600 text-white font-black py-4 rounded-xl uppercase text-xs shadow-md hover:bg-red-500 transition-all active:scale-95">EXECUTAR VIRADA</button>
                </div>

                <div className="bg-purple-500/5 border border-purple-500/20 p-10 rounded-[2.5rem] shadow-lg relative overflow-hidden group">
                   <div className="absolute top-0 right-0 p-8 text-purple-500/5"><Database size={80}/></div>
                   <h3 className="text-3xl font-black italic text-white mb-4 tracking-tighter">RESTAURAR SISTEMA</h3>
                   <p className="text-zinc-500 mb-8 text-xs font-bold uppercase tracking-widest leading-relaxed">Desfaz erro da virada precoce. Volta as vendas para o Painel.</p>
                   <button onClick={forcarAuditoria} disabled={loading} className="w-full bg-purple-600 text-white font-black py-4 rounded-xl uppercase text-xs shadow-md hover:bg-purple-500 transition-all active:scale-95">RESTAURAR VENDAS</button>
                </div>
             </div>
             
             <div className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-xl">
                 <div className="p-6 px-8 border-b border-white/5 flex justify-between items-center">
                    <h4 className="font-black italic text-zinc-500 uppercase tracking-[0.3em] text-[11px]">LOGS DE DADOS</h4>
                 </div>
                 <table className="w-full text-left font-black uppercase text-[11px] tracking-widest whitespace-nowrap min-w-max">
                   <thead className="bg-white/5 text-zinc-600 border-b border-white/5">
                     <tr><th className="px-8 py-5">MEMBRO</th><th className="px-8 py-5">TIPO</th><th className="px-8 py-5 text-right">AÇÃO</th></tr>
                   </thead>
                   <tbody className="divide-y divide-white/5">
                     {registros.filter(r => r.status === 'APROVADO').slice(0, 50).map((r: any) => (
                       <tr key={r.id} className="hover:bg-white/[0.01] transition-colors">
                         <td className="px-8 py-5 text-white text-xs">{r.nome}</td>
                         <td className="px-8 py-5">
                            <span className="text-zinc-500 border border-white/5 px-3 py-1.5 rounded-lg text-[9px]">{r.tipo} • R$ {formatMoney(r.valor || r.cashbackExtra)}</span>
                         </td>
                         <td className="px-8 py-5 text-right">
                            <button onClick={() => deletarLog(r.id)} className="text-red-500/40 hover:text-red-500 p-2.5 bg-red-500/5 rounded-lg transition-all"><Trash2 size={16}/></button>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
             </div>
           </div>
        )}

        {/* HISTORICO BACKUP */}
        {activeTab === 'historico_backup' && (
          <div className="space-y-8 animate-in fade-in duration-500">
             <div className="flex flex-col md:flex-row md:items-center gap-6 bg-[#0a0a0a] p-8 rounded-[2.5rem] border border-white/5 shadow-lg">
                 <div className="flex-1">
                    <p className="text-[11px] font-black uppercase text-zinc-500 mb-3 tracking-[0.3em] italic">PERÍODO</p>
                    <select value={mesBackup} onChange={(e) => setMesBackup(e.target.value)} className="w-full bg-black border border-white/10 text-yellow-400 p-4 rounded-xl outline-none font-black uppercase text-sm cursor-pointer shadow-inner appearance-none">
                        <option value="">Selecione...</option>
                        {mesesDisponiveis.map(m => <option key={m} value={m}>{formatMes(m)}</option>)}
                    </select>
                 </div>
                 <div className="flex-1 flex gap-5">
                    <div className="flex-1 bg-black p-6 rounded-[1.5rem] border border-white/5 shadow-inner">
                        <p className="text-[10px] text-zinc-600 font-black mb-2 uppercase tracking-widest italic">BRUTO</p>
                        <p className="text-2xl font-mono text-white italic font-black">R$ {formatMoney(backupBruto)}</p>
                    </div>
                    <div className="flex-1 bg-black p-6 rounded-[1.5rem] border border-green-500/10 shadow-inner">
                        <p className="text-[10px] text-green-500/70 font-black mb-2 uppercase tracking-widest italic">CAIXA</p>
                        <p className="text-2xl font-mono text-green-400 italic font-black">R$ {formatMoney(backupLiquido)}</p>
                    </div>
                 </div>
             </div>
             
             <div className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-lg">
                 <table className="w-full text-left font-black uppercase text-[11px] tracking-widest whitespace-nowrap min-w-max">
                   <thead className="bg-white/5 text-zinc-600 border-b border-white/5">
                     <tr><th className="px-8 py-5">AGENTE</th><th className="px-8 py-5">TIPO</th><th className="px-8 py-5">VALOR</th><th className="px-8 py-5 text-right">DIA</th></tr>
                   </thead>
                   <tbody className="divide-y divide-white/5">
                     {registrosDoMesBackup.map((r: any) => (
                       <tr key={r.id} className="hover:bg-white/[0.02] transition-colors group">
                         <td className="px-8 py-5 text-white text-xs italic group-hover:text-yellow-400 transition-colors">{r.nome}</td>
                         <td className="px-8 py-5 text-zinc-500 text-[10px] italic">{r.tipo}</td>
                         <td className={`px-8 py-5 font-mono text-sm ${r.tipo === 'SAQUE' ? 'text-red-500' : 'text-green-500'}`}>{r.tipo === 'SAQUE' ? '-' : '+'} R$ {formatMoney(r.valor || r.cashbackExtra)}</td>
                         <td className="px-8 py-5 text-zinc-600 text-[10px] font-mono text-right">{new Date(r.criado_em).toLocaleDateString('pt-BR')}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
             </div>
          </div>
        )}
      </main>

      {/* --- MODAL DETALHADO DO MEMBRO --- */}
      {membroSelecionado && modalMember && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-6 sm:p-10 animate-in fade-in backdrop-blur-sm duration-300">
           <div className="bg-[#050505] border border-white/10 w-full max-w-5xl rounded-[3rem] flex flex-col max-h-[90vh] overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.8)]">
              
              <div className="p-10 lg:p-12 border-b border-white/5 flex justify-between items-start bg-gradient-to-br from-yellow-400/[0.03] to-transparent relative">
                 <button onClick={() => setMembroSelecionado(null)} className="absolute top-8 right-8 text-zinc-600 hover:text-yellow-400 bg-black p-3.5 rounded-full border border-white/5 transition-all hover:scale-110 active:scale-90"><X size={24}/></button>
                 <div className="flex items-center gap-8 w-full pr-20">
                    <img src={modalMember.avatar || `https://ui-avatars.com/api/?name=${modalMember.nome}&background=EAB308&color=000&bold=true`} className="w-28 h-28 lg:w-32 lg:h-32 rounded-[2rem] border-2 border-yellow-400 shadow-[0_0_40px_rgba(250,204,21,0.2)]" alt="" />
                    <div className="flex-1 min-w-0">
                       <h2 className="text-4xl lg:text-5xl font-black uppercase italic tracking-tighter text-white leading-none truncate mb-4">{modalMember.nome}</h2>
                       <p className="text-yellow-400 font-black uppercase tracking-[0.3em] text-[10px] bg-yellow-400/10 inline-block px-5 py-2 rounded-xl border border-yellow-400/20">{modalMember.cargoReal}</p>
                    </div>
                 </div>
              </div>
              
              <div className="p-10 lg:p-12 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-2 gap-12">
                 <div className="space-y-5">
                    <div className="bg-gradient-to-br from-green-500/10 to-transparent border border-green-500/20 p-10 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
                       <div className="absolute top-0 right-0 p-8 text-green-500/10 group-hover:scale-110 transition-transform duration-500"><Banknote size={100}/></div>
                       <p className="text-[11px] text-green-500 font-black uppercase mb-3 tracking-[0.3em] italic relative z-10">SALDO A RECEBER</p>
                       <p className="text-5xl lg:text-6xl font-mono italic text-green-400 font-black relative z-10 tracking-tighter whitespace-nowrap truncate">R$ {formatMoney(modalMember.saldoReal)}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-5">
                       <div className="bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20 p-6 rounded-[2rem] shadow-lg relative overflow-hidden group hover:border-blue-500/40 transition-all">
                          <div className="absolute top-4 right-4 text-blue-500/20 group-hover:scale-110 transition-transform"><Zap size={24}/></div>
                          <p className="text-[10px] font-black text-blue-400 mb-2 uppercase tracking-[0.2em] italic relative z-10">BÔNUS EXTRAS</p>
                          <p className="text-xl lg:text-2xl font-mono text-blue-300 italic font-black relative z-10 whitespace-nowrap truncate">+R$ {formatMoney(modalMember.corridinhas)}</p>
                       </div>
                       
                       <div className="bg-gradient-to-br from-red-500/10 to-transparent border border-red-500/20 p-6 rounded-[2rem] shadow-lg relative overflow-hidden group hover:border-red-500/40 transition-all">
                          <div className="absolute top-4 right-4 text-red-500/20 group-hover:scale-110 transition-transform"><Banknote size={24}/></div>
                          <p className="text-[10px] font-black text-red-400 mb-2 uppercase tracking-[0.2em] italic relative z-10">VALOR PAGO</p>
                          <p className="text-xl lg:text-2xl font-mono text-red-300 italic font-black relative z-10 whitespace-nowrap truncate">-R$ {formatMoney(modalMember.pago)}</p>
                       </div>
                       
                       <div className="bg-gradient-to-br from-white/[0.03] to-transparent border border-white/10 p-6 rounded-[2rem] shadow-lg relative overflow-hidden group hover:border-white/20 transition-all">
                          <div className="absolute top-4 right-4 text-white/5 group-hover:scale-110 transition-transform"><TrendingUp size={24}/></div>
                          <p className="text-[10px] text-zinc-500 font-black uppercase mb-2 tracking-[0.2em] italic relative z-10">BRUTO (MÊS)</p>
                          <p className="text-xl lg:text-2xl font-mono text-white italic font-black relative z-10 tracking-tight whitespace-nowrap truncate">R$ {formatMoney(modalMember.bruto)}</p>
                       </div>
                       
                       <div className="bg-gradient-to-br from-white/[0.03] to-transparent border border-white/10 p-6 rounded-[2rem] shadow-lg relative overflow-hidden group hover:border-white/20 transition-all">
                          <div className="absolute top-4 right-4 text-white/5 group-hover:scale-110 transition-transform"><Database size={24}/></div>
                          <p className="text-[10px] text-zinc-500 font-black uppercase mb-2 tracking-[0.2em] italic relative z-10">CAIXA (MÊS)</p>
                          <p className="text-xl lg:text-2xl font-mono text-white italic font-black relative z-10 tracking-tight whitespace-nowrap truncate">R$ {formatMoney(modalMember.liq)}</p>
                       </div>
                    </div>
                 </div>

                 <div className="space-y-6">
                    <h3 className="text-xl font-black uppercase italic text-zinc-600 flex items-center gap-4 mb-8 tracking-[0.2em]"><History size={22} className="text-yellow-400"/> EXTRATO RECENTE</h3>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin' }}>
                        {registros.filter(r => String(r.discordId) === String(modalMember.discordId) && (r.status === 'APROVADO' || r.status === 'ARQUIVADO') && r.criado_em.startsWith(mesAtualStr)).map((r: any) => (
                          <div key={r.id} className="flex items-center bg-[#0a0a0a] p-6 rounded-[1.5rem] border border-white/5 hover:border-white/10 transition-all gap-4">
                             <div className="min-w-0 flex-1">
                                <p className={`font-black text-sm uppercase italic mb-1 truncate max-w-[200px] lg:max-w-xs ${r.tipo === 'CORRIDINHA' ? 'text-blue-400' : r.tipo === 'SAQUE' ? 'text-red-400' : 'text-white'}`} title={r.item || r.tipo}>{r.item || r.tipo}</p>
                                <p className="text-[10px] text-zinc-600 tracking-widest uppercase mt-1 italic truncate">{new Date(r.criado_em).toLocaleDateString('pt-BR')} • {r.cliente || 'SISTEMA'}</p>
                             </div>
                             <div className="flex-shrink-0 text-right">
                                <p className={`font-mono text-lg font-black italic whitespace-nowrap ${r.tipo === 'SAQUE' ? 'text-red-500' : 'text-green-500'}`}>{r.tipo === 'SAQUE' ? '-' : '+'} R$ {formatMoney(r.valor || r.cashbackExtra)}</p>
                             </div>
                          </div>
                        ))}
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* MODAL RECEBER PARCELA */}
      {modalParcela && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 p-6 animate-in zoom-in-95 duration-300">
           <div className="bg-[#0a0a0a] border border-zinc-800 p-12 rounded-[3rem] w-full max-w-xl shadow-2xl relative">
              <button onClick={() => setModalParcela(null)} className="absolute top-8 right-8 text-zinc-600 hover:text-red-500 bg-black p-3 rounded-full border border-white/5 transition-all"><X size={24}/></button>
              <h3 className="text-3xl font-black italic text-white uppercase tracking-tighter mb-10 text-center underline decoration-yellow-400 underline-offset-8">RECEBER PAGAMENTO</h3>
              <form onSubmit={handlePagarParcela} className="space-y-8">
                 <div className="bg-black border border-white/5 p-8 rounded-[2rem] text-center mb-4 shadow-inner">
                    <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.3em] mb-2 italic">DEVEDOR</p>
                    <p className="text-2xl font-black text-white italic truncate tracking-tight">{modalParcela.cliente}</p>
                 </div>
                 
                 <InputField label={`RECEBIDO AGORA (FALTA R$ ${formatMoney(Number(modalParcela.valor) - Number(modalParcela.valorRecebido))})`} type="number" value={valorParcela} onChange={setValorParcela} placeholder="R$ 0,00" />
                 
                 {parseFloat(valorParcela || '0') < (Number(modalParcela.valor) - Number(modalParcela.valorRecebido)) && valorParcela !== '' && (
                    <div className="p-6 bg-red-500/5 border border-red-500/20 rounded-[1.5rem] animate-in fade-in duration-300">
                       <InputField label="NOVO VENCIMENTO" type="date" value={proximoVencimento} onChange={setProximoVencimento} />
                    </div>
                 )}
                 
                 <button disabled={loading} className="w-full bg-green-500 text-black font-black py-6 rounded-[1.5rem] uppercase tracking-[0.3em] text-xs hover:bg-green-400 shadow-xl transition-all active:scale-95 mt-4">
                    {loading ? 'SINCRONIZANDO...' : 'CONFIRMAR RECEBIMENTO'}
                 </button>
              </form>
           </div>
        </div>
      )}

    </div>
  );
}

function StatCard({ title, value, icon, type = "number", highlight = false }: any) {
  const displayValue = type === 'money' ? `R$ ${formatMoney(value)}` : value;
  return (
    <div className={`p-8 lg:p-10 rounded-[2rem] lg:rounded-[2.5rem] relative overflow-hidden transition-all shadow-xl border ${highlight ? 'bg-gradient-to-br from-[#1a1400] to-[#0a0a0a] border-yellow-500/30' : 'bg-[#0a0a0a] border-white/5 hover:border-white/10'}`}>
       <div className="relative z-10">
          <p className={`text-[10px] font-black uppercase tracking-[0.3em] mb-4 italic ${highlight ? 'text-yellow-500' : 'text-zinc-600'}`}>{title}</p>
          <h3 className={`text-4xl lg:text-5xl font-black italic tracking-tighter ${highlight ? 'text-yellow-500' : 'text-white'}`}>{displayValue}</h3>
       </div>
       <div className={`absolute top-8 right-8 transition-all ${highlight ? 'text-yellow-500/10' : 'text-white/5'}`}>{icon}</div>
    </div>
  );
}

function NavItem({ icon, label, active, onClick, color = "text-zinc-600" }: any) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-4 px-5 py-4 rounded-[1.2rem] transition-all duration-300 ${active ? 'bg-yellow-400 text-black shadow-[0_10px_20px_rgba(250,204,21,0.2)]' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}>
      <span className={active ? 'text-black' : color}>{icon}</span>
      <span className="font-black tracking-[0.2em] text-[10px] uppercase">{label}</span>
    </button>
  );
}

function InputField({ label, value, onChange, placeholder, type = "text", required = true }: any) {
  return (
    <div className="space-y-3">
      <label className="text-[10px] font-black text-zinc-500 uppercase ml-4 tracking-[0.2em] italic">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} className="w-full bg-black border border-white/10 p-5 rounded-2xl text-white outline-none focus:border-yellow-400 font-black text-sm transition-all placeholder:text-zinc-800 shadow-inner" placeholder={placeholder} required={required} />
    </div>
  );
}