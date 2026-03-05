"use client";
import React, { useEffect, useState } from 'react';
import { Trash2, RefreshCw, Search, Database, AlertCircle } from 'lucide-react';

// INTERFACE PARA MATAR O ERRO DE TYPESCRIPT
interface Registro {
  id: string;
  nome: string;
  tipo: string;
  valor: number;
  valorRecebido: number;
  cashbackExtra: number;
  status: string;
  criado_em: string;
}

export default function AdminLogs() {
  const [logs, setLogs] = useState<Registro[]>([]); // Corrigido aqui!
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("");

  const carregarLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/logs');
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Erro ao carregar:", e);
    } finally {
      setLoading(false);
    }
  };

  const deletarRegistro = async (id: string) => {
    if (!confirm("Isso vai apagar o log e SUBTRAIR o valor do saldo do membro. Confirmar?")) return;
    
    const res = await fetch('/api/admin/logs', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });

    if (res.ok) carregarLogs();
  };

  useEffect(() => { carregarLogs(); }, []);

  const logsFiltrados = logs.filter((l) => 
    l.nome?.toLowerCase().includes(filtro.toLowerCase()) || 
    l.tipo?.toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-10 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
          <div>
            <h1 className="text-4xl font-black italic tracking-tighter flex items-center gap-3">
              <Database className="text-purple-500" size={32} /> CENTRAL DE LOGS
            </h1>
            <p className="text-zinc-500 font-medium">Auditando o banco de dados da Equipe AFL</p>
          </div>
          <button 
            onClick={carregarLogs}
            className="bg-white/5 hover:bg-white/10 border border-white/10 px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all"
          >
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} /> ATUALIZAR
          </button>
        </header>

        {/* BUSCA */}
        <div className="relative mb-8">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por Maximus, VZ, Corridinha..." 
            className="w-full bg-zinc-900/40 border border-white/5 rounded-2xl py-5 pl-14 pr-6 focus:outline-none focus:border-purple-500/50 transition-all text-lg"
            onChange={(e) => setFiltro(e.target.value)}
          />
        </div>

        {/* TABELA GLASSMORPHIC */}
        <div className="bg-zinc-900/20 border border-white/5 rounded-[2.5rem] overflow-hidden backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-zinc-500">Membro</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-zinc-500">Tipo</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-zinc-500">Valor Real</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-zinc-500 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {logsFiltrados.length === 0 && !loading && (
                  <tr><td colSpan={4} className="p-20 text-center text-zinc-600">Nenhum registro encontrado.</td></tr>
                )}
                {logsFiltrados.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="p-6">
                      <div className="font-bold text-zinc-200">{log.nome}</div>
                      <div className="text-[10px] text-zinc-600 font-mono">{new Date(log.criado_em).toLocaleString('pt-BR')}</div>
                    </td>
                    <td className="p-6">
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-black ${log.tipo === 'CORRIDINHA' ? 'bg-blue-500/10 text-blue-400' : 'bg-green-500/10 text-green-400'}`}>
                        {log.tipo}
                      </span>
                    </td>
                    <td className="p-6 font-mono font-bold text-purple-400">
                      R$ {(log.cashbackExtra || log.valorRecebido || 0).toFixed(2)}
                    </td>
                    <td className="p-6 text-right">
                      <button 
                        onClick={() => deletarRegistro(log.id)}
                        className="opacity-0 group-hover:opacity-100 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white p-3 rounded-xl transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}