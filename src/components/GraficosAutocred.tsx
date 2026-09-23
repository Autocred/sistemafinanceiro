'use client';

import { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar, ResponsiveContainer
} from 'recharts';
import { getTenantId } from '@/lib/storage';
import { getValorFinal, normalizeDate } from '@/lib/financialEngine';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mesToStr(mes: number) {
  const nomes = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  return nomes[mes] || '';
}

function formatarMoedaCompacta(v: number) {
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
  return v.toFixed(0);
}

const TooltipCustom = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(15,23,42,0.95)', border: '1px solid #334155',
      borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#e2e8f0',
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
    }}>
      <div style={{ fontWeight: 700, marginBottom: 6, color: '#94a3b8' }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}: <b>R$ {Number(p.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</b>
        </div>
      ))}
    </div>
  );
};

const CardGrafico = ({ titulo, subtitulo, children }: { titulo: string; subtitulo: string; children: React.ReactNode }) => (
  <div style={{
    background: 'linear-gradient(135deg, #1e3a5f 0%, #1a3a6b 60%, #1e3f7a 100%)',
    borderRadius: 16, padding: '24px 20px 16px', flex: 1, minWidth: 300,
    boxShadow: '0 4px 24px rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.07)'
  }}>
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: '#e2e8f0' }}>{titulo}</div>
      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{subtitulo}</div>
    </div>
    {children}
  </div>
);

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  transacoes: any[];
  faturas?: any[];
  contas?: any[];
}

export default function GraficosAutocred({ transacoes, faturas = [], contas = [] }: Props) {
  const isAutocred = typeof window !== 'undefined' && getTenantId() === 'autocred-promotora-de-credito';
  if (!isAutocred) return null;

  // Agrupa por dia exato (últimos 7 dias) - SOMENTE EFETIVADAS (pago)
  const dadosDiarios = useMemo(() => {
    const hoje = new Date();
    const dias: Record<string, { label: string; Receitas: number; Despesas: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(hoje);
      d.setDate(hoje.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const dia = d.getDate().toString().padStart(2, '0');
      const mes = (d.getMonth() + 1).toString().padStart(2, '0');
      dias[key] = { label: `${dia}/${mes}`, Receitas: 0, Despesas: 0 };
    }

    for (const t of transacoes) {
      if (t.status !== 'pago' && t.status !== 'recebido') continue;
      
      // LOGICA ALINHADA COM INDICADORES: Ignorar compras individuais de cartão (pagas na fatura)
      if (t.tipo === 'despesa' && (t.formaPagamento === 'cartao_credito' || t.formaPagamento === 'cartao_crédito')) continue;

      const raw = normalizeDate(t.dataPagamento || t.dataVencimento || t.data);
      const dt = raw || '';
      
      if (!dias[dt]) continue;

      const valor = Math.abs(getValorFinal(t));
      if (t.tipo === 'receita') {
        dias[dt].Receitas += valor;
      } else if (t.tipo === 'despesa') {
        dias[dt].Despesas += valor;
      }
    }

    return Object.values(dias);
  }, [transacoes]);

  // Agrupa por mês (últimos 6 meses) - SOMENTE EFETIVADAS (pago)
  const dadosMensais = useMemo(() => {
    const hoje = new Date();
    const meses: Record<string, { label: string; Receitas: number; Despesas: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      meses[key] = {
        label: `${mesToStr(d.getMonth())}/${String(d.getFullYear()).slice(2)}`,
        Receitas: 0,
        Despesas: 0,
      };
    }

    for (const t of transacoes) {
      if (t.status !== 'pago' && t.status !== 'recebido') continue;
      
      // LOGICA ALINHADA COM INDICADORES: Ignorar compras individuais de cartão (pagas na fatura)
      if (t.tipo === 'despesa' && (t.formaPagamento === 'cartao_credito' || t.formaPagamento === 'cartao_crédito')) continue;

      const dtFull = normalizeDate(t.dataPagamento || t.dataVencimento || t.data);
      if (!dtFull) continue;
      const dt = dtFull.substring(0, 7); // Ex: "2023-09"
      
      if (!meses[dt]) continue;

      const valor = Math.abs(getValorFinal(t));
      if (t.tipo === 'receita') meses[dt].Receitas += valor;
      else if (t.tipo === 'despesa') meses[dt].Despesas += valor;
    }

    return Object.values(meses);
  }, [transacoes]);

  return (
    <div style={{ display: 'flex', gap: 20, marginBottom: 28, flexWrap: 'wrap' }}>
      <CardGrafico titulo="Desempenho Diário (Linhas)" subtitulo="Receitas x Despesas — últimos 7 dias (efetivadas)">
        <ResponsiveContainer width="100%" height={230}>
          <LineChart data={dadosDiarios} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={formatarMoedaCompacta} width={52} />
            <Tooltip content={<TooltipCustom />} />
            <Legend iconType="circle" iconSize={8}
              formatter={(value) => <span style={{ color: value === 'Despesas' ? '#ef4444' : '#22c55e', fontSize: 12 }}>{value}</span>}
            />
            <Line type="monotone" dataKey="Despesas" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4, fill: '#ef4444' }} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="Receitas" stroke="#22c55e" strokeWidth={2.5} dot={{ r: 4, fill: '#22c55e' }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </CardGrafico>

      <CardGrafico titulo="Desempenho Mensal (Barras)" subtitulo="Receitas x Despesas — últimos 6 meses (efetivadas)">
        <ResponsiveContainer width="100%" height={230}>
          <BarChart data={dadosMensais} margin={{ top: 4, right: 8, bottom: 0, left: 0 }} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={formatarMoedaCompacta} width={52} />
            <Tooltip content={<TooltipCustom />} />
            <Legend iconType="square" iconSize={10}
              formatter={(value) => <span style={{ color: value === 'Despesas' ? '#ef4444' : '#22c55e', fontSize: 12 }}>{value}</span>}
            />
            <Bar dataKey="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={34} />
            <Bar dataKey="Receitas" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={34} />
          </BarChart>
        </ResponsiveContainer>
      </CardGrafico>
    </div>
  );
}
