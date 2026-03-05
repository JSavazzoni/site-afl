"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { 
  LayoutDashboard, Trophy, PlusCircle, ShieldCheck, TrendingUp, Users, 
  LogOut, UsersRound, X, History, CheckCircle2, Database, Clock, 
  ShoppingCart, UserPlus, Zap, Banknote, AlertCircle, Trash2, ShieldAlert, Archive
} from 'lucide-react';
import { signOut } from "next-auth/react";

// --- CONFIGURAÇÕES ---
const HIERARQUIA = ["Resp.Vendas", "Master AFL", "Resp.AFL", "Auxiliar AFL", "Lider AFL", "Sub-Lider AFL", "Membro AFL"];
const formatMoney = (val: any) => Number(val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatMes = (yyyyMM: string) => {
  if (!yyyyMM) return '';
  const [y, m] = yyyyMM.split('-');
  const mesesNome = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  return `${mesesNome[parseInt(m) - 1]} ${y}`;
};

export default function Painel({ initialIsAdmin, userSession }: any) {
  // --- ESTADOS ---
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
    tipo: 'VENDA', vendedorId: '', cliente: '', cpfEmail: '', item: '', 
    valor: '', valorRecebido: '', pagamento: '', idDiscordAvancado: '', 
    recrutadoId: '', quantidade: '1', membroSaqueId: '', dataVencimento: '' 
  });

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };
  
  const dataAtual = new Date();
  const mesAtualStr = `${dataAtual.getFullYear()}-${String(dataAtual.getMonth() + 1).padStart(2, '0')}`;

  const getCashback = (cargo: string) => { 
    const r: any = { 'Resp.Vendas': 0.15, 'Master AFL': 0.12, 'Resp.AFL': 0.10, 'Auxiliar AFL': 0.09, 'Lider AFL': 0.08, 'Sub-Lider AFL': 0.07, 'Membro AFL': 0.06 };
    return r[cargo || 'Membro AFL'] || 0.06;
  };

  // --- MATEMÁTICA FINANCEIRA ---
  const calcAReceber = (m: any) => {
    const perc = getCashback(m.cargo);
    const recebido = Number(m.valorRecebido) || 0;
    const extra = Number(m.cashbackExtra) || 0;
    const pago = Number(m.cashbackPago) || 0;
    return (recebido * perc) + extra - pago;
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
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { pulse(); const timer = setInterval(pulse, 5000); return () => clearInterval(timer); }, [pulse]);

  useEffect(() => {
    if (registros.length > 0 && !mesBackup) {
      const d = new Date(registros[0].criado_em);
      setMesBackup(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
  }, [registros, mesBackup]);

  // --- PROCESSAMENTO DE DADOS (FILTROS) ---
  const equipeProcessada = equipe.map(m => {
    const regsMes = registros.filter(r => 
        String(r.discordId) === String(m.discordId) && 
        (r.status === 'APROVADO' || r.status === 'ARQUIVADO') && 
        r.criado_em.startsWith(mesAtualStr)
    );

    const bruto = regsMes
        .filter(r => (r.tipo === 'VENDA' || !r.tipo) && !(r.item || '').toUpperCase().includes('DÍVIDA ANTIGA'))
        .reduce((a, r) => a + (Number(r.valor) || 0), 0);

    const liq = regsMes
        .filter(r => (r.tipo === 'VENDA' || !r.tipo))
        .reduce((a, r) => a + (Number(r.valorRecebido) || 0), 0);

    const corridinhas = regsMes
        .filter(r => r.tipo === 'CORRIDINHA' && !(r.item || '').toUpperCase().includes('SALDO RETIDO'))
        .reduce((a, r) => a + (Number(r.cashbackExtra) || 0), 0);

    const pago = regsMes
        .filter(r => r.tipo === 'SAQUE' && !(r.item || '').toUpperCase().includes('DÍVIDA RETIDA'))
        .reduce((a, r) => a + (Number(r.valor) || 0), 0);

    return { ...m, bruto, liq, corridinhas, pago };
  }).sort((a, b) => b.bruto - a.bruto);

  const equipeFiltrada = selectedCargo === 'Todos' ? equipeProcessada : equipeProcessada.filter(m => m.cargo === selectedCargo);
  
  // AQUI ESTÁ A CORREÇÃO: Busca pendências em APROVADOS e ARQUIVADOS
  const pendencias = registros.filter(r => 
    (r.status === 'APROVADO' || r.status === 'ARQUIVADO') && 
    (r.tipo === 'VENDA' || !r.tipo) && 
    Number(r.valorRecebido) < Number(r.valor)
  );

  const aguardando = registros.filter(r => r.status === 'PENDENTE');
  
  const muralMes = registros.filter(r => 
    (r.status === 'APROVADO' || r.status === 'ARQUIVADO') && 
    r.criado_em.startsWith(mesAtualStr) &&
    !(r.item || '').toUpperCase().includes('SALDO RETIDO') &&
    !(r.item || '').toUpperCase().includes('DÍVIDA RETIDA')
  ).sort((a,b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime());

  // Backup
  const mesesDisponiveis = Array.from(new Set(registros.map(r => r.criado_em?.substring(0, 7)))).filter(Boolean).sort().reverse();
  const registrosDoMesBackup = registros.filter(r => r.criado_em?.startsWith(mesBackup));
  const backupBruto = registrosDoMesBackup.filter(r => r.tipo === 'VENDA' || !r.tipo).reduce((a,r)=>a+Number(r.valor), 0);
  const backupLiquido = registrosDoMesBackup.filter(r => r.tipo === 'VENDA' || !r.tipo).reduce((a,r)=>a+Number(r.valorRecebido), 0);

  // --- FUNÇÕES DE AÇÃO ---
  const handleEnviar = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    const valLimpo = parseFloat(form.valor.replace(',', '.')) || 0;
    const recLimpo = form.valorRecebido ? parseFloat(form.valorRecebido.replace(',', '.')) : valLimpo;
    const m = equipe.find((m: any) => String(m.discordId) === String(form.vendedorId || form.membroSaqueId));

    const payload = { 
      ...form, 
      valorNumerico: form.tipo === 'CORRIDINHA' ? 0 : valLimpo,
      recebidoNumerico: form.tipo === 'CORRIDINHA' ? 0 : recLimpo,
      cashbackExtra: form.tipo === 'CORRIDINHA' ? valLimpo : 0,
      vendedorNome: m?.nome 
    };

    const res = await fetch('/api/registros', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (res.ok) {
      setForm({ tipo: 'VENDA', vendedorId: '', cliente: '', cpfEmail: '', item: '', valor: '', valorRecebido: '', pagamento: '', idDiscordAvancado: '', recrutadoId: '', quantidade: '1', membroSaqueId: '', dataVencimento: '' });
      showToast("REGISTRO ENVIADO COM SUCESSO!");
      pulse();
    }
    setLoading(false);
  };

  const decidir = async (id: string, acao: 'APROVAR' | 'REPROVAR') => {
    const res = await fetch('/api/registros/analise', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ registroId: id, acao }) });
    if (res.ok) { showToast(acao === 'APROVAR' ? "APROVADO!" : "REPROVADO!"); pulse(); }
  };

  const deletarLog = async (id: string) => {
    if (!confirm("Deletar registro permanente?")) return;
    await fetch('/api/admin/logs', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    pulse();
  };

  const virarMes = async () => {
    if (!confirm("Arquivar mês atual e zerar produções?")) return;
    setLoading(true);
    await fetch('/api/admin/virada', { method: 'POST' });
    showToast("MÊS VIRADO COM SUCESSO!");
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
      
      {toast && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-10">
          <div className="bg-yellow-400 text-black px-8 py-4 rounded-2xl font-black shadow-2xl flex items-center gap-3 text-[10px] uppercase tracking-widest border-4 border-black/10 italic">
            <CheckCircle2 size={18} /> {toast}
          </div>
        </div>
      )}

      {/* SIDEBAR */}
      <aside className="w-64 border-r border-white/5 bg-[#0a0a0a] p-6 flex flex-col z-50">
        <div className="flex items-center gap-3 mb-10 font-black italic text-2xl uppercase tracking-tighter">
          <div className="p-2 bg-yellow-400 rounded-xl text-black shadow-[0_0_20px_#facc15]"><UsersRound size={24}/></div>
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
              <button onClick={() => setActiveTab('pendencias')} className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl transition-all ${activeTab === 'pendencias' ? 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/20' : 'text-zinc-500 hover:text-white'}`}>
                <div className="flex items-center gap-4"><Clock size={18}/> <span className="font-black text-[10px] tracking-widest uppercase">PENDÊNCIAS</span></div>
                {pendencias.length > 0 && <span className="bg-red-600 text-white text-[9px] px-2 py-0.5 rounded-full">{pendencias.length}</span>}
              </button>
              <button onClick={() => setActiveTab('admin')} className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl transition-all ${activeTab === 'admin' ? 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/20' : 'text-zinc-500 hover:text-white'}`}>
                <div className="flex items-center gap-4"><ShieldCheck size={18}/> <span className="font-black text-[10px] tracking-widest uppercase text-yellow-400">APROVAÇÕES</span></div>
                {aguardando.length > 0 && <span className="bg-yellow-400 text-black text-[9px] font-black px-2 py-0.5 rounded-full">{aguardando.length}</span>}
              </button>
              <NavItem label="ADMINISTRAÇÃO" icon={<ShieldAlert size={18}/>} active={activeTab === 'admin_zone'} onClick={() => setActiveTab('admin_zone')} color="text-red-500" />
              <NavItem label="HISTÓRICO" icon={<Archive size={18}/>} active={activeTab === 'historico_backup'} onClick={() => setActiveTab('historico_backup')} color="text-zinc-400" />
            </div>
          )}
        </nav>
        <button onClick={() => signOut()} className="p-5 mt-4 text-zinc-600 font-black text-[10px] uppercase hover:text-red-500 border border-white/5 bg-black rounded-2xl flex justify-center gap-4 w-full"><LogOut size={16}/> DESCONECTAR</button>
      </aside>

      <main className="flex-1 p-12 overflow-y-auto bg-[#050505]">
        <header className="mb-16 flex justify-between items-end border-b border-white/5 pb-8">
          <div>
            <h2 className="text-6xl font-black uppercase italic tracking-tighter leading-none text-white">
                {activeTab === 'inicio' ? "VISÃO GERAL" : activeTab === 'admin_zone' ? "ZONA ADMIN" : activeTab.replace('_', ' ')}
            </h2>
            <div className="h-1 w-32 bg-yellow-400 mt-6 shadow-[0_0_20px_#facc15]"></div>
          </div>
          <div className="flex items-center gap-4 bg-[#0a0a0a] p-4 rounded-[2rem] border border-white/5">
             <div className="pr-2 text-right">
                <p className="text-xs font-black uppercase italic text-white">{userSession?.user?.name}</p>
                <p className="text-[9px] font-bold text-yellow-400 uppercase tracking-widest mt-1 leading-none">{isAdmin ? 'ADMINISTRADOR' : 'AGENTE AFL'}</p>
             </div>
             <img src={userSession?.user?.image} className="w-12 h-12 rounded-[1.2rem] border-2 border-yellow-400/30" alt="" />
          </div>
        </header>

        {/* --- CONTEÚDO --- */}
        {activeTab === 'inicio' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
             <StatCard title="BRUTO (MÊS)" value={equipeProcessada.reduce((a,m)=>a+m.bruto,0)} icon={<TrendingUp size={32}/>} type="money" />
             <StatCard title="LÍQUIDO (CAIXA)" value={equipeProcessada.reduce((a,m)=>a+m.liq,0)} icon={<Zap size={32}/>} type="money" highlight />
             <StatCard title="MEMBROS ATIVOS" value={equipe.length} icon={<Users size={32}/>} />
          </div>
        )}

        {activeTab === 'ranking' && (
          <div className="bg-[#0a0a0a] border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl">
             <table className="w-full text-left font-black uppercase">
               <thead className="bg-yellow-400 text-black text-[10px] tracking-[0.2em]">
                 <tr><th className="px-10 py-6">RANK</th><th className="px-10 py-6">AGENTE</th><th className="px-10 py-6 text-right">PRODUÇÃO BRUTA (MÊS)</th></tr>
               </thead>
               <tbody className="divide-y divide-white/5">
                 {equipeProcessada.map((m, i) => (
                   <tr key={m.discordId} className="hover:bg-white/[0.02] transition-all">
                     <td className="px-10 py-8 italic text-3xl text-zinc-700">{i + 1}º</td>
                     <td className="px-10 py-8 text-lg text-white italic">{m.nome}</td>
                     <td className="px-10 py-8 text-right text-yellow-400 text-3xl font-mono italic">R$ {formatMoney(m.bruto)}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>
        )}

        {activeTab === 'equipe' && (
          <div className="animate-in fade-in">
             <div className="flex gap-2 mb-8 overflow-x-auto pb-4 no-scrollbar">
                {['Todos', ...HIERARQUIA].map(c => (
                  <button key={c} onClick={() => setSelectedCargo(c)} className={`px-6 py-3 rounded-full text-[10px] font-black uppercase transition-all whitespace-nowrap ${selectedCargo === c ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20' : 'bg-[#0a0a0a] text-zinc-500 border border-white/5 hover:text-white'}`}>{c}</button>
                ))}
             </div>
             <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {equipeFiltrada.map(m => (
                  <div key={m.discordId} onClick={() => setMembroSelecionado(m)} className="bg-[#0a0a0a] p-8 rounded-[2.5rem] border border-white/5 hover:border-yellow-400/50 cursor-pointer shadow-xl group transition-all">
                    <img src={m.avatar || `https://ui-avatars.com/api/?name=${m.nome}&background=EAB308&color=000`} className="w-16 h-16 rounded-[1.5rem] mb-6 border-2 border-zinc-800 group-hover:border-yellow-400 transition-colors" alt="" />
                    <h4 className="font-black uppercase text-white text-xl mb-1 truncate">{m.nome}</h4>
                    <p className="text-[10px] text-yellow-400 font-bold mb-6 italic">{m.cargo}</p>
                    <div className="pt-6 border-t border-white/5 space-y-2 text-[10px] font-black uppercase">
                       <div className="flex justify-between text-zinc-500"><span>BRUTO:</span><span className="text-white">R$ {formatMoney(m.bruto)}</span></div>
                       <div className="flex justify-between text-green-500/80"><span>LÍQUIDO:</span><span className="text-green-400">R$ {formatMoney(m.liq)}</span></div>
                       <div className="flex justify-between text-yellow-400 bg-yellow-400/5 p-2 rounded-lg mt-2"><span>SALDO:</span><span>R$ {formatMoney(calcAReceber(m))}</span></div>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'gestao' && (
           <div className="bg-[#0a0a0a] border border-white/5 rounded-[3.5rem] overflow-hidden shadow-2xl animate-in fade-in">
              <div className="overflow-x-auto">
                 <table className="w-full text-left font-black uppercase text-[10px] tracking-widest whitespace-nowrap min-w-max">
                   <thead className="bg-white/5 text-zinc-500 border-b border-white/5">
                     <tr><th className="px-8 py-6">MEMBRO / VENDEDOR</th><th className="px-8 py-6">TIPO</th><th className="px-8 py-6">CLIENTE / ID</th><th className="px-8 py-6">VALOR</th><th className="px-8 py-6">DATA</th></tr>
                   </thead>
                   <tbody className="divide-y divide-white/5">
                     {muralMes.map((r: any) => (
                       <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                         <td className="px-8 py-6 text-white text-xs">{r.nome}</td>
                         <td className="px-8 py-6 text-zinc-500">{r.tipo}</td>
                         <td className="px-8 py-6 text-yellow-400 italic">{r.cliente || r.item || '-'}</td>
                         <td className={`px-8 py-6 font-mono text-sm ${r.tipo === 'SAQUE' ? 'text-red-500' : 'text-green-500'}`}>{r.tipo === 'SAQUE' ? '-' : ''} R$ {formatMoney(r.valor || r.cashbackExtra)}</td>
                         <td className="px-8 py-6 text-zinc-600">{new Date(r.criado_em).toLocaleDateString('pt-BR')}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
              </div>
           </div>
        )}

        {activeTab === 'registrar' && (
          <div className="max-w-2xl mx-auto animate-in zoom-in-95">
             <div className="flex gap-2 p-1 bg-[#0a0a0a] rounded-2xl mb-8 border border-white/5">
                {[{id:'VENDA', label:'VENDA', icon:<ShoppingCart size={14}/>}, {id:'CORRIDINHA', label:'BÔNUS', icon:<Zap size={14}/>}, {id:'SAQUE', label:'PAGAMENTO', icon:<Banknote size={14}/>}].map(t => (
                  <button key={t.id} onClick={() => setForm({...form, tipo: t.id})} className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl text-[10px] font-black transition-all ${form.tipo === t.id ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20' : 'text-zinc-600 hover:text-white'}`}>{t.icon}{t.label}</button>
                ))}
             </div>
             <form onSubmit={handleEnviar} className="bg-[#0a0a0a] border border-white/5 rounded-[3.5rem] p-12 shadow-2xl space-y-6">
                <div className="space-y-2 border-b border-white/5 pb-6 mb-6">
                  <label className="text-[10px] uppercase text-yellow-400 font-black">MEMBRO RESPONSÁVEL</label>
                  <select value={form.vendedorId || form.membroSaqueId} onChange={e => setForm({...form, vendedorId: e.target.value, membroSaqueId: e.target.value})} className="w-full bg-black border border-white/10 p-6 rounded-2xl text-white outline-none focus:border-yellow-400 font-black uppercase text-xs cursor-pointer appearance-none" required>
                    <option value="">Selecione o Membro...</option>
                    {equipeProcessada.map(m => <option key={m.discordId} value={m.discordId}>{m.nome}</option>)}
                  </select>
                </div>
                {form.tipo === 'VENDA' && (
                  <>
                    <InputField label="CLIENTE (NOME / ID)" value={form.cliente} onChange={(v:any)=>setForm({...form, cliente: v})} placeholder="Ex: Lucas | 4116" />
                    <InputField label="ITEM COMPRADO" value={form.item} onChange={(v:any)=>setForm({...form, item: v})} placeholder="Ex: Farm de Dinheiro" />
                    <div className="grid grid-cols-2 gap-4">
                      <InputField label="VALOR TOTAL (R$)" type="number" value={form.valor} onChange={(v:any)=>setForm({...form, valor: v})} placeholder="0,00" />
                      <InputField label="VALOR RECEBIDO (R$)" type="number" value={form.valorRecebido} onChange={(v:any)=>setForm({...form, valorRecebido: v})} placeholder="0,00" />
                    </div>
                  </>
                )}
                {form.tipo === 'CORRIDINHA' && <InputField label="VALOR DO BÔNUS (R$)" type="number" value={form.valor} onChange={(v:any)=>setForm({...form, valor: v})} placeholder="Ex: 50,00" />}
                {form.tipo === 'SAQUE' && <InputField label="VALOR TRANSFERIDO (R$)" type="number" value={form.valor} onChange={(v:any)=>setForm({...form, valor: v})} placeholder="Valor enviado ao membro" />}
                <button disabled={loading} className="w-full bg-yellow-400 text-black font-black py-6 rounded-2xl uppercase tracking-[0.3em] text-xs shadow-xl italic mt-8 hover:bg-yellow-300 transition-all">
                  {loading ? 'PROCESSANDO...' : 'ENVIAR REGISTRO'}
                </button>
             </form>
          </div>
        )}

        {/* --- PENDÊNCIAS (AQUI ESTÃO ELAS!) --- */}
        {activeTab === 'pendencias' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in">
             {pendencias.length === 0 && <p className="col-span-full text-zinc-600 font-black uppercase text-center py-20">Nenhuma dívida de cliente encontrada.</p>}
             {pendencias.map(r => (
               <div key={r.id} className="bg-[#0a0a0a] p-10 rounded-[3rem] border border-red-500/20 shadow-2xl flex flex-col justify-between group relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-6 text-red-500/10"><AlertCircle size={80}/></div>
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-6 border-b border-white/5 pb-6">
                       <h4 className="text-3xl text-white italic font-black uppercase truncate pr-4">{r.cliente}</h4>
                       <span className="bg-red-500 text-white text-[9px] px-3 py-1.5 rounded-full font-black tracking-widest whitespace-nowrap">FALTA R$ {formatMoney(Number(r.valor) - Number(r.valorRecebido))}</span>
                    </div>
                    <div className="space-y-2 mb-8 text-[10px] font-black uppercase text-zinc-500">
                       <p>VENDEDOR: <span className="text-zinc-300 ml-2">{r.nome}</span></p>
                       <p>ITEM: <span className="text-zinc-300 ml-2">{r.item}</span></p>
                       <p className="mt-4">VENCIMENTO: <span className="text-yellow-400 ml-2">{r.dataVencimento?.split('-').reverse().join('/') || 'A COMBINAR'}</span></p>
                    </div>
                  </div>
                  <button onClick={() => setModalParcela(r)} className="w-full bg-green-500 text-black font-black py-5 rounded-2xl uppercase text-[10px] hover:bg-green-400 shadow-lg shadow-green-500/20 relative z-10 transition-all">RECEBER PAGAMENTO</button>
               </div>
             ))}
          </div>
        )}

        {activeTab === 'admin' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in">
             {aguardando.length === 0 && <p className="col-span-full text-zinc-600 font-black uppercase text-center py-20">Nada para aprovar no momento.</p>}
             {aguardando.map(r => (
               <div key={r.id} className="bg-[#0a0a0a] p-10 rounded-[3rem] border border-yellow-400/20 shadow-2xl flex flex-col justify-between">
                  <div>
                    <h4 className="text-3xl text-white italic font-black uppercase mb-2 truncate">{r.nome}</h4>
                    <p className="text-yellow-400 text-[10px] font-black uppercase mb-6 tracking-[0.2em] bg-yellow-400/10 inline-block px-3 py-1 rounded-lg">{r.tipo} • R$ {formatMoney(r.valor || r.cashbackExtra)}</p>
                    <div className="space-y-1 mb-8 text-[10px] font-black uppercase text-zinc-500">
                       <p>CLIENTE: <span className="text-zinc-300">{r.cliente}</span></p>
                       <p>ITEM: <span className="text-zinc-300">{r.item}</span></p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => decidir(r.id, 'APROVAR')} className="flex-1 bg-yellow-400 text-black font-black py-4 rounded-xl uppercase text-[10px] hover:bg-yellow-300 transition-all shadow-lg shadow-yellow-400/10">APROVAR</button>
                    <button onClick={() => decidir(r.id, 'REPROVAR')} className="px-6 py-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl hover:bg-red-500 hover:text-white transition-all"><X size={20}/></button>
                  </div>
               </div>
             ))}
          </div>
        )}

        {activeTab === 'admin_zone' && (
           <div className="space-y-8 animate-in fade-in">
             <div className="bg-red-500/5 border border-red-500/20 p-10 rounded-[3rem] max-w-xl">
                <h3 className="text-3xl font-black italic text-white mb-4">FECHAMENTO MENSAL</h3>
                <p className="text-zinc-500 mb-8 text-[10px] font-black uppercase tracking-widest leading-relaxed">Arquiva o mês e zera as produções. Os saldos são salvos como Saldo Retido.</p>
                <button onClick={virarMes} disabled={loading} className="w-full bg-red-600 text-white font-black py-5 rounded-2xl uppercase text-xs shadow-xl hover:bg-red-500 transition-all">EXECUTAR VIRADA DE MÊS</button>
             </div>
             <div className="bg-[#0a0a0a] border border-white/5 rounded-[3.5rem] overflow-hidden shadow-2xl">
                 <table className="w-full text-left font-black uppercase text-[10px] tracking-widest whitespace-nowrap min-w-max">
                   <thead className="bg-white/5 text-zinc-500 border-b border-white/5">
                     <tr><th className="px-8 py-6">MEMBRO</th><th className="px-8 py-6">TIPO</th><th className="px-8 py-6">VALOR</th><th className="px-8 py-6 text-right">AÇÃO</th></tr>
                   </thead>
                   <tbody className="divide-y divide-white/5">
                     {registros.filter(r => r.status === 'APROVADO').map((r: any) => (
                       <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                         <td className="px-8 py-6 text-white text-xs">{r.nome}</td>
                         <td className="px-8 py-6 text-zinc-500">{r.tipo}</td>
                         <td className="px-8 py-6 text-yellow-400 font-mono text-sm">R$ {formatMoney(r.valor || r.cashbackExtra)}</td>
                         <td className="px-8 py-6 text-right"><button onClick={() => deletarLog(r.id)} className="text-red-500/50 hover:text-red-500 transition-colors"><Trash2 size={16}/></button></td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
             </div>
           </div>
        )}

        {activeTab === 'historico_backup' && (
          <div className="space-y-8 animate-in fade-in">
             <div className="flex flex-col md:flex-row md:items-center gap-6 bg-[#0a0a0a] p-8 rounded-[3rem] border border-white/5 shadow-xl">
                 <div className="flex-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">MÊS DE REFERÊNCIA</p>
                    <select value={mesBackup} onChange={(e) => setMesBackup(e.target.value)} className="w-full bg-black border border-white/10 text-yellow-400 p-4 rounded-2xl outline-none font-black uppercase text-sm cursor-pointer appearance-none shadow-inner">
                        {mesesDisponiveis.map(m => <option key={m} value={m}>{formatMes(m)}</option>)}
                    </select>
                 </div>
                 <div className="flex-1 flex gap-6">
                    <div className="flex-1 bg-black p-4 rounded-2xl border border-white/5">
                        <p className="text-[9px] text-zinc-600 font-black mb-1 uppercase">BRUTO</p>
                        <p className="text-xl font-mono text-white italic font-black">R$ {formatMoney(backupBruto)}</p>
                    </div>
                    <div className="flex-1 bg-black p-4 rounded-2xl border border-green-500/20">
                        <p className="text-[9px] text-green-500/70 font-black mb-1 uppercase">CAIXA</p>
                        <p className="text-xl font-mono text-green-400 italic font-black">R$ {formatMoney(backupLiquido)}</p>
                    </div>
                 </div>
             </div>
             <div className="bg-[#0a0a0a] border border-white/5 rounded-[3.5rem] overflow-hidden shadow-2xl">
                 <table className="w-full text-left font-black uppercase text-[10px] tracking-widest whitespace-nowrap min-w-max">
                   <thead className="bg-white/5 text-zinc-500 border-b border-white/5">
                     <tr><th className="px-8 py-6">MEMBRO</th><th className="px-8 py-6">VALOR</th><th className="px-8 py-6">DATA</th></tr>
                   </thead>
                   <tbody className="divide-y divide-white/5">
                     {registrosDoMesBackup.map((r: any) => (
                       <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                         <td className="px-8 py-6 text-white text-xs">{r.nome}</td>
                         <td className={`px-8 py-6 font-mono text-sm ${r.tipo === 'SAQUE' ? 'text-red-500' : 'text-green-500'}`}>R$ {formatMoney(r.valor || r.cashbackExtra)}</td>
                         <td className="px-8 py-6 text-zinc-600">{new Date(r.criado_em).toLocaleDateString('pt-BR')}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
             </div>
          </div>
        )}

      </main>

      {/* --- MODAL DETALHADO DO MEMBRO --- */}
      {membroSelecionado && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-6 animate-in fade-in backdrop-blur-sm">
           <div className="bg-[#050505] border border-white/10 w-full max-w-5xl rounded-[4rem] flex flex-col max-h-[90vh] overflow-hidden shadow-2xl">
              <div className="p-12 border-b border-white/5 flex justify-between items-start bg-gradient-to-br from-yellow-400/5 to-transparent relative">
                 <button onClick={() => setMembroSelecionado(null)} className="absolute top-10 right-10 text-zinc-600 hover:text-yellow-400 bg-black p-3 rounded-full border border-white/5 transition-all"><X size={24}/></button>
                 <div className="flex items-center gap-8 w-full pr-16">
                    <img src={membroSelecionado.avatar || `https://ui-avatars.com/api/?name=${membroSelecionado.nome}&background=EAB308&color=000`} className="w-32 h-32 rounded-[2.5rem] border-2 border-yellow-400 shadow-lg" alt="" />
                    <div className="flex-1 min-w-0">
                       <h2 className="text-4xl sm:text-5xl font-black uppercase italic tracking-tighter text-white leading-none truncate">{membroSelecionado.nome}</h2>
                       <p className="text-yellow-400 font-black uppercase tracking-[0.3em] text-[10px] mt-4 bg-yellow-400/10 inline-block px-4 py-1.5 rounded-full">{membroSelecionado.cargo}</p>
                    </div>
                 </div>
              </div>
              <div className="p-12 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-2 gap-12">
                 <div className="space-y-6">
                    <div className="bg-green-500/5 border border-green-500/20 p-10 rounded-[3rem] shadow-lg">
                       <p className="text-[10px] text-green-500 font-black uppercase mb-3 tracking-widest">Saldo a Receber</p>
                       <p className="text-5xl font-mono italic text-green-400 font-black">R$ {formatMoney(calcAReceber(membroSelecionado))}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                       <div className="bg-blue-500/5 border border-blue-500/10 p-6 rounded-[2rem]"><p className="text-[9px] font-black text-blue-500 mb-1 uppercase">Bônus</p><p className="text-2xl font-mono text-blue-400">+R$ {formatMoney(membroSelecionado.corridinhas)}</p></div>
                       <div className="bg-red-500/5 border border-red-500/10 p-6 rounded-[2rem]"><p className="text-[9px] font-black text-red-500 mb-1 uppercase">Pago</p><p className="text-2xl font-mono text-red-400">-R$ {formatMoney(membroSelecionado.pago)}</p></div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                       <div className="bg-[#0a0a0a] p-6 rounded-[2rem] border border-white/5"><p className="text-[9px] text-zinc-600 font-black uppercase mb-1">Bruto</p><p className="text-xl font-mono text-white">R$ {formatMoney(membroSelecionado.bruto)}</p></div>
                       <div className="bg-[#0a0a0a] p-6 rounded-[2rem] border border-white/5"><p className="text-[9px] text-zinc-600 font-black uppercase mb-1">Caixa</p><p className="text-xl font-mono text-white">R$ {formatMoney(membroSelecionado.liq)}</p></div>
                    </div>
                 </div>
                 <div className="space-y-4">
                    <h3 className="text-xl font-black uppercase italic text-zinc-500 flex items-center gap-3 mb-6"><History size={20}/> LANÇAMENTOS DO MÊS</h3>
                    {registros.filter(r => String(r.discordId) === String(membroSelecionado.discordId) && (r.status === 'APROVADO' || r.status === 'ARQUIVADO') && r.criado_em.startsWith(mesAtualStr) && !(r.item || '').toUpperCase().includes('SALDO RETIDO')).map((r: any) => (
                      <div key={r.id} className="flex justify-between items-center bg-[#0a0a0a] p-6 rounded-[2rem] border border-white/5 hover:border-white/10 transition-colors">
                         <div>
                            <p className={`font-black text-sm uppercase italic ${r.tipo === 'CORRIDINHA' ? 'text-blue-400' : r.tipo === 'SAQUE' ? 'text-red-400' : 'text-white'}`}>{r.item || r.tipo}</p>
                            <p className="text-[9px] text-zinc-600 tracking-widest uppercase mt-1.5">{new Date(r.criado_em).toLocaleDateString('pt-BR')} • {r.cliente || 'EQUIPE'}</p>
                         </div>
                         <p className={`font-mono text-base font-black ${r.tipo === 'SAQUE' ? 'text-red-500' : 'text-green-500'}`}>{r.tipo === 'SAQUE' ? '-' : '+'} R$ {formatMoney(r.valor || r.cashbackExtra)}</p>
                      </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* MODAL RECEBER PARCELA */}
      {modalParcela && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 p-4 animate-in zoom-in-95">
           <div className="bg-[#0a0a0a] border border-zinc-800 p-12 rounded-[3.5rem] w-full max-w-md shadow-2xl relative">
              <button onClick={() => setModalParcela(null)} className="absolute top-8 right-8 text-zinc-600 hover:text-red-500 bg-black p-2 rounded-full border border-white/5"><X size={24}/></button>
              <h3 className="text-3xl font-black italic text-white uppercase tracking-tighter mb-8 text-center">RECEBER PAGAMENTO</h3>
              <form onSubmit={handlePagarParcela} className="space-y-8">
                 <div className="bg-black border border-white/5 p-6 rounded-3xl text-center mb-4"><p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">CLIENTE</p><p className="text-xl font-black text-white italic truncate">{modalParcela.cliente}</p></div>
                 <InputField label={`VALOR A RECEBER (FALTAM R$ ${formatMoney(Number(modalParcela.valor) - Number(modalParcela.valorRecebido))})`} type="number" value={valorParcela} onChange={setValorParcela} placeholder="R$ 0,00" />
                 {parseFloat(valorParcela || '0') < (Number(modalParcela.valor) - Number(modalParcela.valorRecebido)) && valorParcela !== '' && (
                    <div className="p-6 bg-red-500/5 border border-red-500/20 rounded-3xl animate-in fade-in">
                       <InputField label="PRÓXIMO VENCIMENTO" type="date" value={proximoVencimento} onChange={setProximoVencimento} />
                    </div>
                 )}
                 <button disabled={loading} className="w-full bg-green-500 text-black font-black py-6 rounded-2xl uppercase tracking-widest text-xs hover:bg-green-400 transition-all shadow-lg shadow-green-500/20">
                    {loading ? 'PROCESSANDO...' : 'CONFIRMAR RECEBIMENTO'}
                 </button>
              </form>
           </div>
        </div>
      )}

    </div>
  );
}

// --- COMPONENTES AUXILIARES ---
function StatCard({ title, value, icon, type = "number", highlight = false }: any) {
  const displayValue = type === 'money' ? `R$ ${formatMoney(value)}` : value;
  return (
    <div className={`p-10 rounded-[3rem] relative overflow-hidden transition-all shadow-xl ${highlight ? 'bg-gradient-to-br from-[#1a1400] to-[#0a0a0a] border border-yellow-500/30' : 'bg-[#0a0a0a] border border-white/5'}`}>
       <div className="relative z-10"><p className={`text-[10px] font-black uppercase tracking-widest mb-4 ${highlight ? 'text-yellow-500' : 'text-zinc-600'}`}>{title}</p><h3 className={`text-5xl font-black italic tracking-tighter ${highlight ? 'text-yellow-500' : 'text-white'}`}>{displayValue}</h3></div>
       <div className={`absolute top-8 right-8 ${highlight ? 'text-yellow-500/20' : 'text-white/5'}`}>{icon}</div>
    </div>
  );
}

function NavItem({ icon, label, active, onClick, color = "text-zinc-600" }: any) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${active ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/10' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}>
      <span className={active ? 'text-black' : color}>{icon}</span><span className="font-black tracking-widest text-[10px] uppercase">{label}</span>
    </button>
  );
}

function InputField({ label, value, onChange, placeholder, type = "text", required = true }: any) {
  return (
    <div className="space-y-3">
      <label className="text-[10px] font-black text-zinc-600 uppercase ml-2 tracking-widest">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} className="w-full bg-black border border-white/10 p-6 rounded-2xl text-white outline-none focus:border-yellow-400 font-black text-sm transition-all placeholder:text-zinc-800" placeholder={placeholder} required={required} />
    </div>
  );
}