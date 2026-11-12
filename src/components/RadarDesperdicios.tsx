'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { subscribeTransacoes, formatarMoeda } from '@/lib/storage';
import { Transacao } from '@/lib/types';
import { analisarVazamentosDeCaixa, AlertaVazamento, TipoAlertaVazamento, ReajusteAprovado, AssinaturaRecorrente } from '@/lib/leak-radar';
import { 
  ShieldAlert, 
  Skull, 
  Scissors, 
  Landmark, 
  CreditCard, 
  Layers, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  Copy, 
  ArrowUpRight, 
  EyeOff, 
  RefreshCw, 
  Sparkles, 
  Zap, 
  DollarSign, 
  Filter,
  Check,
  ChevronRight,
  ExternalLink
} from 'lucide-react';

interface RadarDesperdiciosProps {
  onNavigateToLancamentos?: (filtroContato?: string) => void;
}

export default function RadarDesperdicios({ onNavigateToLancamentos }: RadarDesperdiciosProps) {
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [dispensados, setDispensados] = useState<Set<string>>(new Set());
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [reajustesAprovados, setReajustesAprovados] = useState<Record<string, ReajusteAprovado>>({});
  const [alertaParaAprovar, setAlertaParaAprovar] = useState<AlertaVazamento | null>(null);
  const [statusAssinaturas, setStatusAssinaturas] = useState<Record<string, 'ativo' | 'zumbi' | 'essencial'>>({});
  const [filtroSubAba, setFiltroSubAba] = useState<'todas' | 'zumbis' | 'tarifas' | 'essenciais'>('todas');

  // Carregar status das assinaturas (zumbis / essenciais)
  useEffect(() => {
    try {
      const salvo = localStorage.getItem('radar_status_assinaturas');
      if (salvo) {
        setStatusAssinaturas(JSON.parse(salvo));
      }
    } catch (e) {
      console.error('Erro ao ler status das assinaturas:', e);
    }
  }, []);

  const handleToggleStatusAssinatura = (subId: string, novoStatus: 'ativo' | 'zumbi' | 'essencial') => {
    const atualizado = {
      ...statusAssinaturas,
      [subId]: novoStatus
    };
    setStatusAssinaturas(atualizado);
    try {
      localStorage.setItem('radar_status_assinaturas', JSON.stringify(atualizado));
    } catch (e) {
      console.error('Erro ao salvar status da assinatura:', e);
    }
  };


  // Carregar reajustes aprovados salvos
  useEffect(() => {
    try {
      const salvo = localStorage.getItem('radar_reajustes_aprovados');
      if (salvo) {
        setReajustesAprovados(JSON.parse(salvo));
      }
    } catch (e) {
      console.error('Erro ao ler reajustes aprovados:', e);
    }
  }, []);

  // Aprovar aumento contratual/salarial
  const handleAprovarReajuste = (alerta: AlertaVazamento, motivo?: string) => {
    const key = (alerta.entidade || '').trim().toLowerCase();
    const novo: Record<string, ReajusteAprovado> = {
      ...reajustesAprovados,
      [key]: {
        id: `aprov-${Date.now()}`,
        entidade: alerta.entidade,
        novoValorPadrao: alerta.valorAtual,
        valorAnterior: alerta.valorAnterior || 0,
        percentualAumento: alerta.percentualAumento,
        categoriaNome: alerta.categoriaNome,
        dataAprovacao: new Date().toISOString(),
        motivo: motivo || 'Aumento aprovado pelo gestor'
      }
    };
    setReajustesAprovados(novo);
    try {
      localStorage.setItem('radar_reajustes_aprovados', JSON.stringify(novo));
    } catch (e) {}
  };

  // Revogar aprovação de aumento
  const handleRevogarAprovacao = (entidadeKey: string) => {
    const novo = { ...reajustesAprovados };
    delete novo[entidadeKey];
    setReajustesAprovados(novo);
    try {
      localStorage.setItem('radar_reajustes_aprovados', JSON.stringify(novo));
    } catch (e) {}
  };

  // Carregar lista de alertas dispensados pelo usuário
  useEffect(() => {
    try {
      const salvo = localStorage.getItem('radar_alertas_dispensados');
      if (salvo) {
        setDispensados(new Set(JSON.parse(salvo)));
      }
    } catch (e) {
      console.error('Erro ao ler alertas dispensados:', e);
    }
  }, []);

  // Assinar transações do Firestore em tempo real (read-only, blindado)
  useEffect(() => {
    setLoading(true);
    const unsub = subscribeTransacoes((lista) => {
      setTransacoes(lista);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Dispensar alerta
  const handleDispensar = (id: string) => {
    const novo = new Set(dispensados);
    novo.add(id);
    setDispensados(novo);
    try {
      localStorage.setItem('radar_alertas_dispensados', JSON.stringify(Array.from(novo)));
    } catch (e) {}
  };

  // Restaurar todos os dispensados
  const handleRestaurarTodos = () => {
    setDispensados(new Set());
    try {
      localStorage.removeItem('radar_alertas_dispensados');
    } catch (e) {}
  };

  // Executar análise forense
  const resultadoRadar = useMemo(() => {
    return analisarVazamentosDeCaixa(transacoes, reajustesAprovados, statusAssinaturas);
  }, [transacoes, reajustesAprovados, statusAssinaturas]);

  // Alertas ativos (não dispensados)
  const alertasAtivos = useMemo(() => {
    return resultadoRadar.alertas.filter(a => !dispensados.has(a.id));
  }, [resultadoRadar.alertas, dispensados]);

  // Alertas filtrados por categoria
  const alertasFiltrados = useMemo(() => {
    if (filtroTipo === 'todos') return alertasAtivos;
    return alertasAtivos.filter(a => a.tipo === filtroTipo);
  }, [alertasAtivos, filtroTipo]);

  // Métricas dinâmicas recalculadas
  const economiaMensalAtiva = useMemo(() => {
    return alertasAtivos.reduce((acc, curr) => {
      if (curr.tipo === 'reajuste_silencioso') return acc + (curr.diferencaValor || 0);
      if (curr.tipo === 'duplicidade_suspeita') return acc + (curr.valorAtual || 0);
      return acc;
    }, 0);
  }, [alertasAtivos]);

  const economiaAnualAtiva = useMemo(() => {
    return alertasAtivos.reduce((acc, curr) => acc + (curr.impactoAnual || 0), 0);
  }, [alertasAtivos]);

  const scoreDinamico = useMemo(() => {
    const penalidade = Math.min(65, alertasAtivos.length * 8 + (economiaMensalAtiva > 400 ? 15 : 0));
    return Math.max(35, 100 - penalidade);
  }, [alertasAtivos, economiaMensalAtiva]);

  const totalPorTipo = useMemo(() => {
    const counts: Record<string, number> = {
      reajuste_silencioso: 0,
      duplicidade_suspeita: 0,
      pico_anomalo: 0,
      assinatura_fantasma: 0
    };
    alertasAtivos.forEach(a => {
      if (counts[a.tipo] !== undefined) counts[a.tipo]++;
    });
    return counts;
  }, [alertasAtivos]);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '8px 16px 40px' }}>
      
      {/* ── CABEÇALHO HERO DO RADAR FORENSE ───────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(var(--primary-rgb, 59, 130, 246), 0.12) 0%, rgba(var(--primary-rgb, 59, 130, 246), 0.03) 100%)',
        border: '1px solid var(--border)',
        borderRadius: 20,
        padding: '24px 28px',
        marginBottom: 24,
        boxShadow: '0 8px 32px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.2)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Glow de fundo */}
        <div style={{
          position: 'absolute',
          top: -40,
          right: -40,
          width: 220,
          height: 220,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(var(--primary-rgb, 59, 130, 246), 0.25) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '3px 10px', borderRadius: 20, fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
              <ShieldAlert size={14} /> Auditoria Forense Autônoma (Estilo Ramp / Brex)
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 6px 0', letterSpacing: '-0.5px' }}>
              Radar de Desperdícios & Gastos Fantasma
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, maxWidth: 650 }}>
              Nosso motor de auditoria varre continuamente seus lançamentos para identificar reajustes não autorizados, cobranças em duplicidade e vazamentos ocultos de caixa.
            </p>
          </div>

          {dispensados.size > 0 && (
            <button
              onClick={handleRestaurarTodos}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 10,
                border: '1px solid var(--border)',
                background: 'var(--bg-card)',
                color: 'var(--text-secondary)',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
              }}
            >
              <RefreshCw size={12} /> Ver {dispensados.size} alerta(s) arquivado(s)
            </button>
          )}
        </div>

        {/* ── CARDS DE IMPACTO FINANCEIRO CONSOLIDADO ───────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginTop: 22
        }}>
          {/* Card 1: Economia Mensal Identificada */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: '16px 20px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.1)'
          }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Economia Mensal Imediata
            </span>
            <div style={{ fontSize: '24px', fontWeight: 900, color: '#10b981', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>{formatarMoeda(economiaMensalAtiva)}</span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#10b981', background: 'rgba(16, 185, 129, 0.12)', padding: '2px 6px', borderRadius: 6 }}>/mês</span>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              Projeção de R$ {economiaAnualAtiva.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/ano de caixa recuperado
            </p>
          </div>

          {/* Card 2: Alertas Ativos */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: '16px 20px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.1)'
          }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Anomalias sob Investigação
            </span>
            <div style={{ fontSize: '24px', fontWeight: 900, color: alertasAtivos.length > 0 ? '#ef4444' : '#10b981', marginTop: 4 }}>
              {alertasAtivos.length} {alertasAtivos.length === 1 ? 'Vazamento' : 'Vazamentos'}
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
              {alertasAtivos.filter(a => a.severidade === 'alta').length} requerem atenção imediata
            </p>
          </div>

          {/* Card 3: Score de Eficiência de Caixa */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: '16px 20px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Score de Proteção de Caixa
              </span>
              <span style={{ fontSize: '13px', fontWeight: 900, color: scoreDinamico >= 80 ? '#10b981' : scoreDinamico >= 60 ? '#f59e0b' : '#ef4444' }}>
                {scoreDinamico} / 100
              </span>
            </div>
            {/* Barra de progresso */}
            <div style={{ width: '100%', height: 7, background: 'rgba(0,0,0,0.08)', borderRadius: 10, marginTop: 8, overflow: 'hidden' }}>
              <div style={{
                width: `${scoreDinamico}%`,
                height: '100%',
                borderRadius: 10,
                background: scoreDinamico >= 80 ? '#10b981' : scoreDinamico >= 60 ? '#f59e0b' : '#ef4444',
                transition: 'width 0.4s ease'
              }} />
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '6px 0 0 0' }}>
              {scoreDinamico >= 85 ? '🛡️ Excelente controle sem vazamentos graves' : '⚠️ Oportunidades claras de redução de custos identificadas'}
            </p>
          </div>

          {/* Card 4: Assinaturas Zumbis & Recorrências */}
          <div 
            onClick={() => setFiltroTipo('assinaturas')}
            style={{
              background: 'var(--bg-card)',
              border: filtroTipo === 'assinaturas' ? '1px solid var(--primary)' : '1px solid var(--border)',
              borderRadius: 14,
              padding: '16px 20px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.1)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Assinaturas & Recorrências
              </span>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#8b5cf6', background: 'rgba(139, 92, 246, 0.12)', padding: '2px 6px', borderRadius: 6 }}>
                {resultadoRadar.assinaturas.length} ativas
              </span>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text-primary)', marginTop: 4 }}>
              <span>{formatarMoeda(resultadoRadar.totalAnualAssinaturas)}</span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>/ano</span>
            </div>
            <p style={{ fontSize: '11px', color: resultadoRadar.totalEconomiaZumbis > 0 ? '#10b981' : 'var(--text-muted)', margin: '4px 0 0 0', fontWeight: 600 }}>
              {resultadoRadar.totalEconomiaZumbis > 0 
                ? `✂️ + ${formatarMoeda(resultadoRadar.totalEconomiaZumbis)}/ano em cortes marcados`
                : 'Mapeie serviços e tarifas que podem ser cancelados'}
            </p>
          </div>

        </div>
      </div>

      {/* ── ABAS DE FILTRO RÁPIDO DO RADAR ─────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        overflowX: 'auto',
        paddingBottom: 12,
        marginBottom: 16
      }}>
        {[
          { id: 'todos', label: `Todos os Alertas (${alertasAtivos.length})` },
          { id: 'assinaturas', label: `🧟 Assinaturas & Recorrências (${resultadoRadar.assinaturas.length})` },
          { id: 'reajuste_silencioso', label: `Reajustes Silenciosos (${totalPorTipo.reajuste_silencioso})` },
          { id: 'duplicidade_suspeita', label: `Duplicidades Suspeitas (${totalPorTipo.duplicidade_suspeita})` },
          { id: 'pico_anomalo', label: `Picos Fora do Padrão (${totalPorTipo.pico_anomalo})` },
          { id: 'aprovados', label: `✅ Reajustes Aprovados (${Object.keys(reajustesAprovados).length})` }
        ].map(tab => {
          const isActive = filtroTipo === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setFiltroTipo(tab.id)}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                fontSize: '11.5px',
                fontWeight: isActive ? 700 : 600,
                border: `1px solid ${isActive ? 'var(--primary)' : 'var(--border)'}`,
                background: isActive ? 'var(--primary)' : 'var(--bg-card)',
                color: isActive ? '#ffffff' : 'var(--text-primary)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: isActive ? '0 2px 6px rgba(var(--primary-rgb, 59, 130, 246), 0.3)' : '0 1px 3px rgba(0,0,0,0.03)',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── LISTA DE ALERTAS FORENSES ──────────────────────────────────────── */}
      {filtroTipo === 'aprovados' ? (
        Object.keys(reajustesAprovados).length === 0 ? (
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            padding: '48px 24px',
            textAlign: 'center',
            boxShadow: '0 4px 16px rgba(0,0,0,0.02)'
          }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <CheckCircle2 size={30} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
              Nenhum reajuste aprovado ainda
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: 500, margin: '0 auto' }}>
              Quando você aprovar aumentos reais (como aluguel, dissídios ou contratos renegociados), eles aparecerão aqui como novos tetos oficiais.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {Object.entries(reajustesAprovados).map(([key, item]) => {
              const dt = new Date(item.dataAprovacao).toLocaleDateString('pt-BR');
              return (
                <div
                  key={item.id}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid rgba(16, 185, 129, 0.35)',
                    borderLeft: '4px solid #10b981',
                    borderRadius: 14,
                    padding: '18px 22px',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 12
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{
                        background: 'rgba(16, 185, 129, 0.12)',
                        color: '#10b981',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        padding: '2px 8px',
                        borderRadius: 6,
                        fontSize: '10px',
                        fontWeight: 800,
                        textTransform: 'uppercase'
                      }}>
                        ✅ Aprovado pelo Gestor
                      </span>
                      {item.categoriaNome && (
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                          • {item.categoriaNome}
                        </span>
                      )}
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        • Aprovado em {dt}
                      </span>
                    </div>

                    <h4 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
                      {item.entidade}
                    </h4>

                    <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: 0 }}>
                      Anterior: R$ {item.valorAnterior.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ➔ <strong style={{ color: '#10b981' }}>Novo Padrão Aprovado: R$ {item.novoValorPadrao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                      {item.percentualAumento ? ` (+${item.percentualAumento}%)` : ''}
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      onClick={() => handleRevogarAprovacao(key)}
                      style={{
                        padding: '7px 14px',
                        borderRadius: 8,
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        background: 'rgba(239, 68, 68, 0.08)',
                        color: '#ef4444',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      title="Revogar aprovação e reabrir alertas para este lançamento"
                    >
                      Revogar / Reabrir Alerta
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : 
      filtroTipo === 'assinaturas' ? (
        <div>
          {/* Hero Banner das Assinaturas */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            padding: '24px',
            marginBottom: 20,
            boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6', padding: '3px 10px', borderRadius: 20, fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', marginBottom: 8 }}>
                  <Skull size={14} /> Monitor de Gastos Recorrentes Fixos
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
                  Auditor de Assinaturas Zumbis & Tarifas Bancárias
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, maxWidth: 650 }}>
                  Serviços recorrentes e tarifas fixas consom silenciosamente seu caixa mês a mês. Marque serviços ociosos como <strong>Zumbi (Cortar)</strong> para simular e estancar saídas de caixa.
                </p>
              </div>

              {/* Box de Economia Imediata com Zumbis */}
              <div style={{
                background: resultadoRadar.totalEconomiaZumbis > 0 ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-secondary)',
                border: resultadoRadar.totalEconomiaZumbis > 0 ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid var(--border)',
                borderRadius: 14,
                padding: '14px 20px',
                textAlign: 'right'
              }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: resultadoRadar.totalEconomiaZumbis > 0 ? '#10b981' : 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Economia Anual com Cortes
                </div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: resultadoRadar.totalEconomiaZumbis > 0 ? '#10b981' : 'var(--text-primary)', marginTop: 2 }}>
                  + {formatarMoeda(resultadoRadar.totalEconomiaZumbis)}
                  <span style={{ fontSize: '12px', fontWeight: 600 }}>/ano</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>
                  {resultadoRadar.assinaturas.filter(s => s.statusCorte === 'zumbi').length} serviço(s) marcados para cancelamento
                </div>
              </div>
            </div>

            {/* Sub-Abas de Filtro da Categoria */}
            <div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap' }}>
              {[
                { id: 'todas', label: `Todas (${resultadoRadar.assinaturas.length})` },
                { id: 'zumbis', label: `🧟 Marcadas para Cancelar (${resultadoRadar.assinaturas.filter(s => s.statusCorte === 'zumbi').length})` },
                { id: 'tarifas', label: `🏦 Tarifas Bancárias (${resultadoRadar.assinaturas.filter(s => s.isTarifaBancaria).length})` },
                { id: 'essenciais', label: `✅ Essenciais Confirmadas (${resultadoRadar.assinaturas.filter(s => s.statusCorte === 'essencial').length})` }
              ].map(subTab => {
                const isSubActive = filtroSubAba === subTab.id;
                return (
                  <button
                    key={subTab.id}
                    onClick={() => setFiltroSubAba(subTab.id as any)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 16,
                      fontSize: '11px',
                      fontWeight: isSubActive ? 800 : 600,
                      border: `1px solid ${isSubActive ? 'var(--primary)' : 'var(--border)'}`,
                      background: isSubActive ? 'var(--primary)' : 'var(--bg-secondary)',
                      color: isSubActive ? '#fff' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {subTab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lista de Cards de Assinaturas */}
          {(() => {
            const lista = resultadoRadar.assinaturas.filter(s => {
              if (filtroSubAba === 'zumbis') return s.statusCorte === 'zumbi';
              if (filtroSubAba === 'tarifas') return s.isTarifaBancaria;
              if (filtroSubAba === 'essenciais') return s.statusCorte === 'essencial';
              return true;
            });

            if (lista.length === 0) {
              return (
                <div style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 16,
                  padding: '48px 24px',
                  textAlign: 'center',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.02)'
                }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <Skull size={30} />
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
                    Nenhuma assinatura encontrada neste filtro
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: 450, margin: '0 auto' }}>
                    {filtroSubAba === 'zumbis' 
                      ? 'Nenhum serviço foi marcado como zumbi. Explore a lista completa para selecionar gastos que podem ser cortados.'
                      : 'Nenhuma despesa recorrente atende a este critério no momento.'}
                  </p>
                </div>
              );
            }

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {lista.map(sub => {
                  const isZumbi = sub.statusCorte === 'zumbi';
                  const isEssencial = sub.statusCorte === 'essencial';
                  const dtUltima = sub.ultimaData ? new Date(sub.ultimaData).toLocaleDateString('pt-BR') : '';

                  return (
                    <div
                      key={sub.id}
                      style={{
                        background: 'var(--bg-card)',
                        border: isZumbi 
                          ? '1px solid rgba(239, 68, 68, 0.45)' 
                          : isEssencial 
                            ? '1px solid rgba(16, 185, 129, 0.35)' 
                            : '1px solid var(--border)',
                        borderLeft: isZumbi 
                          ? '5px solid #ef4444' 
                          : isEssencial 
                            ? '5px solid #10b981' 
                            : sub.isTarifaBancaria 
                              ? '5px solid #f59e0b' 
                              : '5px solid var(--primary)',
                        borderRadius: 14,
                        padding: '18px 22px',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 16,
                        opacity: isZumbi ? 0.95 : 1,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {/* Info do Serviço */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 280 }}>
                        <div style={{
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          background: isZumbi 
                            ? 'rgba(239, 68, 68, 0.12)' 
                            : sub.isTarifaBancaria 
                              ? 'rgba(245, 158, 11, 0.12)' 
                              : 'rgba(var(--primary-rgb, 59, 130, 246), 0.12)',
                          color: isZumbi 
                            ? '#ef4444' 
                            : sub.isTarifaBancaria 
                              ? '#f59e0b' 
                              : 'var(--primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {isZumbi ? <Skull size={22} /> : sub.isTarifaBancaria ? <Landmark size={22} /> : <RefreshCw size={22} />}
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                            {isZumbi && (
                              <span style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', padding: '2px 8px', borderRadius: 6, fontSize: '10px', fontWeight: 800, textTransform: 'uppercase' }}>
                                🚨 Marcada para Cancelamento
                              </span>
                            )}
                            {isEssencial && (
                              <span style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', padding: '2px 8px', borderRadius: 6, fontSize: '10px', fontWeight: 800, textTransform: 'uppercase' }}>
                                ✅ Essencial Confirmada
                              </span>
                            )}
                            {sub.isTarifaBancaria && (
                              <span style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', padding: '2px 8px', borderRadius: 6, fontSize: '10px', fontWeight: 800, textTransform: 'uppercase' }}>
                                🏦 Tarifa Bancária (Evitável)
                              </span>
                            )}
                            {sub.categoriaNome && (
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                                • {sub.categoriaNome}
                              </span>
                            )}
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              • {sub.quantidadeOcorrencias} cobrança(s) detectada(s)
                            </span>
                            {dtUltima && (
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                • Última: {dtUltima}
                              </span>
                            )}
                          </div>

                          <h4 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, textDecoration: isZumbi ? 'line-through' : 'none' }}>
                            {sub.entidade}
                          </h4>
                        </div>
                      </div>

                      {/* Valores */}
                      <div style={{ textAlign: 'right', minWidth: 140 }}>
                        <div style={{ fontSize: '18px', fontWeight: 900, color: isZumbi ? '#ef4444' : 'var(--text-primary)' }}>
                          {formatarMoeda(sub.valorMensal)} <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>/mês</span>
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: isZumbi ? '#b91c1c' : '#10b981', marginTop: 2 }}>
                          {formatarMoeda(sub.custoAnual)} / ano
                        </div>
                      </div>

                      {/* Botões de Ação */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {isZumbi ? (
                          <button
                            onClick={() => handleToggleStatusAssinatura(sub.id, 'ativo')}
                            style={{
                              padding: '7px 14px',
                              borderRadius: 8,
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              background: 'rgba(239, 68, 68, 0.08)',
                              color: '#ef4444',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6
                            }}
                            title="Desmarcar status de zumbi"
                          >
                            ↩️ Desfazer Corte
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleStatusAssinatura(sub.id, 'zumbi')}
                            style={{
                              padding: '7px 14px',
                              borderRadius: 8,
                              border: '1px solid #ef4444',
                              background: '#ef4444',
                              color: '#ffffff',
                              fontSize: '11.5px',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)'
                            }}
                            title="Marcar assinatura como desnecessária para cancelamento"
                          >
                            <Skull size={14} /> Cortar (Zumbi)
                          </button>
                        )}

                        {!isEssencial ? (
                          <button
                            onClick={() => handleToggleStatusAssinatura(sub.id, 'essencial')}
                            style={{
                              padding: '7px 12px',
                              borderRadius: 8,
                              border: '1px solid var(--border)',
                              background: 'var(--bg-secondary)',
                              color: 'var(--text-secondary)',
                              fontSize: '11.5px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                            title="Marcar como despesa essencial"
                          >
                            <Check size={14} /> Essencial
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleStatusAssinatura(sub.id, 'ativo')}
                            style={{
                              padding: '7px 12px',
                              borderRadius: 8,
                              border: '1px solid rgba(16, 185, 129, 0.3)',
                              background: 'rgba(16, 185, 129, 0.08)',
                              color: '#10b981',
                              fontSize: '11.5px',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                            title="Alterar status de essencial"
                          >
                            Alterar
                          </button>
                        )}

                        {onNavigateToLancamentos && sub.transacaoIds.length > 0 && (
                          <button
                            onClick={() => onNavigateToLancamentos(`id:${sub.transacaoIds[sub.transacaoIds.length - 1]}`)}
                            style={{
                              padding: '7px 12px',
                              borderRadius: 8,
                              border: '1px solid var(--border)',
                              background: 'var(--bg-secondary)',
                              color: 'var(--text-secondary)',
                              fontSize: '11.5px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                            title="Ver histórico de lançamentos desta assinatura"
                          >
                            <ExternalLink size={13} /> Auditar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      ) :  loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <p style={{ fontSize: '13px', fontWeight: 600 }}>Executando auditoria forense nos lançamentos...</p>
        </div>
      ) : alertasFiltrados.length === 0 ? (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: '48px 24px',
          textAlign: 'center',
          boxShadow: '0 4px 16px rgba(0,0,0,0.02)'
        }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <CheckCircle2 size={30} />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
            Nenhum vazamento identificado nesta categoria!
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: 500, margin: '0 auto' }}>
            Seus contratos, fornecedores e lançamentos estão operando dentro dos padrões de normalidade orçamentária.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {alertasFiltrados.map((alerta) => {
            const isAlta = alerta.severidade === 'alta';
            const isMedia = alerta.severidade === 'media';
            const badgeBg = isAlta ? 'rgba(239, 68, 68, 0.12)' : isMedia ? 'rgba(245, 158, 11, 0.12)' : 'rgba(59, 130, 246, 0.12)';
            const badgeColor = isAlta ? '#ef4444' : isMedia ? '#f59e0b' : '#3b82f6';
            const badgeBorder = isAlta ? 'rgba(239, 68, 68, 0.3)' : isMedia ? 'rgba(245, 158, 11, 0.3)' : 'rgba(59, 130, 246, 0.3)';

            return (
              <div
                key={alerta.id}
                style={{
                  background: 'var(--bg-card)',
                  border: `1px solid ${isAlta ? 'rgba(239, 68, 68, 0.35)' : 'var(--border)'}`,
                  borderLeft: `4px solid ${badgeColor}`,
                  borderRadius: 14,
                  padding: '18px 22px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.1)',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 280 }}>
                    {/* Header do Alerta */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                      <span style={{
                        background: badgeBg,
                        color: badgeColor,
                        border: `1px solid ${badgeBorder}`,
                        padding: '2px 8px',
                        borderRadius: 6,
                        fontSize: '10px',
                        fontWeight: 800,
                        textTransform: 'uppercase'
                      }}>
                        {isAlta ? '🔴 Atenção Urgente' : isMedia ? '🟠 Reajuste Acima da Média' : '🔵 Oportunidade'}
                      </span>
                      {alerta.categoriaNome && (
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                          • {alerta.categoriaNome}
                        </span>
                      )}
                      {alerta.descricaoTransacao && alerta.descricaoTransacao !== alerta.entidade && (
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>
                          • {alerta.descricaoTransacao}
                        </span>
                      )}
                      {alerta.transacaoIds && alerta.transacaoIds.length > 0 && (
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', background: 'var(--bg-body)', padding: '2px 6px', borderRadius: 4, fontFamily: 'monospace' }}>
                          ID: {alerta.transacaoIds[0]}
                        </span>
                      )}
                    </div>

                    <h4 style={{ fontSize: '15.5px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
                      {alerta.titulo}
                    </h4>

                    <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: '0 0 10px 0', lineHeight: '1.5' }}>
                      {alerta.descricao}
                    </p>

                    {/* Dica Acionável de CFO */}
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      background: 'rgba(var(--primary-rgb, 59, 130, 246), 0.08)',
                      border: '1px solid rgba(var(--primary-rgb, 59, 130, 246), 0.2)',
                      padding: '6px 12px',
                      borderRadius: 8,
                      fontSize: '11px',
                      color: 'var(--text-primary)',
                      fontWeight: 600
                    }}>
                      <Zap size={13} color="var(--primary)" />
                      <span><strong>Recomendação de CFO:</strong> {alerta.dicaAcao}</span>
                    </div>
                  </div>

                  {/* Lado Direito: Valores e Ações Rápidas */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10, flexShrink: 0 }}>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                        Impacto Anualizado
                      </span>
                      <div style={{ fontSize: '18px', fontWeight: 900, color: '#ef4444' }}>
                        - R$ {alerta.impactoAnual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {alerta.tipo === 'reajuste_silencioso' && (
                        <button
                          onClick={() => setAlertaParaAprovar(alerta)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '6px 12px',
                            borderRadius: 8,
                            border: '1px solid rgba(16, 185, 129, 0.4)',
                            background: 'rgba(16, 185, 129, 0.1)',
                            color: '#10b981',
                            fontSize: '11px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#10b981';
                            e.currentTarget.style.color = '#ffffff';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)';
                            e.currentTarget.style.color = '#10b981';
                          }}
                          title="Aprovar este aumento como o novo valor padrão e não alertar mais"
                        >
                          <CheckCircle2 size={12} />
                          <span>Aprovar Aumento</span>
                        </button>
                      )}

                      {onNavigateToLancamentos && alerta.transacaoIds && alerta.transacaoIds.length > 0 && (
                        <button
                          onClick={() => {
                            const alvo = alerta.tipo === 'duplicidade_suspeita'
                              ? alerta.transacaoIds.join(',')
                              : alerta.transacaoIds[0];
                            onNavigateToLancamentos(`id:${alvo}`);
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '6px 14px',
                            borderRadius: 8,
                            border: '1px solid var(--primary)',
                            background: 'var(--primary)',
                            color: '#ffffff',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            boxShadow: '0 2px 4px rgba(var(--primary-rgb, 59, 130, 246), 0.3)',
                            transition: 'all 0.15s ease'
                          }}
                          title="Abrir diretamente este lançamento especificado na tabela de lançamentos"
                        >
                          Auditar Lançamento <ExternalLink size={11} />
                        </button>
                      )}

                      <button
                        onClick={() => handleDispensar(alerta.id)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '6px 10px',
                          borderRadius: 8,
                          border: '1px solid var(--border)',
                          background: 'var(--bg-body)',
                          color: 'var(--text-muted)',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                        title="Marcar como analisado e dispensar"
                      >
                        <EyeOff size={11} /> Dispensar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* ── MODAL DE CONFIRMAÇÃO DE APROVAÇÃO DE AUMENTO ────────────────── */}
      {alertaParaAprovar && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: 16
        }}>
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            maxWidth: 480,
            width: '100%',
            padding: 24,
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>
                  Aprovar Aumento Legítimo
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                  Definir novo valor padrão oficial para este lançamento
                </p>
              </div>
            </div>

            <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 16px 0' }}>
              Deseja aprovar o valor de <strong style={{ color: 'var(--text-primary)' }}>R$ {alertaParaAprovar.valorAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> como o novo teto padrão acordado para <strong style={{ color: 'var(--text-primary)' }}>"{alertaParaAprovar.entidade}"</strong>?
            </p>

            <div style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: 10,
              padding: '12px 14px',
              marginBottom: 20,
              fontSize: 12,
              color: 'var(--text-primary)',
              lineHeight: 1.4
            }}>
              💡 <strong>Inteligência do Radar:</strong> O sistema não considerará mais este valor como desperdício e deixará de alertar nas cobranças futuras deste mesmo patamar. Se o fornecedor aumentar <em>novamente</em> além deste teto, o Radar voltará a notificá-lo.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => setAlertaParaAprovar(null)}
                style={{
                  padding: '9px 16px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-body)',
                  color: 'var(--text-primary)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  handleAprovarReajuste(alertaParaAprovar);
                  setAlertaParaAprovar(null);
                }}
                style={{
                  padding: '9px 18px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'linear-gradient(180deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 3px 10px rgba(16, 185, 129, 0.35)'
                }}
              >
                Confirmar Novo Padrão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
