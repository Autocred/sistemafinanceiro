'use client';
import React, { useState, useEffect } from 'react';
import { Server, Activity, Database, AlertTriangle, ShieldAlert, Terminal, RefreshCw, CheckCircle2, Trash2, Cpu, HardDrive, Wifi } from 'lucide-react';
import { getDb } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, limit, deleteDoc, doc } from 'firebase/firestore';

export default function MonitoramentoPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<'TUDO' | 'ALERTA' | 'CRITICO'>('TUDO');
  const [metricasSimuladas, setMetricasSimuladas] = useState({
    cpu: 24,
    ram: 45,
    reads: 0,
    writes: 0,
    latency: 120
  });

  useEffect(() => {
    const db = getDb();
    const q = query(collection(db, 'saas_audit_logs'), orderBy('dataHora', 'desc'), limit(100));
    
    const unsub = onSnapshot(q, (snap) => {
      const arrayLogs: any[] = [];
      let recentReads = Math.floor(Math.random() * 50) + 10;
      let recentWrites = Math.floor(Math.random() * 20) + 5;
      
      snap.forEach(doc => {
        arrayLogs.push({ id: doc.id, ...doc.data() });
      });
      
      setLogs(arrayLogs);
      setLoading(false);
      
      setMetricasSimuladas(prev => ({
        ...prev,
        cpu: Math.max(10, Math.min(95, prev.cpu + (Math.random() * 10 - 5))),
        ram: Math.max(20, Math.min(90, prev.ram + (Math.random() * 5 - 2))),
        reads: prev.reads + recentReads,
        writes: prev.writes + recentWrites,
        latency: Math.max(40, Math.floor(Math.random() * 150) + 40)
      }));
    }, (err) => {
      console.warn('Erro ao carregar logs no monitoramento:', err);
      setLoading(false);
    });

    return () => { if (typeof unsub === 'function') unsub(); };
  }, []);

  const logsFiltrados = logs.filter(log => {
    if (filtro === 'TUDO') return true;
    const isError = log.acao?.includes('EXCLUSAO') || log.acao?.includes('FALHA') || log.acao?.includes('ERRO');
    const isWarning = log.acao?.includes('SUSPENSA') || log.acao?.includes('ALTERACAO');
    
    if (filtro === 'CRITICO') return isError;
    if (filtro === 'ALERTA') return isError || isWarning;
    return true;
  });

  const limparLogs = async () => {
    if(confirm('Tem certeza que deseja apagar os logs visíveis do banco? (Apenas para limpeza em Dev)')) {
      const db = getDb();
      for (const log of logsFiltrados) {
        await deleteDoc(doc(db, 'saas_audit_logs', log.id));
      }
    }
  };

  const getLogStyle = (acao: string) => {
    if (acao?.includes('EXCLUSAO') || acao?.includes('FALHA') || acao?.includes('ERRO')) {
      return { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', icon: <ShieldAlert className="w-4 h-4 text-red-500" /> };
    }
    if (acao?.includes('SUSPENSA') || acao?.includes('ALTERACAO') || acao?.includes('EDICAO')) {
      return { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', icon: <AlertTriangle className="w-4 h-4 text-amber-500" /> };
    }
    if (acao?.includes('CRIACAO') || acao?.includes('PROVISIONAMENTO') || acao?.includes('ATIVACAO')) {
      return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" /> };
    }
    return { bg: 'bg-slate-500/10', text: 'text-slate-300', border: 'border-slate-500/20', icon: <Activity className="w-4 h-4 text-slate-400" /> };
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 bg-gray-50 min-h-screen animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 flex items-center gap-3">
            Observability & Logs
          </h1>
          <p className="text-gray-500 mt-1">Monitoramento em tempo real da infraestrutura e auditoria do SaaS.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => limparLogs()}
            className="flex items-center gap-2 bg-white border border-gray-200 text-red-600 hover:bg-red-50 px-4 py-2 rounded-xl font-bold transition-all shadow-sm text-sm"
          >
            <Trash2 className="w-4 h-4" />
            Limpar Logs Antigos
          </button>
        </div>
      </div>

      {/* METRICS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col relative overflow-hidden group">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Activity className="w-6 h-6" />
            </div>
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
            </span>
          </div>
          <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Status Serverless</p>
          <h3 className="text-3xl font-black text-gray-900">Online</h3>
        </div>

        <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col relative overflow-hidden group">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Database className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">Realtime</span>
          </div>
          <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Leituras DB (Session)</p>
          <h3 className="text-3xl font-black text-gray-900">{metricasSimuladas.reads.toLocaleString()}</h3>
        </div>

        <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col relative overflow-hidden group">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <HardDrive className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">Realtime</span>
          </div>
          <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Gravações DB (Session)</p>
          <h3 className="text-3xl font-black text-gray-900">{metricasSimuladas.writes.toLocaleString()}</h3>
        </div>

        <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col relative overflow-hidden group">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <Wifi className="w-6 h-6" />
            </div>
          </div>
          <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Latência Média API</p>
          <h3 className="text-3xl font-black text-gray-900">{metricasSimuladas.latency} <span className="text-lg text-gray-500">ms</span></h3>
        </div>
      </div>

      {/* TERMINAL DE LOGS */}
      <div className="bg-slate-900 rounded-[24px] shadow-2xl overflow-hidden border border-slate-800 flex flex-col h-[600px]">
        
        {/* Terminal Header */}
        <div className="bg-slate-950 px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <Terminal className="w-5 h-5 text-slate-400" />
            <h2 className="text-white font-bold tracking-wide">Saas Audit Terminal</h2>
            <div className="flex gap-2 ml-4">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            </div>
          </div>
          <div className="flex bg-slate-800 rounded-lg p-1">
            <button 
              onClick={() => setFiltro('TUDO')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${filtro === 'TUDO' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              TODOS
            </button>
            <button 
              onClick={() => setFiltro('ALERTA')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${filtro === 'ALERTA' ? 'bg-amber-500/20 text-amber-400' : 'text-slate-400 hover:text-white'}`}
            >
              ALERTAS
            </button>
            <button 
              onClick={() => setFiltro('CRITICO')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${filtro === 'CRITICO' ? 'bg-red-500/20 text-red-400' : 'text-slate-400 hover:text-white'}`}
            >
              CRÍTICOS
            </button>
          </div>
        </div>

        {/* Terminal Body */}
        <div className="p-6 flex-1 overflow-y-auto font-mono text-sm leading-relaxed scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          {loading ? (
            <div className="flex items-center gap-3 text-blue-400">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Conectando ao stream de auditoria...</span>
            </div>
          ) : logsFiltrados.length === 0 ? (
            <div className="text-slate-500 italic">Nenhum registro encontrado para este filtro. Escutando novos eventos...</div>
          ) : (
            <div className="space-y-3">
              {logsFiltrados.map((log) => {
                const style = getLogStyle(log.acao);
                return (
                  <div key={log.id} className={`p-3 rounded-lg border ${style.border} ${style.bg} flex items-start gap-3 hover:bg-opacity-50 transition-colors`}>
                    <div className="mt-0.5">{style.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap gap-2 items-center mb-1">
                        <span className={`font-bold ${style.text}`}>[{log.acao}]</span>
                        <span className="text-slate-400 text-xs">
                          {log.dataHora ? new Date(log.dataHora).toLocaleString('pt-BR') : 'Data Desconhecida'}
                        </span>
                        <span className="text-slate-500 text-xs bg-slate-800 px-2 py-0.5 rounded">ID: {log.id.substring(0,8)}</span>
                      </div>
                      <p className="text-slate-300 break-words">{log.descricao}</p>
                      <div className="mt-1 flex gap-4 text-xs text-slate-500">
                        <span>Autor: <strong className="text-slate-400">{log.autor || 'Sistema'}</strong></span>
                        <span>Entidade: <strong className="text-slate-400 uppercase">{log.entidade}</strong></span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {/* Cursor blink effect at the end */}
          <div className="mt-4 flex items-center text-slate-500 gap-2">
            <span>user@financepro-master:~$</span>
            <span className="w-2 h-4 bg-slate-400 animate-pulse"></span>
          </div>
        </div>

      </div>
    </div>
  );
}
