'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Target, TrendingUp, TrendingDown, AlertTriangle, PlusCircle, CheckCircle2,
  Edit2, Trash2, Wand2, CalendarDays, Zap, X, Activity, BarChart3,
  Clock, Flame, Award, ArrowUp, ArrowDown, RefreshCw
} from 'lucide-react';
import {
  formatarMoeda,
  subscribeTransacoes,
  subscribeMetasFinanceiras,
  salvarMetaFinanceira,
  excluirMetaFinanceira
} from '@/lib/storage';
import { Transacao, MetaFinanceira } from '@/lib/types';
import {
  format, parseISO, isWithinInterval, startOfMonth, endOfMonth,
  eachDayOfInterval, isAfter, isBefore, addDays, differenceInDays,
  isSameDay
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, BarChart, Bar, Legend, Cell
} from 'recharts';
import { getValorFinal } from '@/lib/financialEngine';

// ── Helpers ──────────────────────────────────────────────────────────────────
function isDiaUtil(d: Date) {
  const dia = d.getDay();
  return dia !== 0 && dia !== 6;
}

function calcularDiasUteisEntre(inicio: Date, fim: Date) {
  let cont = 0;
  let atual = new Date(inicio);
  atual.setHours(0, 0, 0, 0);
  const fimD = new Date(fim);
  fimD.setHours(0, 0, 0, 0);
  while (atual <= fimD) {
    if (isDiaUtil(atual)) cont++;
    atual = addDays(atual, 1);
  }
  return cont;
}

function gerarId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color?: string;
  bg?: string;
  border?: string;
}

function KpiCard({ icon, label, value, sub, color = '#fff' }: KpiCardProps) {
  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.015)', 
      border: '1px solid rgba(255, 255, 255, 0.04)',
      borderRadius: 14, 
      padding: '16px 20px',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
    }}>
      {/* Indicador de cor sutil na lateral */}
      {color !== '#fff' && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: color, opacity: 0.6 }} />}

      <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <span style={{ color: color !== '#fff' ? color : '#94a3b8', display: 'flex', opacity: 0.8 }}>{icon}</span> {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, color, letterSpacing: '-0.5px' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, fontWeight: 500 }}>{sub}</div>}
    </div>
  );
}

// ── Componente Principal ──────────────────────────────────────────────────────
export default function MetasGamificadasV2() {
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [metas, setMetas] = useState<MetaFinanceira[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMeta, setEditingMeta] = useState<Partial<MetaFinanceira> | null>(null);
  const [metaDestaqueId, setMetaDestaqueId] = useState<string | null>(null);
  const [valorAlvoStr, setValorAlvoStr] = useState('');

  // Formata número como moeda BR enquanto digita (ex: 40000 → "40.000,00")
  const formatarInputMoeda = (raw: string): { display: string; numerico: number } => {
    const apenasDigitos = raw.replace(/\D/g, '');
    const num = Number(apenasDigitos) / 100;
    const display = num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return { display, numerico: num };
  };

  useEffect(() => {
    const unsubs: (() => void)[] = [];
    unsubs.push(subscribeTransacoes((dados) => setTransacoes(dados as Transacao[])));
    const u = subscribeMetasFinanceiras((dados) => {
      const lista = dados as MetaFinanceira[];
      setMetas(lista);
      setLoading(false);
      if (!metaDestaqueId && lista.length > 0) {
        // Prioriza receita ativa
        const ativa = lista.find(m => m.status === 'ativa' && m.tipo === 'receita') || lista[0];
        setMetaDestaqueId(ativa.id);
      }
    });
    unsubs.push(u);
    return () => unsubs.forEach(fn => fn());
  }, []);

  // ── Cálculo da meta ─────────────────────────────────────────────────────────
  const calcularMeta = useMemo(() => (meta: MetaFinanceira) => {
    const dInicio = parseISO(meta.dataInicio);
    const dFim = parseISO(meta.dataTermino);
    const hoje = new Date();
    hoje.setHours(23, 59, 59, 999);

    // Receitas/despesas pagas dentro do período
    let realizado = 0;
    const lancamentosDoDia: { data: string; valor: number }[] = [];

    transacoes.forEach(t => {
      if (t.status !== 'pago') return;
      if (t.tipo !== meta.tipo) return;
      if (meta.categoria && t.categoriaNome !== meta.categoria) return;

      const raw = t.dataPagamento || t.dataVencimento || t.data;
      if (!raw) return;

      let dtT: Date;
      try {
        dtT = parseISO(raw.substring(0, 10));
      } catch { return; }

      if (isWithinInterval(dtT, { start: dInicio, end: dFim })) {
        const val = Math.abs(getValorFinal(t));
        realizado += val;
        const dia = format(dtT, 'yyyy-MM-dd');
        const existing = lancamentosDoDia.find(l => l.data === dia);
        if (existing) existing.valor += val;
        else lancamentosDoDia.push({ data: dia, valor: val });
      }
    });

    const pct = meta.valorAlvo > 0 ? (realizado / meta.valorAlvo) * 100 : 0;
    const falta = Math.max(0, meta.valorAlvo - realizado);

    // Dias úteis
    const dataLimiteDecorrido = isBefore(hoje, dFim) ? hoje : dFim;
    const diasUteisTotal = calcularDiasUteisEntre(dInicio, dFim);
    const diasUteisDecorridos = calcularDiasUteisEntre(dInicio, dataLimiteDecorrido);
    const diasUteisRestantes = Math.max(0, diasUteisTotal - diasUteisDecorridos);

    // Dias corridos
    const diasCorridosTotal = differenceInDays(dFim, dInicio) + 1;
    const diasCorridosDecorridos = Math.min(differenceInDays(hoje, dInicio) + 1, diasCorridosTotal);
    const diasCorridosRestantes = Math.max(0, diasCorridosTotal - diasCorridosDecorridos);

    const metaDiariaGlobal = diasUteisTotal > 0 ? meta.valorAlvo / diasUteisTotal : 0;
    const mediaDiariaRealizada = diasUteisDecorridos > 0 ? realizado / diasUteisDecorridos : 0;
    const projecao = mediaDiariaRealizada * diasUteisTotal;
    const variacao = projecao - meta.valorAlvo;
    const taxaCumprimento = meta.valorAlvo > 0 ? (projecao / meta.valorAlvo) * 100 : 0;
    const metaDiariaAjustada = diasUteisRestantes > 0 ? falta / diasUteisRestantes : 0;
    const idealAcumulado = metaDiariaGlobal * diasUteisDecorridos;
    const avancoVsIdeal = realizado - idealAcumulado;
    const velocidade = idealAcumulado > 0 ? (realizado / idealAcumulado) * 100 : 0;

    // Maior dia de receita
    const melhorDia = lancamentosDoDia.sort((a, b) => b.valor - a.valor)[0];

    // Chart data
    const dias = eachDayOfInterval({ start: dInicio, end: dFim });
    let acumulado = 0;
    let idealAcum = 0;
    const chartData = dias.map(d => {
      if (isDiaUtil(d)) idealAcum += metaDiariaGlobal;
      const diaStr = format(d, 'yyyy-MM-dd');
      const lancDia = lancamentosDoDia.find(l => l.data === diaStr);
      if (!isAfter(d, hoje)) {
        acumulado += lancDia?.valor ?? 0;
        return { dia: format(d, 'dd/MM'), realizado: acumulado, ideal: idealAcum, diario: lancDia?.valor ?? 0 };
      }
      return { dia: format(d, 'dd/MM'), ideal: idealAcum };
    });

    return {
      realizado, pct, falta,
      diasUteisTotal, diasUteisDecorridos, diasUteisRestantes,
      diasCorridosTotal, diasCorridosDecorridos, diasCorridosRestantes,
      metaDiariaGlobal, mediaDiariaRealizada, projecao,
      variacao, taxaCumprimento, metaDiariaAjustada,
      idealAcumulado, avancoVsIdeal, velocidade,
      melhorDia, chartData
    };
  }, [transacoes]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const abrirNovaMeta = () => {
    const hoje = new Date();
    setEditingMeta({
      nome: '',
      descricao: '',
      tipo: 'receita',
      valorAlvo: 0,
      dataInicio: format(startOfMonth(hoje), 'yyyy-MM-dd'),
      dataTermino: format(endOfMonth(hoje), 'yyyy-MM-dd'),
      frequencia: 'mensal',
      status: 'ativa',
      alertaPercentual: 80
    });
    setValorAlvoStr('');
    setModalOpen(true);
  };

  const abrirEditarMeta = (meta: MetaFinanceira) => {
    setEditingMeta({ ...meta });
    // Pré-formata o valor existente como moeda
    const display = meta.valorAlvo > 0
      ? meta.valorAlvo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : '';
    setValorAlvoStr(display);
    setModalOpen(true);
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMeta) return;
    try {
      await salvarMetaFinanceira({ ...editingMeta, valorAlvo: Number(editingMeta.valorAlvo || 0) });
      setModalOpen(false);
      setEditingMeta(null);
    } catch {
      alert('Erro ao salvar meta.');
    }
  };

  const handleExcluir = async (id: string) => {
    if (confirm('Excluir esta meta?')) await excluirMetaFinanceira(id);
  };

  // ── Lógica KPIs globais ──────────────────────────────────────────────────────
  const metasAtivas = metas.filter(m => m.status === 'ativa');
  const taxaMedia = metasAtivas.length > 0
    ? metasAtivas.reduce((acc, m) => acc + Math.min(calcularMeta(m).pct, 100), 0) / metasAtivas.length
    : 0;
  const metaDestaque = metas.find(m => m.id === metaDestaqueId) || metasAtivas[0] || metas[0];
  const kd = metaDestaque ? calcularMeta(metaDestaque) : null;

  if (loading) return (
    <div style={{ padding: 60, textAlign: 'center', color: '#fff', fontSize: 16 }}>
      <RefreshCw size={32} color="#60a5fa" style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
      <div>Carregando Metas...</div>
    </div>
  );

  return (
    <div style={{ padding: '20px 24px 120px 24px' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-title)', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Wand2 size={22} color="var(--primary)" /> Metas Financeiras com IA
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
            Acompanhamento em tempo real · Regime de Caixa · Dias Úteis
          </p>
        </div>
        <button onClick={abrirNovaMeta} style={{
          background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff',
          border: 'none', borderRadius: 20, padding: '10px 20px',
          fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center',
          gap: 8, cursor: 'pointer', boxShadow: '0 4px 14px rgba(16,185,129,0.35)'
        }}>
          <PlusCircle size={16} /> Nova Meta
        </button>
      </div>

      {/* ── KPIs Globais ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        <div style={{ background: '#1e3a8a', padding: 16, borderRadius: 12, border: '1px solid #1e40af', textAlign: 'center' }}>
          <Target size={22} color="#60a5fa" style={{ margin: '0 auto 6px' }} />
          <div style={{ fontSize: 11, color: '#93c5fd', fontWeight: 700, textTransform: 'uppercase' }}>Total de Metas</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#fff' }}>{metas.length}</div>
        </div>
        <div style={{ background: '#064e3b', padding: 16, borderRadius: 12, border: '1px solid #047857', textAlign: 'center' }}>
          <CheckCircle2 size={22} color="#34d399" style={{ margin: '0 auto 6px' }} />
          <div style={{ fontSize: 11, color: '#6ee7b7', fontWeight: 700, textTransform: 'uppercase' }}>Ativas</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#fff' }}>{metasAtivas.length}</div>
        </div>
        <div style={{ background: '#78350f', padding: 16, borderRadius: 12, border: '1px solid #92400e', textAlign: 'center' }}>
          <AlertTriangle size={22} color="#fbbf24" style={{ margin: '0 auto 6px' }} />
          <div style={{ fontSize: 11, color: '#fcd34d', fontWeight: 700, textTransform: 'uppercase' }}>Concluídas</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#fff' }}>{metas.filter(m => m.status === 'concluida').length}</div>
        </div>
        <div style={{ background: '#4c1d95', padding: 16, borderRadius: 12, border: '1px solid #5b21b6', textAlign: 'center' }}>
          <Activity size={22} color="#a78bfa" style={{ margin: '0 auto 6px' }} />
          <div style={{ fontSize: 11, color: '#c4b5fd', fontWeight: 700, textTransform: 'uppercase' }}>Progresso Médio</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#fff' }}>{taxaMedia.toFixed(0)}%</div>
        </div>
      </div>

      {/* ── Seletor de Meta Destaque ── */}
      {metas.length > 1 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {metas.filter(m => m.status === 'ativa').map(m => (
            <button key={m.id} onClick={() => setMetaDestaqueId(m.id)} style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer',
              background: metaDestaqueId === m.id ? 'var(--primary)' : 'transparent',
              color: metaDestaqueId === m.id ? '#fff' : '#93c5fd',
              border: `1px solid ${metaDestaqueId === m.id ? 'var(--primary)' : '#334155'}`
            }}>
              {m.nome}
            </button>
          ))}
        </div>
      )}

      {/* ── Painel Destaque ── */}
      {metaDestaque && kd && (
        <div style={{
          background: 'linear-gradient(135deg, #0f1f4a 0%, #1a2f6a 100%)',
          borderRadius: 16, border: '1px solid #1e40af',
          marginBottom: 32, padding: 24,
          boxShadow: '0 12px 40px rgba(0,0,0,0.3)'
        }}>
          {/* Título + botão editar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#fff' }}>{metaDestaque.nome}</h2>
              <div style={{ fontSize: 12, color: '#93c5fd', marginTop: 4 }}>
                {format(parseISO(metaDestaque.dataInicio), 'dd/MM/yyyy')} até {format(parseISO(metaDestaque.dataTermino), 'dd/MM/yyyy')}
                <span style={{ marginLeft: 10, textTransform: 'uppercase', fontWeight: 700, color: metaDestaque.tipo === 'receita' ? '#34d399' : '#f87171' }}>
                  {metaDestaque.tipo}
                </span>
              </div>
            </div>
            <button onClick={() => abrirEditarMeta(metaDestaque)} style={{
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff', borderRadius: 8, padding: '8px 14px',
              fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
            }}>
              <Edit2 size={14} /> Editar Meta
            </button>
          </div>

          {/* ── Linha 1: Alvo | Atingido | Falta | Meta Diária ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12, marginBottom: 12 }}>
            <KpiCard
              icon={<Target size={13} />} label="Alvo"
              value={formatarMoeda(metaDestaque.valorAlvo)}
            />
            <KpiCard
              icon={<CheckCircle2 size={13} />} label="Atingido"
              value={formatarMoeda(kd.realizado)}
              sub={`${kd.pct.toFixed(1)}% da meta`}
              color="#34d399"
              bg="rgba(16,185,129,0.08)" border="rgba(16,185,129,0.25)"
            />
            <KpiCard
              icon={<X size={13} />} label="Falta"
              value={formatarMoeda(kd.falta)}
              sub={kd.falta <= 0 ? '🎉 Meta batida!' : `${kd.diasUteisRestantes} dias úteis restantes`}
              color={kd.falta <= 0 ? '#34d399' : '#f87171'}
              bg="rgba(239,68,68,0.08)" border="rgba(239,68,68,0.25)"
            />
            <KpiCard
              icon={<Activity size={13} />} label="Meta Diária (Original)"
              value={formatarMoeda(kd.metaDiariaGlobal)}
              sub="Valor por dia útil para bater a meta"
              bg="rgba(139,92,246,0.08)" border="rgba(139,92,246,0.25)"
            />
          </div>

          {/* ── Linha 2: Dias úteis | Decorridos | Média Diária | Projeção ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12, marginBottom: 12 }}>
            <KpiCard
              icon={<CalendarDays size={13} />} label="Total Dias Úteis"
              value={String(kd.diasUteisTotal)}
              sub={`${kd.diasCorridosTotal} dias corridos no período`}
            />
            <KpiCard
              icon={<Zap size={13} />} label="Dias Úteis Decorridos"
              value={String(kd.diasUteisDecorridos)}
              sub={`${kd.diasCorridosDecorridos} dias corridos passados`}
              color="#fbbf24"
              bg="rgba(245,158,11,0.08)" border="rgba(245,158,11,0.25)"
            />
            <KpiCard
              icon={<TrendingUp size={13} />} label="Média Diária Realizada"
              value={formatarMoeda(kd.mediaDiariaRealizada)}
              sub="Valor médio por dia útil passado"
              color="#38bdf8"
              bg="rgba(14,165,233,0.08)" border="rgba(14,165,233,0.25)"
            />
            <KpiCard
              icon={<BarChart3 size={13} />} label="Projeção de Fechamento"
              value={formatarMoeda(kd.projecao)}
              sub={`Com base no seu ritmo atual`}
              color="#f472b6"
              bg="rgba(236,72,153,0.08)" border="rgba(236,72,153,0.25)"
            />
          </div>

          {/* ── Linha 3: Variação | Taxa Cumprimento | Meta Ajustada | Velocidade ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12, marginBottom: 12 }}>
            <KpiCard
              icon={kd.variacao >= 0 ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
              label="Variação Projeção vs Alvo"
              value={(kd.variacao >= 0 ? '+' : '') + formatarMoeda(kd.variacao)}
              sub={kd.variacao >= 0 ? 'Acima da meta' : 'Abaixo da meta'}
              color={kd.variacao >= 0 ? '#10b981' : '#ef4444'}
              bg={kd.variacao >= 0 ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)'}
              border={kd.variacao >= 0 ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}
            />
            <KpiCard
              icon={<Flame size={13} />} label="Taxa de Cumprimento Projetada"
              value={`${kd.taxaCumprimento.toFixed(1)}%`}
              sub={kd.taxaCumprimento >= 100 ? '✅ No caminho certo!' : '⚠️ Abaixo do esperado'}
              color={kd.taxaCumprimento >= 100 ? '#10b981' : '#f59e0b'}
              bg="rgba(245,158,11,0.08)" border="rgba(245,158,11,0.25)"
            />
            <KpiCard
              icon={<Clock size={13} />} label="Meta Necessária por Dia Restante"
              value={kd.diasUteisRestantes > 0 ? formatarMoeda(kd.metaDiariaAjustada) : '—'}
              sub={kd.diasUteisRestantes > 0 ? `Em ${kd.diasUteisRestantes} dias úteis restantes` : 'Período encerrado'}
              color="#fff"
            />
            <KpiCard
              icon={<Activity size={13} />} label="Velocidade vs Ideal"
              value={`${kd.velocidade.toFixed(1)}%`}
              sub={kd.velocidade >= 100 ? 'Acima do ritmo ideal' : 'Abaixo do ritmo ideal'}
              color={kd.velocidade >= 100 ? '#34d399' : '#f87171'}
              bg={kd.velocidade >= 100 ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)'}
              border={kd.velocidade >= 100 ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}
            />
          </div>

          {/* ── Linha 4: Ideal Acumulado | Avanço vs Ideal | Melhor Dia | Dias Restantes ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12, marginBottom: 20 }}>
            <KpiCard
              icon={<Target size={13} />} label="Ideal Acumulado Até Hoje"
              value={formatarMoeda(kd.idealAcumulado)}
              sub="Quanto deveria ter atingido"
            />
            <KpiCard
              icon={kd.avancoVsIdeal >= 0 ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
              label="Avanço vs Ideal"
              value={(kd.avancoVsIdeal >= 0 ? '+' : '') + formatarMoeda(kd.avancoVsIdeal)}
              sub={kd.avancoVsIdeal >= 0 ? 'Na frente do cronograma!' : 'Atrás do cronograma'}
              color={kd.avancoVsIdeal >= 0 ? '#34d399' : '#f87171'}
              bg={kd.avancoVsIdeal >= 0 ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)'}
              border={kd.avancoVsIdeal >= 0 ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}
            />
            <KpiCard
              icon={<Award size={13} />} label="Melhor Dia de Receita"
              value={kd.melhorDia ? formatarMoeda(kd.melhorDia.valor) : '—'}
              sub={kd.melhorDia ? format(parseISO(kd.melhorDia.data), 'dd/MM/yyyy') : 'Sem dados'}
              color="#fbbf24"
              bg="rgba(245,158,11,0.08)" border="rgba(245,158,11,0.25)"
            />
            <KpiCard
              icon={<CalendarDays size={13} />} label="Dias Corridos Restantes"
              value={String(kd.diasCorridosRestantes)}
              sub={`${kd.diasUteisRestantes} dias úteis restantes`}
            />
          </div>

          {/* ── Barra de Progresso ── */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#93c5fd' }}>Progresso Atual</span>
              <span style={{ fontSize: 15, fontWeight: 900, color: '#fff' }}>{kd.pct.toFixed(1)}%</span>
            </div>
            <div style={{ width: '100%', height: 18, background: 'rgba(0,0,0,0.35)', borderRadius: 9, overflow: 'hidden' }}>
              <div style={{
                width: Math.min(kd.pct, 100) + '%', height: '100%',
                background: kd.pct >= 100
                  ? 'linear-gradient(90deg, #10b981, #34d399)'
                  : 'linear-gradient(90deg, var(--primary), #60a5fa)',
                borderRadius: 9, transition: 'width 1.2s ease'
              }} />
            </div>
            {/* Marcador ideal */}
            <div style={{ position: 'relative', marginTop: 4 }}>
              <div style={{
                position: 'absolute',
                left: Math.min(kd.idealAcumulado / metaDestaque.valorAlvo * 100, 100) + '%',
                transform: 'translateX(-50%)',
                fontSize: 10, color: '#f59e0b', fontWeight: 700
              }}>▲ Ideal</div>
            </div>
          </div>

          {/* ── Insight IA ── */}
          <div style={{
            padding: 18,
            background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(59,130,246,0.15))',
            borderRadius: 12, border: '1px solid rgba(139,92,246,0.3)',
            display: 'flex', gap: 14, marginBottom: 24
          }}>
            <div style={{ background: 'rgba(139,92,246,0.25)', padding: 10, borderRadius: 10, flexShrink: 0, alignSelf: 'flex-start' }}>
              <Wand2 size={22} color="#a78bfa" />
            </div>
            <div>
              <h4 style={{ margin: '0 0 6px 0', fontSize: 13, fontWeight: 800, color: '#c4b5fd' }}>Insight Inteligente da IA</h4>
              <p style={{ margin: 0, fontSize: 13, color: '#e2e8f0', lineHeight: 1.65 }}>
                {kd.falta <= 0 ? (
                  <>🎉 <strong style={{ color: '#34d399' }}>Parabéns! Meta já batida!</strong> Você superou o alvo de {formatarMoeda(metaDestaque.valorAlvo)} e atingiu {formatarMoeda(kd.realizado)} ({kd.pct.toFixed(1)}%). Continue nesse ritmo para maximizar o resultado final do mês!</>
                ) : kd.variacao >= 0 ? (
                  <>✅ Excelente ritmo! Com média de <strong style={{ color: '#fff' }}>{formatarMoeda(kd.mediaDiariaRealizada)}/dia</strong>, sua projeção de <strong style={{ color: '#34d399' }}>{formatarMoeda(kd.projecao)}</strong> supera o alvo. Você está <strong style={{ color: '#34d399' }}>na frente</strong> e deve fechar o mês com {formatarMoeda(kd.variacao)} acima da meta. Mantenha o foco nos {kd.diasUteisRestantes} dias úteis restantes!</>
                ) : (
                  <>⚠️ Atenção: sua projeção de <strong style={{ color: '#f87171' }}>{formatarMoeda(kd.projecao)}</strong> está {formatarMoeda(Math.abs(kd.variacao))} abaixo do alvo. Para virar o jogo, você precisa de <strong style={{ color: '#fbbf24' }}>{formatarMoeda(kd.metaDiariaAjustada)}/dia</strong> nos {kd.diasUteisRestantes} dias úteis restantes. Faltam apenas <strong style={{ color: '#fff' }}>{formatarMoeda(kd.falta)}</strong> — é totalmente possível!</>
                )}
              </p>
            </div>
          </div>

          {/* ── Gráfico: Evolução Acumulada ── */}
          <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={16} color="#60a5fa" /> Evolução Acumulada da Meta
            </h3>
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={kd.chartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gReal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="dia" stroke="#64748b" fontSize={10} tickMargin={8} axisLine={false} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickFormatter={v => 'R$' + (v / 1000).toFixed(0) + 'k'} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(val: any, name: any) => [formatarMoeda(Number(val)), name === 'realizado' ? 'Realizado' : 'Alvo Ideal']}
                    contentStyle={{ background: '#1e293b', borderColor: '#334155', borderRadius: 8, color: '#fff', fontSize: 12 }}
                  />
                  <ReferenceLine y={metaDestaque.valorAlvo} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Meta', fill: '#ef4444', fontSize: 11 }} />
                  <Area type="monotone" dataKey="ideal" name="ideal" stroke="#f59e0b" strokeWidth={2} fill="none" strokeDasharray="5 5" />
                  <Area type="monotone" dataKey="realizado" name="realizado" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#gReal)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Gráfico: Receita por Dia ── */}
          <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <BarChart3 size={16} color="#a78bfa" /> Receita por Dia
              </h3>
              {/* Legenda */}
              <div style={{ display: 'flex', gap: 16, fontSize: 11, fontWeight: 700 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#4ade80' }}>
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: '#22c55e', display: 'inline-block' }} />
                  Bateu a meta diária
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#fbbf24' }}>
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: '#f59e0b', display: 'inline-block' }} />
                  Abaixo da meta
                </span>
              </div>
            </div>
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={kd.chartData.filter(d => d.diario !== undefined)} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="dia" stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickFormatter={v => 'R$' + (v / 1000).toFixed(1) + 'k'} axisLine={false} tickLine={false} />
                  <Tooltip
                    content={({ active, payload, label }: any) => {
                      if (!active || !payload?.length) return null;
                      const val = Number(payload[0]?.value ?? 0);
                      const bateu = val >= kd.metaDiariaGlobal;
                      const pctDia = kd.metaDiariaGlobal > 0 ? (val / kd.metaDiariaGlobal) * 100 : 0;
                      return (
                        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#fff' }}>
                          <div style={{ fontWeight: 800, marginBottom: 6 }}>{label}</div>
                          <div>Receita: <strong style={{ color: bateu ? '#4ade80' : '#fbbf24' }}>{formatarMoeda(val)}</strong></div>
                          <div style={{ marginTop: 4 }}>Meta do dia: {formatarMoeda(kd.metaDiariaGlobal)}</div>
                          <div style={{ marginTop: 6, padding: '4px 10px', borderRadius: 20, background: bateu ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)', display: 'inline-block', color: bateu ? '#4ade80' : '#fbbf24', fontWeight: 800 }}>
                            {bateu ? '✅' : '⚠️'} {pctDia.toFixed(0)}% da meta diária
                          </div>
                        </div>
                      );
                    }}
                  />
                  <ReferenceLine y={kd.metaDiariaGlobal} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Meta/dia', fill: '#f59e0b', fontSize: 10 }} />
                  <Bar dataKey="diario" name="Receita" radius={[4, 4, 0, 0]}>
                    {kd.chartData.filter(d => d.diario !== undefined).map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.diario >= kd.metaDiariaGlobal ? '#22c55e' : '#f59e0b'}
                        fillOpacity={entry.diario === 0 ? 0.3 : 0.9}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ── Lista de Metas ── */}
      <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-title)', marginBottom: 14 }}>Todas as Metas</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {metas.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, border: '1px dashed var(--border)', borderRadius: 12 }}>
            Nenhuma meta cadastrada. Clique em "Nova Meta" para começar!
          </div>
        )}
        {metas.map(meta => {
          const prog = calcularMeta(meta);
          const isClosed = meta.status !== 'ativa';
          const cor = prog.pct >= 100 ? '#10b981' : isClosed ? '#ef4444' : 'var(--primary)';
          const badge = prog.pct >= 100 ? 'Superada' : prog.pct >= 85 ? 'Quase lá' : prog.pct >= 50 ? 'Parcial' : isClosed ? 'Não atingida' : 'Em andamento';

          return (
            <div key={meta.id} onClick={() => setMetaDestaqueId(meta.id)} style={{
              background: 'var(--bg-card)', border: `1px solid ${meta.id === metaDestaqueId ? 'var(--primary)' : 'var(--border)'}`,
              borderRadius: 12, padding: '16px 20px', cursor: 'pointer',
              transition: 'border-color 0.2s'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--text-title)' }}>{meta.nome}</h3>
                    <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700, color: cor, background: cor + '18', border: '1px solid ' + cor + '44' }}>
                      {badge}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: meta.tipo === 'receita' ? '#34d399' : '#f87171', textTransform: 'uppercase' }}>{meta.tipo}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {format(parseISO(meta.dataInicio), 'dd/MM/yyyy')} → {format(parseISO(meta.dataTermino), 'dd/MM/yyyy')}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 16, fontWeight: 900, color: cor }}>{prog.pct.toFixed(1)}%</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatarMoeda(prog.realizado)} / {formatarMoeda(meta.valorAlvo)}</div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); abrirEditarMeta(meta); }} style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, padding: 6, cursor: 'pointer', color: 'var(--text-muted)' }}>
                    <Edit2 size={14} />
                  </button>
                  <button onClick={e => { e.stopPropagation(); handleExcluir(meta.id); }} style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, padding: 6, cursor: 'pointer', color: '#ef4444' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div style={{ width: '100%', height: 6, background: 'var(--bg-secondary)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: Math.min(prog.pct, 100) + '%', height: '100%', background: cor, borderRadius: 3, transition: 'width 1s ease' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
                <span>Falta: {formatarMoeda(prog.falta)}</span>
                <span>Média/dia: {formatarMoeda(prog.mediaDiariaRealizada)}</span>
                <span>{prog.diasUteisRestantes} dias úteis restantes</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Modal ── */}
      {modalOpen && editingMeta && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 16, width: '100%', maxWidth: 580, maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--text-title)' }}>
                {editingMeta.id ? 'Editar Meta' : 'Nova Meta'}
              </h2>
              <button onClick={() => setModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSalvar} style={{ padding: 24 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>Nome da Meta *</label>
                <input required value={editingMeta.nome || ''} onChange={e => setEditingMeta({ ...editingMeta, nome: e.target.value })} style={{ width: '100%', padding: '11px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 14, boxSizing: 'border-box' }} placeholder="Ex: Receita Setembro 2026" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>Tipo *</label>
                  <select required value={editingMeta.tipo || 'receita'} onChange={e => setEditingMeta({ ...editingMeta, tipo: e.target.value as any })} style={{ width: '100%', padding: '11px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 14 }}>
                    <option value="receita">Receita</option>
                    <option value="despesa">Despesa</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>Valor Alvo (R$) *</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#60a5fa', fontWeight: 800, fontSize: 14, pointerEvents: 'none' }}>R$</span>
                    <input
                      required
                      type="text"
                      inputMode="numeric"
                      value={valorAlvoStr}
                      onChange={e => {
                        const { display, numerico } = formatarInputMoeda(e.target.value);
                        setValorAlvoStr(display);
                        setEditingMeta({ ...editingMeta, valorAlvo: numerico });
                      }}
                      style={{ width: '100%', padding: '11px 14px 11px 42px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 15, fontWeight: 700, boxSizing: 'border-box' }}
                      placeholder="0,00"
                    />
                  </div>
                  {editingMeta?.valorAlvo && editingMeta.valorAlvo > 0 && (
                    <div style={{ fontSize: 11, color: '#60a5fa', marginTop: 4, fontWeight: 600 }}>
                      = {editingMeta.valorAlvo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>Data Início *</label>
                  <input required type="date" value={editingMeta.dataInicio || ''} onChange={e => setEditingMeta({ ...editingMeta, dataInicio: e.target.value })} style={{ width: '100%', padding: '11px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 14 }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>Data Término *</label>
                  <input required type="date" value={editingMeta.dataTermino || ''} onChange={e => setEditingMeta({ ...editingMeta, dataTermino: e.target.value })} style={{ width: '100%', padding: '11px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 14 }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>Frequência</label>
                  <select value={editingMeta.frequencia || 'mensal'} onChange={e => setEditingMeta({ ...editingMeta, frequencia: e.target.value as any })} style={{ width: '100%', padding: '11px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 14 }}>
                    <option value="unica">Única</option>
                    <option value="mensal">Mensal</option>
                    <option value="anual">Anual</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6 }}>Status</label>
                  <select value={editingMeta.status || 'ativa'} onChange={e => setEditingMeta({ ...editingMeta, status: e.target.value as any })} style={{ width: '100%', padding: '11px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 14 }}>
                    <option value="ativa">Ativa</option>
                    <option value="concluida">Concluída</option>
                    <option value="cancelada">Cancelada</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button type="button" onClick={() => setModalOpen(false)} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: 8, padding: '10px 20px', fontWeight: 700, cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button type="submit" style={{ background: '#10b981', border: 'none', color: '#fff', borderRadius: 8, padding: '10px 24px', fontWeight: 800, cursor: 'pointer' }}>
                  {editingMeta.id ? 'Salvar Alterações' : 'Criar Meta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}