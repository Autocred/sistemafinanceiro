'use client';
import React, { useState, useEffect } from 'react';
import { 
  Building2, Users, Database, Server, CreditCard, 
  TrendingUp, Activity, ShieldCheck, Cpu, HardDrive, 
  Wallet, Rocket, ArrowUpRight, ArrowDownRight, MoreHorizontal, LifeBuoy
} from 'lucide-react';
import { getDb } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { formatarMoeda } from '@/lib/storage';
import Link from 'next/link';

export default function MasterDashboard() {
  const [metricas, setMetricas] = useState({
    licencasAtivas: 0,
    clientesOnline: 0,
    mrr: 0,
    faturado30d: 0,
    licencasVencendo: 0,
    inadimplentes: 0
  });
  
  const [logsAtividade, setLogsAtividade] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const db = getDb();
    const unsubs: any[] = [];

    try {
      // 1. Fetch Planos
      const unsubPlanos = onSnapshot(collection(db, 'admin_master_planos'), (snapPlanos) => {
        const mapaPlanos: Record<string, number> = {};
        snapPlanos.forEach(doc => {
          mapaPlanos[doc.id] = doc.data().preco || 0;
        });

        // 2. Fetch Licencas
        const unsubLicencas = onSnapshot(collection(db, 'admin_master_licencas'), (snapLicencas) => {
          let ativas = 0;
          let vencendo = 0;
          let inadimplentes = 0;
          let mrrTotal = 0;
          
          const hoje = new Date();
          const em7Dias = new Date();
          em7Dias.setDate(em7Dias.getDate() + 7);

          snapLicencas.forEach(doc => {
            const l = doc.data();
            if (l.status === 'ativa') {
               ativas++;
               if (l.plano && mapaPlanos[l.plano]) {
                  mrrTotal += mapaPlanos[l.plano];
               }
            }
            if (l.status === 'inadimplente') inadimplentes++;
            
            if (l.dataVencimento) {
              let v: Date | null = null;
              if (typeof l.dataVencimento.toDate === 'function') {
                v = l.dataVencimento.toDate();
              } else if (l.dataVencimento) {
                v = new Date(l.dataVencimento);
              }
              if (v && !isNaN(v.getTime()) && v > hoje && v <= em7Dias) {
                vencendo++;
              }
            }
          });
          
          setMetricas(prev => ({
            ...prev, 
            licencasAtivas: ativas, 
            licencasVencendo: vencendo,
            inadimplentes,
            mrr: mrrTotal
          }));
        }, (err) => {
          console.warn('Erro ao carregar licencas no dashboard master:', err);
        });
        unsubs.push(unsubLicencas);

      }, (err) => {
        console.warn('Erro ao carregar planos:', err);
      });
      unsubs.push(unsubPlanos);

      // 3. Fetch logs de auditoria
      const unsubLogs = onSnapshot(query(collection(db, 'saas_audit_logs'), orderBy('dataHora', 'desc'), limit(10)), (snapLogs) => {
        const logs: any[] = [];
        snapLogs.forEach(doc => {
          logs.push({ id: doc.id, ...doc.data() });
        });
        setLogsAtividade(logs);
        setLoading(false);
      }, (err) => {
        console.warn('Erro ao carregar audit logs:', err);
        setLoading(false);
      });
      unsubs.push(unsubLogs);

      // 4. Fetch Faturas
      const unsubFaturas = onSnapshot(collection(db, 'admin_master_faturas'), (snapFaturas) => {
        let faturado = 0;
        const mesAtual = new Date().toISOString().substring(0,7);
        snapFaturas.forEach(doc => {
          const f = doc.data();
          if (f.status === 'pago' && f.dataVencimento?.startsWith(mesAtual)) {
            faturado += f.valor || 0;
          }
        });
        setMetricas(prev => ({
          ...prev,
          faturado30d: faturado
        }));
      }, (err) => {
        console.warn('Erro ao carregar faturas:', err);
      });
      unsubs.push(unsubFaturas);

    } catch (e) {
      console.error('Erro na inicializacao do master dashboard:', e);
      setLoading(false);
    }

    return () => {
      unsubs.forEach(u => typeof u === 'function' && u());
    };
  }, []);

  const infrastructure = [
    { name: 'Uso de CPU', percent: 12, color: 'bg-blue-500', icone: <Cpu className="w-4 h-4 text-blue-600" /> },
    { name: 'Memória RAM', percent: 28, color: 'bg-emerald-500', icone: <Activity className="w-4 h-4 text-emerald-600" /> },
    { name: 'Espaço em Disco', percent: 15, color: 'bg-orange-500', icone: <HardDrive className="w-4 h-4 text-orange-600" /> },
    { name: 'Banco de Dados', percent: 5, color: 'bg-purple-500', icone: <Database className="w-4 h-4 text-purple-600" /> },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900 flex items-center gap-3">
            Visão Geral do Ecossistema
          </h1>
          <p className="text-gray-500 mt-1">Métricas em tempo real de toda a infraestrutura SaaS e faturamento.</p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/master/suporte" className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl font-bold transition-all text-sm border border-blue-200">
            <LifeBuoy className="w-4 h-4" /> Central de Suporte
          </Link>
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-2 rounded-xl text-sm font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Operação 100% Online
          </div>
        </div>
      </div>

      {/* KPIS PRINCIPAIS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* MRR */}
        <div 
          className="p-5 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 min-h-[140px] flex flex-col items-center justify-center text-center gap-2"
          style={{ background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)', border: 'none' }}
        >
          <div className="flex flex-col items-center gap-1.5 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/90 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> MRR (Recorrência)
            </span>
            <span className="text-[9px] font-black bg-black/20 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
              <ArrowUpRight className="w-2.5 h-2.5" /> +14%
            </span>
          </div>
          <h3 className="text-2xl font-black text-white">{formatarMoeda(metricas.mrr)}</h3>
          <p className="text-[10px] font-medium text-white/80 mt-1">
            Faturado este mês: {formatarMoeda(metricas.faturado30d)}
          </p>
        </div>

        {/* LICENÇAS ATIVAS */}
        <div 
          className="p-5 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 min-h-[140px] flex flex-col items-center justify-center text-center gap-2"
          style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', border: 'none' }}
        >
          <div className="flex flex-col items-center gap-1.5 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/90 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" /> Empresas Ativas
            </span>
            <span className="text-[9px] font-black bg-black/20 text-white px-2 py-0.5 rounded-full">
              TENANTS
            </span>
          </div>
          <h3 className="text-2xl font-black text-white">{metricas.licencasAtivas}</h3>
          <p className="text-[10px] font-medium text-white/80 mt-1">
            Bancos isolados e provisionados
          </p>
        </div>

        {/* VENCENDO EM 7 DIAS */}
        <div 
          className={`p-5 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 min-h-[140px] flex flex-col items-center justify-center text-center gap-2 ${metricas.licencasVencendo > 0 ? 'glow-pulse-amber indicator-blinking' : ''}`}
          style={{ 
            background: metricas.licencasVencendo > 0 ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : '#fff',
            border: metricas.licencasVencendo > 0 ? 'none' : '1px solid #e2e8f0'
          }}
        >
          <div className="flex flex-col items-center gap-1.5 mb-1">
            <span className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${metricas.licencasVencendo > 0 ? 'text-white/90' : 'text-amber-500'}`}>
              <Activity className="w-3.5 h-3.5" /> A Vencer na Semana
            </span>
            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${metricas.licencasVencendo > 0 ? 'bg-black/20 text-white' : 'bg-amber-100 text-amber-600'}`}>
              7 DIAS
            </span>
          </div>
          <h3 className={`text-2xl font-black ${metricas.licencasVencendo > 0 ? 'text-white' : 'text-gray-900'}`}>{metricas.licencasVencendo}</h3>
          <p className={`text-[10px] font-medium mt-1 ${metricas.licencasVencendo > 0 ? 'text-white/80' : 'text-gray-500'}`}>
            Contratos com renovação próxima
          </p>
        </div>

        {/* INADIMPLENTES */}
        <div 
          className={`p-5 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 min-h-[140px] flex flex-col items-center justify-center text-center gap-2 ${metricas.inadimplentes > 0 ? 'glow-pulse-red indicator-blinking' : ''}`}
          style={{ 
            background: metricas.inadimplentes > 0 ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' : '#fff',
            border: metricas.inadimplentes > 0 ? 'none' : '1px solid #e2e8f0'
          }}
        >
          <div className="flex flex-col items-center gap-1.5 mb-1">
            <span className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${metricas.inadimplentes > 0 ? 'text-white/90' : 'text-red-500'}`}>
              <ShieldCheck className="w-3.5 h-3.5" /> Inadimplentes
            </span>
            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${metricas.inadimplentes > 0 ? 'bg-black/20 text-white' : 'bg-red-100 text-red-600'}`}>
              ALERTA
            </span>
          </div>
          <h3 className={`text-2xl font-black ${metricas.inadimplentes > 0 ? 'text-white' : 'text-gray-900'}`}>{metricas.inadimplentes}</h3>
          <p className={`text-[10px] font-medium mt-1 ${metricas.inadimplentes > 0 ? 'text-white/80' : 'text-gray-500'}`}>
            Bloqueio automático em 5 dias
          </p>
        </div>

      </div>

      {/* SAÚDE DA INFRAESTRUTURA & ATIVIDADE RECENTE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* SERVIDORES / CLUSTER */}
        <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b border-gray-100 pb-4">
            <div>
              <h2 className="font-bold text-lg text-gray-900">Cluster & Servidores</h2>
              <p className="text-xs text-gray-500">Google Cloud / Firebase Platform</p>
            </div>
            <Server className="w-5 h-5 text-gray-400" />
          </div>

          <div className="space-y-4">
            {infrastructure.map((item) => (
              <div key={item.name} className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium text-gray-700 flex items-center gap-2">
                    {item.icone} {item.name}
                  </span>
                  <span className="font-bold text-gray-900">{item.percent}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`${item.color} h-2 rounded-full transition-all duration-500`} 
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
            <span>Latência média: <strong>32ms</strong></span>
            <span>Uptime: <strong>99.98%</strong></span>
          </div>
        </div>

        {/* LOGS DE AUDITORIA MASTER */}
        <div className="lg:col-span-2 bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-4">
              <div>
                <h2 className="font-bold text-lg text-gray-900">Auditoria Global de Eventos</h2>
                <p className="text-xs text-gray-500">Ações críticas executadas no painel Master</p>
              </div>
              <Activity className="w-5 h-5 text-gray-400" />
            </div>

            <div className="space-y-3 overflow-y-auto max-h-[260px] custom-scrollbar pr-2">
              {logsAtividade.length === 0 ? (
                <p className="text-sm text-gray-400 py-6 text-center">Nenhum evento registrado recentemente.</p>
              ) : (
                logsAtividade.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50/70 border border-gray-100 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <div>
                        <p className="text-xs font-bold text-gray-800">{log.descricao || log.acao}</p>
                        <p className="text-[10px] text-gray-400 font-medium">Autor: {log.autor || 'Sistema'} • {log.entidade || 'Global'}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 whitespace-nowrap">
                      {log.dataHora ? new Date(log.dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
            <span className="text-xs text-gray-500">Monitoramento Contínuo Ativo</span>
            <Link href="/master/monitoramento" className="text-xs font-bold text-blue-600 hover:underline">
              Ver Todos os Logs →
            </Link>
          </div>
        </div>

      </div>

    </div>
  );
}
