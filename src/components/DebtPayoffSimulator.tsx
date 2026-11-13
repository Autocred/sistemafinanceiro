'use client';

import React, { useMemo, useState } from 'react';
import {
  Flame,
  Snowflake,
  Zap,
  CalendarCheck2,
  TrendingUp,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Calculator,
  Sparkles,
  ArrowRight,
  Clock
} from 'lucide-react';
import { Transacao } from '@/lib/types';
import {
  getValorFinal,
  normalizeDate,
  isParcelamentoTransacao,
  getChaveSerieParcelamento
} from '@/lib/financialEngine';

interface DebtPayoffSimulatorProps {
  transacoes: Transacao[];
  mesFormatado: string; // 'yyyy-MM'
  saldoEmCaixa?: number;
  compactOnDashboard?: boolean;
}

interface SerieParcelamentoAtiva {
  chave: string;
  titulo: string;
  fornecedor: string;
  categoria: string;
  totalParcelas: number;
  parcelasPagas: number;
  parcelasAVencer: number;
  valorParcelaMensal: number;
  saldoDevedorRestante: number;
  valorJaPago: number;
  proximaDataVencimento: string;
  ultimoMesVencimento: string; // 'yyyy-MM'
  ultimaDataVencimento: string; // 'yyyy-MM-dd'
  progressoPct: number;
  roiAlivioMensalPct: number; // Quanto libera por mês a cada R$ 100 de saldo quitado
  itensPendentes: {
    id: string;
    descricao: string;
    dataVencimento: string;
    valor: number;
  }[];
}

type EstrategiaQuitacao = 'roi' | 'snowball' | 'avalanche';

const MESES_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function formatarMesAno(ym: string): string {
  if (!ym || !ym.includes('-')) return '—';
  const [y, m] = ym.split('-');
  const idx = parseInt(m, 10) - 1;
  if (isNaN(idx) || idx < 0 || idx > 11) return ym;
  return `${MESES_CURTOS[idx]}/${y}`;
}

function limparTituloSerie(desc: string): string {
  if (!desc) return 'Parcelamento / Contrato';
  return desc
    .replace(/\bparcela\s*\d+(\s*(de|\/)\s*\d+)?\b/gi, '')
    .replace(/\(\s*\d{1,2}\s*\/\s*\d{1,2}\s*\)/g, '')
    .replace(/[-–—]\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim() || desc;
}

export default function DebtPayoffSimulator({
  transacoes,
  mesFormatado,
  saldoEmCaixa = 0,
  compactOnDashboard = false
}: DebtPayoffSimulatorProps) {
  const [estrategia, setEstrategia] = useState<EstrategiaQuitacao>('roi');
  const [aporteSimulado, setAporteSimulado] = useState<number>(5000);
  const [descontoAntecipacaoPct, setDescontoAntecipacaoPct] = useState<number>(5);
  const [serieExpandida, setSerieExpandida] = useState<string | null>(null);
  const [mostrarTodosContratos, setMostrarTodosContratos] = useState<boolean>(false);

  const fmt = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });

  const analise = useMemo(() => {
    const mapaSeries = new Map<string, Transacao[]>();

    transacoes.forEach(t => {
      if (!t || t.tipo !== 'despesa') return;
      if (!isParcelamentoTransacao(t)) return;
      const chave = getChaveSerieParcelamento(t);
      if (!chave) return;
      const atual = mapaSeries.get(chave) || [];
      atual.push(t);
      mapaSeries.set(chave, atual);
    });

    const seriesAtivas: SerieParcelamentoAtiva[] = [];

    mapaSeries.forEach((lista, chave) => {
      // Ordenar cronologicamente por vencimento
      const ordenada = [...lista].sort((a, b) => {
        const da = normalizeDate(a.dataVencimento || a.data || a.dataPagamento);
        const db = normalizeDate(b.dataVencimento || b.data || b.dataPagamento);
        return da.localeCompare(db);
      });

      const pagas = ordenada.filter(x => {
        const st = ((x.status || '') as string).toLowerCase();
        return st === 'pago' || st === 'recebido';
      });

      const pendentes = ordenada.filter(x => {
        const st = ((x.status || '') as string).toLowerCase();
        return st !== 'pago' && st !== 'recebido';
      });

      // REGRA: se não tem mais nenhuma parcela a vencer, está encerrado e não entra no painel!
      if (pendentes.length === 0) return;

      const saldoDevedorRestante = pendentes.reduce((acc, x) => acc + getValorFinal(x), 0);
      if (saldoDevedorRestante <= 0) return;

      const valorJaPago = pagas.reduce((acc, x) => acc + getValorFinal(x), 0);

      // Parcela mensal de referência: próxima parcela pendente do mês atual ou a primeira pendente
      const parcelaMesAtual = pendentes.find(x =>
        normalizeDate(x.dataVencimento || x.data).startsWith(mesFormatado)
      );
      const refParcela = parcelaMesAtual || pendentes[0];
      const valorParcelaMensal = getValorFinal(refParcela);

      // Total de parcelas da série
      const maxDeclarado = ordenada.reduce((m, x) => Math.max(m, Number(x.totalParcelas) || 0), 0);
      const totalParcelas = Math.max(ordenada.length, maxDeclarado, pagas.length + pendentes.length);

      const proximaDataVencimento = normalizeDate(pendentes[0].dataVencimento || pendentes[0].data);
      const ultimaPendente = pendentes[pendentes.length - 1];
      const ultimaDataVencimento = normalizeDate(ultimaPendente.dataVencimento || ultimaPendente.data);
      const ultimoMesVencimento = ultimaDataVencimento ? ultimaDataVencimento.substring(0, 7) : mesFormatado;

      const progressoPct = totalParcelas > 0 ? Math.min(99, (pagas.length / totalParcelas) * 100) : 0;
      const roiAlivioMensalPct =
        saldoDevedorRestante > 0 ? (valorParcelaMensal / saldoDevedorRestante) * 100 : 0;

      const representativa = refParcela || ordenada[0];
      const tituloLimpo = limparTituloSerie(representativa.descricao || representativa.fornecedorNome || 'Parcelamento');

      seriesAtivas.push({
        chave,
        titulo: tituloLimpo,
        fornecedor: representativa.fornecedorNome || 'Contrato Ativo',
        categoria: representativa.categoriaNome || 'Empréstimos / Parcelamentos',
        totalParcelas,
        parcelasPagas: pagas.length,
        parcelasAVencer: pendentes.length,
        valorParcelaMensal,
        saldoDevedorRestante,
        valorJaPago,
        proximaDataVencimento,
        ultimoMesVencimento,
        ultimaDataVencimento,
        progressoPct,
        roiAlivioMensalPct,
        itensPendentes: pendentes.map(p => ({
          id: p.id || `${chave}-${p.dataVencimento}`,
          descricao: p.descricao || tituloLimpo,
          dataVencimento: normalizeDate(p.dataVencimento || p.data),
          valor: getValorFinal(p)
        }))
      });
    });

    // Ordenação conforme estratégia americana selecionada
    const seriesOrdenadas = [...seriesAtivas].sort((a, b) => {
      if (estrategia === 'snowball') {
        // Menor saldo restante primeiro (ou menos parcelas restantes)
        if (a.saldoDevedorRestante !== b.saldoDevedorRestante) {
          return a.saldoDevedorRestante - b.saldoDevedorRestante;
        }
        return a.parcelasAVencer - b.parcelasAVencer;
      }
      if (estrategia === 'avalanche') {
        // Maior peso mensal no fluxo de caixa primeiro
        return b.valorParcelaMensal - a.valorParcelaMensal;
      }
      // 'roi' (Padrão SoFi / Tally): Maior liberação de fluxo mensal por R$ investido na quitação
      return b.roiAlivioMensalPct - a.roiAlivioMensalPct;
    });

    const totalComprometidoMensal = seriesAtivas.reduce((acc, s) => acc + s.valorParcelaMensal, 0);
    const saldoDevedorTotal = seriesAtivas.reduce((acc, s) => acc + s.saldoDevedorRestante, 0);
    const totalJaPagoHistorico = seriesAtivas.reduce((acc, s) => acc + s.valorJaPago, 0);

    // CALENDÁRIO DE ALÍVIO DE CAIXA (Quando cada parcelamento termina e quanto libera no mês)
    const mapaAlivioPorMes = new Map<
      string,
      { mesAno: string; valorLiberadoNoMes: number; contratosEncerrados: string[] }
    >();

    seriesAtivas.forEach(s => {
      const ym = s.ultimoMesVencimento || mesFormatado;
      const atual = mapaAlivioPorMes.get(ym) || {
        mesAno: ym,
        valorLiberadoNoMes: 0,
        contratosEncerrados: []
      };
      atual.valorLiberadoNoMes += s.valorParcelaMensal;
      atual.contratosEncerrados.push(s.titulo);
      mapaAlivioPorMes.set(ym, atual);
    });

    let acumuladoLiberado = 0;
    const calendarioAlivio = Array.from(mapaAlivioPorMes.values())
      .sort((a, b) => a.mesAno.localeCompare(b.mesAno))
      .map(item => {
        acumuladoLiberado += item.valorLiberadoNoMes;
        return {
          ...item,
          acumuladoLiberado
        };
      });

    // SIMULAÇÃO DE QUITAÇÃO ANTECIPADA COM O APORTE ESCOLHIDO
    const fatorDesconto = Math.max(0, 1 - descontoAntecipacaoPct / 100);
    let orcamentoRestante = Math.max(0, aporteSimulado);
    const contratosQuitadosSimulacao: {
      serie: SerieParcelamentoAtiva;
      custoComDesconto: number;
      economiaDesconto: number;
      alivioMensal: number;
    }[] = [];

    for (const s of seriesOrdenadas) {
      const custoQuitacao = s.saldoDevedorRestante * fatorDesconto;
      if (orcamentoRestante >= custoQuitacao && custoQuitacao > 0) {
        orcamentoRestante -= custoQuitacao;
        contratosQuitadosSimulacao.push({
          serie: s,
          custoComDesconto: custoQuitacao,
          economiaDesconto: s.saldoDevedorRestante - custoQuitacao,
          alivioMensal: s.valorParcelaMensal
        });
      }
    }

    const totalUsadoSimulacao = contratosQuitadosSimulacao.reduce((acc, c) => acc + c.custoComDesconto, 0);
    const totalEconomiaDesconto = contratosQuitadosSimulacao.reduce((acc, c) => acc + c.economiaDesconto, 0);
    const totalAlivioMensalDestravado = contratosQuitadosSimulacao.reduce((acc, c) => acc + c.alivioMensal, 0);
    const mesesPayback =
      totalAlivioMensalDestravado > 0 ? totalUsadoSimulacao / totalAlivioMensalDestravado : 0;

    return {
      seriesOrdenadas,
      totalComprometidoMensal,
      saldoDevedorTotal,
      totalJaPagoHistorico,
      calendarioAlivio,
      contratosQuitadosSimulacao,
      totalUsadoSimulacao,
      totalEconomiaDesconto,
      totalAlivioMensalDestravado,
      mesesPayback
    };
  }, [transacoes, mesFormatado, estrategia, aporteSimulado, descontoAntecipacaoPct]);

  if (analise.seriesOrdenadas.length === 0) {
    return null;
  }

  const chavesQuitadasNaSimulacao = new Set(analise.contratosQuitadosSimulacao.map(c => c.serie.chave));
  const listaExibida = mostrarTodosContratos
    ? analise.seriesOrdenadas
    : analise.seriesOrdenadas.slice(0, 6);

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        borderRadius: 16,
        padding: compactOnDashboard ? '22px 26px' : '26px 30px',
        border: '1px solid var(--border)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
        marginBottom: 24,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* CABEÇALHO SOFI / TALLY / WALL STREET DEBT OPTIMIZER */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 14,
          marginBottom: 18
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #311042 0%, #701a75 100%)',
              border: '1px solid rgba(236, 72, 153, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f472b6',
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(236, 72, 153, 0.2)'
            }}
          >
            <Sparkles size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  padding: '2.5px 8px',
                  borderRadius: 6,
                  background: 'rgba(236, 72, 153, 0.14)',
                  color: '#db2777',
                  border: '1px solid rgba(236, 72, 153, 0.3)',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase'
                }}
              >
                PADRÃO SOFI & TALLY USA
              </span>
              <h3
                style={{
                  margin: 0,
                  fontSize: 16.5,
                  fontWeight: 800,
                  color: 'var(--text-title)',
                  letterSpacing: '-0.01em'
                }}
              >
                Acelerador de Quitação (Snowball vs. Avalanche) & Calendário de Alívio de Caixa
              </h3>
            </div>
            <p style={{ margin: '3px 0 0 0', fontSize: 12.5, color: 'var(--text-muted)' }}>
              Mapeia apenas seus <strong>{analise.seriesOrdenadas.length} parcelamentos/empréstimos ativos</strong>, mostra quando cada um termina e simula qual quitar primeiro para liberar mais fôlego mensal.
            </p>
          </div>
        </div>

        {/* Seletor das 3 Estratégias Americanas */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: 'var(--bg-secondary)',
            padding: 4,
            borderRadius: 10,
            border: '1px solid var(--border)',
            flexWrap: 'wrap'
          }}
        >
          <button
            onClick={() => setEstrategia('roi')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '6px 11px',
              borderRadius: 7,
              fontSize: 11.5,
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              background: estrategia === 'roi' ? '#ec4899' : 'transparent',
              color: estrategia === 'roi' ? '#ffffff' : 'var(--text-muted)',
              transition: 'all 0.15s'
            }}
            title="Ordena pelos parcelamentos que liberam mais caixa mensal para cada R$ investido na quitação"
          >
            <Zap size={13} /> Maior Alívio Rápido (ROI)
          </button>
          <button
            onClick={() => setEstrategia('snowball')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '6px 11px',
              borderRadius: 7,
              fontSize: 11.5,
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              background: estrategia === 'snowball' ? '#0284c7' : 'transparent',
              color: estrategia === 'snowball' ? '#ffffff' : 'var(--text-muted)',
              transition: 'all 0.15s'
            }}
            title="Estratégia Snowball (Bola de Neve): ataca os menores saldos restantes primeiro para eliminar contratos rapidamente"
          >
            <Snowflake size={13} /> Bola de Neve (Menor Saldo)
          </button>
          <button
            onClick={() => setEstrategia('avalanche')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '6px 11px',
              borderRadius: 7,
              fontSize: 11.5,
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              background: estrategia === 'avalanche' ? '#7c3aed' : 'transparent',
              color: estrategia === 'avalanche' ? '#ffffff' : 'var(--text-muted)',
              transition: 'all 0.15s'
            }}
            title="Estratégia Avalanche: ataca a maior parcela mensal primeiro para cortar o maior peso do mês"
          >
            <Flame size={13} /> Avalanche (Maior Parcela)
          </button>
        </div>
      </div>

      {/* KPIs RÁPIDOS DE PASSIVO ATIVO */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 12,
          marginBottom: 18
        }}
      >
        <div
          style={{
            background: 'var(--bg-secondary)',
            borderRadius: 12,
            padding: '12px 16px',
            border: '1px solid var(--border)'
          }}
        >
          <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Peso Mensal Atual (Parcelas Ativas)
          </div>
          <div className="valor-sensivel" style={{ fontSize: 20, fontWeight: 900, color: '#ec4899', marginTop: 4 }}>
            {fmt(analise.totalComprometidoMensal)}
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}> /mês</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            Em {analise.seriesOrdenadas.length} contratos com parcelas a vencer
          </div>
        </div>

        <div
          style={{
            background: 'var(--bg-secondary)',
            borderRadius: 12,
            padding: '12px 16px',
            border: '1px solid var(--border)'
          }}
        >
          <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Saldo Total Restante a Vencer
          </div>
          <div className="valor-sensivel" style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-title)', marginTop: 4 }}>
            {fmt(analise.saldoDevedorTotal)}
          </div>
          <div style={{ fontSize: 11, color: '#10b981', fontWeight: 700, marginTop: 2 }}>
            Já amortizado: {fmt(analise.totalJaPagoHistorico)}
          </div>
        </div>

        {analise.calendarioAlivio.length > 0 && (
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(5, 150, 105, 0.05) 100%)',
              borderRadius: 12,
              padding: '12px 16px',
              border: '1px solid rgba(16, 185, 129, 0.35)'
            }}
          >
            <div style={{ fontSize: 10.5, fontWeight: 800, color: '#10b981', textTransform: 'uppercase' }}>
              Próximo Alívio Automático de Caixa
            </div>
            <div className="valor-sensivel" style={{ fontSize: 20, fontWeight: 900, color: '#10b981', marginTop: 4 }}>
              + {fmt(analise.calendarioAlivio[0].valorLiberadoNoMes)}
              <span style={{ fontSize: 11, fontWeight: 700 }}>/mês</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              A partir de <strong>{formatarMesAno(analise.calendarioAlivio[0].mesAno)}</strong> ({analise.calendarioAlivio[0].contratosEncerrados.length}{' '}
              {analise.calendarioAlivio[0].contratosEncerrados.length === 1 ? 'contrato acaba' : 'contratos acabam'})
            </div>
          </div>
        )}
      </div>

      {/* CALENDÁRIO DE ALÍVIO DE CAIXA (CASH FLOW LIBERATION TIMELINE) */}
      <div
        style={{
          background: 'var(--bg-secondary)',
          borderRadius: 14,
          padding: '14px 18px',
          border: '1px solid var(--border)',
          marginBottom: 18
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8,
            marginBottom: 10
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CalendarCheck2 size={16} color="#10b981" />
            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-title)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Calendário de Alívio de Caixa — Quando Suas Parcelas Acabam e o Dinheiro Sobra Livre
            </span>
          </div>
          <span style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 600 }}>
            Fôlego mensal destravado automaticamente conforme os contratos se encerram
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))',
            gap: 10
          }}
        >
          {analise.calendarioAlivio.slice(0, 6).map((item, idx) => (
            <div
              key={item.mesAno}
              style={{
                background: 'var(--bg-card)',
                borderRadius: 10,
                padding: '10px 12px',
                border: idx === 0 ? '1.5px solid rgba(16, 185, 129, 0.45)' : '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      padding: '2px 7px',
                      borderRadius: 5,
                      background: idx === 0 ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-secondary)',
                      color: idx === 0 ? '#10b981' : 'var(--text-title)'
                    }}
                  >
                    Última em {formatarMesAno(item.mesAno)}
                  </span>
                  <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 700 }}>
                    {item.contratosEncerrados.length} {item.contratosEncerrados.length === 1 ? 'fim' : 'fins'}
                  </span>
                </div>

                <div className="valor-sensivel" style={{ fontSize: 16, fontWeight: 900, color: '#10b981', marginTop: 6 }}>
                  + {fmt(item.valorLiberadoNoMes)}/mês
                </div>

                <div
                  style={{
                    fontSize: 10.5,
                    color: 'var(--text-muted)',
                    marginTop: 3,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                  title={item.contratosEncerrados.join(', ')}
                >
                  Fim de: <strong style={{ color: 'var(--text-title)' }}>{item.contratosEncerrados.join(', ')}</strong>
                </div>
              </div>

              <div
                style={{
                  marginTop: 8,
                  paddingTop: 6,
                  borderTop: '1px dashed var(--border)',
                  fontSize: 10.5,
                  color: 'var(--text-muted)',
                  display: 'flex',
                  justifyContent: 'space-between'
                }}
              >
                <span>Alívio Acumulado:</span>
                <strong className="valor-sensivel" style={{ color: '#059669' }}>
                  + {fmt(item.acumuladoLiberado)}/mês
                </strong>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SIMULADOR INTERATIVO DE QUITAÇÃO ANTECIPADA ("WHAT-IF PAYOFF") */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.96) 0%, rgba(30, 41, 59, 0.96) 100%)',
          color: '#ffffff',
          borderRadius: 14,
          padding: '16px 20px',
          border: '1px solid rgba(236, 72, 153, 0.35)',
          marginBottom: 18
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 14
          }}
        >
          <div style={{ flex: '1 1 320px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calculator size={16} color="#f472b6" />
              <span style={{ fontSize: 12, fontWeight: 800, color: '#f472b6', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Simulador What-If: E se você usar parte do caixa para quitar parcelamentos hoje?
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, color: '#cbd5e1', fontWeight: 600 }}>Valor p/ Quitar:</span>
                {[2000, 5000, 10000, 20000, 40000].map(val => (
                  <button
                    key={val}
                    onClick={() => setAporteSimulado(val)}
                    style={{
                      padding: '4px 9px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 800,
                      cursor: 'pointer',
                      border: aporteSimulado === val ? '1px solid #f472b6' : '1px solid rgba(255,255,255,0.15)',
                      background: aporteSimulado === val ? '#ec4899' : 'rgba(255,255,255,0.06)',
                      color: '#ffffff'
                    }}
                  >
                    R$ {(val / 1000).toFixed(0)}k
                  </button>
                ))}
                <input
                  type="number"
                  value={aporteSimulado || ''}
                  onChange={e => setAporteSimulado(Math.max(0, Number(e.target.value) || 0))}
                  placeholder="Outro valor"
                  style={{
                    width: 105,
                    padding: '4px 8px',
                    borderRadius: 6,
                    fontSize: 11.5,
                    fontWeight: 800,
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: '#ffffff'
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11.5, color: '#94a3b8', fontWeight: 600 }}>Desconto Antecipação:</span>
                {[0, 5, 10, 15].map(pct => (
                  <button
                    key={pct}
                    onClick={() => setDescontoAntecipacaoPct(pct)}
                    style={{
                      padding: '3px 7px',
                      borderRadius: 5,
                      fontSize: 10.5,
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: descontoAntecipacaoPct === pct ? '1px solid #38bdf8' : '1px solid rgba(255,255,255,0.12)',
                      background: descontoAntecipacaoPct === pct ? '#0284c7' : 'transparent',
                      color: '#ffffff'
                    }}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Resultado da Simulação */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              flexWrap: 'wrap',
              background: 'rgba(255,255,255,0.06)',
              padding: '10px 16px',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.12)'
            }}
          >
            <div>
              <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>
                Contratos 100% Eliminados
              </div>
              <div style={{ fontSize: 17, fontWeight: 900, color: '#38bdf8' }}>
                {analise.contratosQuitadosSimulacao.length} de {analise.seriesOrdenadas.length}
              </div>
            </div>

            <ArrowRight size={15} color="#64748b" />

            <div>
              <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>
                Fôlego Mensal Destravado JÁ
              </div>
              <div className="valor-sensivel" style={{ fontSize: 18, fontWeight: 900, color: '#34d399' }}>
                + {fmt(analise.totalAlivioMensalDestravado)}/mês
              </div>
            </div>

            {analise.mesesPayback > 0 && (
              <>
                <ArrowRight size={15} color="#64748b" />
                <div>
                  <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>
                    Retorno do Caixa (Payback)
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 900, color: '#fbbf24' }}>
                    {analise.mesesPayback.toFixed(1)} meses
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* RANKING DE PARCELAMENTOS ATIVOS CONFORME ESTRATÉGIA */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {listaExibida.map((s, idx) => {
          const isSimuladoQuitado = chavesQuitadasNaSimulacao.has(s.chave);
          const isOpen = serieExpandida === s.chave;

          return (
            <div
              key={s.chave}
              onClick={() => setSerieExpandida(isOpen ? null : s.chave)}
              style={{
                background: isSimuladoQuitado
                  ? 'linear-gradient(145deg, rgba(16, 185, 129, 0.1) 0%, var(--bg-secondary) 100%)'
                  : 'var(--bg-secondary)',
                borderRadius: 12,
                padding: '14px 16px',
                border: isSimuladoQuitado
                  ? '1.5px solid rgba(16, 185, 129, 0.5)'
                  : idx === 0
                  ? '1.5px solid rgba(236, 72, 153, 0.45)'
                  : '1px solid var(--border)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.15s ease'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      padding: '2px 7px',
                      borderRadius: 5,
                      background: isSimuladoQuitado
                        ? 'rgba(16, 185, 129, 0.18)'
                        : idx === 0
                        ? 'rgba(236, 72, 153, 0.16)'
                        : 'var(--bg-card)',
                      color: isSimuladoQuitado ? '#10b981' : idx === 0 ? '#db2777' : 'var(--text-muted)',
                      textTransform: 'uppercase'
                    }}
                  >
                    {isSimuladoQuitado
                      ? '✅ Quitado na Simulação'
                      : idx === 0
                      ? '🎯 #1 Prioridade de Quitação'
                      : `#${idx + 1} na Fila`}
                  </span>

                  <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    <Clock size={11} /> Fim: {formatarMesAno(s.ultimoMesVencimento)}
                  </span>
                </div>

                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: 'var(--text-title)',
                    marginTop: 8,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                  title={s.titulo}
                >
                  {s.titulo}
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 6 }}>
                  <div>
                    <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 600 }}>Parcela Mensal: </span>
                    <strong className="valor-sensivel" style={{ fontSize: 15.5, fontWeight: 900, color: '#ec4899' }}>
                      {fmt(s.valorParcelaMensal)}
                    </strong>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 600 }}>Faltam: </span>
                    <strong className="valor-sensivel" style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text-title)' }}>
                      {fmt(s.saldoDevedorRestante)}
                    </strong>
                  </div>
                </div>

                {/* Barra de Progresso do Parcelamento */}
                <div style={{ marginTop: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, marginBottom: 4 }}>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
                      Pagas: <strong>{s.parcelasPagas}</strong> de <strong>{s.totalParcelas}</strong>
                    </span>
                    <span style={{ color: '#ec4899', fontWeight: 800 }}>
                      Restam {s.parcelasAVencer} {s.parcelasAVencer === 1 ? 'parcela' : 'parcelas'}
                    </span>
                  </div>
                  <div
                    style={{
                      height: 7,
                      width: '100%',
                      borderRadius: 999,
                      background: 'rgba(148, 163, 184, 0.2)',
                      overflow: 'hidden'
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.max(6, s.progressoPct)}%`,
                        height: '100%',
                        background: isSimuladoQuitado
                          ? '#10b981'
                          : 'linear-gradient(90deg, #ec4899, #8b5cf6)',
                        borderRadius: 999
                      }}
                    />
                  </div>
                </div>
              </div>

              <div
                style={{
                  marginTop: 10,
                  paddingTop: 8,
                  borderTop: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: 11
                }}
              >
                <span style={{ color: '#10b981', fontWeight: 700 }}>
                  Quitar libera +{fmt(s.valorParcelaMensal)}/mês
                </span>
                <span style={{ color: 'var(--text-muted)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                  {isOpen ? 'Ocultar' : 'Parcelas'} {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </span>
              </div>

              {isOpen && (
                <div
                  onClick={e => e.stopPropagation()}
                  style={{
                    marginTop: 10,
                    paddingTop: 8,
                    borderTop: '1px dashed var(--border)',
                    maxHeight: 160,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 5
                  }}
                >
                  {s.itensPendentes.map(it => (
                    <div
                      key={it.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 11,
                        padding: '4px 6px',
                        borderRadius: 6,
                        background: 'var(--bg-card)'
                      }}
                    >
                      <span style={{ color: 'var(--text-muted)' }}>
                        Venc: <strong>{it.dataVencimento.split('-').reverse().join('/')}</strong>
                      </span>
                      <strong className="valor-sensivel" style={{ color: 'var(--text-title)' }}>
                        {fmt(it.valor)}
                      </strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {analise.seriesOrdenadas.length > 6 && (
        <div style={{ textAlign: 'center', marginTop: 14 }}>
          <button
            onClick={() => setMostrarTodosContratos(!mostrarTodosContratos)}
            style={{
              padding: '7px 16px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-title)',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            {mostrarTodosContratos
              ? 'Mostrar apenas os 6 principais'
              : `Ver todos os ${analise.seriesOrdenadas.length} parcelamentos ativos`}
          </button>
        </div>
      )}
    </div>
  );
}
