'use client';

import React, { useMemo, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Layers,
  ShieldAlert,
  Sparkles,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Users,
  Landmark,
  Zap,
  Receipt,
  PieChart
} from 'lucide-react';
import { getInfoSerieParcelamento } from '@/lib/financialEngine';

interface WaterfallProps {
  transacoes: any[];
  faturas?: any[];
  mesFormatado: string; // 'yyyy-MM'
  nomeMes: string;
  receitasRealizadas: number;
  receitasAReceber: number;
  despesasRealizadas: number;
  despesasAPagar: number;
  compactOnDashboard?: boolean;
}

interface BucketItem {
  id: string;
  descricao: string;
  categoria: string;
  valor: number;
  status: string;
  data: string;
  porCemReais: number;
}

interface WaterfallBucket {
  key: string;
  label: string;
  sublabel: string;
  color: string;
  bgLight: string;
  borderLight: string;
  icon: any;
  valorTotal: number;
  valorPago: number;
  valorPendente: number;
  porCemReais: number;
  saldoRestantePorCem: number;
  saldoRestanteReais: number;
  itens: BucketItem[];
}

const fmt = (v: number) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtCem = (v: number) =>
  `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function WaterfallAttribution({
  transacoes,
  faturas = [],
  mesFormatado,
  nomeMes,
  receitasRealizadas,
  receitasAReceber,
  despesasRealizadas,
  despesasAPagar,
  compactOnDashboard = false
}: WaterfallProps) {
  const [baseReceitaModo, setBaseReceitaModo] = useState<'projetada' | 'realizada'>('projetada');
  const [bucketExpandido, setBucketExpandido] = useState<string | null>(null);

  const analise = useMemo(() => {
    const normalize = (str: string) =>
      (str || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

    const normalizeDate = (d: string) => {
      if (!d) return '';
      if (d.includes('/')) {
        const p = d.split('/');
        if (p.length === 3) return `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
      }
      return d.slice(0, 10);
    };

    const getValorFinal = (t: any) =>
      Math.abs((Number(t.valor) || 0) + (Number(t.juros) || 0) - (Number(t.desconto) || 0));

    // Filtra despesas do mês selecionado (excluindo transferências, faturas duplicadas e parcelamentos encerrados)
    const despesasMes: Array<{
      id: string;
      descricao: string;
      categoria: string;
      valor: number;
      status: 'pago' | 'pendente';
      data: string;
      bucketKey: string;
    }> = [];

    const classificarBucket = (desc: string, cat: string, t?: any): string => {
      const texto = `${normalize(desc)} ${normalize(cat)}`;

      // 1. Empréstimos, Financiamentos e Parcelamentos (inclui parcelamentos de INSS/Simples com a Receita)
      //    Vem ANTES de impostos para que "Parcelamento INSS/Simples" conte como dívida parcelada.
      if (
        /\bparcela\s*\d+/i.test(desc || '') ||
        Number(t?.totalParcelas) > 1 ||
        texto.includes('emprestimo') ||
        texto.includes('financiamento') ||
        texto.includes('parcelamento') ||
        texto.includes('consorcio') ||
        texto.includes('pronampe') ||
        texto.includes('sispar') ||
        texto.includes('capital de giro')
      ) {
        return 'dividas';
      }

      // 2. Impostos, Taxas e Encargos Sociais (INSS, FGTS, DAS, Simples, DARF, Imposto)
      if (
        texto.includes('imposto') ||
        texto.includes('simples nacional') ||
        /\bdas\b/.test(texto) ||
        texto.includes('inss') ||
        texto.includes('fgts') ||
        texto.includes('darf') ||
        texto.includes('irpj') ||
        texto.includes('csll') ||
        /\biss\b/.test(texto) ||
        texto.includes('tributo') ||
        texto.includes('taxa fiscal')
      ) {
        return 'impostos';
      }

      // 3. Folha de Pagamento, Pró-Labore, Funcionários e Adiantamentos
      if (
        texto.includes('salario') ||
        texto.includes('folha') ||
        texto.includes('pro-labore') ||
        texto.includes('pro labore') ||
        texto.includes('adiantamento') ||
        texto.includes('funcionario') ||
        texto.includes('vale transporte') ||
        texto.includes('vale refeicao') ||
        texto.includes('13o') ||
        texto.includes('ferias') ||
        texto.includes('rescisao')
      ) {
        return 'folha';
      }

      // 4. Estrutura & Custos Fixos Operacionais (Aluguel, Contador, Água, Luz, Internet, Sistemas, Telefonia)
      const comp = (t?.comportamento || '').toLowerCase();
      if (
        comp === 'fixo' ||
        comp === 'fixa' ||
        texto.includes('aluguel') ||
        texto.includes('condominio') ||
        texto.includes('iptu') ||
        texto.includes('contabilidade') ||
        texto.includes('contador') ||
        texto.includes('honorario') ||
        texto.includes('internet') ||
        texto.includes('energia') ||
        texto.includes('eletrica') ||
        texto.includes('celesc') ||
        texto.includes('cpfl') ||
        texto.includes('enel') ||
        texto.includes('cemig') ||
        texto.includes('copel') ||
        texto.includes('agua') ||
        texto.includes('sanepar') ||
        texto.includes('sabesp') ||
        texto.includes('casan') ||
        texto.includes('telefone') ||
        texto.includes('celular') ||
        texto.includes('vivo') ||
        texto.includes('claro') ||
        texto.includes('tim') ||
        texto.includes('sistema') ||
        texto.includes('software') ||
        texto.includes('assinatura') ||
        texto.includes('mensalidade') ||
        texto.includes('seguro') ||
        texto.includes('limpeza') ||
        texto.includes('seguranca')
      ) {
        return 'estrutura';
      }

      // 5. Demais Custos Variáveis, Comissões, Cartões e Operação Diária
      return 'variaveis';
    };

    (transacoes || []).forEach(t => {
      if (t.tipo !== 'despesa') return;
      if (t.isTransferencia || t.categoria === 'Transferência' || t.categoria === 'Pagamento de Fatura') return;
      if (t.cartaoId && t.faturaId) return;
      if (t.formaPagamento === 'cartao_credito') return;

      const isPago = t.status === 'pago';
      const dataEfetiva = isPago
        ? normalizeDate(t.dataPagamento || t.data || '')
        : normalizeDate(t.data || t.dataVencimento || '');

      if (!dataEfetiva.startsWith(mesFormatado)) return;

      const val = getValorFinal(t);
      if (val <= 0) return;

      const desc = t.descricao || 'Despesa';
      const cat = t.categoria || 'Geral';

      despesasMes.push({
        id: t.id || `${desc}-${dataEfetiva}-${val}`,
        descricao: desc,
        categoria: cat,
        valor: val,
        status: isPago ? 'pago' : 'pendente',
        data: dataEfetiva,
        bucketKey: classificarBucket(desc, cat, t)
      });
    });

    // Inclui Faturas de cartão do mês
    (faturas || []).forEach(f => {
      const dtVenc = normalizeDate(f.dataVencimento || '');
      if (!dtVenc.startsWith(mesFormatado)) return;
      const val = Math.abs(Number(f.valorTotal || 0));
      if (val <= 0) return;
      const isPaga = f.status === 'paga';
      despesasMes.push({
        id: `fat-${f.id}`,
        descricao: `Fatura Cartão (${f.mesReferencia || mesFormatado})`,
        categoria: 'Cartão de Crédito',
        valor: val,
        status: isPaga ? 'pago' : 'pendente',
        data: dtVenc,
        bucketKey: 'variaveis'
      });
    });

    const receitaProjetadaTotal = Math.max(0, (Number(receitasRealizadas) || 0) + (Number(receitasAReceber) || 0));
    const receitaEfetivadaTotal = Math.max(0, Number(receitasRealizadas) || 0);

    // Se a receita realizada for 0 mas houver projetada, usa a projetada como base
    const receitaBase =
      baseReceitaModo === 'realizada' && receitaEfetivadaTotal > 0
        ? receitaEfetivadaTotal
        : receitaProjetadaTotal > 0
        ? receitaProjetadaTotal
        : receitaEfetivadaTotal;

    const totalDespesas = despesasMes.reduce((acc, i) => acc + i.valor, 0);
    const baseCalculo = receitaBase > 0 ? receitaBase : totalDespesas > 0 ? totalDespesas : 100;
    const semReceitaNoMes = receitaBase <= 0;

    const definicoesBuckets = [
      {
        key: 'impostos',
        label: 'Impostos & Encargos',
        sublabel: 'DAS, Simples, INSS, FGTS e Tributos',
        color: '#f59e0b',
        bgLight: 'rgba(245, 158, 11, 0.12)',
        borderLight: 'rgba(245, 158, 11, 0.3)',
        icon: Landmark
      },
      {
        key: 'folha',
        label: 'Folha, Salários & Pró-Labore',
        sublabel: 'Equipe, sócios, adiantamentos e benefícios',
        color: '#3b82f6',
        bgLight: 'rgba(59, 130, 246, 0.12)',
        borderLight: 'rgba(59, 130, 246, 0.3)',
        icon: Users
      },
      {
        key: 'estrutura',
        label: 'Estrutura & Custos Fixos',
        sublabel: 'Aluguel, contabilidade, luz, internet e sistemas',
        color: '#6366f1',
        bgLight: 'rgba(99, 102, 241, 0.12)',
        borderLight: 'rgba(99, 102, 241, 0.3)',
        icon: Building2
      },
      {
        key: 'dividas',
        label: 'Empréstimos & Parcelamentos Ativos',
        sublabel: 'Parcelas ativas (exclui quitados automaticamente)',
        color: '#ec4899',
        bgLight: 'rgba(236, 72, 153, 0.12)',
        borderLight: 'rgba(236, 72, 153, 0.3)',
        icon: Receipt
      },
      {
        key: 'variaveis',
        label: 'Variáveis, Operação & Cartões',
        sublabel: 'Gastos operacionais variáveis, comissões e faturas',
        color: '#8b5cf6',
        bgLight: 'rgba(139, 92, 246, 0.12)',
        borderLight: 'rgba(139, 92, 246, 0.3)',
        icon: Zap
      }
    ];

    let acumuladoReais = 0;
    const buckets: WaterfallBucket[] = definicoesBuckets.map(def => {
      const filtrados = despesasMes
        .filter(d => d.bucketKey === def.key)
        .sort((a, b) => b.valor - a.valor);

      const valorTotal = filtrados.reduce((acc, i) => acc + i.valor, 0);
      const valorPago = filtrados.filter(i => i.status === 'pago').reduce((acc, i) => acc + i.valor, 0);
      const valorPendente = filtrados.filter(i => i.status === 'pendente').reduce((acc, i) => acc + i.valor, 0);
      const porCemReais = (valorTotal / baseCalculo) * 100;

      acumuladoReais += valorTotal;
      const saldoRestanteReais = receitaBase - acumuladoReais;
      const saldoRestantePorCem = 100 - (acumuladoReais / baseCalculo) * 100;

      return {
        ...def,
        valorTotal,
        valorPago,
        valorPendente,
        porCemReais,
        saldoRestantePorCem,
        saldoRestanteReais,
        itens: filtrados.map(item => ({
          ...item,
          porCemReais: (item.valor / baseCalculo) * 100
        }))
      };
    });

    const resultadoLiquidoReais = receitaBase - totalDespesas;
    const sobraPorCemReais = semReceitaNoMes ? 0 : 100 - (totalDespesas / baseCalculo) * 100;
    const consumidoPorCemReais = (totalDespesas / baseCalculo) * 100;

    return {
      receitaProjetadaTotal,
      receitaEfetivadaTotal,
      receitaBase,
      totalDespesas,
      semReceitaNoMes,
      buckets,
      resultadoLiquidoReais,
      sobraPorCemReais,
      consumidoPorCemReais
    };
  }, [transacoes, faturas, mesFormatado, receitasRealizadas, receitasAReceber, baseReceitaModo]);

  const emLucro = !analise.semReceitaNoMes && analise.sobraPorCemReais >= 0;

  return (
    <div style={{
      background: 'var(--bg-card)',
      borderRadius: 16,
      padding: compactOnDashboard ? '22px 26px' : '26px 30px',
      border: '1px solid var(--border)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
      marginBottom: 24,
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* CABEÇALHO WALL STREET / STRIPE SIGMA */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#38bdf8',
            flexShrink: 0,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
          }}>
            <DollarSign size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: 10,
                fontWeight: 800,
                padding: '2.5px 8px',
                borderRadius: 6,
                background: 'rgba(56, 189, 248, 0.14)',
                color: '#0284c7',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                letterSpacing: '0.05em',
                textTransform: 'uppercase'
              }}>
                PADRÃO STRIPE SIGMA & WALL STREET
              </span>
              <h3 style={{ margin: 0, fontSize: 16.5, fontWeight: 800, color: 'var(--text-title)', letterSpacing: '-0.01em' }}>
                Raio-X de Destino de Cada R$ 100,00 (Cash Flow Waterfall)
              </h3>
            </div>
            <p style={{ margin: '3px 0 0 0', fontSize: 12.5, color: 'var(--text-muted)' }}>
              De cada <strong>R$ 100,00</strong> de receita em <strong>{nomeMes}</strong>, veja exatamente quantos reais vão para cada área e quanto sobra livre no caixa.
            </p>
          </div>
        </div>

        {/* Seletor de Base de Receita */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-secondary)', padding: 4, borderRadius: 10, border: '1px solid var(--border)' }}>
          <button
            onClick={() => setBaseReceitaModo('projetada')}
            style={{
              padding: '6px 11px',
              borderRadius: 7,
              fontSize: 11.5,
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              background: baseReceitaModo === 'projetada' ? 'var(--primary)' : 'transparent',
              color: baseReceitaModo === 'projetada' ? '#ffffff' : 'var(--text-muted)',
              transition: 'all 0.15s'
            }}
          >
            Receita Total Mês ({fmt(analise.receitaProjetadaTotal)})
          </button>
          <button
            onClick={() => setBaseReceitaModo('realizada')}
            style={{
              padding: '6px 11px',
              borderRadius: 7,
              fontSize: 11.5,
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              background: baseReceitaModo === 'realizada' ? 'var(--primary)' : 'transparent',
              color: baseReceitaModo === 'realizada' ? '#ffffff' : 'var(--text-muted)',
              transition: 'all 0.15s'
            }}
          >
            Apenas Já Recebida ({fmt(analise.receitaEfetivadaTotal)})
          </button>
        </div>
      </div>

      {/* BARRA VISUAL DA NOTA DE R$ 100,00 FATIADA */}
      <div style={{
        background: 'var(--bg-secondary)',
        borderRadius: 14,
        padding: '16px 18px',
        border: '1px solid var(--border)',
        marginBottom: 18
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-title)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            💵 Fatiamento Real de Cada Nota de R$ 100,00 que Entra na Empresa
          </div>
          <div style={{ fontSize: 12, fontWeight: 800, color: emLucro ? '#10b981' : '#ef4444' }}>
            {analise.semReceitaNoMes ? (
              <span>Sem receitas lançadas em {nomeMes} (proporção sobre despesas)</span>
            ) : emLucro ? (
              <span>✅ De cada R$ 100,00 entram livres no bolso: {fmtCem(analise.sobraPorCemReais)} ({analise.sobraPorCemReais.toFixed(1)}%)</span>
            ) : (
              <span>⚠️ Para cada R$ 100,00 que entram, as despesas consomem {fmtCem(analise.consumidoPorCemReais)} (faltam {fmtCem(Math.abs(analise.sobraPorCemReais))})</span>
            )}
          </div>
        </div>

        {/* Barra de Progresso Multi-Segmentos */}
        <div style={{
          height: 26,
          width: '100%',
          borderRadius: 10,
          background: 'rgba(148, 163, 184, 0.15)',
          overflow: 'hidden',
          display: 'flex',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.08)'
        }}>
          {analise.buckets.map(b => {
            if (b.valorTotal <= 0) return null;
            const divisor = Math.max(100, analise.consumidoPorCemReais);
            const widthPct = Math.max(5.5, (b.porCemReais / divisor) * 100);
            return (
              <div
                key={b.key}
                title={`${b.label}: ${fmtCem(b.porCemReais)} de cada R$ 100 (${fmt(b.valorTotal)})`}
                style={{
                  width: `${widthPct}%`,
                  minWidth: 64,
                  background: b.color,
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontSize: widthPct < 7.5 ? 9.5 : 10.5,
                  fontWeight: 800,
                  padding: '0 4px',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  borderRight: '1px solid rgba(255,255,255,0.25)',
                  transition: 'width 0.3s ease'
                }}
              >
                {fmtCem(b.porCemReais)}
              </div>
            );
          })}
          {emLucro && analise.sobraPorCemReais > 0 && (
            <div
              title={`Lucro Livre no Bolso: ${fmtCem(analise.sobraPorCemReais)} de cada R$ 100 (${fmt(analise.resultadoLiquidoReais)})`}
              style={{
                flex: 1,
                minWidth: 68,
                background: 'linear-gradient(90deg, #10b981, #059669)',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontSize: 10.5,
                fontWeight: 900,
                padding: '0 4px',
                overflow: 'hidden',
                whiteSpace: 'nowrap'
              }}
            >
              {analise.sobraPorCemReais >= 12 ? `LUCRO: ${fmtCem(analise.sobraPorCemReais)}` : fmtCem(analise.sobraPorCemReais)}
            </div>
          )}
        </div>

        {/* Legenda Rápida da Barra */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 10 }}>
          {analise.buckets.map(b => (
            <div key={b.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: b.color, flexShrink: 0 }} />
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{b.label}:</span>
              <strong style={{ color: 'var(--text-title)' }}>{fmtCem(b.porCemReais)}</strong>
            </div>
          ))}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, marginLeft: 'auto' }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: emLucro ? '#10b981' : '#ef4444', flexShrink: 0 }} />
            <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>{emLucro ? 'Sobra Livre:' : 'Déficit p/ R$ 100:'}</span>
            <strong style={{ color: emLucro ? '#10b981' : '#ef4444', fontWeight: 900 }}>
              {fmtCem(analise.sobraPorCemReais)}
            </strong>
          </div>
        </div>
      </div>

      {/* CASCATA PASSO A PASSO (WATERFALL STEP-DOWN) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
        {/* Card Inicial: Entrada de R$ 100,00 */}
        <div style={{
          background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)',
          color: '#ffffff',
          borderRadius: 12,
          padding: '14px 16px',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              1. ENTRADA BRUTA (BASE)
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#ffffff', marginTop: 4 }}>
              R$ 100,00
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
              Receita total: <span className="valor-sensivel" style={{ color: '#e2e8f0', fontWeight: 700 }}>{fmt(analise.receitaBase)}</span>
            </div>
          </div>
          <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: 11, color: '#34d399', fontWeight: 700 }}>
            100% da Receita do Mês
          </div>
        </div>

        {/* Cards de Dedução em Cascata */}
        {analise.buckets.map((b, idx) => {
          const Icon = b.icon;
          const isOpen = bucketExpandido === b.key;
          return (
            <div
              key={b.key}
              onClick={() => b.itens.length > 0 && setBucketExpandido(isOpen ? null : b.key)}
              style={{
                background: 'var(--bg-secondary)',
                borderRadius: 12,
                padding: '14px 16px',
                border: isOpen ? `1.5px solid ${b.color}` : '1px solid var(--border)',
                cursor: b.itens.length > 0 ? 'pointer' : 'default',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.15s ease'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: b.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {idx + 2}. (-) {b.label}
                  </span>
                  <Icon size={15} color={b.color} />
                </div>
                <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-title)', marginTop: 4 }}>
                  - {fmtCem(b.porCemReais)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  Total: <strong className="valor-sensivel" style={{ color: 'var(--text-title)' }}>{fmt(b.valorTotal)}</strong> ({b.itens.length} {b.itens.length === 1 ? 'item' : 'itens'})
                </div>
              </div>

              <div style={{
                marginTop: 10,
                paddingTop: 8,
                borderTop: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: 11
              }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
                  Restam: <strong style={{ color: b.saldoRestantePorCem >= 0 ? 'var(--text-title)' : '#ef4444' }}>{fmtCem(b.saldoRestantePorCem)}</strong>
                </span>
                {b.itens.length > 0 && (
                  <span style={{ color: b.color, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                    {isOpen ? 'Fechar' : 'Ver itens'} {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {/* Card Final: Resultado Livre de Cada R$ 100 */}
        <div style={{
          background: emLucro
            ? 'linear-gradient(145deg, rgba(16, 185, 129, 0.14) 0%, rgba(5, 150, 105, 0.08) 100%)'
            : 'linear-gradient(145deg, rgba(239, 68, 68, 0.14) 0%, rgba(185, 28, 28, 0.08) 100%)',
          borderRadius: 12,
          padding: '14px 16px',
          border: emLucro ? '1.5px solid rgba(16, 185, 129, 0.45)' : '1.5px solid rgba(239, 68, 68, 0.45)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, color: emLucro ? '#10b981' : '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              (=) {emLucro ? 'MARGEM LÍQUIDA LIVRE' : 'DÉFICIT POR R$ 100'}
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: emLucro ? '#10b981' : '#ef4444', marginTop: 4 }}>
              {fmtCem(analise.sobraPorCemReais)}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              Resultado: <strong className="valor-sensivel" style={{ color: emLucro ? '#10b981' : '#ef4444' }}>{fmt(analise.resultadoLiquidoReais)}</strong>
            </div>
          </div>
          <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--border)', fontSize: 11, fontWeight: 700, color: emLucro ? '#10b981' : '#ef4444' }}>
            {emLucro ? 'Lucro livre de cada R$ 100' : 'Acima da receita do mês'}
          </div>
        </div>
      </div>

      {/* DRILL-DOWN DE ITENS QUANDO UM CARD DA CASCATA É CLICADO */}
      {bucketExpandido && (() => {
        const b = analise.buckets.find(x => x.key === bucketExpandido);
        if (!b || b.itens.length === 0) return null;
        return (
          <div style={{
            marginTop: 16,
            padding: '14px 18px',
            borderRadius: 12,
            background: 'var(--bg-secondary)',
            border: `1px solid ${b.color}`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-title)' }}>
                Detalhamento de {b.label} — Como consome {fmtCem(b.porCemReais)} de cada R$ 100,00
              </div>
              <button
                onClick={() => setBucketExpandido(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
              >
                Fechar ✕
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8, maxHeight: 240, overflowY: 'auto' }}>
              {b.itens.map(item => (
                <div
                  key={item.id}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-title)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.descricao}
                    </div>
                    <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                      {item.categoria} • {item.status === 'pago' ? 'Pago' : 'A pagar'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: b.color }}>
                      {fmtCem(item.porCemReais)} <span style={{ fontSize: 9.5, color: 'var(--text-muted)', fontWeight: 600 }}>/ R$ 100</span>
                    </div>
                    <div className="valor-sensivel" style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 600 }}>
                      {fmt(item.valor)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
