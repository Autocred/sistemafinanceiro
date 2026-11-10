'use client';
import React, { useEffect, useState } from 'react';
import { IndicadorCard } from '@/components/IndicadorCard';
import { FiltroBar, FiltroTipo } from '@/components/FiltroBar';
import { LancamentoRow } from '@/components/LancamentoRow';
import { useConfiguracao } from '@/hooks/useConfiguracao';
import { LayoutDashboard, RefreshCw, Bell, ArrowLeft, AlertCircle } from 'lucide-react';
import { NextPage } from 'next';
import Link from 'next/link';

/**
 * Página da Central Inteligente de Alertas – estritamente isolada por Licença (Tenant).
 * Respeita 100% a Regra White‑Label SaaS:
 * - Exibe nomeSistema, fotoPerfil e cores exclusivas da licença logada.
 * - NUNCA mistura dados com a licença Master ou outras licenças.
 */
const CentralPage: NextPage = () => {
  const { cfg, tenantId, loading: configLoading } = useConfiguracao();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<FiltroTipo>('todas');

  const fetchMonitoramento = async () => {
    setLoading(true);
    setErro(null);
    try {
      // Identifica o tenant ativo
      let activeT = tenantId;
      if (!activeT && typeof window !== 'undefined') {
        activeT = new URLSearchParams(window.location.search).get('tenant') ||
                  localStorage.getItem('last_logged_tenantId') ||
                  'master';
      }

      // Chama a API com o parâmetro isolado
      const res = await fetch(`/api/cron/monitoramento?tenant=${encodeURIComponent(activeT || 'master')}`);
      const json = await res.json();
      
      if (res.ok && json.status === 'ok') {
        // Filtra estritamente os resultados para pertencerem única e exclusivamente a este tenant
        const isolados = (json.resultados || []).filter((r: any) => r.tenant === (activeT || 'master'));
        setData({
          ...json,
          resultados: isolados
        });
      } else {
        setErro(json.error || 'Falha ao sincronizar dados do monitoramento.');
      }
    } catch (e: any) {
      console.error('Falha ao buscar monitoramento', e);
      setErro(e.message || 'Erro de conexão ao buscar monitoramento.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!configLoading) {
      fetchMonitoramento();
    }
  }, [tenantId, configLoading]);

  const primaryColor = cfg?.corPrimaria || '#10b981';
  const nomeSistema = cfg?.nomeSistema || 'AUTOCRED Promotora';
  const fotoPerfil = cfg?.fotoPerfil;

  // Agrega métricas globais exclusivamente do tenant ativo
  const resultados = data?.resultados || [];
  const totalAPagar = resultados.reduce((sum: number, r: any) => {
    const pend = (r.pendencias || []).filter((p: any) => p.tipo !== 'recebeHoje');
    return sum + pend.reduce((s: number, it: any) => s + Number(it.saldoPendente || it.valor || 0), 0);
  }, 0);

  const totalAReceber = resultados.reduce((sum: number, r: any) => {
    const rec = (r.pendencias || []).filter((p: any) => p.tipo === 'recebeHoje');
    return sum + rec.reduce((s: number, it: any) => s + Number(it.saldoPendente || it.valor || 0), 0);
  }, 0);

  const totalVencido = resultados.reduce((sum: number, r: any) => {
    const venc = (r.pendencias || []).filter((p: any) => p.tipo === 'vencida');
    return sum + venc.reduce((s: number, it: any) => s + Number(it.saldoPendente || it.valor || 0), 0);
  }, 0);

  const totalHoje = resultados.reduce((sum: number, r: any) => {
    const hoje = (r.pendencias || []).filter((p: any) => p.tipo === 'venceHoje' || p.tipo === 'recebeHoje');
    return sum + hoje.reduce((s: number, it: any) => s + Number(it.saldoPendente || it.valor || 0), 0);
  }, 0);

  // Filtragem dos lançamentos
  const todasPendencias = resultados.flatMap((r: any) => r.pendencias || []);
  const filtradas = todasPendencias.filter((p: any) => {
    switch (filtro) {
      case 'todas':
        return true;
      case 'aPagar':
        return p.tipo !== 'recebeHoje';
      case 'aReceber':
        return p.tipo === 'recebeHoje';
      case 'vencidas':
        return p.tipo === 'vencida';
      case 'venceHoje':
        return p.tipo === 'venceHoje' || p.tipo === 'recebeHoje';
      case 'prioritarias':
        return p.prioridade === 'alta';
      default:
        return true;
    }
  });

  const tenantQueryParam = tenantId ? `?tenant=${encodeURIComponent(tenantId)}` : '';

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto min-h-screen">
      {/* Header White Label com Isolamento Estrito */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          {fotoPerfil ? (
            <img src={fotoPerfil} alt={nomeSistema} className="h-12 w-12 rounded-full object-cover border" />
          ) : (
            <div
              className="h-12 w-12 rounded-full flex items-center justify-center font-bold text-white text-lg shadow-sm"
              style={{ backgroundColor: primaryColor }}
            >
              🔔
            </div>
          )}
          <div>
            <h1 className="text-xl md:text-2xl font-bold" style={{ color: primaryColor }}>
              {nomeSistema}
            </h1>
            <p className="text-xs md:text-sm text-slate-500">
              Central Inteligente de Alertas & Monitoramento Contínuo
            </p>
          </div>
        </div>

        {/* Botões de Ação com Parâmetro de Tenant Preservado */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/notifications${tenantQueryParam}`}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
            style={{ backgroundColor: primaryColor }}
          >
            <Bell size={16} />
            Configurar Notificações Push
          </Link>

          <button
            onClick={fetchMonitoramento}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Atualizar
          </button>

          <Link
            href={`/${tenantQueryParam}`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <ArrowLeft size={16} />
            Início
          </Link>
        </div>
      </div>

      {/* Exibição de Erro ou Estado de Carregamento */}
      {erro && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" size={20} />
            <div>
              <p className="text-sm font-bold text-amber-800 dark:text-amber-200">
                Aviso de Sincronização
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                {erro}
              </p>
            </div>
          </div>
          <button
            onClick={fetchMonitoramento}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition"
          >
            Tentar Novamente
          </button>
        </div>
      )}

      {(loading || configLoading) && !data ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <RefreshCw size={32} className="animate-spin mb-3" style={{ color: primaryColor }} />
          <p className="text-sm">Carregando métricas da licença...</p>
        </div>
      ) : (
        <>
          {/* Cards de indicadores da Licença */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <IndicadorCard
              title="A PAGAR"
              value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalAPagar)}
              icon={<LayoutDashboard size={20} />}
              bgColor={primaryColor}
            />
            <IndicadorCard
              title="A RECEBER"
              value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalAReceber)}
              icon={<LayoutDashboard size={20} />}
              bgColor={primaryColor}
            />
            <IndicadorCard
              title="VENCIDO"
              value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalVencido)}
              icon={<LayoutDashboard size={20} />}
              bgColor={primaryColor}
            />
            <IndicadorCard
              title="HOJE"
              value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalHoje)}
              icon={<LayoutDashboard size={20} />}
              bgColor={primaryColor}
            />
          </div>

          {/* Barra de Filtros */}
          <div className="mb-4">
            <FiltroBar selected={filtro} onChange={setFiltro} />
          </div>

          {/* Lista de lançamentos do Tenant */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            {filtradas.length === 0 ? (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                🎉 Nenhuma conta ou pendência encontrada nesta licença no momento.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {filtradas.map((l: any) => (
                  <LancamentoRow key={l.transacaoId} lancamento={l} tenantId={tenantId} />
                ))}
              </div>
            )}
          </div>

          {/* Rodapé informativo com dados da Licença */}
          {data && (
            <div className="mt-6 flex flex-wrap justify-between items-center text-xs text-slate-500 dark:text-slate-400 gap-2">
              <span>
                Licença: <strong>{nomeSistema}</strong> ({tenantId || 'master'}) | Horário: <strong>{data.horarioSp}</strong>
              </span>
              <span>
                Monitoramento Persistente (60 min): <strong className="text-emerald-600 dark:text-emerald-400">ATIVO</strong>
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export const dynamic = 'force-dynamic';
export default CentralPage;
