"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { 
  LayoutDashboard, Trophy, PlusCircle, ShieldCheck, TrendingUp, Users, 
  LogOut, UsersRound, X, History, CheckCircle2, Database, Clock, 
  ShoppingCart, UserPlus, Zap, Banknote, AlertCircle, Trash2, ShieldAlert, Archive
} from 'lucide-react';
import { signOut } from "next-auth/react";

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
    tipo: 'VENDA', vendedorId: '', cliente: '', cpfEmail: '', item: '', 
    valor: '', valorRecebido: '', pagamento: '', idDiscordAvancado: '', 
    recrutadoId: '', quantidade: '1', membroSaqueId: '', dataVencimento: '' 
  });

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };
  
  const getCashback = (cargo: string) => { 
    const r: any = { 'Resp.Vendas': 0.15, 'Master AFL': 0.12, 'Resp.AFL': 0.10, 'Auxiliar AFL': 0.09, 'Lider AFL': 0.08, 'Sub-Lider AFL': 0.07, 'Membro AFL': 0.06 };
    return r[cargo] || 0.06;
  };

  const calcAReceber = (m: any) => {
    const perc = getCashback(m.cargoPainel || m.cargo);
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
    if (!isAdmin) return;
    const autoAudit = () => fetch('/api/admin/auditoria?fix=true').catch(() => null);
    autoAudit(); 
    const auditTimer = setInterval(autoAudit, 60000); 
    return () => clearInterval(auditTimer);
  }, [isAdmin]);

  useEffect(() => {
    if (membroSelecionado) {
       const atualizado = equipe.find((m: any) => String(m.discordId) === String(membroSelecionado.discordId));
       if (atualizado && JSON.stringify(atualizado) !== JSON.stringify(membroSelecionado)) setMembroSelecionado(atualizado);
    }
  }, [equipe, membroSelecionado]);

  useEffect(() => {
    if (registros.length > 0 && !mesBackup) {
      const d = new Date(registros[0].criado_em);
      setMesBackup(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
  }, [registros, mesBackup]);

  const handleEnviar = async (e: any) => {
    e.preventDefault();
    if ((form.tipo === 'VENDA' || form.tipo === 'RECRUTAMENTO' || form.tipo === 'CORRIDINHA') && !form.vendedorId) return showToast("❌ SELECIONE O VENDEDOR!");
    
    setLoading(true);
    const valorLimpo = parseFloat(form.valor.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
    const recebidoLimpo = form.valorRecebido ? parseFloat(form.valorRecebido.replace(/[^\d,.-]/g, '').replace(',', '.')) : valorLimpo;
    const membroVendedor = equipe.find((m: any) => String(m.discordId) === String(form.vendedorId));

    let payload = { 
      ...form, valorNumerico: valorLimpo, recebidoNumerico: recebidoLimpo,
      vendedorNome: membroVendedor?.nome, cashbackExtra: 0
    };

    if (form.tipo === 'CORRIDINHA') {
       payload = { ...payload, cashbackExtra: valorLimpo, valorNumerico: 0, recebidoNumerico: 0, item: 'Bônus: Corridinha Maluca', cliente: 'EQUIPE AFL' };
    } else if (form.tipo === 'SAQUE') {
       const m = equipe.find((m: any) => String(m.discordId) === String(form.membroSaqueId));
       if (!m) { showToast("Selecione o membro!"); setLoading(false); return; }
       payload = { ...payload, recrutadoId: form.membroSaqueId, cliente: m.nome };
    }

    const res = await fetch('/api/registros', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (res.ok) {
      setForm({ tipo: 'VENDA', vendedorId: '', cliente: '', cpfEmail: '', item: '', valor: '', valorRecebido: '', pagamento: '', idDiscordAvancado: '', recrutadoId: '', quantidade: '1', membroSaqueId: '', dataVencimento: '' });
      showToast("REGISTRO POSTADO COM SUCESSO!");
      pulse();
    }
    setLoading(false);
  };

  const decidir = async (id: string, acao: 'APROVAR' | 'REPROVAR') => {
    const res = await fetch('/api/registros/analise', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ registroId: id, acao }) });
    if (res.ok) { showToast(acao === 'APROVAR' ? "VENDA APROVADA!" : "VENDA REPROVADA!"); pulse(); }
  };

  const deletarLog = async (id: string) => {
    if (!confirm("ATENÇÃO ADMIN: Deletar esse registro permanentemente? O saldo do membro será estornado/recalculado.")) return;
    await fetch('/api/admin/logs', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    pulse();
  };

  const virarMes = async () => {
    if (!confirm("VIRADA DE MÊS: Deseja arquivar o mês atual, zerar as produções de vendas e salvar o crédito a receber da equipe?")) return;
    setLoading(true);
    await fetch('/api/admin/virada', { method: 'POST' });
    showToast("MÊS ARQUIVADO E ZERADO!");
    pulse();
    setLoading(false);
  };

  const rodarAuditoria = async () => {
    if (!confirm("FORÇAR AUDITORIA: Recalcular o banco de dados agora?")) return;
    setLoading(true);
    await fetch('/api/admin/auditoria?fix=true');
    showToast("AUDITORIA CONCLUÍDA!");
    pulse();
    setLoading(false);
  };

  const handlePagarParcela = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    const v = parseFloat(valorParcela.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
    const res = await fetch('/api/registros/parcela', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ registroId: modalParcela.id, valorPago: v, proximaData: proximoVencimento }) });
    if (res.ok) { showToast("PARCELA RECEBIDA COM SUCESSO!"); setModalParcela(null); setValorParcela(''); setProximoVencimento(''); pulse(); }
    setLoading(false);
  };

  const pendencias = registros.filter(r => r.status === 'APROVADO' && (r.tipo === 'VENDA' || !r.tipo) && Number(r.valorRecebido) < Number(r.valor));
  const aguardando = registros.filter(r => r.status === 'PENDENTE');
  const equipeOrdenada = [...equipe].sort((a, b) => b.vendas - a.vendas);
  const equipeFiltrada = selectedCargo === 'Todos' ? equipeOrdenada : equipeOrdenada.filter(m => m.cargoPainel === selectedCargo);
  
  const historicoMembro = membroSelecionado ? registros.filter(r => 
    String(r.discordId || r.vendedorId) === String(membroSelecionado.discordId) && 
    r.status === 'APROVADO'
  ).sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime()) : [];

  // --- CÁLCULOS DO DASHBOARD (MATEMÁTICA CORRIGIDA) ---
  const totalBruto = equipe.reduce((a, m) => a + (Number(m.vendas) || 0), 0);
  
  // O Líquido agora reflete EXATAMENTE o que foi recebido, sem descontar dívidas passadas da equipe.
  const totalLiquido = equipe.reduce((a, m) => a + (Number(m.valorRecebido) || 0), 0);

  const mesesDisponiveis = Array.from(new Set(registros.map(r => {
    const d = new Date(r.criado_em);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }))).sort().reverse();

  const registrosDoMes = registros.filter(r => {
    const d = new Date(r.criado_em);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === mesBackup;
  });

  const mesBackupBruto = registrosDoMes.reduce((a, r) => a + (Number(r.valor) || 0), 0);
  const mesBackupPago = registrosDoMes.filter(r => r.tipo === 'SAQUE').reduce((a, r) => a + (Number(r.valor) || 0), 0);

  return (
    <div className="flex min-h-screen bg-[#050505] text-white font-sans selection:bg-yellow-400 overflow-hidden">
      
      {toast && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-10">
          <div className="bg-yellow-400 text-black px-8 py-4 rounded-2xl font-black shadow-2xl flex items-center gap-3 text-[10px] uppercase tracking-widest italic border-4 border-black/10">
            <CheckCircle2 size={18} /> {toast}
          </div>
        </div>
      )}

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
              <button onClick={() => setActiveTab('pendencias')} className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl transition-all ${activeTab === 'pendencias' ? 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 shadow-lg shadow-yellow-400/5' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}>
                <div className="flex items-center gap-4"><Clock size={18}/> <span className="font-black text-[10px] tracking-widest uppercase">PENDÊNCIAS</span></div>
                {pendencias.length > 0 && <span className="bg-red-600 text-white text-[9px] px-2 py-0.5 rounded-full shadow-lg shadow-red-600/50">{pendencias.length}</span>}
              </button>
              <button onClick={() => setActiveTab('admin')} className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl transition-all ${activeTab === 'admin' ? 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 shadow-lg shadow-yellow-400/5' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}>
                <div className="flex items-center gap-4"><ShieldCheck size={18} className="text-yellow-400"/> <span className="font-black text-[10px] tracking-widest uppercase text-yellow-400">APROVAÇÕES</span></div>
                {aguardando.length > 0 && <span className="bg-yellow-400 text-black text-[9px] font-black px-2 py-0.5 rounded-full">{aguardando.length}</span>}
              </button>
              <NavItem label="ADMINISTRAÇÃO" icon={<ShieldAlert size={18}/>} active={activeTab === 'admin_zone'} onClick={() => setActiveTab('admin_zone')} color="text-red-500" />
              <NavItem label="HISTÓRICO" icon={<Archive size={18}/>} active={activeTab === 'historico_backup'} onClick={() => setActiveTab('historico_backup')} color="text-zinc-400" />
            </div>
          )}
        </nav>
        <button onClick={() => signOut()} className="p-5 mt-4 text-zinc-600 font-black text-[10px] uppercase hover:text-red-500 transition-all flex items-center justify-center gap-4 border border-white/5 bg-black rounded-2xl"><LogOut size={16}/> DESCONECTAR</button>
      </aside>

      <main className="flex-1 p-12 overflow-y-auto bg-[#050505] relative">
        <header className="mb-16 flex justify-between items-end border-b border-white/5 pb-8">
          <div>
            <h2 className="text-6xl font-black uppercase italic tracking-tighter leading-none text-white">
              {activeTab === 'inicio' ? "VISÃO GERAL" : activeTab === 'admin_zone' ? "ZONA ADMIN" : activeTab === 'historico_backup' ? "BACKUP MENSAL" : activeTab}
            </h2>
            <div className="h-1 w-32 bg-yellow-400 mt-6 shadow-[0_0_20px_#facc15]"></div>
          </div>
          <div className="flex items-center gap-4 bg-[#0a0a0a] p-4 rounded-[2rem] border border-white/5">
             <div className="pr-2 text-right">
                <p className="text-xs font-black uppercase italic text-white">{userSession?.user?.name}</p>
                <p className="text-[9px] font-bold text-yellow-400 uppercase tracking-widest leading-none mt-1">{isAdmin ? 'ADMINISTRADOR' : 'AGENTE AFL'}</p>
             </div>
             <img src={userSession?.user?.image || `https://ui-avatars.com/api/?name=${userSession?.user?.name}&background=EAB308&color=000&bold=true`} className="w-12 h-12 rounded-[1.2rem] border-2 border-yellow-400/30" alt="" />
          </div>
        </header>

        {activeTab === 'inicio' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4">
             <StatCard title="VALOR BRUTO" value={totalBruto} icon={<TrendingUp size={32}/>} type="money" />
             <StatCard title="VALOR LÍQUIDO (RECEBIDO)" value={totalLiquido} icon={<Zap size={32}/>} type="money" highlight />
             <StatCard title="MEMBROS ATIVOS" value={equipe.length} icon={<Users size={32}/>} />
          </div>
        )}

        {activeTab === 'ranking' && (
          <div className="bg-[#0a0a0a] border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl animate-in fade-in">
             <table className="w-full text-left font-black uppercase">
               <thead className="bg-yellow-400 text-black text-[10px] tracking-[0.2em]">
                 <tr><th className="px-10 py-6">RANK</th><th className="px-10 py-6 text-center">AGENTE</th><th className="px-10 py-6 text-right">PRODUÇÃO BRUTA</th></tr>
               </thead>
               <tbody className="divide-y divide-white/5">
                 {equipeOrdenada.map((m, i) => (
                   <tr key={m.discordId} className="hover:bg-white/[0.02] transition-all">
                     <td className="px-10 py-8 italic text-3xl text-zinc-700">{i + 1}º</td>
                     <td className="px-10 py-8 flex items-center justify-center gap-6 text-lg italic text-white"><img src={m.avatar || `https://ui-avatars.com/api/?name=${m.nome}&background=EAB308&color=000`} className="w-12 h-12 rounded-xl" alt=""/> {m.nome}</td>
                     <td className="px-10 py-8 text-right text-yellow-400 text-3xl font-mono italic">R$ {formatMoney(m.vendas)}</td>
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
                  <button key={c} onClick={() => setSelectedCargo(c)} className={`px-6 py-3 rounded-full text-[10px] font-black tracking-widest uppercase transition-all whitespace-nowrap ${selectedCargo === c ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20' : 'bg-[#0a0a0a] text-zinc-500 border border-white/5 hover:text-white'}`}>{c}</button>
                ))}
             </div>
             <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {equipeFiltrada.map(m => (
                  <div key={m.discordId} onClick={() => setMembroSelecionado(m)} className="bg-[#0a0a0a] p-8 rounded-[2.5rem] border border-white/5 hover:border-yellow-400/50 transition-all cursor-pointer group shadow-xl">
                    <img src={m.avatar || `https://ui-avatars.com/api/?name=${m.nome}&background=EAB308&color=000`} className="w-16 h-16 rounded-[1.5rem] mb-6 border-2 border-zinc-800 group-hover:border-yellow-400 transition-colors" alt="" />
                    <h4 className="font-black uppercase text-white text-xl mb-1 truncate">{m.nome}</h4>
                    <p className="text-[10px] text-yellow-400 font-bold mb-6 italic tracking-widest uppercase">{m.cargoPainel}</p>
                    <div className="pt-6 border-t border-white/5 space-y-3 text-[10px] font-black uppercase tracking-widest">
                       <div className="flex justify-between text-zinc-500"><span>PRODUÇÃO:</span><span className="text-white font-mono">R$ {formatMoney(m.vendas)}</span></div>
                       <div className="flex justify-between text-yellow-400 italic bg-yellow-400/5 p-3 rounded-xl border border-yellow-400/10"><span>A RECEBER:</span><span className="font-mono text-sm">R$ {formatMoney(calcAReceber(m))}</span></div>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'registrar' && (
          <div className="max-w-2xl mx-auto animate-in zoom-in-95">
             <div className="flex gap-2 p-1 bg-[#0a0a0a] rounded-2xl mb-8 border border-white/5 overflow-x-auto no-scrollbar">
                {[{id:'VENDA', label:'VENDA', icon:<ShoppingCart size={14}/>}, {id:'CORRIDINHA', label:'BÔNUS', icon:<Zap size={14}/>}, {id:'RECRUTAMENTO', label:'RECRUTA', icon:<UserPlus size={14}/>}, {id:'SAQUE', label:'PAGAMENTO', icon:<Banknote size={14}/>}].map(t => (
                  <button key={t.id} onClick={() => setForm({...form, tipo: t.id})} className={`flex-1 flex items-center justify-center gap-2 py-4 px-4 rounded-xl text-[10px] tracking-widest font-black transition-all ${form.tipo === t.id ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20' : 'text-zinc-600 hover:text-white'}`}>{t.icon}{t.label}</button>
                ))}
             </div>

             <div className="bg-[#0a0a0a] border border-white/5 rounded-[3.5rem] p-12 shadow-2xl">
                <form onSubmit={handleEnviar} className="space-y-6">
                   {form.tipo !== 'SAQUE' && (
                     <div className="space-y-2 border-b border-white/5 pb-6 mb-6">
                        <label className="text-[10px] uppercase tracking-widest text-yellow-400 ml-2 font-black">VENDEDOR / RESPONSÁVEL</label>
                        <select value={form.vendedorId} onChange={e => setForm({...form, vendedorId: e.target.value})} className="w-full bg-black border border-white/10 p-6 rounded-2xl text-white outline-none focus:border-yellow-400 font-black uppercase text-xs transition-all appearance-none cursor-pointer" required>
                           <option value="">Selecione o Vendedor...</option>
                           {equipeOrdenada.map(m => <option key={m.discordId} value={m.discordId}>{m.nome} ({m.cargoPainel})</option>)}
                        </select>
                     </div>
                   )}

                   {form.tipo === 'VENDA' && (
                     <div className="space-y-6 animate-in fade-in">
                       <InputField label="CLIENTE (NOME / ID)" value={form.cliente} onChange={(v:any)=>setForm({...form, cliente: v})} placeholder="Ex: Lucas | 4116" />
                       <InputField label="ITEM COMPRADO" value={form.item} onChange={(v:any)=>setForm({...form, item: v})} placeholder="Ex: Farm de Dinheiro" />
                       <div className="grid grid-cols-2 gap-4">
                         <InputField label="VALOR DA VENDA (R$)" type="number" value={form.valor} onChange={(v:any)=>setForm({...form, valor: v})} placeholder="Total Cobrado" />
                         <InputField label="VALOR RECEBIDO HOJE (R$)" type="number" value={form.valorRecebido} onChange={(v:any)=>setForm({...form, valorRecebido: v})} placeholder="Valor já pago" />
                       </div>
                       {parseFloat(form.valorRecebido || '0') < parseFloat(form.valor || '0') && form.valor && (
                         <div className="p-6 border border-red-500/20 bg-red-500/5 rounded-2xl">
                            <InputField label="DATA DE VENCIMENTO DO RESTANTE" type="date" value={form.dataVencimento} onChange={(v:any)=>setForm({...form, dataVencimento: v})} required={false} />
                            <p className="text-[9px] font-black text-red-500 tracking-widest uppercase mt-4 flex items-center gap-2"><AlertCircle size={14}/> Será gerada uma pendência para cobrar o restante.</p>
                         </div>
                       )}
                     </div>
                   )}

                   {form.tipo === 'CORRIDINHA' && (
                     <div className="space-y-6 animate-in fade-in bg-blue-500/5 border border-blue-500/20 p-8 rounded-3xl">
                       <InputField label="VALOR DO BÔNUS (R$)" type="number" value={form.valor} onChange={(v:any)=>setForm({...form, valor: v})} placeholder="Ex: 50,00" />
                     </div>
                   )}

                   {form.tipo === 'RECRUTAMENTO' && (
                     <div className="grid grid-cols-2 gap-4 animate-in fade-in">
                       <InputField label="ID DISCORD DO RECRUTADO" value={form.recrutadoId} onChange={(v:any)=>setForm({...form, recrutadoId: v})} placeholder="ID do novato" />
                       <InputField label="COMISSÃO (R$)" type="number" value={form.valor} onChange={(v:any)=>setForm({...form, valor: v})} placeholder="Ex: 30,00" />
                     </div>
                   )}

                   {form.tipo === 'SAQUE' && (
                     <div className="space-y-6 animate-in fade-in bg-green-500/5 border border-green-500/20 p-8 rounded-3xl">
                        <div className="space-y-2">
                          <label className="text-[10px] uppercase tracking-widest text-green-500 ml-2 font-black">QUAL MEMBRO RECEBEU O DINHEIRO?</label>
                          <select value={form.membroSaqueId} onChange={e => setForm({...form, membroSaqueId: e.target.value})} className="w-full bg-black border border-green-500/30 p-6 rounded-2xl text-white outline-none focus:border-green-500 font-black uppercase text-xs transition-all appearance-none cursor-pointer" required>
                             <option value="">Selecione o Membro...</option>
                             {equipeOrdenada.map(m => <option key={m.discordId} value={m.discordId}>{m.nome} (A Receber: R$ {formatMoney(calcAReceber(m))})</option>)}
                          </select>
                        </div>
                       <InputField label="VALOR TRANSFERIDO (R$)" type="number" value={form.valor} onChange={(v:any)=>setForm({...form, valor: v})} placeholder="Dinheiro enviado" />
                     </div>
                   )}

                   <button disabled={loading} className={`w-full text-black font-black py-6 rounded-2xl uppercase tracking-[0.3em] text-xs shadow-xl transition-all italic mt-8 ${form.tipo === 'SAQUE' ? 'bg-green-500 hover:bg-green-400' : form.tipo === 'CORRIDINHA' ? 'bg-blue-500 text-white hover:bg-blue-400' : 'bg-yellow-400 hover:bg-yellow-300'}`}>
                      {loading ? 'PROCESSANDO...' : 'ENVIAR PARA BANCO DE DADOS'}
                   </button>
                </form>
             </div>
          </div>
        )}

        {activeTab === 'pendencias' && (
          <div className="space-y-8 animate-in fade-in">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {pendencias.length === 0 && <p className="col-span-full text-zinc-600 font-black uppercase tracking-widest p-12 bg-[#0a0a0a] rounded-[3rem] text-center border border-white/5">Nenhum cliente devendo.</p>}
                {pendencias.map(r => {
                  const falta = Number(r.valor) - Number(r.valorRecebido);
                  return (
                  <div key={r.id} className="bg-[#0a0a0a] p-10 rounded-[3rem] border border-red-500/20 shadow-2xl flex flex-col justify-between relative overflow-hidden group">
                     <div className="absolute top-0 right-0 p-6 text-red-500/10 group-hover:text-red-500/20 transition-colors"><AlertCircle size={80}/></div>
                     <div className="relative z-10">
                        <div className="flex justify-between items-start mb-6 border-b border-white/5 pb-6">
                           <h4 className="text-3xl text-white italic font-black uppercase truncate pr-4">{r.cliente}</h4>
                           <span className="bg-red-500 text-white text-[9px] px-3 py-1.5 rounded-full font-black tracking-widest whitespace-nowrap shadow-lg shadow-red-500/20">FALTA R$ {formatMoney(falta)}</span>
                        </div>
                        <div className="space-y-2 mb-8 text-[10px] font-black uppercase tracking-widest">
                           <p className="text-zinc-500">VENDEDOR: <span className="text-zinc-300 ml-2">{r.nome}</span></p>
                           <p className="text-zinc-500">ITEM: <span className="text-zinc-300 ml-2">{r.item}</span></p>
                           <p className="text-zinc-500 mt-4">VENCIMENTO: <span className="text-yellow-400 ml-2 bg-yellow-400/10 px-2 py-1 rounded-lg">{r.dataVencimento ? r.dataVencimento.split('-').reverse().join('/') : 'A COMBINAR'}</span></p>
                        </div>
                     </div>
                     <button onClick={() => setModalParcela(r)} className="w-full bg-green-500 text-black font-black py-5 rounded-2xl uppercase tracking-widest text-[10px] hover:bg-green-400 transition-all shadow-lg shadow-green-500/10 relative z-10">RECEBER PAGAMENTO</button>
                  </div>
                )})}
             </div>
          </div>
        )}

        {activeTab === 'admin' && isAdmin && (
          <div className="space-y-8 animate-in fade-in">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {aguardando.length === 0 && <p className="col-span-full text-zinc-600 font-black uppercase tracking-widest p-12 bg-[#0a0a0a] rounded-[3rem] text-center border border-white/5">Fila limpa.</p>}
                {aguardando.map(r => (
                  <div key={r.id} className="bg-[#0a0a0a] p-10 rounded-[3rem] border border-yellow-400/20 shadow-2xl flex flex-col justify-between">
                     <div>
                        <h4 className="text-3xl text-white italic font-black uppercase mb-2 truncate">{r.nome || r.nomeVendedor}</h4>
                        <p className="text-yellow-400 text-[10px] font-black uppercase mb-6 tracking-[0.2em] bg-yellow-400/10 inline-block px-3 py-1 rounded-lg">{r.tipo || 'VENDA'} • R$ {formatMoney(r.valor)}</p>
                        <div className="space-y-2 mb-8 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                           <p>CLIENTE: <span className="text-zinc-300">{r.cliente}</span></p>
                           <p>ITEM: <span className="text-zinc-300">{r.item}</span></p>
                           <p>RECEBIDO HOJE: <span className="text-green-500">R$ {formatMoney(r.valorRecebido || r.valor)}</span></p>
                        </div>
                     </div>
                     <div className="flex gap-3">
                        <button onClick={() => decidir(r.id, 'APROVAR')} className="flex-1 bg-yellow-400 text-black font-black py-4 rounded-xl uppercase text-[10px] tracking-widest hover:bg-yellow-300 transition-all shadow-lg shadow-yellow-400/10">APROVAR</button>
                        <button onClick={() => decidir(r.id, 'REPROVAR')} className="px-6 py-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl hover:bg-red-500 hover:text-white transition-all"><X size={20}/></button>
                     </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'admin_zone' && isAdmin && (
           <div className="space-y-8 animate-in fade-in">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-red-500/5 border border-red-500/20 p-10 rounded-[3rem]">
                   <h3 className="text-3xl font-black italic text-white mb-4">FECHAMENTO MENSAL</h3>
                   <p className="text-zinc-500 mb-8 text-[10px] font-black uppercase tracking-widest leading-relaxed">Arquiva o mês atual, zera as produções de vendas e salva o crédito a receber da equipe.</p>
                   <button onClick={virarMes} disabled={loading} className="w-full bg-red-600 text-white font-black py-5 rounded-2xl uppercase tracking-widest text-xs shadow-xl shadow-red-600/20 hover:bg-red-500 transition-all">EXECUTAR VIRADA DE MÊS</button>
                </div>
                <div className="bg-purple-500/5 border border-purple-500/20 p-10 rounded-[3rem]">
                   <h3 className="text-3xl font-black italic text-white mb-4">AUDITORIA DE DADOS</h3>
                   <p className="text-zinc-500 mb-8 text-[10px] font-black uppercase tracking-widest leading-relaxed">Força o sistema a varrer todo o banco de dados e recalcular cada centavo de cada membro.</p>
                   <button onClick={rodarAuditoria} disabled={loading} className="w-full bg-purple-600 text-white font-black py-5 rounded-2xl uppercase tracking-widest text-xs shadow-xl shadow-purple-600/20 hover:bg-purple-500 transition-all">FORÇAR AUDITORIA</button>
                </div>
             </div>
             
             <div className="bg-[#0a0a0a] border border-white/5 rounded-[3.5rem] overflow-hidden shadow-2xl mt-8">
                 <table className="w-full text-left font-black uppercase text-[10px] tracking-widest whitespace-nowrap min-w-max">
                   <thead className="bg-white/5 text-zinc-500 border-b border-white/5">
                     <tr><th className="px-8 py-6">MEMBRO / VENDEDOR</th><th className="px-8 py-6">TIPO</th><th className="px-8 py-6">VALOR</th><th className="px-8 py-6">DATA DA AÇÃO</th><th className="px-8 py-6 text-right">EXCLUIR</th></tr>
                   </thead>
                   <tbody className="divide-y divide-white/5">
                     {registros.filter(r => r.status === 'APROVADO').map((r: any) => (
                       <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                         <td className="px-8 py-6 text-white text-xs">{r.nome || r.nomeVendedor}</td>
                         <td className="px-8 py-6 text-zinc-500">{r.tipo || 'VENDA'}</td>
                         <td className="px-8 py-6 text-yellow-400 font-mono text-sm">R$ {formatMoney(r.valor || r.financeiro || r.cashbackExtra)}</td>
                         <td className="px-8 py-6 text-zinc-600">{new Date(r.criado_em).toLocaleString('pt-BR')}</td>
                         <td className="px-8 py-6 text-right"><button onClick={() => deletarLog(r.id)} className="text-red-500/50 hover:text-red-500 p-2"><Trash2 size={16}/></button></td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
             </div>
           </div>
        )}

        {activeTab === 'historico_backup' && isAdmin && (
          <div className="space-y-8 animate-in fade-in">
             <div className="flex flex-col md:flex-row md:items-center gap-6 bg-[#0a0a0a] p-8 rounded-[3rem] border border-white/5 shadow-xl">
                 <div className="flex-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">SELECIONE O MÊS DE REFERÊNCIA</p>
                    <select value={mesBackup} onChange={(e) => setMesBackup(e.target.value)} className="w-full bg-black border border-white/10 text-yellow-400 p-4 rounded-2xl outline-none font-black uppercase text-sm appearance-none cursor-pointer">
                        {mesesDisponiveis.map(m => <option key={m} value={m}>{formatMes(m)}</option>)}
                    </select>
                 </div>
                 <div className="flex-1 flex gap-6">
                    <div className="flex-1 bg-black p-4 rounded-2xl border border-white/5">
                        <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest mb-1">PRODUÇÃO BRUTA</p>
                        <p className="text-xl font-mono text-white italic font-black">R$ {formatMoney(mesBackupBruto)}</p>
                    </div>
                    <div className="flex-1 bg-black p-4 rounded-2xl border border-green-500/20">
                        <p className="text-[9px] text-green-500/70 font-black uppercase tracking-widest mb-1">SAQUES PAGOS</p>
                        <p className="text-xl font-mono text-green-400 italic font-black">R$ {formatMoney(mesBackupPago)}</p>
                    </div>
                 </div>
             </div>

             <div className="bg-[#0a0a0a] border border-white/5 rounded-[3.5rem] overflow-hidden shadow-2xl">
                 <table className="w-full text-left font-black uppercase text-[10px] tracking-widest whitespace-nowrap min-w-max">
                   <thead className="bg-white/5 text-zinc-500 border-b border-white/5">
                     <tr><th className="px-8 py-6">MEMBRO</th><th className="px-8 py-6">TIPO</th><th className="px-8 py-6">CLIENTE / ID</th><th className="px-8 py-6">VALOR TOTAL</th><th className="px-8 py-6">DATA</th></tr>
                   </thead>
                   <tbody className="divide-y divide-white/5">
                     {registrosDoMes.map((r: any) => (
                       <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                         <td className="px-8 py-6 text-white text-xs">{r.nome || r.nomeVendedor}</td>
                         <td className="px-8 py-6 text-zinc-500">{r.tipo || 'VENDA'}</td>
                         <td className="px-8 py-6 text-yellow-400 italic">{r.cliente || r.recrutadoId || r.item || '-'}</td>
                         <td className={`px-8 py-6 font-mono text-sm ${r.tipo === 'SAQUE' ? 'text-red-500' : 'text-green-500'}`}>{r.tipo === 'SAQUE' ? '-' : ''} R$ {formatMoney(r.valor || r.financeiro || r.cashbackExtra)}</td>
                         <td className="px-8 py-6 text-zinc-600">{new Date(r.criado_em).toLocaleDateString('pt-BR')}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
             </div>
          </div>
        )}

        {activeTab === 'gestao' && (
           <div className="bg-[#0a0a0a] border border-white/5 rounded-[3.5rem] overflow-hidden shadow-2xl animate-in fade-in">
              <div className="overflow-x-auto">
                 <table className="w-full text-left font-black uppercase text-[10px] tracking-widest whitespace-nowrap min-w-max">
                   <thead className="bg-white/5 text-zinc-500 border-b border-white/5">
                     <tr><th className="px-8 py-6">MEMBRO / VENDEDOR</th><th className="px-8 py-6">TIPO</th><th className="px-8 py-6">CLIENTE / ID</th><th className="px-8 py-6">VALOR TOTAL</th><th className="px-8 py-6">DATA</th></tr>
                   </thead>
                   <tbody className="divide-y divide-white/5">
                     {registros.filter(r => r.status === 'APROVADO').map((r: any) => (
                       <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                         <td className="px-8 py-6 text-white text-xs">{r.nome || r.nomeVendedor}</td>
                         <td className="px-8 py-6 text-zinc-500">{r.tipo || 'VENDA'}</td>
                         <td className="px-8 py-6 text-yellow-400 italic">{r.cliente || r.recrutadoId || r.item || '-'}</td>
                         <td className={`px-8 py-6 font-mono text-sm ${r.tipo === 'SAQUE' ? 'text-red-500' : 'text-green-500'}`}>{r.tipo === 'SAQUE' ? '-' : ''} R$ {formatMoney(r.valor || r.financeiro || r.cashbackExtra)}</td>
                         <td className="px-8 py-6 text-zinc-600">{new Date(r.criado_em).toLocaleDateString('pt-BR')}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
              </div>
           </div>
        )}

      </main>

      {membroSelecionado && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-6 animate-in fade-in backdrop-blur-sm">
           <div className="bg-[#050505] border border-white/10 w-full max-w-5xl rounded-[4rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-12 border-b border-white/5 flex justify-between items-start bg-gradient-to-br from-yellow-400/5 to-transparent relative">
                 <button onClick={() => setMembroSelecionado(null)} className="absolute top-10 right-10 text-zinc-600 hover:text-yellow-400 bg-black p-3 rounded-full border border-white/5"><X size={24}/></button>
                 <div className="flex items-center gap-8 w-full pr-16">
                    <img src={membroSelecionado.avatar || `https://ui-avatars.com/api/?name=${membroSelecionado.nome}&background=EAB308&color=000`} className="w-32 h-32 rounded-[2.5rem] border-2 border-yellow-400 shadow-[0_0_40px_rgba(250,204,21,0.2)]" alt="" />
                    <div className="flex-1 min-w-0">
                       <h2 className="text-4xl sm:text-5xl font-black uppercase italic tracking-tighter text-white leading-none truncate">{membroSelecionado.nome}</h2>
                       <p className="text-yellow-400 font-black uppercase tracking-[0.3em] text-[10px] mt-4 bg-yellow-400/10 inline-block px-4 py-1.5 rounded-full">{membroSelecionado.cargoPainel}</p>
                    </div>
                 </div>
              </div>
              <div className="p-12 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-2 gap-12">
                 <div className="space-y-6">
                    <div className="bg-[#0a0a0a] border border-white/5 p-10 rounded-[3rem]"><p className="text-[10px] text-zinc-600 font-black uppercase mb-3 tracking-widest">Produção Bruta (Mês)</p><p className="text-5xl font-mono italic text-white font-black">R$ {formatMoney(membroSelecionado.vendas)}</p></div>
                    <div className="bg-green-500/5 border border-green-500/20 p-10 rounded-[3rem] shadow-[0_0_30px_rgba(34,197,94,0.05)]"><p className="text-[10px] text-green-500 font-black uppercase mb-3 tracking-widest">Saldo a Receber</p><p className="text-5xl font-mono italic text-green-400 font-black">R$ {formatMoney(calcAReceber(membroSelecionado))}</p></div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="bg-blue-500/5 border border-blue-500/10 p-6 rounded-[2rem]"><p className="text-[9px] font-black text-blue-500 mb-1 uppercase tracking-widest">Corridinhas</p><p className="text-2xl font-mono text-blue-400">+R$ {formatMoney(membroSelecionado.cashbackExtra)}</p></div>
                      <div className="bg-red-500/5 border border-red-500/10 p-6 rounded-[2rem]"><p className="text-[9px] font-black text-red-500 mb-1 uppercase tracking-widest">Já Pago</p><p className="text-2xl font-mono text-red-400">-R$ {formatMoney(membroSelecionado.cashbackPago)}</p></div>
                    </div>
                 </div>
                 <div className="space-y-4">
                    <h3 className="text-xl font-black uppercase italic text-zinc-500 flex items-center gap-3 mb-6"><History size={20}/> ÚLTIMOS LANÇAMENTOS</h3>
                    {historicoMembro.length === 0 && <p className="text-zinc-700 text-xs font-black uppercase tracking-widest p-8 text-center bg-[#0a0a0a] rounded-3xl">Nenhum histórico no mês atual.</p>}
                    {historicoMembro.map((r: any) => (
                      <div key={r.id} className="flex justify-between items-center bg-[#0a0a0a] p-6 rounded-[2rem] border border-white/5 hover:border-white/10 transition-colors">
                         <div><p className={`font-black text-sm uppercase italic ${r.tipo === 'CORRIDINHA' ? 'text-blue-400' : r.tipo === 'SAQUE' ? 'text-red-400' : 'text-white'}`}>{r.item || r.tipo}</p><p className="text-[9px] text-zinc-600 tracking-widest uppercase mt-1.5">{new Date(r.criado_em).toLocaleDateString('pt-BR')} • {r.cliente || 'AFL'}</p></div>
                         <p className={`font-mono text-base font-black ${r.tipo === 'SAQUE' ? 'text-red-500' : 'text-green-500'}`}>{r.tipo === 'SAQUE' ? '-' : '+'} R$ {formatMoney(r.valor || r.cashbackExtra || r.financeiro)}</p>
                      </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      )}

      {modalParcela && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 p-4 animate-in zoom-in-95">
           <div className="bg-[#0a0a0a] border border-zinc-800 p-12 rounded-[3.5rem] w-full max-w-md shadow-[0_0_50px_rgba(34,197,94,0.1)] relative">
              <button onClick={() => setModalParcela(null)} className="absolute top-8 right-8 text-zinc-600 hover:text-red-500 bg-black p-2 rounded-full border border-white/5"><X size={24}/></button>
              <h3 className="text-3xl font-black italic text-white uppercase tracking-tighter mb-8 text-center">RECEBER PARCELA</h3>
              <form onSubmit={handlePagarParcela} className="space-y-8">
                 <div className="bg-black border border-white/5 p-6 rounded-3xl text-center mb-4"><p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">CLIENTE DEVENDO</p><p className="text-xl font-black text-white italic">{modalParcela.cliente}</p></div>
                 <InputField label={`VALOR RECEBIDO AGORA (FALTAM R$ ${formatMoney(Number(modalParcela.valor) - Number(modalParcela.valorRecebido))})`} type="number" value={valorParcela} onChange={setValorParcela} placeholder="R$ 0,00" />
                 {parseFloat(valorParcela || '0') < (Number(modalParcela.valor) - Number(modalParcela.valorRecebido)) && valorParcela !== '' && (
                    <div className="p-6 bg-red-500/5 border border-red-500/20 rounded-3xl animate-in fade-in">
                       <InputField label="NOVO VENCIMENTO (PRÓXIMA PARCELA)" type="date" value={proximoVencimento} onChange={setProximoVencimento} />
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

function StatCard({ title, value, icon, type = "number", highlight = false }: any) {
  const displayValue = type === 'money' ? `R$ ${formatMoney(value)}` : value;
  return (
    <div className={`p-10 rounded-[3rem] relative overflow-hidden transition-all shadow-xl ${highlight ? 'bg-gradient-to-br from-[#1a1400] to-[#0a0a0a] border border-yellow-500/30 shadow-yellow-500/5' : 'bg-[#0a0a0a] border border-white/5'}`}>
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