'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { subscribeTransacoes, formatarMoeda } from '@/lib/storage';
import { Transacao } from '@/lib/types';
import { analisarVazamentosDeCaixa, AlertaVazamento, TipoAlertaVazamento } from '@/lib/leak-radar';
import { 
  ShieldAlert, 
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
    return analisarVazamentosDeCaixa(transacoes);
  }, [transacoes]);

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
      pico_anomalo: 0
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
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
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
          { id: 'reajuste_silencioso', label: `Reajustes Silenciosos (${totalPorTipo.reajuste_silencioso})` },
          { id: 'duplicidade_suspeita', label: `Duplicidades Suspeitas (${totalPorTipo.duplicidade_suspeita})` },
          { id: 'pico_anomalo', label: `Picos Fora do Padrão (${totalPorTipo.pico_anomalo})` }
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
      {loading ? (
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
                      {onNavigateToLancamentos && alerta.entidade && (
                        <button
                          onClick={() => onNavigateToLancamentos(alerta.entidade)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '6px 12px',
                            borderRadius: 8,
                            border: '1px solid var(--primary)',
                            background: 'var(--primary)',
                            color: '#ffffff',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            boxShadow: '0 2px 4px rgba(var(--primary-rgb, 59, 130, 246), 0.3)'
                          }}
                          title={`Ver lançamentos de ${alerta.entidade}`}
                        >
                          Auditar Lançamentos <ExternalLink size={11} />
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
    </div>
  );
}
