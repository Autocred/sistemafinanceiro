'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, Sparkles, BrainCircuit, AlertTriangle,
  CheckCircle2, DollarSign, Calendar, ArrowUpRight, ArrowDownRight,
  Plus, Trash2, RefreshCw, SlidersHorizontal, Zap, ShieldAlert,
  Download, Eye, Layers, Activity, ChevronRight, Info
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip, CartesianGrid, ReferenceLine
} from 'recharts';
import { getTransacoes, getContas, getConfiguracoes } from '@/lib/storage';
import { Transacao, Conta, ConfiguracaoApp } from '@/lib/types';

interface CenarioSimulacao {
  id: string;
  descricao: string;
  tipo: 'receita' | 'despesa';
  valor: number;
  data: string;
  ativo: boolean;
}

interface ItemPrevisao {
  data: string;
  diaLabel: string;
  saldoProjetado: number;
  entradas: number;
  saidas: number;
  detalhes: {
    descricao: string;
    valor: number;
    tipo: 'receita' | 'despesa';
    origem: 'agendado' | 'ia_recorrente' | 'simulacao';
  }[];
}

interface PadraoDetectado {
  id: string;
  descricao: string;
  tipo: 'receita' | 'despesa';
  valorMedio: number;
  diaTipico: number;
  frequencia: string;
  confianca: number;
  ocorrencias: number;
}

export default function PrevisaoFluxoIA() {
  const [loading, setLoading] = useState(true);
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [contas, setContas] = useState<Conta[]>([]);
  const [cfg, setCfg] = useState<ConfiguracaoApp | null>(null);
  
  // Horizonte de projeção
  const [diasHorizonte, setDiasHorizonte] = useState<number>(30);
  const [filtroTipoLista, setFiltroTipoLista] = useState<'todos' | 'agendado' | 'ia_recorrente' | 'simulacao'>('todos');
  
  // Cenários "E Se?" (Simulador)
  const [cenarios, setCenarios] = useState<CenarioSimulacao[]>([]);
  const [modalNovoCenario, setModalNovoCenario] = useState(false);
  const [novoCenarioDesc, setNovoCenarioDesc] = useState('');
  const [novoCenarioTipo, setNovoCenarioTipo] = useState<'receita' | 'despesa'>('despesa');
  const [novoCenarioValor, setNovoCenarioValor] = useState<string>('');
  const [novoCenarioData, setNovoCenarioData] = useState<string>(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );

  // Carregar dados
  const carregarDados = async () => {
    setLoading(true);
    try {
      const [tList, cList, config] = await Promise.all([
        getTransacoes().catch(() => []),
        getContas().catch(() => []),
        getConfiguracoes().catch(() => null)
      ]);
      setTransacoes(tList || []);
      setContas(cList || []);
      setCfg(config);
    } catch (e) {
      console.error('Erro ao carregar dados de previsão:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  // Saldo total atual em caixa
  const saldoAtual = useMemo(() => {
    return contas
      .filter(c => c.ativo !== false)
      .reduce((acc, c) => acc + (Number(c.saldo) || 0), 0);
  }, [contas]);

  // Motor de Inteligência Artificial: Detectar padrões e recorrências passadas
  const padroesIA = useMemo<PadraoDetectado[]>(() => {
    if (!transacoes || transacoes.length === 0) return [];

    const agora = new Date();
    const dataLimite = new Date();
    dataLimite.setDate(agora.getDate() - 180);
    const limiteStr = dataLimite.toISOString().split('T')[0];

    const historico = transacoes.filter(t => 
      t.status === 'pago' && 
      (t.tipo === 'receita' || t.tipo === 'despesa') &&
      (t.data >= limiteStr)
    );

    const normalizar = (s: string) => {
      return (s || '')
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, ' ')
        .trim();
    };

    const grupos: Record<string, { transacoes: Transacao[]; tipo: 'receita' | 'despesa'; nomeOriginal: string }> = {};

    historico.forEach(t => {
      const norm = normalizar(t.descricao);
      if (!norm || norm.length < 3) return;
      
      let chaveEncontrada = Object.keys(grupos).find(k => {
        return k === norm || (k.length > 5 && norm.includes(k)) || (norm.length > 5 && k.includes(norm));
      });

      if (!chaveEncontrada) {
        chaveEncontrada = norm;
        grupos[chaveEncontrada] = {
          transacoes: [],
          tipo: t.tipo as 'receita' | 'despesa',
          nomeOriginal: t.descricao
        };
      }

      grupos[chaveEncontrada].transacoes.push(t);
    });

    const padroes: PadraoDetectado[] = [];

    Object.entries(grupos).forEach(([chave, grupo]) => {
      if (grupo.transacoes.length >= 2) {
        const valores = grupo.transacoes.map(t => Number(t.valor) || 0);
        const valorMedio = valores.reduce((a, b) => a + b, 0) / valores.length;

        const dias = grupo.transacoes.map(t => {
          const dt = t.dataVencimento || t.data || '';
          const parts = dt.split('-');
          return parts.length === 3 ? parseInt(parts[2], 10) : 10;
        });
        const diaTipico = Math.round(dias.reduce((a, b) => a + b, 0) / dias.length);

        const variancia = valores.reduce((acc, v) => acc + Math.abs(v - valorMedio), 0) / valores.length;
        const coefVariacao = valorMedio > 0 ? (variancia / valorMedio) : 1;
        let confianca = Math.min(98, Math.max(65, Math.round(70 + (grupo.transacoes.length * 5) - (coefVariacao * 20))));

        padroes.push({
          id: chave,
          descricao: grupo.nomeOriginal,
          tipo: grupo.tipo,
          valorMedio: Math.round(valorMedio * 100) / 100,
          diaTipico: Math.min(28, Math.max(1, diaTipico)),
          frequencia: 'Mensal',
          confianca,
          ocorrencias: grupo.transacoes.length
        });
      }
    });

    return padroes.sort((a, b) => b.valorMedio - a.valorMedio);
  }, [transacoes]);

  // Projeção Diária do Fluxo de Caixa (Linha do Tempo)
  const projecao = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const timeline: ItemPrevisao[] = [];
    let saldoCorrente = saldoAtual;

    const hojeStr = hoje.toISOString().split('T')[0];
    const transacoesFuturas = transacoes.filter(t => {
      const dataTransacao = t.dataVencimento || t.data;
      return dataTransacao >= hojeStr && (t.status === 'pendente' || t.status === 'agendado' || t.status === 'atrasado');
    });

    for (let i = 0; i <= diasHorizonte; i++) {
      const dataAtual = new Date(hoje);
      dataAtual.setDate(hoje.getDate() + i);
      const dataAtualStr = dataAtual.toISOString().split('T')[0];
      const diaDoMes = dataAtual.getDate();

      const diaLabel = i === 0 
        ? 'Hoje' 
        : `${String(diaDoMes).padStart(2, '0')}/${String(dataAtual.getMonth() + 1).padStart(2, '0')}`;

      let entradasDia = 0;
      let saidasDia = 0;
      const detalhesDia: ItemPrevisao['detalhes'] = [];

      // 1. Lançamentos agendados reais
      transacoesFuturas.forEach(t => {
        const dt = t.dataVencimento || t.data;
        if (dt === dataAtualStr) {
          const val = Number(t.valor) || 0;
          if (t.tipo === 'receita') {
            entradasDia += val;
            detalhesDia.push({ descricao: t.descricao, valor: val, tipo: 'receita', origem: 'agendado' });
          } else if (t.tipo === 'despesa') {
            saidasDia += val;
            detalhesDia.push({ descricao: t.descricao, valor: val, tipo: 'despesa', origem: 'agendado' });
          }
        }
      });

      // 2. Previsão da IA
      if (i > 0) {
        padroesIA.forEach(padrao => {
          if (padrao.diaTipico === diaDoMes) {
            const jaExiste = detalhesDia.some(d => 
              d.origem === 'agendado' && 
              (d.descricao.toLowerCase().includes(padrao.descricao.toLowerCase().slice(0, 5)))
            );

            if (!jaExiste) {
              if (padrao.tipo === 'receita') {
                entradasDia += padrao.valorMedio;
                detalhesDia.push({
                  descricao: `[IA] ${padrao.descricao}`,
                  valor: padrao.valorMedio,
                  tipo: 'receita',
                  origem: 'ia_recorrente'
                });
              } else {
                saidasDia += padrao.valorMedio;
                detalhesDia.push({
                  descricao: `[IA] ${padrao.descricao}`,
                  valor: padrao.valorMedio,
                  tipo: 'despesa',
                  origem: 'ia_recorrente'
                });
              }
            }
          }
        });
      }

      // 3. Simulações ativas
      cenarios.filter(c => c.ativo && c.data === dataAtualStr).forEach(sim => {
        if (sim.tipo === 'receita') {
          entradasDia += sim.valor;
          detalhesDia.push({
            descricao: `[Simulação] ${sim.descricao}`,
            valor: sim.valor,
            tipo: 'receita',
            origem: 'simulacao'
          });
        } else {
          saidasDia += sim.valor;
          detalhesDia.push({
            descricao: `[Simulação] ${sim.descricao}`,
            valor: sim.valor,
            tipo: 'despesa',
            origem: 'simulacao'
          });
        }
      });

      saldoCorrente = saldoCorrente + entradasDia - saidasDia;

      timeline.push({
        data: dataAtualStr,
        diaLabel,
        saldoProjetado: Math.round(saldoCorrente * 100) / 100,
        entradas: Math.round(entradasDia * 100) / 100,
        saidas: Math.round(saidasDia * 100) / 100,
        detalhes: detalhesDia
      });
    }

    return timeline;
  }, [saldoAtual, transacoes, padroesIA, cenarios, diasHorizonte]);

  // Métricas-Chave da Previsão
  const metricas = useMemo(() => {
    if (projecao.length === 0) {
      return {
        saldoFinal: 0,
        variacaoTotal: 0,
        menorSaldo: 0,
        dataMenorSaldo: '',
        maiorSaldo: 0,
        diasNegativos: 0,
        totalEntradas: 0,
        totalSaidas: 0
      };
    }

    const saldoFinal = projecao[projecao.length - 1].saldoProjetado;
    const variacaoTotal = saldoFinal - saldoAtual;

    let menor = projecao[0].saldoProjetado;
    let dataMenor = projecao[0].data;
    let maior = projecao[0].saldoProjetado;
    let negativos = 0;
    let ent = 0;
    let sai = 0;

    projecao.forEach(item => {
      if (item.saldoProjetado < menor) {
        menor = item.saldoProjetado;
        dataMenor = item.data;
      }
      if (item.saldoProjetado > maior) {
        maior = item.saldoProjetado;
      }
      if (item.saldoProjetado < 0) {
        negativos++;
      }
      ent += item.entradas;
      sai += item.saidas;
    });

    return {
      saldoFinal,
      variacaoTotal,
      menorSaldo: menor,
      dataMenorSaldo: dataMenor,
      maiorSaldo: maior,
      diasNegativos: negativos,
      totalEntradas: Math.round(ent * 100) / 100,
      totalSaidas: Math.round(sai * 100) / 100
    };
  }, [projecao, saldoAtual]);

  // Diagnósticos da IA em Alto Contraste
  const diagnosticosIA = useMemo(() => {
    const list: { tipo: 'alerta' | 'sucesso' | 'info'; titulo: string; mensagem: string; acao?: string }[] = [];

    if (metricas.diasNegativos > 0) {
      const dataFormatada = metricas.dataMenorSaldo.split('-').reverse().join('/');
      list.push({
        tipo: 'alerta',
        titulo: 'Atenção: Risco de Caixa Negativo',
        mensagem: `A projeção indica que seu saldo ficará negativo em ${formatarMoeda(metricas.menorSaldo)} no dia ${dataFormatada}. Há concentração de saídas sem cobertura de entradas no período.`,
        acao: 'Ação Recomendada: Renegociar prazos de fornecedores ou adiantar recebíveis para evitar taxas de cheque especial.'
      });
    } else if (metricas.menorSaldo < (metricas.totalSaidas * 0.15)) {
      list.push({
        tipo: 'alerta',
        titulo: 'Margem de Segurança Estreita',
        mensagem: `O saldo projetado não fica negativo, mas atinge a reserva mínima de ${formatarMoeda(metricas.menorSaldo)}. Pequenos imprevistos podem tensionar o caixa.`,
        acao: 'Ação Recomendada: Manter provisão de segurança e evitar retiradas extraordinárias.'
      });
    } else {
      list.push({
        tipo: 'sucesso',
        titulo: 'Fluxo de Caixa Estável e Seguro',
        mensagem: `Sua projeção de liquidez se mantém positiva em todo o horizonte de ${diasHorizonte} dias. O saldo final estimado é de ${formatarMoeda(metricas.saldoFinal)}.`,
        acao: 'Ação Recomendada: Excelente liquidez. Você pode programar investimentos ou alocação em reservas remuneradas.'
      });
    }

    if (metricas.saldoFinal > saldoAtual && metricas.saldoFinal > 5000) {
      list.push({
        tipo: 'info',
        titulo: 'Oportunidade de Aplicação Financeira',
        mensagem: `Ao final de ${diasHorizonte} dias, você terá um volume positivo de ${formatarMoeda(metricas.saldoFinal)}. Dinheiro parado em conta corrente perde poder de compra.`,
        acao: 'Dica do Banco: Aplicar os excedentes em CDB com liquidez diária para gerar rendimento automático.'
      });
    }

    return list;
  }, [metricas, diasHorizonte, saldoAtual]);

  // Lista de lançamentos projetados
  const listaProjetados = useMemo(() => {
    const list: {
      data: string;
      descricao: string;
      valor: number;
      tipo: 'receita' | 'despesa';
      origem: 'agendado' | 'ia_recorrente' | 'simulacao';
      saldoApos: number;
    }[] = [];

    projecao.forEach(p => {
      p.detalhes.forEach(d => {
        if (filtroTipoLista === 'todos' || d.origem === filtroTipoLista) {
          list.push({
            data: p.data,
            descricao: d.descricao,
            valor: d.valor,
            tipo: d.tipo,
            origem: d.origem,
            saldoApos: p.saldoProjetado
          });
        }
      });
    });

    return list;
  }, [projecao, filtroTipoLista]);

  function formatarMoeda(val: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  }

  const handleAdicionarCenario = () => {
    if (!novoCenarioDesc.trim() || !novoCenarioValor) return;
    const val = parseFloat(novoCenarioValor.replace(',', '.'));
    if (isNaN(val) || val <= 0) return;

    const novo: CenarioSimulacao = {
      id: String(Date.now()),
      descricao: novoCenarioDesc.trim(),
      tipo: novoCenarioTipo,
      valor: val,
      data: novoCenarioData,
      ativo: true
    };

    setCenarios(prev => [...prev, novo]);
    setNovoCenarioDesc('');
    setNovoCenarioValor('');
    setModalNovoCenario(false);
  };

  const handleRemoverCenario = (id: string) => {
    setCenarios(prev => prev.filter(c => c.id !== id));
  };

  const handleToggleCenario = (id: string) => {
    setCenarios(prev => prev.map(c => c.id === id ? { ...c, ativo: !c.ativo } : c));
  };

  if (loading) {
    return (
      <div className="font-santander flex flex-col items-center justify-center min-h-[500px] gap-4">
        <div className="spinner"></div>
        <p className="text-[var(--text-secondary)] font-bold text-sm">
          Calculando projeções inteligentes de fluxo de caixa...
        </p>
      </div>
    );
  }

  const primaryColor = cfg?.corPrimaria || '#EC0000';
  const nomeEmpresa = cfg?.nomeSistema || 'FinanceAI';

  return (
    <div className="font-santander space-y-8 p-3 sm:p-5 md:p-6 lg:p-8 max-w-[1440px] mx-auto animate-in fade-in duration-500 text-[var(--text-primary)]">
      
      {/* CABEÇALHO PADRÃO BANCÁRIO SANTANDER */}
      <div 
        className="glass p-6 md:p-8 rounded-3xl relative overflow-hidden flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 shadow-xl border border-[var(--border)]"
        style={{
          borderLeft: `6px solid ${primaryColor}`
        }}
      >
        <div className="flex items-center gap-4 z-10">
          <div 
            className="w-16 h-16 rounded-2xl flex items-center justify-center p-3 shadow-lg flex-shrink-0"
            style={{ 
              background: 'linear-gradient(135deg, rgba(236, 0, 0, 0.15), rgba(204, 0, 0, 0.25))',
              border: '2px solid rgba(236, 0, 0, 0.4)'
            }}
          >
            <BrainCircuit className="w-9 h-9 text-[#EC0000] animate-pulse" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-xs uppercase font-extrabold tracking-wider px-3 py-1 rounded-full bg-[#EC0000]/10 text-[#EC0000] border border-[#EC0000]/30">
                Padrão Bancário Executivo
              </span>
              <span className="text-xs font-bold text-[var(--text-muted)]">
                {nomeEmpresa}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[var(--text-title)]">
              Previsão de Fluxo de Caixa
            </h1>
            <p className="text-sm font-medium text-[var(--text-secondary)] mt-1 max-w-2xl leading-relaxed">
              Projeção preditiva diária de liquidez com Machine Learning, identificação automática de contas recorrentes e simulação de cenários.
            </p>
          </div>
        </div>

        {/* CONTROLES DO HORIZONTE */}
        <div className="flex flex-wrap items-center gap-2 bg-[var(--bg-secondary)] p-2 rounded-2xl border border-[var(--border)] w-full lg:w-auto justify-start sm:justify-end shadow-sm">
          {[
            { dias: 30, label: '30 Dias' },
            { dias: 60, label: '60 Dias' },
            { dias: 90, label: '90 Dias' },
            { dias: 180, label: '180 Dias' }
          ].map(opt => (
            <button
              key={opt.dias}
              onClick={() => setDiasHorizonte(opt.dias)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                diasHorizonte === opt.dias 
                  ? 'bg-[#EC0000] text-white shadow-md hover:bg-[#CC0000]' 
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-title)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
          <button
            onClick={() => setModalNovoCenario(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 text-white rounded-xl text-xs font-bold transition-all shadow-md ml-auto sm:ml-2"
            title="Simular Novo Cenário E Se?"
          >
            <SlidersHorizontal size={14} />
            <span>Simular E Se?</span>
          </button>
        </div>
      </div>

      {/* CARDS DE INDICADORES PREDITIVOS (HIGH CONTRAST) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Saldo Atual */}
        <div className="glass p-5 rounded-2xl border border-[var(--border)] relative overflow-hidden shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[var(--text-muted)] mb-2 font-bold text-xs uppercase tracking-wider">
              <span>Saldo Atual Consolidado</span>
              <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-2xl lg:text-3xl font-extrabold text-[var(--text-title)] tracking-tight">
              {formatarMoeda(saldoAtual)}
            </div>
          </div>
          <div className="text-xs font-semibold text-[var(--text-muted)] mt-3 pt-2 border-t border-[var(--border)]">
            Total em {contas.filter(c => c.ativo !== false).length} contas bancárias ativas
          </div>
        </div>

        {/* 2. Saldo Projetado ao Final */}
        <div className="glass p-5 rounded-2xl border border-[var(--border)] relative overflow-hidden shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[var(--text-muted)] mb-2 font-bold text-xs uppercase tracking-wider">
              <span>Projeção em {diasHorizonte} Dias</span>
              {metricas.saldoFinal >= saldoAtual ? (
                <ArrowUpRight className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <ArrowDownRight className="w-5 h-5 text-[#EC0000]" />
              )}
            </div>
            <div className={`text-2xl lg:text-3xl font-extrabold tracking-tight ${metricas.saldoFinal >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-[#EC0000]'}`}>
              {formatarMoeda(metricas.saldoFinal)}
            </div>
          </div>
          <div className="text-xs font-bold mt-3 pt-2 border-t border-[var(--border)] flex items-center justify-between">
            <span className={metricas.variacaoTotal >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-[#EC0000]'}>
              {metricas.variacaoTotal >= 0 ? '+' : ''}{formatarMoeda(metricas.variacaoTotal)}
            </span>
            <span className="text-[var(--text-muted)] font-medium">vs saldo de hoje</span>
          </div>
        </div>

        {/* 3. Menor Ponto do Caixa */}
        <div className="glass p-5 rounded-2xl border border-[var(--border)] relative overflow-hidden shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[var(--text-muted)] mb-2 font-bold text-xs uppercase tracking-wider">
              <span>Menor Saldo Previsto</span>
              <AlertTriangle className={`w-5 h-5 ${metricas.menorSaldo < 0 ? 'text-[#EC0000]' : 'text-amber-600 dark:text-amber-400'}`} />
            </div>
            <div className={`text-2xl lg:text-3xl font-extrabold tracking-tight ${metricas.menorSaldo < 0 ? 'text-[#EC0000]' : 'text-[var(--text-title)]'}`}>
              {formatarMoeda(metricas.menorSaldo)}
            </div>
          </div>
          <div className="text-xs font-bold mt-3 pt-2 border-t border-[var(--border)] flex items-center justify-between">
            <span className="text-[var(--text-secondary)]">Dia {metricas.dataMenorSaldo.split('-').reverse().join('/') || 'N/A'}</span>
            {metricas.diasNegativos > 0 ? (
              <span className="text-[#EC0000] font-extrabold bg-[#EC0000]/10 px-2 py-0.5 rounded">
                {metricas.diasNegativos}d negativo
              </span>
            ) : (
              <span className="text-emerald-700 dark:text-emerald-400 font-bold">100% positivo</span>
            )}
          </div>
        </div>

        {/* 4. Entradas vs Saídas */}
        <div className="glass p-5 rounded-2xl border border-[var(--border)] relative overflow-hidden shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[var(--text-muted)] mb-2 font-bold text-xs uppercase tracking-wider">
              <span>Fluxo Previsto ({diasHorizonte}d)</span>
              <Activity className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="flex items-center justify-between text-sm font-extrabold">
              <span className="text-emerald-700 dark:text-emerald-400">+{formatarMoeda(metricas.totalEntradas)}</span>
              <span className="text-[#EC0000]">-{formatarMoeda(metricas.totalSaidas)}</span>
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-[var(--border)]">
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden flex">
              <div 
                className="bg-emerald-600 dark:bg-emerald-500 h-full transition-all" 
                style={{ 
                  width: `${Math.min(100, (metricas.totalEntradas / (metricas.totalEntradas + metricas.totalSaidas || 1)) * 100)}%` 
                }} 
              />
              <div 
                className="bg-[#EC0000] h-full transition-all" 
                style={{ 
                  width: `${Math.min(100, (metricas.totalSaidas / (metricas.totalEntradas + metricas.totalSaidas || 1)) * 100)}%` 
                }} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* GRÁFICO PRINCIPAL COM ESPAÇAMENTO RESPONSIVO E SEM CORTES */}
      <div className="glass p-6 md:p-8 rounded-3xl border border-[var(--border)] shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 pb-4 border-b border-[var(--border)]">
          <div>
            <h2 className="text-lg md:text-xl font-extrabold text-[var(--text-title)] flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-[#EC0000]" />
              Evolução Diária da Projeção de Caixa
            </h2>
            <p className="text-xs sm:text-sm font-medium text-[var(--text-secondary)] mt-1">
              Curva de liquidez dia a dia considerando saldo bancário atual, contas agendadas e estimativas inteligentes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-bold">
            <div className="flex items-center gap-2 bg-[var(--bg-secondary)] px-3 py-1.5 rounded-xl border border-[var(--border)]">
              <div className="w-3.5 h-3.5 rounded-full bg-indigo-600 dark:bg-indigo-400"></div>
              <span className="text-[var(--text-title)]">Saldo Projetado</span>
            </div>
            <div className="flex items-center gap-2 bg-[var(--bg-secondary)] px-3 py-1.5 rounded-xl border border-[var(--border)]">
              <div className="w-4 h-1 bg-[#EC0000] rounded"></div>
              <span className="text-[#EC0000]">Linha Zero (Déficit de Caixa)</span>
            </div>
          </div>
        </div>

        <div className="h-[380px] w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart 
              data={projecao} 
              margin={{ top: 25, right: 30, left: 15, bottom: 25 }}
            >
              <defs>
                <linearGradient id="corSaldoSantander" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.45}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.2)" />
              <XAxis 
                dataKey="diaLabel" 
                stroke="var(--text-secondary)" 
                fontSize={12}
                fontWeight={600}
                tickLine={false}
                dy={10}
              />
              <YAxis 
                stroke="var(--text-secondary)" 
                fontSize={12}
                fontWeight={600}
                width={75}
                tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
                tickLine={false}
                dx={-5}
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data: ItemPrevisao = payload[0].payload;
                    return (
                      <div className="bg-white dark:bg-slate-900 border-2 border-indigo-500/40 p-4 rounded-2xl shadow-2xl backdrop-blur-md min-w-[240px] text-left">
                        <div className="text-xs font-bold text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800 pb-1.5 mb-2">
                          Data: {data.data.split('-').reverse().join('/')} ({data.diaLabel})
                        </div>
                        <div className="text-base font-extrabold text-indigo-700 dark:text-indigo-300 mb-2">
                          Saldo Previsto: {formatarMoeda(data.saldoProjetado)}
                        </div>
                        {data.entradas > 0 && (
                          <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex justify-between py-0.5">
                            <span>Receitas do dia:</span>
                            <span>+{formatarMoeda(data.entradas)}</span>
                          </div>
                        )}
                        {data.saidas > 0 && (
                          <div className="text-xs font-bold text-[#EC0000] flex justify-between py-0.5">
                            <span>Despesas do dia:</span>
                            <span>-{formatarMoeda(data.saidas)}</span>
                          </div>
                        )}
                        {data.detalhes.length > 0 && (
                          <div className="mt-2.5 pt-2 border-t border-gray-200 dark:border-gray-800 space-y-1">
                            {data.detalhes.slice(0, 4).map((d, idx) => (
                              <div key={idx} className="text-[11px] font-medium text-gray-700 dark:text-gray-300 flex justify-between gap-2">
                                <span className="truncate max-w-[150px]">{d.descricao}</span>
                                <span className={d.tipo === 'receita' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-[#EC0000] font-bold'}>
                                  {formatarMoeda(d.valor)}
                                </span>
                              </div>
                            ))}
                            {data.detalhes.length > 4 && (
                              <div className="text-[10px] text-gray-400 italic pt-1">
                                + {data.detalhes.length - 4} outros lançamentos
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine y={0} stroke="#EC0000" strokeWidth={2} strokeDasharray="4 4" />
              <Area 
                type="monotone" 
                dataKey="saldoProjetado" 
                stroke="#4f46e5" 
                strokeWidth={3.5}
                fillOpacity={1} 
                fill="url(#corSaldoSantander)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* PAINEL DE INSIGHTS DA IA & SIMULADOR "E SE?" */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUNA ESQUERDA: DIAGNÓSTICO DA IA E PADRÕES RECORRENTES */}
        <div className="lg:col-span-2 glass p-6 md:p-8 rounded-3xl border border-[var(--border)] shadow-xl flex flex-col gap-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-extrabold text-[var(--text-title)] flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                Diagnóstico & Aconselhamento Financeiro da IA
              </h3>
              <span className="text-xs text-indigo-700 dark:text-indigo-300 font-bold bg-indigo-100 dark:bg-indigo-950/50 px-3 py-1 rounded-full border border-indigo-300 dark:border-indigo-800">
                Auditoria Preditiva
              </span>
            </div>

            {/* CARDS DE DIAGNÓSTICO COM ALTO CONTRASTE */}
            <div className="space-y-3.5">
              {diagnosticosIA.map((d, index) => (
                <div 
                  key={index}
                  className={`p-4 md:p-5 rounded-2xl border transition-all ${
                    d.tipo === 'alerta' 
                      ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50' 
                      : d.tipo === 'sucesso'
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50'
                      : 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/50'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    {d.tipo === 'alerta' && <AlertTriangle className="w-6 h-6 text-[#EC0000] flex-shrink-0 mt-0.5" />}
                    {d.tipo === 'sucesso' && <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />}
                    {d.tipo === 'info' && <Info className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />}
                    <div className="space-y-1.5 flex-1">
                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                        {d.titulo}
                      </h4>
                      <p className="text-xs md:text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                        {d.mensagem}
                      </p>
                      {d.acao && (
                        <div className="mt-2 text-xs font-bold text-amber-950 dark:text-amber-200 bg-amber-100/90 dark:bg-amber-950/60 px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-800/60 inline-flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 flex-shrink-0" />
                          <span>{d.acao}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PADRÕES RECORRENTES IDENTIFICADOS (SEM CORTES) */}
          <div className="pt-4 border-t border-[var(--border)]">
            <h4 className="text-xs font-extrabold text-[var(--text-muted)] uppercase tracking-wider mb-3">
              Principais Padrões Recorrentes Mapeados pela IA:
            </h4>
            {padroesIA.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">Nenhum padrão recorrente identificado nos últimos 180 dias.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {padroesIA.slice(0, 6).map(p => (
                  <div 
                    key={p.id} 
                    className="bg-[var(--bg-secondary)] p-3.5 rounded-xl border border-[var(--border)] flex items-center justify-between text-xs shadow-sm hover:border-[#EC0000]/40 transition-colors"
                  >
                    <div className="flex-1 pr-2">
                      <div className="font-extrabold text-[var(--text-title)] text-xs">
                        {p.descricao}
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                        Todo dia {p.diaTipico} • Confiança {p.confianca}% ({p.ocorrencias}x)
                      </div>
                    </div>
                    <div className={`font-extrabold text-sm whitespace-nowrap ${p.tipo === 'receita' ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#EC0000]'}`}>
                      {p.tipo === 'receita' ? '+' : '-'}{formatarMoeda(p.valorMedio)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* COLUNA DIREITA: SIMULADOR "E SE?" */}
        <div className="glass p-6 md:p-8 rounded-3xl border border-[var(--border)] shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-extrabold text-[var(--text-title)] flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                Simulador "E Se?"
              </h3>
              <button
                onClick={() => setModalNovoCenario(true)}
                className="p-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white transition-all shadow-md flex items-center gap-1 text-xs font-bold"
                title="Adicionar Simulação"
              >
                <Plus size={15} />
                <span>Simular</span>
              </button>
            </div>
            
            <p className="text-xs font-medium text-[var(--text-secondary)] mb-4 leading-relaxed">
              Adicione valores hipotéticos (ex: venda futura, gasto não previsto) para visualizar o impacto no caixa em tempo real.
            </p>

            {cenarios.length === 0 ? (
              <div className="text-center p-6 border-2 border-dashed border-[var(--border)] rounded-2xl bg-[var(--bg-secondary)]">
                <SlidersHorizontal className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2 opacity-50" />
                <p className="text-xs text-[var(--text-secondary)] font-bold">Nenhum cenário simulado ativo.</p>
                <button
                  onClick={() => setModalNovoCenario(true)}
                  className="mt-3 text-xs font-extrabold text-purple-600 dark:text-purple-400 hover:underline inline-flex items-center gap-1"
                >
                  <Plus size={13} />
                  Criar primeiro cenário de teste
                </button>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                {cenarios.map(c => (
                  <div 
                    key={c.id} 
                    className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                      c.ativo 
                        ? 'bg-purple-50 dark:bg-purple-950/30 border-purple-300 dark:border-purple-800 text-[var(--text-title)]' 
                        : 'bg-gray-100 dark:bg-gray-800/30 border-gray-300 dark:border-gray-800 opacity-60 text-[var(--text-muted)]'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                      <input 
                        type="checkbox" 
                        checked={c.ativo} 
                        onChange={() => handleToggleCenario(c.id)}
                        className="rounded accent-purple-600 cursor-pointer w-4 h-4 flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="font-extrabold text-xs text-[var(--text-title)] truncate">{c.descricao}</div>
                        <div className="text-[11px] text-[var(--text-muted)]">
                          {c.data.split('-').reverse().join('/')} • {c.tipo === 'receita' ? 'Receita' : 'Despesa'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`font-extrabold text-xs ${c.tipo === 'receita' ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#EC0000]'}`}>
                        {c.tipo === 'receita' ? '+' : '-'}{formatarMoeda(c.valor)}
                      </span>
                      <button 
                        onClick={() => handleRemoverCenario(c.id)}
                        className="text-gray-400 hover:text-[#EC0000] p-1 transition-colors"
                        title="Remover Simulação"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-5 pt-3 border-t border-[var(--border)] text-xs text-[var(--text-muted)] flex items-center gap-1.5 font-medium">
            <Zap size={14} className="text-amber-500 flex-shrink-0" />
            <span>O gráfico acima recalcula instantaneamente ao marcar/desmarcar simulações.</span>
          </div>
        </div>
      </div>

      {/* CRONOGRAMA DE MOVIMENTAÇÕES FUTURAS (TABELA PADRÃO SANTANDER) */}
      <div className="glass p-6 md:p-8 rounded-3xl border border-[var(--border)] shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5 pb-3 border-b border-[var(--border)]">
          <div>
            <h3 className="text-lg font-extrabold text-[var(--text-title)]">
              Cronograma de Movimentações Futuras
            </h3>
            <p className="text-xs sm:text-sm font-medium text-[var(--text-secondary)]">
              Lista consolidada de lançamentos agendados, previsões de IA e simulações para os próximos {diasHorizonte} dias.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 bg-[var(--bg-secondary)] p-1.5 rounded-xl border border-[var(--border)] text-xs font-bold shadow-sm">
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'agendado', label: 'Agendados' },
              { id: 'ia_recorrente', label: 'IA Preditiva' },
              { id: 'simulacao', label: 'Simulações' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFiltroTipoLista(f.id as any)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  filtroTipoLista === f.id
                    ? 'bg-[#EC0000] text-white shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-title)]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-[var(--bg-secondary)] text-[var(--text-muted)] font-extrabold border-b-2 border-[var(--border)] z-10 uppercase tracking-wider">
              <tr>
                <th className="p-3.5">Data</th>
                <th className="p-3.5">Descrição</th>
                <th className="p-3.5">Origem</th>
                <th className="p-3.5 text-right">Valor</th>
                <th className="p-3.5 text-right">Saldo Previsto Após</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] font-medium">
              {listaProjetados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-[var(--text-muted)] font-bold text-sm">
                    Nenhum lançamento previsto no filtro selecionado.
                  </td>
                </tr>
              ) : (
                listaProjetados.map((item, idx) => (
                  <tr key={idx} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                    <td className="p-3.5 font-bold text-[var(--text-secondary)] whitespace-nowrap">
                      {item.data.split('-').reverse().join('/')}
                    </td>
                    <td className="p-3.5 font-extrabold text-[var(--text-title)]">
                      {item.descricao}
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      {item.origem === 'agendado' && (
                        <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200 border border-blue-300 dark:border-blue-800 text-[10px] font-extrabold">
                          Agendado Real
                        </span>
                      )}
                      {item.origem === 'ia_recorrente' && (
                        <span className="px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-800 text-[10px] font-extrabold">
                          IA Preditiva
                        </span>
                      )}
                      {item.origem === 'simulacao' && (
                        <span className="px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200 border border-purple-300 dark:border-purple-800 text-[10px] font-extrabold">
                          Simulação
                        </span>
                      )}
                    </td>
                    <td className={`p-3.5 text-right font-extrabold whitespace-nowrap ${item.tipo === 'receita' ? 'text-emerald-700 dark:text-emerald-400' : 'text-[#EC0000]'}`}>
                      {item.tipo === 'receita' ? '+' : '-'}{formatarMoeda(item.valor)}
                    </td>
                    <td className={`p-3.5 text-right font-extrabold whitespace-nowrap ${item.saldoApos >= 0 ? 'text-[var(--text-title)]' : 'text-[#EC0000]'}`}>
                      {formatarMoeda(item.saldoApos)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL NOVO CENÁRIO */}
      {modalNovoCenario && (
        <div className="font-santander fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="glass max-w-md w-full p-6 md:p-8 rounded-3xl border border-purple-500/30 shadow-2xl relative bg-[var(--bg-card)] text-[var(--text-primary)]">
            <h3 className="text-xl font-extrabold text-[var(--text-title)] mb-2 flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              Adicionar Simulação "E Se?"
            </h3>
            <p className="text-xs font-medium text-[var(--text-secondary)] mb-5">
              Crie uma movimentação hipotética para verificar o comportamento do fluxo de caixa.
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[var(--text-title)] block mb-1">Descrição do Cenário</label>
                <input 
                  type="text" 
                  className="input-field w-full text-xs font-medium" 
                  placeholder="Ex: Novo cliente contratado, Reforma, Bônus..."
                  value={novoCenarioDesc}
                  onChange={e => setNovoCenarioDesc(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[var(--text-title)] block mb-1">Tipo</label>
                  <select 
                    className="input-field w-full text-xs font-medium"
                    value={novoCenarioTipo}
                    onChange={e => setNovoCenarioTipo(e.target.value as any)}
                  >
                    <option value="despesa">Despesa (Saída)</option>
                    <option value="receita">Receita (Entrada)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-[var(--text-title)] block mb-1">Valor (R$)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    className="input-field w-full text-xs font-medium" 
                    placeholder="0,00"
                    value={novoCenarioValor}
                    onChange={e => setNovoCenarioValor(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[var(--text-title)] block mb-1">Data Estimada</label>
                <input 
                  type="date" 
                  className="input-field w-full text-xs font-medium" 
                  value={novoCenarioData}
                  onChange={e => setNovoCenarioData(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)] mt-6">
                <button
                  type="button"
                  onClick={() => setModalNovoCenario(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-title)] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleAdicionarCenario}
                  className="px-6 py-2.5 rounded-xl text-xs font-extrabold bg-[#EC0000] hover:bg-[#CC0000] text-white transition-all shadow-md"
                >
                  Salvar Simulação
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
