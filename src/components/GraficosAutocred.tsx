'use client';

import { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar, ResponsiveContainer
} from 'recharts';
import { getTenantId } from '@/lib/storage';
import { getValorFinal, normalizeDate, getInfoSerieParcelamento } from '@/lib/financialEngine';

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

// Custom Ticks para garantir renderização dos eixos em BRANCO NEVE PURO (#ffffff)
const renderTickX = ({ x, y, payload }: any) => (
  <g transform={`translate(${x},${y})`}>
    <text
      x={0}
      y={0}
      dy={14}
      textAnchor="middle"
      fill="#ffffff"
      style={{
        fill: '#ffffff',
        fontSize: '11.5px',
        fontWeight: 700,
        paintOrder: 'stroke',
        textShadow: '0 1px 3px rgba(0,0,0,0.6)'
      }}
    >
      {payload.value}
    </text>
  </g>
);

const renderTickY = ({ x, y, payload }: any) => (
  <g transform={`translate(${x},${y})`}>
    <text
      x={0}
      y={0}
      dy={4}
      textAnchor="end"
      fill="#ffffff"
      style={{
        fill: '#ffffff',
        fontSize: '11px',
        fontWeight: 700,
        paintOrder: 'stroke',
        textShadow: '0 1px 3px rgba(0,0,0,0.6)'
      }}
    >
      {formatarMoedaCompacta(payload.value)}
    </text>
  </g>
);

// Tooltip com texto em VERMELHO BEM NÍTIDO para Despesas e VERDE BEM NÍTIDO para Receitas
const TooltipCustom = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.96)',
      border: '1px solid rgba(255, 255, 255, 0.25)',
      borderRadius: 12,
      padding: '10px 14px',
      fontSize: 13,
      color: '#ffffff',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
      backdropFilter: 'blur(10px)'
    }}>
      <div style={{ fontWeight: 800, marginBottom: 8, color: '#ffffff', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </div>
      {payload.map((p: any, i: number) => {
        const isDesp = p.dataKey === 'Despesas' || p.name === 'Despesas';
        const corNitida = isDesp ? '#ff4d4f' : '#22c55e'; // Vermelho vivo bem nítido / Verde vivo bem nítido
        const icone = isDesp ? '🔻' : '⚡';
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginBottom: 4, fontWeight: 700 }}>
            <span style={{ color: corNitida, display: 'flex', alignItems: 'center', gap: 5, fontSize: 13 }}>
              <span>{icone}</span>
              <span style={{ fontWeight: 800 }}>{p.name}:</span>
            </span>
            <b style={{ color: corNitida, fontWeight: 800, fontSize: 13, textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
              R$ {Number(p.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </b>
          </div>
        );
      })}
    </div>
  );
};

const CardGrafico = ({ titulo, subtitulo, children }: { titulo: string; subtitulo: string; children: React.ReactNode }) => (
  <div className="grafico-autocred-box" style={{
    /* Gradiente 3D profundo em camadas */
    background: 'linear-gradient(160deg, #2563a8 0%, #1a3f7c 28%, #132d60 55%, #0d2050 80%, #0a1a40 100%)',
    borderRadius: 20,
    padding: '0',
    flex: 1,
    minWidth: 300,
    position: 'relative',
    /* Sombra 3D multicamada: difusa + projetada + brilho colorido */
    boxShadow: [
      '0 2px 0 rgba(255,255,255,0.08) inset',       /* borda superior iluminada */
      '0 1px 0 rgba(255,255,255,0.04) inset',
      '0 24px 48px rgba(0,0,0,0.55)',                /* sombra projetada profunda */
      '0 8px 16px rgba(0,0,0,0.4)',                  /* sombra intermediária */
      '0 2px 4px rgba(0,0,0,0.3)',                   /* sombra próxima */
      '0 0 0 1px rgba(100,160,255,0.18)',            /* borda azul brilhante */
      '0 0 32px rgba(37,99,168,0.25)',               /* brilho ambiente azul */
    ].join(', '),
    overflow: 'hidden',
  }}>
    {/* Camada de brilho superior (reflexo 3D) */}
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, height: '50%',
      background: 'linear-gradient(180deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.01) 100%)',
      borderRadius: '20px 20px 0 0',
      pointerEvents: 'none', zIndex: 1
    }} />
    {/* Borda superior luminosa */}
    <div style={{
      position: 'absolute', top: 0, left: '8%', right: '8%', height: '1px',
      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), rgba(255,255,255,0.5), rgba(255,255,255,0.35), transparent)',
      pointerEvents: 'none', zIndex: 2
    }} />
    {/* Brilho diagonal canto superior esquerdo */}
    <div style={{
      position: 'absolute', top: 0, left: 0, width: '45%', height: '55%',
      background: 'radial-gradient(ellipse at 20% 15%, rgba(100,160,255,0.12) 0%, transparent 70%)',
      pointerEvents: 'none', zIndex: 1
    }} />
    {/* Conteúdo */}
    <div style={{ position: 'relative', zIndex: 3, padding: '24px 20px 16px' }}>
      {/* Header com linha decorativa */}
      <div style={{ marginBottom: 16 }}>
        <div style={{
          fontSize: 16.5, fontWeight: 900, color: '#ffffff',
          textShadow: '0 1px 6px rgba(0,0,0,0.6), 0 0 20px rgba(100,180,255,0.3)',
          letterSpacing: '-0.2px'
        }}>{titulo}</div>
        <div style={{
          fontSize: 12.5, color: 'rgba(180,210,255,0.95)', marginTop: 4,
          fontWeight: 600, textShadow: '0 1px 3px rgba(0,0,0,0.5)'
        }}>{subtitulo}</div>
        {/* Linha divisória gradiente */}
        <div style={{
          marginTop: 12, height: '1.5px',
          background: 'linear-gradient(90deg, rgba(100,160,255,0.6), rgba(100,160,255,0.2), transparent)',
          borderRadius: 2
        }} />
      </div>
      {children}
    </div>
  </div>
);

// ─── Custom Bar Shape 3D Premium (Idêntico ao Resumo Mensal) ───────────────────

const renderBarra3D = (isDespesa: boolean) => (props: any) => {
  const { x, y, width, height } = props;
  if (!height || height <= 0 || !width || width <= 0) return null;

  const radius = Math.min(8, width / 2);
  const gradId = isDespesa ? 'gradDespesas3D' : 'gradReceitas3D';

  const rawVal = props.value;
  const valorFormatado = typeof rawVal === 'number' && rawVal > 0
    ? (rawVal >= 1000 ? `${(rawVal / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k` : rawVal.toLocaleString('pt-BR'))
    : null;

  return (
    <g>
      {/* Barra Principal com Cantos Arredondados e Gradiente 3D */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={radius}
        ry={radius}
        fill={`url(#${gradId})`}
        filter="url(#shadowBar3D)"
        style={{ transition: 'all 0.3s ease' }}
      />

      {/* Camada de Iluminação Superior / Brilho Cilíndrico (Glossy Highlight) */}
      {height > 10 && (
        <rect
          x={x}
          y={y}
          width={width}
          height={Math.min(height * 0.45, 20)}
          rx={radius}
          ry={radius}
          fill="url(#glossHighlight3D)"
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* Borda de reflexo interna sutil */}
      {height > 6 && (
        <line
          x1={x + 3}
          y1={y + 1}
          x2={x + width - 3}
          y2={y + 1}
          stroke="rgba(255,255,255,0.45)"
          strokeWidth={1}
          strokeLinecap="round"
          style={{ pointerEvents: 'none' }}
        />
      )}

      {/* Valor numérico visível sobre a barra em branco puro */}
      {valorFormatado && (
        <text
          x={x + width / 2}
          y={Math.max(y - 5, 12)}
          textAnchor="middle"
          fill="#ffffff"
          fontSize={10.5}
          fontWeight={800}
          style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
        >
          {valorFormatado}
        </text>
      )}
    </g>
  );
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  transacoes: any[];
  faturas?: any[];
  contas?: any[];
  mesSelecionado?: Date;
}

export default function GraficosAutocred({ transacoes, faturas = [], contas = [], mesSelecionado }: Props) {
  const isAutocred = typeof window !== 'undefined' && getTenantId() === 'autocred-promotora-de-credito';
  if (!isAutocred) return null;

  // Agrupa por dias do mês selecionado (ou últimos 7 dias se for o mês corrente) - SOMENTE EFETIVADAS (pago)
  const dadosDiarios = useMemo(() => {
    const refDate = mesSelecionado || new Date();
    const hoje = new Date();
    const isMesAtual = refDate.getFullYear() === hoje.getFullYear() && refDate.getMonth() === hoje.getMonth();

    const dias: Record<string, { label: string; Receitas: number; Despesas: number }> = {};

    if (isMesAtual) {
      // Se for o mês corrente, exibe os últimos 7 dias até hoje
      for (let i = 6; i >= 0; i--) {
        const d = new Date(hoje);
        d.setDate(hoje.getDate() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const dia = d.getDate().toString().padStart(2, '0');
        const mes = (d.getMonth() + 1).toString().padStart(2, '0');
        dias[key] = { label: `${dia}/${mes}`, Receitas: 0, Despesas: 0 };
      }
    } else {
      // Se for outro mês (passado ou futuro), exibe a evolução ao longo de todo o mês selecionado
      const totalDiasNoMes = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0).getDate();
      for (let day = 1; day <= totalDiasNoMes; day++) {
        const key = `${refDate.getFullYear()}-${String(refDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dia = day.toString().padStart(2, '0');
        const mes = (refDate.getMonth() + 1).toString().padStart(2, '0');
        dias[key] = { label: `${dia}/${mes}`, Receitas: 0, Despesas: 0 };
      }
    }

    for (const t of transacoes) {
      if (t.status !== 'pago' && t.status !== 'recebido') continue;

      // LOGICA ALINHADA COM INDICADORES: Ignorar compras individuais de cartão (pagas na fatura) e parcelamentos já encerrados (sem parcelas a vencer)
      if (t.tipo === 'despesa') {
        if (t.formaPagamento === 'cartao_credito' || false) continue;
        const infoParc = getInfoSerieParcelamento(t, transacoes);
        if (infoParc.isParcelamento && infoParc.terminado) continue;
      }

      const raw = normalizeDate(t.dataPagamento || t.dataVencimento || t.data);
      const dt = raw ? raw.substring(0, 10) : '';

      if (!dias[dt]) continue;

      const valor = Math.abs(getValorFinal(t));
      if (t.tipo === 'receita') {
        dias[dt].Receitas += valor;
      } else if (t.tipo === 'despesa') {
        dias[dt].Despesas += valor;
      }
    }

    return Object.values(dias);
  }, [transacoes, mesSelecionado]);

  // Agrupa por 6 meses terminando no mês selecionado - SOMENTE EFETIVADAS (pago)
  const dadosMensais = useMemo(() => {
    const refDate = mesSelecionado || new Date();
    const meses: Record<string, { label: string; Receitas: number; Despesas: number; isSelected?: boolean }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(refDate.getFullYear(), refDate.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      meses[key] = {
        label: `${mesToStr(d.getMonth())}/${String(d.getFullYear()).slice(2)}`,
        Receitas: 0,
        Despesas: 0,
        isSelected: i === 0,
      };
    }

    for (const t of transacoes) {
      if (t.status !== 'pago' && t.status !== 'recebido') continue;

      // LOGICA ALINHADA COM INDICADORES: Ignorar compras individuais de cartão (pagas na fatura) e parcelamentos já encerrados (sem parcelas a vencer)
      if (t.tipo === 'despesa') {
        if (t.formaPagamento === 'cartao_credito' || false) continue;
        const infoParc = getInfoSerieParcelamento(t, transacoes);
        if (infoParc.isParcelamento && infoParc.terminado) continue;
      }

      const dtFull = normalizeDate(t.dataPagamento || t.dataVencimento || t.data);
      if (!dtFull) continue;
      const dt = dtFull.substring(0, 7); // Ex: "2026-01"

      if (!meses[dt]) continue;

      const valor = Math.abs(getValorFinal(t));
      if (t.tipo === 'receita') meses[dt].Receitas += valor;
      else if (t.tipo === 'despesa') meses[dt].Despesas += valor;
    }

    return Object.values(meses);
  }, [transacoes, mesSelecionado]);

  return (
    <div style={{ display: 'flex', gap: 20, marginBottom: 28, flexWrap: 'wrap' }}>
      {/* Gráfico 1: Desempenho Diário (Linhas) */}
      <CardGrafico titulo="Desempenho Diário (Linhas)" subtitulo={`Receitas x Despesas — ${mesSelecionado ? (mesToStr(mesSelecionado.getMonth()) + "/" + mesSelecionado.getFullYear()) : "últimos dias"} (efetivadas)`}>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={dadosDiarios} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.12)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={renderTickX}
              axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
              tickLine={false}
            />
            <YAxis
              tick={renderTickY}
              axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
              tickLine={false}
              width={54}
            />
            <Tooltip content={<TooltipCustom />} />
            <Legend
              content={() => (
                <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginTop: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 8px rgba(239,68,68,0.7)' }} />
                    <span style={{ color: '#ff4d4f', fontWeight: 800, textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>Despesas</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px rgba(34,197,94,0.7)' }} />
                    <span style={{ color: '#22c55e', fontWeight: 800, textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>Receitas</span>
                  </div>
                </div>
              )}
            />
            <Line type="monotone" dataKey="Despesas" stroke="#ef4444" strokeWidth={2.8} dot={{ r: 4, fill: '#ef4444', stroke: '#ffffff', strokeWidth: 1 }} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="Receitas" stroke="#22c55e" strokeWidth={2.8} dot={{ r: 4, fill: '#22c55e', stroke: '#ffffff', strokeWidth: 1 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </CardGrafico>

      {/* Gráfico 2: Desempenho Mensal (Barras) */}
      <CardGrafico titulo="Desempenho Mensal (Barras)" subtitulo={`Receitas x Despesas — 6 meses até ${mesSelecionado ? (mesToStr(mesSelecionado.getMonth()) + "/" + mesSelecionado.getFullYear()) : "mês atual"}`}>
        <ResponsiveContainer width="100%" height={230}>
          <BarChart data={dadosMensais} margin={{ top: 16, right: 8, bottom: 4, left: 0 }} barGap={8}>
            {/* Definições SVG de Gradiente 3D e Brilho Cilíndrico idênticos ao Resumo Mensal */}
            <defs>
              {/* Gradiente 3D para Despesas */}
              <linearGradient id="gradDespesas3D" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f87171" stopOpacity={1} />
                <stop offset="35%" stopColor="#ef4444" stopOpacity={1} />
                <stop offset="70%" stopColor="#dc2626" stopOpacity={1} />
                <stop offset="100%" stopColor="#991b1b" stopOpacity={1} />
              </linearGradient>

              {/* Gradiente 3D para Receitas */}
              <linearGradient id="gradReceitas3D" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4ade80" stopOpacity={1} />
                <stop offset="35%" stopColor="#22c55e" stopOpacity={1} />
                <stop offset="70%" stopColor="#16a34a" stopOpacity={1} />
                <stop offset="100%" stopColor="#15803d" stopOpacity={1} />
              </linearGradient>

              {/* Reflexo de luz translúcido na metade superior da barra (Efeito Gloss) */}
              <linearGradient id="glossHighlight3D" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffffff" stopOpacity={0.35} />
                <stop offset="70%" stopColor="#ffffff" stopOpacity={0.06} />
                <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
              </linearGradient>

              {/* Sombra 3D suave */}
              <filter id="shadowBar3D" x="-10%" y="-10%" width="120%" height="120%">
                <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="rgba(0,0,0,0.35)" />
              </filter>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.12)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={renderTickX}
              axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
              tickLine={false}
            />
            <YAxis
              tick={renderTickY}
              axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
              tickLine={false}
              width={54}
            />
            <Tooltip content={<TooltipCustom />} />

            {/* Legenda com as cores nítidas: VERMELHO para Despesas e VERDE para Receitas */}
            <Legend
              content={() => (
                <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginTop: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13 }}>
                    <div style={{
                      width: 14,
                      height: 12,
                      borderRadius: 3,
                      background: 'linear-gradient(135deg, #f87171 0%, #ef4444 40%, #991b1b 100%)',
                      boxShadow: '0 2px 6px rgba(239, 68, 68, 0.5)'
                    }} />
                    <span style={{ color: '#ff4d4f', fontWeight: 800, textShadow: '0 1px 3px rgba(0,0,0,0.6)', letterSpacing: '0.2px' }}>
                      Despesas
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13 }}>
                    <div style={{
                      width: 14,
                      height: 12,
                      borderRadius: 3,
                      background: 'linear-gradient(135deg, #4ade80 0%, #22c55e 40%, #15803d 100%)',
                      boxShadow: '0 2px 6px rgba(34, 197, 94, 0.5)'
                    }} />
                    <span style={{ color: '#22c55e', fontWeight: 800, textShadow: '0 1px 3px rgba(0,0,0,0.6)', letterSpacing: '0.2px' }}>
                      Receitas
                    </span>
                  </div>
                </div>
              )}
            />

            {/* Barras renderizadas com formato 3D, degradê e brilho idênticos ao Resumo Mensal */}
            <Bar
              dataKey="Despesas"
              shape={renderBarra3D(true)}
              maxBarSize={42}
            />
            <Bar
              dataKey="Receitas"
              shape={renderBarra3D(false)}
              maxBarSize={42}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardGrafico>
    </div>
  );
}
