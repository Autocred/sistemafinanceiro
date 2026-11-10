'use client';

import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend, PieChart, Pie,
  LineChart, Line, Area, AreaChart, ReferenceLine, ComposedChart
} from 'recharts';
import { Transacao, Cliente } from '@/lib/types';
import { formatarMoeda } from '@/lib/storage';
import { format, subMonths, addMonths, getDaysInMonth, getDate } from 'date-fns';
import { normalizeDate } from '@/lib/financialEngine';
import { getComportamentoTransacao } from './ExtratoBancario';
import { useConfiguracao } from '@/hooks/useConfiguracao';
import {
  Building2, TrendingUp, DollarSign, Zap, Calendar, Filter,
  ArrowUpRight, PieChart as PieIcon, BarChart3, Award,
  ChevronDown, ChevronUp, FileSpreadsheet, Search, CheckCircle2,
  Clock, ShieldCheck, Target, Layers, TrendingDown
} from 'lucide-react';

interface RelatorioComissoesProps {
  transacoes: Transacao[];
  transacoesFiltradas: Transacao[];
  dataInicio: string;
  dataFim: string;
}

export function RelatorioComissoes({
  transacoes,
  transacoesFiltradas,
  dataInicio,
  dataFim
}: RelatorioComissoesProps) {
  const [bancoSelecionado, setBancoSelecionado] = useState<string>('todos');
  const [modalidadeFiltro, setModalidadeFiltro] = useState<'todas' | 'diferida' | 'avista'>('todas');
  const [buscaLcto, setBuscaLcto] = useState<string>('');
  const [bancoExpandido, setBancoExpandido] = useState<string | null>(null);

  const fmt = formatarMoeda;

  // ── CORES DO TENANT (White-Label SaaS) ────────────────────────────────────
  const { cfg } = useConfiguracao();
  const corPrimaria = cfg?.corPrimaria || '#7c3aed';
  // Computa variações de cor a partir da cor primária do tenant
  const corPrimariaAlpha = (alpha: number) => {
    // Converte hex para rgb se necessário e aplica alpha
    if (corPrimaria.startsWith('#')) {
      const r = parseInt(corPrimaria.slice(1, 3), 16);
      const g = parseInt(corPrimaria.slice(3, 5), 16);
      const b = parseInt(corPrimaria.slice(5, 7), 16);
      return `rgba(${r},${g},${b},${alpha})`;
    }
    return corPrimaria;
  };

  // 0. CÁLCULO PREDITIVO EM TEMPO REAL DE COMISSÕES DIFERIDAS
  const agora = new Date();
  const mesAtualStr = format(agora, 'yyyy-MM');
  const mesAnteriorStr = format(subMonths(agora, 1), 'yyyy-MM');
  const anoAtualStr = format(agora, 'yyyy');

  const metricasDiferidasLive = useMemo(() => {
    let realMesAtual = 0;
    let pendMesAtual = 0;
    let qtdMesAtual = 0;

    let realMesAnterior = 0;
    let qtdMesAnterior = 0;

    let realAnoAtual = 0;
    let qtdAnoAtual = 0;

    transacoes.forEach(t => {
      if (t.tipo !== 'receita') return;
      const comp = getComportamentoTransacao(t);
      const sub = ((t as any).subcategoria || '').toLowerCase();
      const desc = (t.descricao || '').toLowerCase();
      const isDif = comp === 'fixa' || sub.includes('diferida') || desc.includes('diferida');

      if (!isDif) return;

      const v = Number(t.valor) || 0;
      const dataRef = normalizeDate(t.dataPagamento || t.data || '');
      const mesRef = dataRef.substring(0, 7);
      const anoRef = dataRef.substring(0, 4);

      // Mês Atual
      if (mesRef === mesAtualStr) {
        if (t.status === 'pago') {
          realMesAtual += v;
          qtdMesAtual++;
        } else {
          pendMesAtual += v;
        }
      }
      // Mês Anterior
      else if (mesRef === mesAnteriorStr) {
        if (t.status === 'pago' || !t.status) {
          realMesAnterior += v;
          qtdMesAnterior++;
        }
      }

      // Ano Atual
      if (anoRef === anoAtualStr && (t.status === 'pago' || !t.status)) {
        realAnoAtual += v;
        qtdAnoAtual++;
      }
    });

    const diasNoMes = getDaysInMonth(agora);
    const diaAtual = getDate(agora);

    // Ritmo diário atingido no mês atual
    const ritmoDiario = diaAtual > 0 ? realMesAtual / diaAtual : 0;
    const projecaoRitmo = ritmoDiario * diasNoMes;

    // Projeção Inteligente para o Mês Atual:
    const projecaoMesAtual = Math.max(
      realMesAtual + pendMesAtual,
      projecaoRitmo,
      realMesAnterior
    );

    // Comparativo MoM vs Mês Anterior
    const variacaoMoM = realMesAnterior > 0
      ? ((projecaoMesAtual - realMesAnterior) / realMesAnterior) * 100
      : (projecaoMesAtual > 0 ? 100 : 0);
    const diferencaMoM = projecaoMesAtual - realMesAnterior;

    // Percentual de conclusão do mês atual
    const percConcluidoMes = projecaoMesAtual > 0 ? Math.min(100, (realMesAtual / projecaoMesAtual) * 100) : 0;

    // Projeção Anual Consolidada (Ano Vigente Jan-Dez)
    const mesAtualNum = agora.getMonth() + 1;
    const mesesRestantes = 12 - mesAtualNum;
    const projecaoAnualTotal = realAnoAtual + (projecaoMesAtual * mesesRestantes);

    // Run-rate da carteira ativa em 12 meses
    const runRateAnual = projecaoMesAtual * 12;

    const nomeMesAtual = agora.toLocaleDateString('pt-BR', { month: 'long' });
    const nomeMesAnterior = subMonths(agora, 1).toLocaleDateString('pt-BR', { month: 'long' });

    return {
      realMesAtual,
      pendMesAtual,
      qtdMesAtual,
      projecaoMesAtual,
      realMesAnterior,
      qtdMesAnterior,
      variacaoMoM,
      diferencaMoM,
      percConcluidoMes,
      realAnoAtual,
      qtdAnoAtual,
      projecaoAnualTotal,
      runRateAnual,
      ritmoDiario,
      diaAtual,
      diasNoMes,
      nomeMesAtual: nomeMesAtual.charAt(0).toUpperCase() + nomeMesAtual.slice(1),
      nomeMesAnterior: nomeMesAnterior.charAt(0).toUpperCase() + nomeMesAnterior.slice(1),
      anoAtualStr
    };
  }, [transacoes, mesAtualStr, mesAnteriorStr, anoAtualStr]);

  // 1. Filtrar apenas RECEITAS que representem operações / comissões
  const receitasFiltradas = useMemo(() => {
    return transacoesFiltradas.filter(t => {
      if (t.tipo !== 'receita') return false;
      // Não incluir transferências ou ajustes internos
      if (t.categoriaNome?.toLowerCase().includes('ajuste') || t.categoriaNome?.toLowerCase().includes('transferência')) return false;

      // Filtro de banco selecionado
      const bancoNome = t.clienteNome || 'Sem Parceiro Vinculado';
      if (bancoSelecionado !== 'todos' && bancoNome !== bancoSelecionado) return false;

      // Filtro por modalidade (Diferida / À Vista)
      const comp = getComportamentoTransacao(t);
      const sub = ((t as any).subcategoria || '').toLowerCase();
      const desc = (t.descricao || '').toLowerCase();
      const isDiferida = comp === 'fixa' || sub.includes('diferida') || desc.includes('diferida');

      if (modalidadeFiltro === 'diferida' && !isDiferida) return false;
      if (modalidadeFiltro === 'avista' && isDiferida) return false;

      // Filtro de texto de busca
      if (buscaLcto) {
        const q = buscaLcto.toLowerCase();
        const match =
          (t.descricao && t.descricao.toLowerCase().includes(q)) ||
          (t.clienteNome && t.clienteNome.toLowerCase().includes(q)) ||
          ((t as any).subcategoria && (t as any).subcategoria.toLowerCase().includes(q)) ||
          String(t.valor).includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [transacoesFiltradas, bancoSelecionado, modalidadeFiltro, buscaLcto]);

  // 2. Extrair lista única de Bancos Parceiros presentes nas receitas
  const listaBancos = useMemo(() => {
    const set = new Set<string>();
    transacoes.forEach(t => {
      if (t.tipo === 'receita' && t.clienteNome) {
        set.add(t.clienteNome.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [transacoes]);

  // 3. Indicadores de Topo (KPIs)
  const kpis = useMemo(() => {
    let total = 0;
    let totalDiferida = 0;
    let totalAvista = 0;
    let qtdDiferida = 0;
    let qtdAvista = 0;

    receitasFiltradas.forEach(t => {
      const v = Number(t.valor) || 0;
      total += v;

      const comp = getComportamentoTransacao(t);
      const sub = ((t as any).subcategoria || '').toLowerCase();
      const desc = (t.descricao || '').toLowerCase();
      const isDiferida = comp === 'fixa' || sub.includes('diferida') || desc.includes('diferida');

      if (isDiferida) {
        totalDiferida += v;
        qtdDiferida++;
      } else {
        totalAvista += v;
        qtdAvista++;
      }
    });

    const totalQtd = receitasFiltradas.length;
    const ticketMedio = totalQtd > 0 ? total / totalQtd : 0;
    const percDiferida = total > 0 ? (totalDiferida / total) * 100 : 0;
    const percAvista = total > 0 ? (totalAvista / total) * 100 : 0;

    return {
      total,
      totalQtd,
      totalDiferida,
      qtdDiferida,
      percDiferida,
      totalAvista,
      qtdAvista,
      percAvista,
      ticketMedio
    };
  }, [receitasFiltradas]);

  // 4. Agrupamento por Banco Parceiro para Ranking e Gráficos
  const dadosPorBanco = useMemo(() => {
    const map = new Map<string, {
      banco: string;
      total: number;
      diferida: number;
      avista: number;
      qtd: number;
      qtdDiferida: number;
      qtdAvista: number;
      transacoes: Transacao[];
    }>();

    receitasFiltradas.forEach(t => {
      const b = (t.clienteNome || 'Sem Parceiro Vinculado').trim();
      const v = Number(t.valor) || 0;

      const comp = getComportamentoTransacao(t);
      const sub = ((t as any).subcategoria || '').toLowerCase();
      const desc = (t.descricao || '').toLowerCase();
      const isDiferida = comp === 'fixa' || sub.includes('diferida') || desc.includes('diferida');

      let item = map.get(b);
      if (!item) {
        item = {
          banco: b,
          total: 0,
          diferida: 0,
          avista: 0,
          qtd: 0,
          qtdDiferida: 0,
          qtdAvista: 0,
          transacoes: []
        };
        map.set(b, item);
      }

      item.total += v;
      item.qtd++;
      item.transacoes.push(t);

      if (isDiferida) {
        item.diferida += v;
        item.qtdDiferida++;
      } else {
        item.avista += v;
        item.qtdAvista++;
      }
    });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [receitasFiltradas]);

  // Banco líder
  const bancoLider = dadosPorBanco[0] || null;

  // 5. Dados para Gráfico de Distribuição por Modalidade
  const pieDataModalidade = useMemo(() => {
    return [
      { name: 'Comissão Diferida (Fixa/Recorrente)', value: kpis.totalDiferida, color: '#8b5cf6' },
      { name: 'Comissão À Vista (Variável/Spot)', value: kpis.totalAvista, color: '#10b981' }
    ].filter(d => d.value > 0);
  }, [kpis]);

  // 6. Dados para Gráfico de Barras (Top Bancos)
  const barDataBancos = useMemo(() => {
    return dadosPorBanco.slice(0, 8).map(b => ({
      banco: b.banco.length > 18 ? b.banco.substring(0, 16) + '...' : b.banco,
      bancoCompleto: b.banco,
      'À Vista': b.avista,
      'Diferida': b.diferida,
      Total: b.total
    }));
  }, [dadosPorBanco]);

  // 7. Projeção de Comissões Diferidas nos Próximos 6 Meses
  // Algoritmo preditivo: usa média ponderada dos últimos 6 meses reais (todos os lançamentos,
  // não só o período filtrado) para calcular a base mensal recorrente.
  const projecaoMeses = useMemo(() => {
    const hoje = new Date();

    // ── Coleta o realizado de cada um dos últimos 6 meses históricos ──
    const historicoMensal: Record<string, number> = {};
    for (let i = 1; i <= 6; i++) {
      const ref = subMonths(hoje, i);
      const key = format(ref, 'yyyy-MM');
      historicoMensal[key] = 0;
    }

    transacoes.forEach(t => {
      if (t.tipo !== 'receita') return;
      const comp = getComportamentoTransacao(t);
      const sub = ((t as any).subcategoria || '').toLowerCase();
      const desc = (t.descricao || '').toLowerCase();
      const isDif = comp === 'fixa' || sub.includes('diferida') || desc.includes('diferida');
      if (!isDif) return;

      const v = Number(t.valor) || 0;
      const dataRef = normalizeDate(t.dataPagamento || t.data || '');
      const mesRef = dataRef.substring(0, 7);
      if (mesRef in historicoMensal) {
        historicoMensal[mesRef] += v;
      }
    });

    // ── Média ponderada (meses mais recentes têm peso maior) ──
    const valoresMensais = Object.values(historicoMensal).filter(v => v > 0);
    let baseMensal = metricasDiferidasLive.projecaoMesAtual; // fallback = projeção mês atual

    if (valoresMensais.length > 0) {
      // Pesos decrescentes: mês -1 = peso 6, mês -2 = peso 5, ..., mês -6 = peso 1
      const chaves = Object.keys(historicoMensal).sort().reverse(); // mais recente primeiro
      let somaPesos = 0;
      let somaValores = 0;
      chaves.forEach((k, idx) => {
        const peso = Math.max(6 - idx, 1);
        somaValores += historicoMensal[k] * peso;
        somaPesos += peso;
      });
      const mediaPonderada = somaPesos > 0 ? somaValores / somaPesos : 0;
      // Garante que nunca fica abaixo da projeção do mês atual
      baseMensal = Math.max(mediaPonderada, metricasDiferidasLive.projecaoMesAtual * 0.8);
    }

    // ── Fator de crescimento baseado na tendência dos últimos 3 meses ──
    const ultimos3 = Object.keys(historicoMensal).sort().reverse().slice(0, 3).map(k => historicoMensal[k]).filter(v => v > 0);
    let fatorCrescimento = 1.0;
    if (ultimos3.length >= 2) {
      const crescimento = (ultimos3[0] - ultimos3[ultimos3.length - 1]) / (ultimos3[ultimos3.length - 1] || 1);
      // Limita variação entre -5% e +5% por mês projetado
      fatorCrescimento = 1 + Math.max(-0.05, Math.min(0.05, crescimento / (ultimos3.length - 1)));
    }

    const meses = [];
    let acum = 0;

    for (let i = 1; i <= 6; i++) {
      const d = addMonths(hoje, i);
      const mesNome = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      const mesISO = format(d, 'yyyy-MM');
      // Aplica fator composto mês a mês
      const estimativa = baseMensal * Math.pow(fatorCrescimento, i);
      acum += estimativa;
      meses.push({
        mes: mesNome.toUpperCase().replace('.', ''),
        mesISO,
        estimativa,
        acumulado: acum,
        crescimento: i === 1 ? 0 : ((Math.pow(fatorCrescimento, i) - Math.pow(fatorCrescimento, i - 1)) / Math.pow(fatorCrescimento, i - 1)) * 100
      });
    }
    return meses;
  }, [transacoes, metricasDiferidasLive.projecaoMesAtual]);

  const totalProjecao6Meses = useMemo(() => {
    return projecaoMeses.reduce((acc, curr) => acc + curr.estimativa, 0);
  }, [projecaoMeses]);

  // Máximo para normalizar as barras do gráfico
  const maxEstimativa = useMemo(() =>
    Math.max(...projecaoMeses.map(p => p.estimativa), 1),
    [projecaoMeses]
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* 🔮 SUPER INDICADOR LIVE DE COMISSÕES DIFERIDAS (TEMPO REAL) */}
      <div style={{
        background: `linear-gradient(135deg, ${corPrimariaAlpha(0.12)} 0%, ${corPrimariaAlpha(0.05)} 50%, rgba(16, 185, 129, 0.06) 100%)`,
        border: `1px solid ${corPrimariaAlpha(0.35)}`,
        borderRadius: 22,
        padding: '24px 26px',
        boxShadow: `0 8px 32px ${corPrimariaAlpha(0.12)}`,
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* TOPO COM IDENTIFICAÇÃO E BADGE LIVE */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: `linear-gradient(135deg, ${corPrimaria}, ${corPrimaria}cc)`,
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 4px 16px ${corPrimariaAlpha(0.4)}`
            }}>
              <Zap size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.3px' }}>
                  Painel em Tempo Real • Carteira de Comissões Diferidas (Fixas)
                </h3>
                {/* BADGE PULSANTE TEMPO REAL */}
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '3px 10px',
                  borderRadius: 20,
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  color: '#059669',
                  fontSize: 10,
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  <span style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: '#10b981',
                    boxShadow: '0 0 8px #10b981'
                  }}></span>
                  Tempo Real Ativo
                </div>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '3px 0 0' }}>
                Cálculo preditivo inteligente atualizado automaticamente a cada novo lançamento no sistema
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Dia {metricasDiferidasLive.diaAtual} de {metricasDiferidasLive.diasNoMes}</span>
            <div style={{ width: 80, height: 6, borderRadius: 3, background: 'rgba(0,0,0,0.1)', overflow: 'hidden' }}>
              <div style={{ width: `${(metricasDiferidasLive.diaAtual / metricasDiferidasLive.diasNoMes) * 100}%`, height: '100%', background: corPrimaria }}></div>
            </div>
          </div>
        </div>

        {/* 4 CARDS ESTRATÉGICOS MODERNOS */}
        <div className="grid-responsive-4" style={{ gap: 14 }}>
          {/* CARD 1: MÊS ATUAL */}
          <div style={{
            background: 'var(--bg-glass, rgba(255,255,255,0.7))',
            border: '1px solid rgba(124, 58, 237, 0.25)',
            borderRadius: 16,
            padding: '16px 18px',
            backdropFilter: 'blur(10px)'
          }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: 4 }}>
              📅 Projeção {metricasDiferidasLive.nomeMesAtual}
            </span>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#7c3aed', letterSpacing: '-0.5px' }}>
              {fmt(metricasDiferidasLive.projecaoMesAtual)}
            </div>

            {/* Barra de Progresso Realizado */}
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                <span style={{ color: 'var(--text-muted)' }}>Realizado até hoje:</span>
                <strong style={{ color: '#059669' }}>{fmt(metricasDiferidasLive.realMesAtual)}</strong>
              </div>
              <div style={{ width: '100%', height: 6, borderRadius: 3, background: 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                <div style={{
                  width: `${metricasDiferidasLive.percConcluidoMes}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #10b981, #7c3aed)',
                  borderRadius: 3
                }}></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                <span>{metricasDiferidasLive.percConcluidoMes.toFixed(1)}% faturado</span>
                <span>Ritmo: {fmt(metricasDiferidasLive.ritmoDiario)}/dia</span>
              </div>
            </div>
          </div>

          {/* CARD 2: BASE MÊS ANTERIOR */}
          <div style={{
            background: 'var(--bg-glass, rgba(255,255,255,0.7))',
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: 16,
            padding: '16px 18px',
            backdropFilter: 'blur(10px)'
          }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: 4 }}>
              ⏪ Base {metricasDiferidasLive.nomeMesAnterior} (Realizado)
            </span>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
              {fmt(metricasDiferidasLive.realMesAnterior)}
            </div>

            <div style={{ marginTop: 10 }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '3px 8px',
                borderRadius: 6,
                background: metricasDiferidasLive.diferencaMoM >= 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                color: metricasDiferidasLive.diferencaMoM >= 0 ? '#059669' : '#dc2626',
                fontSize: 11,
                fontWeight: 700
              }}>
                {metricasDiferidasLive.diferencaMoM >= 0 ? <TrendingUp size={13} /> : null}
                {metricasDiferidasLive.diferencaMoM >= 0 ? '+' : ''}{metricasDiferidasLive.variacaoMoM.toFixed(1)}% vs anterior
              </div>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginTop: 4 }}>
                Diferença: {metricasDiferidasLive.diferencaMoM >= 0 ? '+' : ''}{fmt(metricasDiferidasLive.diferencaMoM)}
              </span>
            </div>
          </div>

          {/* CARD 3: PROJEÇÃO ANUAL TOTAL */}
          <div style={{
            background: 'var(--bg-glass, rgba(255,255,255,0.7))',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: 16,
            padding: '16px 18px',
            backdropFilter: 'blur(10px)'
          }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: 4 }}>
              🔮 Projeção Total ({metricasDiferidasLive.anoAtualStr})
            </span>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#059669', letterSpacing: '-0.5px' }}>
              {fmt(metricasDiferidasLive.projecaoAnualTotal)}
            </div>

            <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span>Realizado Jan a Hoje:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{fmt(metricasDiferidasLive.realAnoAtual)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Projeção Restante:</span>
                <strong style={{ color: '#059669' }}>+{fmt(metricasDiferidasLive.projecaoAnualTotal - metricasDiferidasLive.realAnoAtual)}</strong>
              </div>
            </div>
          </div>

          {/* CARD 4: RUN-RATE ANUAL (12 MESES) */}
          <div style={{
            background: 'var(--bg-glass, rgba(255,255,255,0.7))',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            borderRadius: 16,
            padding: '16px 18px',
            backdropFilter: 'blur(10px)'
          }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: 4 }}>
              💎 Run-Rate Carteira (12 Meses)
            </span>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#d97706', letterSpacing: '-0.5px' }}>
              {fmt(metricasDiferidasLive.runRateAnual)}
            </div>

            <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span>Média Mensal Base:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{fmt(metricasDiferidasLive.projecaoMesAtual)}</strong>
              </div>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block' }}>
                Potencial de fluxo anualizado da carteira
              </span>
            </div>
          </div>
        </div>
      </div>
      {/* CABEÇALHO DO MÓDULO */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(204,0,0,0.06), rgba(204,0,0,0.02))',
        border: '1px solid rgba(204,0,0,0.2)',
        borderRadius: 20,
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 46,
            height: 46,
            borderRadius: 14,
            background: 'var(--primary, #cc0000)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(204,0,0,0.3)'
          }}>
            <Building2 size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: 19, fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.3px' }}>
              Painel Analítico de Comissões & Bancos Parceiros
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '3px 0 0' }}>
              Visão consolidada de produção por instituição financeira, comparativo de Comissões À Vista vs. Diferidas (recorrência) e projeções.
            </p>
          </div>
        </div>

        {/* CONTROLES / FILTROS LOCAIS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {/* Seletor de Banco */}
          <div style={{ minWidth: 180 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
              Filtrar Banco
            </label>
            <select
              className="input-field filter-select-sm"
              value={bancoSelecionado}
              onChange={e => setBancoSelecionado(e.target.value)}
            >
              <option value="todos">Todos os Bancos ({listaBancos.length})</option>
              {listaBancos.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Modalidade */}
          <div style={{ minWidth: 150 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
              Modalidade
            </label>
            <select
              className="input-field filter-select-sm"
              value={modalidadeFiltro}
              onChange={e => setModalidadeFiltro(e.target.value as any)}
            >
              <option value="todas">Todas as Modalidades</option>
              <option value="diferida">Apenas Diferidas (Fixas)</option>
              <option value="avista">Apenas À Vista (Spot)</option>
            </select>
          </div>
        </div>
      </div>

      {/* CARDS DE INDICADORES (KPIs) */}
      <div className="grid-responsive-4" style={{ gap: 16 }}>
        {/* TOTAL COMISSÕES */}
        <div className="glass" style={{
          padding: '18px 20px',
          borderRadius: 16,
          border: '1px solid rgba(204,0,0,0.18)',
          background: 'linear-gradient(135deg, rgba(204,0,0,0.04), transparent)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Total em Comissões
            </span>
            <span style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(204,0,0,0.1)', color: 'var(--primary, #cc0000)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={16} />
            </span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
            {fmt(kpis.total)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>{kpis.totalQtd} lançamentos de comissão</span>
          </div>
        </div>

        {/* COMISSÕES DIFERIDAS (FIXAS) */}
        <div className="glass" style={{
          padding: '18px 20px',
          borderRadius: 16,
          border: '1px solid rgba(139,92,246,0.25)',
          background: 'linear-gradient(135deg, rgba(139,92,246,0.06), transparent)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase' }}>
              Comissões Diferidas (Fixas)
            </span>
            <span style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(139,92,246,0.15)', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={16} />
            </span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#7c3aed', letterSpacing: '-0.5px' }}>
            {fmt(kpis.totalDiferida)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            <strong style={{ color: '#7c3aed' }}>{kpis.percDiferida.toFixed(1)}%</strong> da receita total ({kpis.qtdDiferida} recebimentos)
          </div>
        </div>

        {/* COMISSÕES À VISTA (VARIÁVEIS) */}
        <div className="glass" style={{
          padding: '18px 20px',
          borderRadius: 16,
          border: '1px solid rgba(16,185,129,0.25)',
          background: 'linear-gradient(135deg, rgba(16,185,129,0.06), transparent)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>
              Comissões À Vista (Spot)
            </span>
            <span style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(16,185,129,0.15)', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={16} />
            </span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#059669', letterSpacing: '-0.5px' }}>
            {fmt(kpis.totalAvista)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            <strong style={{ color: '#059669' }}>{kpis.percAvista.toFixed(1)}%</strong> da receita total ({kpis.qtdAvista} contratos)
          </div>
        </div>

        {/* BANCO LÍDER DO PERÍODO */}
        <div className="glass" style={{
          padding: '18px 20px',
          borderRadius: 16,
          border: '1px solid rgba(245,158,11,0.25)',
          background: 'linear-gradient(135deg, rgba(245,158,11,0.06), transparent)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#d97706', textTransform: 'uppercase' }}>
              Parceiro Líder
            </span>
            <span style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(245,158,11,0.15)', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Award size={16} />
            </span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {bancoLider ? bancoLider.banco : 'Nenhum'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            {bancoLider ? (
              <>
                <strong style={{ color: '#d97706' }}>{fmt(bancoLider.total)}</strong> ({((bancoLider.total / (kpis.total || 1)) * 100).toFixed(1)}% do volume)
              </>
            ) : 'Sem dados'}
          </div>
        </div>
      </div>

      {/* SEÇÃO DE GRÁFICOS ANALÍTICOS */}
      <div className="grid-responsive-2" style={{ gap: 20 }}>
        {/* GRÁFICO 1: RANKING POR BANCO PARCEIRO */}
        <div className="glass" style={{ padding: 22, borderRadius: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Ranking por Banco Parceiro (Top 8)
              </h3>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>
                Divisão entre À Vista e Diferida por instituição
              </p>
            </div>
            <BarChart3 size={18} color="var(--primary, #cc0000)" />
          </div>

          <div style={{ width: '100%', height: 280 }}>
            {barDataBancos.length === 0 ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                Nenhum dado encontrado para os filtros selecionados
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barDataBancos} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.06)" />
                  <XAxis
                    dataKey="banco"
                    tick={{ fill: 'var(--text-muted)', fontSize: 11, fontWeight: 600 }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis
                    tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                    tickFormatter={v => `R$ ${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: any, name: any) => [fmt(Number(value) || 0), name]}
                    contentStyle={{
                      background: 'rgba(255,255,255,0.96)',
                      borderRadius: 12,
                      border: '1px solid rgba(0,0,0,0.1)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                      fontSize: 12
                    }}
                  />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 12, fontWeight: 600 }} />
                  <Bar dataKey="À Vista" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="Diferida" stackId="a" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* GRÁFICO 2: COMPOSIÇÃO DA CARTEIRA (À VISTA VS DIFERIDA) */}
        <div className="glass" style={{ padding: 22, borderRadius: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Composição: À Vista vs. Diferida
              </h3>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>
                Proporção de recorrência fixa vs. receita pontual
              </p>
            </div>
            <PieIcon size={18} color="#8b5cf6" />
          </div>

          <div style={{ width: '100%', height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {pieDataModalidade.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                Sem dados de comissões para o período
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieDataModalidade}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={4}
                  >
                    {pieDataModalidade.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any, name: any) => [fmt(Number(value) || 0), name]}
                    contentStyle={{
                      background: 'rgba(255,255,255,0.96)',
                      borderRadius: 12,
                      border: '1px solid rgba(0,0,0,0.1)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                      fontSize: 12
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 11, fontWeight: 600 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* TABELA CONSOLIDADA POR BANCO PARCEIRO */}
      <div className="glass" style={{ borderRadius: 20, overflow: 'hidden' }}>
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12
        }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Detalhamento por Instituição Parceira
            </h3>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>
              Clique em qualquer parceiro para expandir e ver os lançamentos individuais
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Campo de busca rápida */}
            <div style={{ position: 'relative', width: 220 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Buscar contrato/descrição..."
                className="input-field filter-select-sm"
                style={{ paddingLeft: 30 }}
                value={buscaLcto}
                onChange={e => setBuscaLcto(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* TABELA */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', width: 60 }}>#</th>
                <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Banco / Parceiro</th>
                <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'center' }}>Operações</th>
                <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>À Vista (Spot)</th>
                <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Diferida (Fixa)</th>
                <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Total Geral</th>
                <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Share (%)</th>
                <th style={{ padding: '12px 18px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'center', width: 80 }}>Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {dadosPorBanco.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                    Nenhuma operação de comissão encontrada para este filtro.
                  </td>
                </tr>
              ) : (
                dadosPorBanco.map((b, index) => {
                  const share = kpis.total > 0 ? (b.total / kpis.total) * 100 : 0;
                  const expandido = bancoExpandido === b.banco;

                  return (
                    <React.Fragment key={b.banco}>
                      <tr
                        onClick={() => setBancoExpandido(expandido ? null : b.banco)}
                        style={{
                          borderBottom: '1px solid var(--border)',
                          cursor: 'pointer',
                          background: expandido ? 'rgba(204,0,0,0.03)' : (index % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.01)'),
                          transition: 'background 0.2s'
                        }}
                      >
                        <td style={{ padding: '14px 18px', fontSize: 12, fontWeight: 700, color: index < 3 ? 'var(--primary, #cc0000)' : 'var(--text-muted)' }}>
                          #{index + 1}
                        </td>
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 30,
                              height: 30,
                              borderRadius: 8,
                              background: index === 0 ? 'rgba(245,158,11,0.15)' : 'rgba(204,0,0,0.08)',
                              color: index === 0 ? '#d97706' : 'var(--primary, #cc0000)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: 12
                            }}>
                              <Building2 size={16} />
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                              {b.banco}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '14px 18px', fontSize: 12, textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 600 }}>
                          {b.qtd}
                        </td>
                        <td style={{ padding: '14px 18px', fontSize: 13, textAlign: 'right', fontWeight: 600, color: '#059669' }}>
                          {fmt(b.avista)}
                        </td>
                        <td style={{ padding: '14px 18px', fontSize: 13, textAlign: 'right', fontWeight: 600, color: '#7c3aed' }}>
                          {fmt(b.diferida)}
                        </td>
                        <td style={{ padding: '14px 18px', fontSize: 14, textAlign: 'right', fontWeight: 800, color: 'var(--text-primary)' }}>
                          {fmt(b.total)}
                        </td>
                        <td style={{ padding: '14px 18px', fontSize: 12, textAlign: 'right', fontWeight: 700, color: 'var(--text-muted)' }}>
                          {share.toFixed(1)}%
                        </td>
                        <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ padding: '4px 8px', fontSize: 11, borderRadius: 6 }}
                          >
                            {expandido ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </td>
                      </tr>

                      {/* DETALHAMENTO DE LANÇAMENTOS DO BANCO EXPANDIDO */}
                      {expandido && (
                        <tr>
                          <td colSpan={8} style={{ padding: '16px 24px', background: 'rgba(0,0,0,0.02)', borderBottom: '2px solid rgba(204,0,0,0.15)' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                                  Lançamentos de Comissões de <strong>{b.banco}</strong> ({b.transacoes.length} registros)
                                </span>
                              </div>

                              <div style={{ maxHeight: 280, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--bg-glass)' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                  <thead>
                                    <tr style={{ background: 'rgba(0,0,0,0.03)', borderBottom: '1px solid var(--border)' }}>
                                      <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-muted)' }}>Data</th>
                                      <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-muted)' }}>Descrição</th>
                                      <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-muted)' }}>Subcategoria</th>
                                      <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-muted)' }}>Modalidade</th>
                                      <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-muted)' }}>Status</th>
                                      <th style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'right' }}>Valor</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {b.transacoes.map((t, tIdx) => {
                                      const comp = getComportamentoTransacao(t);
                                      const sub = ((t as any).subcategoria || '').toLowerCase();
                                      const desc = (t.descricao || '').toLowerCase();
                                      const isDif = comp === 'fixa' || sub.includes('diferida') || desc.includes('diferida');

                                      return (
                                        <tr key={t.id || tIdx} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                                          <td style={{ padding: '8px 12px', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                                            {String(t.dataPagamento || t.data || '').split('-').reverse().join('/')}
                                          </td>
                                          <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                            {t.descricao}
                                          </td>
                                          <td style={{ padding: '8px 12px' }}>
                                            {(t as any).subcategoria ? (
                                              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'rgba(59,130,246,0.1)', color: '#2563eb' }}>
                                                {(t as any).subcategoria}
                                              </span>
                                            ) : '-'}
                                          </td>
                                          <td style={{ padding: '8px 12px' }}>
                                            <span style={{
                                              fontSize: 10,
                                              fontWeight: 700,
                                              padding: '2px 6px',
                                              borderRadius: 4,
                                              background: isDif ? 'rgba(139,92,246,0.15)' : 'rgba(16,185,129,0.15)',
                                              color: isDif ? '#7c3aed' : '#059669'
                                            }}>
                                              {isDif ? 'Diferida (Fixa)' : 'À Vista (Spot)'}
                                            </span>
                                          </td>
                                          <td style={{ padding: '8px 12px' }}>
                                            <span style={{
                                              fontSize: 10,
                                              fontWeight: 700,
                                              padding: '2px 6px',
                                              borderRadius: 4,
                                              background: t.status === 'pago' ? 'rgba(21,128,61,0.12)' : 'rgba(234,179,8,0.15)',
                                              color: t.status === 'pago' ? '#15803d' : '#d97706'
                                            }}>
                                              {t.status === 'pago' ? 'Confirmado' : 'Pendente'}
                                            </span>
                                          </td>
                                          <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#15803d' }}>
                                            +{fmt(t.valor)}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* QUADRO DE PROJEÇÃO DE RECORRÊNCIA FUTURA */}
      <div className="glass" style={{ padding: 22, borderRadius: 20, border: `1px solid ${corPrimariaAlpha(0.25)}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              🔮 Projeção de Carteira Recorrente — Comissões Diferidas (6 Meses)
            </h3>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '2px 0 0' }}>
              Estimativa inteligente com tendência histórica ponderada • Atualiza em tempo real a cada novo lançamento
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: corPrimaria, background: corPrimariaAlpha(0.1), padding: '6px 12px', borderRadius: 8 }}>
              Base Mensal: {fmt(metricasDiferidasLive.projecaoMesAtual)}
            </span>
            <span style={{
              fontSize: 12, fontWeight: 800, color: 'white',
              background: corPrimaria,
              padding: '6px 14px', borderRadius: 8,
              boxShadow: `0 2px 8px ${corPrimariaAlpha(0.35)}`
            }}>
              Total 6 Meses: {fmt(totalProjecao6Meses)}
            </span>
          </div>
        </div>

        {/* ── BANNER CONSOLIDADOR GRANDE ── */}
        <div style={{
          background: `linear-gradient(135deg, ${corPrimariaAlpha(0.14)}, ${corPrimariaAlpha(0.04)})`,
          border: `1px solid ${corPrimariaAlpha(0.4)}`,
          borderRadius: 16,
          padding: '20px 24px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: corPrimaria, color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 6px 18px ${corPrimariaAlpha(0.4)}`
            }}>
              <Target size={26} />
            </div>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: corPrimaria, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                Totalização da Carteira — Próximos 6 Meses
              </span>
              <p style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-primary)', margin: '2px 0 0', letterSpacing: '-0.8px' }}>
                {fmt(totalProjecao6Meses)}
              </p>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Soma das 6 projeções mensais com tendência aplicada
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 20, alignItems: 'stretch', flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center', padding: '10px 16px', background: 'rgba(16,185,129,0.08)', borderRadius: 10, border: '1px solid rgba(16,185,129,0.2)' }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', fontWeight: 700, textTransform: 'uppercase' }}>Média Mensal</span>
              <strong style={{ fontSize: 16, color: '#059669' }}>{fmt(totalProjecao6Meses / 6)}</strong>
            </div>
            <div style={{ textAlign: 'center', padding: '10px 16px', background: corPrimariaAlpha(0.07), borderRadius: 10, border: `1px solid ${corPrimariaAlpha(0.2)}` }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', fontWeight: 700, textTransform: 'uppercase' }}>Mês Pico</span>
              <strong style={{ fontSize: 16, color: corPrimaria }}>{fmt(maxEstimativa)}</strong>
            </div>
            <div style={{ textAlign: 'center', padding: '10px 16px', background: 'rgba(245,158,11,0.08)', borderRadius: 10, border: '1px solid rgba(245,158,11,0.2)' }}>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', fontWeight: 700, textTransform: 'uppercase' }}>Período</span>
              <strong style={{ fontSize: 15, color: '#d97706' }}>1 Semestre</strong>
            </div>
          </div>
        </div>

        {/* ── GRÁFICO DE ÁREA (ACUMULADO) + BARRAS (MENSAL) ── */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Layers size={14} color={corPrimaria} />
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
              Evolução Projetada (Mensal + Acumulado)
            </span>
          </div>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={projecaoMeses} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="gradAcum" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={corPrimaria} stopOpacity={0.18} />
                    <stop offset="95%" stopColor={corPrimaria} stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="mes" tick={{ fill: 'var(--text-muted)', fontSize: 11, fontWeight: 600 }} />
                <YAxis
                  yAxisId="left"
                  tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                  tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                  tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: any, name: any) => [fmt(Number(value) || 0), name === 'estimativa' ? 'Mensal Estimado' : 'Acumulado']}
                  contentStyle={{
                    background: 'rgba(255,255,255,0.97)',
                    borderRadius: 12, border: `1px solid ${corPrimariaAlpha(0.2)}`,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)', fontSize: 12
                  }}
                />
                <Legend verticalAlign="top" height={32} wrapperStyle={{ fontSize: 11, fontWeight: 600 }} />
                <Bar yAxisId="left" dataKey="estimativa" name="Mensal Estimado" fill={corPrimaria} radius={[6, 6, 0, 0]} opacity={0.85} />
                <Area yAxisId="right" type="monotone" dataKey="acumulado" name="Acumulado" stroke="#10b981" strokeWidth={2.5} fill="url(#gradAcum)" dot={{ fill: '#10b981', r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── CARDS DOS 6 MESES ── */}
        <div className="grid-responsive-3" style={{ gap: 12 }}>
          {projecaoMeses.map((p, idx) => (
            <div key={idx} style={{
              background: corPrimariaAlpha(0.04),
              border: `1px solid ${corPrimariaAlpha(0.18)}`,
              borderRadius: 12,
              padding: '14px 16px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Mini barra de progresso interna */}
              <div style={{
                position: 'absolute', bottom: 0, left: 0,
                width: `${(p.estimativa / maxEstimativa) * 100}%`,
                height: 3, background: corPrimaria, borderRadius: '0 0 0 12px', opacity: 0.5
              }} />
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Previsão {p.mes}
                  </span>
                  <p style={{ fontSize: 17, fontWeight: 800, color: corPrimaria, margin: '4px 0 0', letterSpacing: '-0.3px' }}>
                    {fmt(p.estimativa)}
                  </p>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginTop: 3 }}>
                    Acum.: <strong style={{ color: '#059669' }}>{fmt(p.acumulado)}</strong>
                  </span>
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 800, color: 'white',
                  background: '#10b981', padding: '2px 7px', borderRadius: 5, marginTop: 2
                }}>
                  Recorrente
                </span>
              </div>
            </div>
          ))}

          {/* CARD RESUMO FINAL 6 MESES */}
          <div style={{
            background: `linear-gradient(135deg, ${corPrimariaAlpha(0.2)}, ${corPrimariaAlpha(0.08)})`,
            border: `2px dashed ${corPrimaria}`,
            borderRadius: 12,
            padding: '14px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <div>
              <span style={{ fontSize: 10, fontWeight: 800, color: corPrimaria, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                TOTAL 6 MESES
              </span>
              <p style={{ fontSize: 20, fontWeight: 900, color: corPrimaria, margin: '4px 0 0', letterSpacing: '-0.5px' }}>
                {fmt(totalProjecao6Meses)}
              </p>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginTop: 2 }}>
                Soma acumulada do semestre
              </span>
            </div>
            <span style={{
              fontSize: 11, fontWeight: 800, color: 'white',
              background: corPrimaria, padding: '5px 12px', borderRadius: 8,
              boxShadow: `0 2px 8px ${corPrimariaAlpha(0.35)}`
            }}>
              Semestre
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
