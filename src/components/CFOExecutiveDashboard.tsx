'use client';

import React, { useState, useEffect } from 'react';
import {
  Activity, ShieldCheck, TrendingUp, TrendingDown, DollarSign,
  AlertTriangle, BrainCircuit, Lightbulb, Search, ArrowUpRight,
  Sparkles, CheckCircle2, Clock, Landmark, Zap
} from 'lucide-react';
import { Transacao, Conta, Fatura, CFODiagnãostico, PrevisaoCaixaPreditiva } from '@/lib/types';
import { getTransacoes, getContas, getFaturas, formatarMoeda } from '@/lib/storage';
import { gerarDiagnãosticoCFO, projetarFluxoCaixa } from '@/lib/cfoEngine';
import { AgenteDiretorFinanceiro } from '@/lib/ai-agent-engine';
import { ProjecaoFluxoCaixa } from './ProjecaoFluxoCaixa';
import { AgingList } from './AgingList';
import { SimuladorCenarios } from './SimuladorCenarios';
import { DespesasPorCategoriaMesAtual } from './DespesasPorCategoriaMesAtual';

export function CFOExecutiveDashboard() {
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [contas, setContas] = useState<Conta[]>([]);
  const [faturas, setFaturas] = useState<Fatura[]>([]);
  const [loading, setLoading] = useState(true);

  const [diagnãostico, setDiagnãostico] = useState<CFODiagnãostico | null>(null);
  const [previsao30, setPrevisao30] = useState<PrevisaoCaixaPreditiva | null>(null);
  const [previsao90, setPrevisao90] = useState<PrevisaoCaixaPreditiva | null>(null);

  const [pergunta, setPergunta] = useState('');
  const [respostaIA, setRespostaIA] = useState<string | null>(null);
  const [loadingIA, setLoadingIA] = useState(false);

  useEffect(() => {
    (async () => {
      const [t, c, f] = await Promise.all([getTransacoes(), getContas(), getFaturas()]);
      setTransacoes(t);
      setContas(c);
      setFaturas(f);

      const diag = gerarDiagnãosticoCFO(t, c, f);
      setDiagnãostico(diag);

      setPrevisao30(projetarFluxoCaixa(t, c, 30));
      setPrevisao90(projetarFluxoCaixa(t, c, 90));

      setLoading(false);
    })();
  }, []);

  const handlePerguntar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pergunta.trim() || loadingIA) return;
    setLoadingIA(true);
    setRespostaIA(null);
    try {
      const agente = new AgenteDiretorFinanceiro();
      const resp = await agente.analisarPergunta(pergunta, []);
      setRespostaIA(resp.respostaTexto);
    } catch (err: any) {
      setRespostaIA('❌ Ocorreu um erro ao consultar o CFO Digital: ' + err.message);
    } finally {
      setLoadingIA(false);
    }
  };

  if (loading || !diagnãostico) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Carregando Cockpit CFO Digital...</div>;
  }

  const fmt = formatarMoeda;
  const getCorScore = (score: number) => {
    if (score >= 75) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 160 }}>
      {/* HEADER COCKPIT CFO */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(204,0,0,0.15) 0%, rgba(139,0,0,0.05) 100%)',
        border: '1px solid rgba(204,0,0,0.3)',
        borderRadius: 20,
        padding: '24px 28px',
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16,
            background: 'linear-gradient(135deg, #cc0000, #8b0000)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 20px rgba(204,0,0,0.35)'
          }}>
            <BrainCircuit size={28} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
              Cockpit CFO Digital Executivo
            </h1>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              Inteligência Financeira Preditiva • Diagnóstico em Tempo Real
            </p>
          </div>
        </div>

        {/* VELOCÍMETRO / SCORE DE SAÚDE */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 16
        }}>
          <div>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Saúde Financeira
            </span>
            <div style={{ fontSize: 26, fontWeight: 900, color: getCorScore(diagnãostico.scoreSaude) }}>
              {diagnãostico.scoreSaude} <span style={{ fontSize: 14, fontWeight: 600 }}>/ 100</span>
            </div>
          </div>
          <div style={{
            padding: '4px 10px',
            borderRadius: 99,
            fontSize: 11,
            fontWeight: 800,
            background: `${getCorScore(diagnãostico.scoreSaude)}22`,
            color: getCorScore(diagnãostico.scoreSaude),
            border: `1px solid ${getCorScore(diagnãostico.scoreSaude)}44`
          }}>
            RISCO {diagnãostico.nivelRisco}
          </div>
        </div>
      </div>

      {/* ASSISTENTE DE LINGUAGEM NATURAL */}
      <div className="glass" style={{ padding: 20, borderRadius: 16, marginBottom: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={18} color="#f59e0b" /> Faça uma pergunta ao seu CFO Digital
        </h3>

        <form onSubmit={handlePerguntar} style={{ display: 'flex', gap: 10 }}>
          <input
            type="text"
            className="input-field"
            placeholder="Ex: Quanto gastei com combustível este anão? Qual minha meta mensal?"
            value={pergunta}
            onChange={e => setPergunta(e.target.value)}
            disabled={loadingIA}
            style={{ flex: 1 }}
          />
          <button type="submit" disabled={!pergunta.trim() || loadingIA} className="btn-primary" style={{ padding: '0 24px', opacity: (!pergunta.trim() || loadingIA) ? 0.7 : 1 }}>
            {loadingIA ? 'Consultando...' : <><Search size={16} /> Consultar IA</>}
          </button>
        </form>

        {respostaIA && (
          <div style={{
            marginTop: 16,
            padding: 16,
            borderRadius: 12,
            background: 'rgba(204,0,0,0.06)',
            border: '1px solid rgba(204,0,0,0.2)',
            fontSize: 13,
            color: 'var(--text-primary)',
            lineHeight: '1.6'
          }}>
            <div dangerouslySetInnerHTML={{ __html: respostaIA.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }} />
          </div>
        )}
      </div>

      {/* MÉTRICAS DE CAPITAL & LIQUIDEZ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="glass" style={{ padding: 18 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Capital de Giro Líquido
          </span>
          <p style={{ fontSize: 22, fontWeight: 900, color: diagnãostico.capitalGiro >= 0 ? '#10b981' : '#ef4444', marginTop: 4 }}>
            {fmt(diagnãostico.capitalGiro)}
          </p>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Saldo livre de obrigações pendentes</span>
        </div>

        <div className="glass" style={{ padding: 18 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Índice de Liquidez Corrente
          </span>
          <p style={{ fontSize: 22, fontWeight: 900, color: '#3b82f6', marginTop: 4 }}>
            {diagnãostico.liquidezCorrente}x
          </p>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Cobertura de saldo para despesas mensais</span>
        </div>

        <div className="glass" style={{ padding: 18 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Taxa de Inadimplência
          </span>
          <p style={{ fontSize: 22, fontWeight: 900, color: diagnãostico.taxaInadimplencia === 0 ? '#10b981' : '#ef4444', marginTop: 4 }}>
            {diagnãostico.taxaInadimplencia}%
          </p>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Proporção de contas com atraso</span>
        </div>

        <div className="glass" style={{ padding: 18 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Previsão 30 Dias ({previsao30?.dataAlvo})
          </span>
          <p style={{ fontSize: 22, fontWeight: 900, color: (previsao30?.saldoPrevisto || 0) >= 0 ? '#10b981' : '#ef4444', marginTop: 4 }}>
            {fmt(previsao30?.saldoPrevisto || 0)}
          </p>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Saldo estimado fim do mês</span>
        </div>
      </div>

      {/* PROJEÇÃO DE FLUXO DE CAIXA E AGING LIST */}
      <div style={{ marginBottom: 24 }}>
        <ProjecaoFluxoCaixa transacoes={transacoes} contas={contas} diasProjecao={60} />
      </div>
      
      <div style={{ marginBottom: 24 }}>
        <AgingList transacoes={transacoes} />
      </div>

      <div style={{ marginBottom: 24 }}>
        <DespesasPorCategoriaMesAtual transacoes={transacoes} />
      </div>

      <div style={{ marginBottom: 24 }}>
        <SimuladorCenarios />
      </div>

      {/* OPORTUNIDADES E ANOMALIAS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        {/* OPORTUNIDADES DE ECONOMIA */}
        <div className="glass" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Lightbulb size={18} color="#f59e0b" /> Oportunidades de Economia
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {diagnãostico.oportunidadesEconomia.map((op, idx) => (
              <div key={idx} style={{
                background: 'rgba(245,158,11,0.06)',
                border: '1px solid rgba(245,158,11,0.2)',
                borderRadius: 12,
                padding: 12,
                fontSize: 12,
                color: 'var(--text-primary)',
                lineHeight: '1.5'
              }}>
                💡 {op}
              </div>
            ))}
          </div>
        </div>

        {/* DETECÇÃO DE ANOMALIAS */}
        <div className="glass" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={18} color="#ef4444" /> Alertas de Anomalia & Risco
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {diagnãostico.anomalias.map((anom, idx) => (
              <div key={idx} style={{
                background: 'rgba(239,68,68,0.06)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 12,
                padding: 12,
                fontSize: 12,
                color: 'var(--text-primary)',
                lineHeight: '1.5'
              }}>
                ⚠️ {anom}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
