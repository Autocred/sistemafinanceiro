'use client';
import React, { useState, useEffect } from 'react';
import { getDb } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { Rocket, TrendingUp, Bug, Shield, Star, Server } from 'lucide-react';
import { getTenantId } from '@/lib/storage';

const TIPO_CONFIG: Record<string, { label: string; icon: React.ReactNode; cor: string; bg: string; border: string }> = {
  novo:      { label: 'Novo', icon: <Rocket className="w-3.5 h-3.5" />, cor: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  melhoria:  { label: 'Melhoria', icon: <TrendingUp className="w-3.5 h-3.5" />, cor: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200' },
  correcao:  { label: 'Correção', icon: <Bug className="w-3.5 h-3.5" />, cor: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  seguranca: { label: 'Segurança', icon: <Shield className="w-3.5 h-3.5" />, cor: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  breaking:  { label: 'Importante', icon: <Star className="w-3.5 h-3.5" />, cor: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200' },
};

export default function AtualizacoesCliente() {
  const [tenantId, setTenantIdState] = useState<string | null>(null);
  const [releases, setReleases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    // O Master testando a visão do cliente não possui tenantId.
    // Vamos tentar pegar o tenantId por 1 segundo. Se não vier, assumimos que é o Master (ou alguém sem tenant) e mostramos pelo menos as atualizações globais.
    let count = 0;
    const interval = setInterval(() => {
      const id = getTenantId();
      if (id) {
        setTenantIdState(id);
        clearInterval(interval);
      } else {
        count++;
        if (count > 5) { // Passou ~1.5s
          setTenantIdState('MASTER_VIEW');
          clearInterval(interval);
        }
      }
    }, 300);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!tenantId) return; // Aguarda resolver se é tenant ou master

    const db = getDb();
    const q = query(collection(db, 'saas_releases'), orderBy('dataLancamento', 'desc'), limit(50));
    
    const unsub = onSnapshot(q, (snap) => {
      const lista: any[] = [];
      snap.forEach(doc => {
        const data = doc.data();
        if (data.status === 'publicado') {
          const alvos = data.alvos;
          let isTarget = false;
          
          if (!alvos || alvos === 'todos') {
            isTarget = true;
          } else if (tenantId !== 'MASTER_VIEW' && Array.isArray(alvos) && alvos.includes(tenantId)) {
            isTarget = true;
          }

          if (isTarget) {
            lista.push({ id: doc.id, ...data });
          }
        }
      });
      setReleases(lista);
      setLoading(false);
    }, (err) => {
      console.error("Erro ao buscar atualizações", err);
      setLoading(false);
    });

    return () => unsub();
  }, [tenantId]);

  if (!isMounted) return null;

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-100 text-indigo-600 mb-4">
          <Server className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Atualizações do Sistema</h1>
        <p className="text-gray-500 mt-2 max-w-lg mx-auto">
          Acompanhe as últimas novidades, correções e melhorias lançadas na sua plataforma.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Carregando histórico de atualizações...</div>
      ) : releases.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50">
          <Rocket className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="font-bold text-gray-600">Nenhuma atualização registrada</h3>
          <p className="text-sm text-gray-400">Em breve novidades aparecerão por aqui.</p>
        </div>
      ) : (
        <div className="space-y-12 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
          {releases.map((rel, index) => (
            <div key={rel.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              
              <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-indigo-100 text-indigo-600 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10">
                {rel.destaque ? <Star className="w-4 h-4 fill-indigo-600" /> : <Rocket className="w-4 h-4" />}
              </div>
              
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-6 rounded-2xl border border-gray-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
                <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                  <h3 className="text-lg font-black text-gray-900">
                    Versão {rel.versao}
                  </h3>
                  <span className="text-xs font-semibold text-gray-400 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                    {new Date(rel.dataLancamento).toLocaleString('pt-BR')}
                  </span>
                </div>
                
                <h4 className="text-md font-bold text-indigo-600 mb-3">{rel.titulo}</h4>
                <p className="text-sm text-gray-600 mb-5 leading-relaxed">{rel.descricao}</p>
                
                {rel.changes && rel.changes.length > 0 && (
                  <div className="space-y-3 pt-4 border-t border-gray-50">
                    {rel.changes.map((change: any, i: number) => {
                      const cfg = TIPO_CONFIG[change.tipo] || TIPO_CONFIG['novo'];
                      return (
                        <div key={i} className="flex gap-3 items-start">
                          <span className={`mt-0.5 shrink-0 px-2 py-1 flex items-center gap-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${cfg.bg} ${cfg.cor} ${cfg.border}`}>
                            {cfg.icon} {cfg.label}
                          </span>
                          <span className="text-sm text-gray-700 leading-relaxed pt-0.5">{change.texto}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
