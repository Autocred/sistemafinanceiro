'use client';
import React, { useState, useEffect } from 'react';
import { 
  Shield, Key, AlertTriangle, Lock, Eye, CheckCircle2, 
  Smartphone, Monitor, Globe, XCircle, ShieldAlert,
  Server, UserX, Activity
} from 'lucide-react';
import { getDb } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, setDoc, getDoc, updateDoc, doc, limit } from 'firebase/firestore';

interface Dispositivo {
  id: string;
  nome: string;
  ip: string;
  localizacao: string;
  ultimoAcesso: string;
  isAtual: boolean;
}

export default function SegurancaPage() {
  const [logsSeguranca, setLogsSeguranca] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  
  // Policies States
  const [force2FA, setForce2FA] = useState(true);
  const [blockAfter5, setBlockAfter5] = useState(true);
  const [requireStrongPassword, setRequireStrongPassword] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  
  // Sessions State (Simulated based on context)
  const [sessoes, setSessoes] = useState<Dispositivo[]>([
    { id: 'dev_1', nome: 'Chrome no Windows', ip: '177.89.33.12', localizacao: 'São Paulo, BR', ultimoAcesso: 'Agora mesmo', isAtual: true },
    { id: 'dev_2', nome: 'Safari no iPhone', ip: '189.45.12.9', localizacao: 'Rio de Janeiro, BR', ultimoAcesso: 'Ontem às 14:30', isAtual: false },
    { id: 'dev_3', nome: 'Firefox no Mac', ip: '200.15.44.2', localizacao: 'Curitiba, BR', ultimoAcesso: '02 Ago 2026', isAtual: false },
  ]);

  useEffect(() => {
    setIsMounted(true);
    const db = getDb();
    const q = query(collection(db, 'saas_audit_logs'), orderBy('dataHora', 'desc'), limit(100));

    // Load config
    const loadConfig = async () => {
      try {
        const docRef = doc(db, 'saas_config', 'security');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const d = snap.data();
          setForce2FA(!!d.force2FA);
          setBlockAfter5(!!d.blockAfter5);
          setRequireStrongPassword(!!d.requireStrongPassword);
        }
      } catch (e) {}
    };
    loadConfig();

    // Load active users as sessions
    const qUsers = query(collection(db, 'users'), orderBy('lastLogin', 'desc'), limit(10));
    const unsubUsers = onSnapshot(qUsers, (snap) => {
      const activeSessions: Dispositivo[] = [];
      snap.forEach(d => {
        const data = d.data();
        if (data.status !== 'desativado' && data.ativo !== false && !data.forceLogout) {
          activeSessions.push({
            id: d.id,
            nome: data.nome + ' (' + data.email + ')',
            ip: data.role.toUpperCase(),
            localizacao: data.tenantId ? 'Tenant: ' + data.tenantId : 'Master',
            ultimoAcesso: data.lastLogin ? new Date(data.lastLogin).toLocaleString('pt-BR') : 'Desconhecido',
            isAtual: false // We don't have current user id easily here without auth hook, but it's ok
          });
        }
      });
      setSessoes(activeSessions);
    });

    
    const unsub = onSnapshot(q, (snap) => {
      const lista: any[] = [];
      snap.forEach(doc => {
        const data = doc.data();
        // Filtramos para a tela de segurança apenas eventos críticos, logins e sessões
        if (data.acao?.includes('LOGIN') || data.acao?.includes('SESSAO') || data.acao?.includes('ALERTA') || data.acao?.includes('BLOQUEIO')) {
          lista.push({ id: doc.id, ...data });
        }
      });
      setLogsSeguranca(lista);
      setLoadingLogs(false);
    }, (err) => {
      console.warn('Erro ao carregar logs na segurança:', err);
      setLoadingLogs(false);
    });

    return () => { 
      if (typeof unsub === 'function') unsub(); 
      if (typeof unsubUsers === 'function') unsubUsers(); 
    };
  }, []);

  
  const derrubarSessao = async (id: string, nome: string) => {
    if(confirm(`ATENÇÃO: Deseja forçar o logout do usuário "${nome}" imediatamente?`)) {
      const db = getDb();
      try {
        await updateDoc(doc(db, 'users', id), {
          forceLogout: true
        });
        
        await setDoc(doc(collection(db, 'saas_audit_logs')), {
           acao: 'SESSAO_REVOGADA',
           entidade: 'seguranca',
           entidadeId: id,
           descricao: `Sessão revogada remotamente: ${nome}.`,
           autor: 'Admin Master',
           dataHora: new Date().toISOString()
        });
        
        alert('Comando de logout forçado enviado com sucesso!');
      } catch(e) {
        alert('Erro ao derrubar sessão.');
      }
    }
  };

  
  const togglePolicy = async (policy: string, state: boolean, setter: any, dbKey: string) => {
    const newState = !state;
    setter(newState);
    const db = getDb();
    
    // Save to config
    await setDoc(doc(db, 'saas_config', 'security'), {
      [dbKey]: newState
    }, { merge: true });

    // Log
    await setDoc(doc(collection(db, 'saas_audit_logs')), {
       acao: 'POLITICA_ALTERADA',
       entidade: 'seguranca',
       entidadeId: policy,
       descricao: `A política de segurança "${policy}" foi ${newState ? 'ATIVADA' : 'DESATIVADA'}.`,
       autor: 'Admin Master',
       dataHora: new Date().toISOString()
    });
  };

  const simularAtaque = async () => {
    const db = getDb();
    await setDoc(doc(collection(db, 'saas_audit_logs')), {
       acao: 'FALHA_LOGIN',
       entidade: 'seguranca',
       entidadeId: 'unknown_ip',
       descricao: `Múltiplas falhas de login (IP: 145.23.44.11 - Rússia). Conta temporariamente bloqueada.`,
       autor: 'Sistema WAF',
       dataHora: new Date().toISOString()
    });
  };

  if (!isMounted) return null;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 bg-gray-50 min-h-screen animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 flex items-center gap-3">
            Central de Segurança (Vault)
          </h1>
          <p className="text-gray-500 mt-1">Proteção contra intrusões, políticas de acesso e rastreio de conexões.</p>
        </div>
        <button 
          onClick={simularAtaque}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-bold transition-all shadow-sm text-sm"
        >
          <ShieldAlert className="w-4 h-4 text-red-500" />
          Testar Alerta WAF
        </button>
      </div>

      {/* KPIS DE SEGURANÇA */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-[24px] border border-slate-700 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <Shield className="w-24 h-24 text-emerald-500" />
          </div>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">Monitoramento Ativo</span>
          </div>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1 relative z-10">Score de Segurança</p>
          <h3 className="text-4xl font-black text-white relative z-10">98<span className="text-xl text-slate-400">/100</span></h3>
        </div>

        <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Lock className="w-6 h-6" />
            </div>
          </div>
          <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Políticas Globais Ativas</p>
          <h3 className="text-3xl font-black text-gray-900">
            {[force2FA, blockAfter5, requireStrongPassword].filter(Boolean).length} <span className="text-lg text-gray-500 font-medium">de 3</span>
          </h3>
        </div>

        <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <UserX className="w-6 h-6" />
            </div>
          </div>
          <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">Tentativas Bloqueadas (24h)</p>
          <h3 className="text-3xl font-black text-gray-900">
            {logsSeguranca.filter(l => l.acao === 'FALHA_LOGIN').length}
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUNA ESQUERDA: DISPOSITIVOS E POLÍTICAS */}
        <div className="lg:col-span-1 space-y-8">
          
          {/* POLÍTICAS DE ACESSO */}
          <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2">
              <Key className="w-5 h-5 text-indigo-600" />
              Regras de Acesso
            </h2>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-gray-800 text-sm">Forçar 2FA</h4>
                  <p className="text-xs text-gray-500 mt-0.5">Exigir duplo fator para todos</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={force2FA} onChange={() => togglePolicy('Forçar 2FA', force2FA, setForce2FA, 'force2FA')} />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-gray-800 text-sm">Bloqueio contra Brute-Force</h4>
                  <p className="text-xs text-gray-500 mt-0.5">Travar IP após 5 falhas</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={blockAfter5} onChange={() => togglePolicy('Bloqueio após 5 falhas', blockAfter5, setBlockAfter5, 'blockAfter5')} />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-gray-800 text-sm">Senha Forte</h4>
                  <p className="text-xs text-gray-500 mt-0.5">Mínimo 8 chars, 1 Especial</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={requireStrongPassword} onChange={() => togglePolicy('Senha Forte', requireStrongPassword, setRequireStrongPassword, 'requireStrongPassword')} />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>
            </div>
          </div>

          {/* DISPOSITIVOS LOGADOS */}
          <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2">
              <Monitor className="w-5 h-5 text-blue-600" />
              Sessões Ativas
            </h2>
            
            <div className="space-y-4">
              {sessoes.map(s => (
                <div key={s.id} className="p-4 rounded-2xl border border-gray-100 bg-gray-50 flex items-start justify-between gap-3 group">
                  <div className="flex gap-3">
                    <div className="mt-1">
                      {s.nome.includes('iPhone') ? <Smartphone className="w-5 h-5 text-gray-400" /> : <Monitor className="w-5 h-5 text-gray-400" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                        {s.nome}
                        {s.isAtual && <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[9px] uppercase tracking-wider">Você</span>}
                      </h4>
                      <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1"><Globe className="w-3 h-3"/> {s.ip}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{s.localizacao} • {s.ultimoAcesso}</p>
                    </div>
                  </div>
                  {!s.isAtual && (
                    <button 
                      onClick={() => derrubarSessao(s.id, s.nome)}
                      className="px-3 py-1.5 flex items-center gap-1.5 bg-red-50 text-red-600 border border-red-200 hover:bg-red-600 hover:text-white rounded-lg transition-all text-xs font-bold uppercase tracking-wider"
                      title="Forçar Logout deste usuário"
                    >
                      <XCircle className="w-4 h-4" />
                      Derrubar Sessão
                    </button>
                  )}
                </div>
              ))}
              {sessoes.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">Nenhuma sessão ativa encontrada.</p>
              )}
            </div>
          </div>

        </div>

        {/* COLUNA DIREITA: LOGS DE SEGURANÇA */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full min-h-[600px]">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-red-500" />
                Histórico de Eventos de Segurança
              </h2>
              <p className="text-sm text-gray-500 mt-1">Logs filtrados apenas para alertas, logins e modificações de políticas.</p>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {loadingLogs ? (
                <p className="text-gray-500 text-center py-10">Carregando logs de segurança...</p>
              ) : logsSeguranca.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-2xl">
                  <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="font-bold text-gray-600">Nenhum alerta recente</h3>
                  <p className="text-sm text-gray-400">O sistema está seguro e sem eventos críticos no momento.</p>
                </div>
              ) : (
                logsSeguranca.map(log => {
                  const isCritico = log.acao?.includes('FALHA') || log.acao?.includes('REVOGADA');
                  const isSuccess = log.acao?.includes('LOGIN') && !log.acao?.includes('FALHA');
                  
                  return (
                    <div key={log.id} className={`p-4 rounded-xl border flex gap-4 items-start transition-all hover:bg-opacity-80 
                      ${isCritico ? 'bg-red-50/50 border-red-100' : isSuccess ? 'bg-emerald-50/50 border-emerald-100' : 'bg-gray-50 border-gray-200'}
                    `}>
                      <div className={`mt-1 rounded-full p-2 ${isCritico ? 'bg-red-100 text-red-600' : isSuccess ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                        {isCritico ? <ShieldAlert className="w-4 h-4"/> : isSuccess ? <CheckCircle2 className="w-4 h-4"/> : <AlertTriangle className="w-4 h-4"/>}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h4 className={`font-bold text-sm ${isCritico ? 'text-red-900' : isSuccess ? 'text-emerald-900' : 'text-gray-900'}`}>
                            {log.acao}
                          </h4>
                          <span className="text-xs font-semibold text-gray-500 bg-white px-2 py-1 rounded-md border border-gray-100 shadow-sm">
                            {new Date(log.dataHora).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mt-1 leading-relaxed">{log.descricao}</p>
                        <div className="mt-2 text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1">
                          <Shield className="w-3 h-3" /> Autor: {log.autor}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
