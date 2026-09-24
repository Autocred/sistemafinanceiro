'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import { formatarMoeda, subscribeTransacoes, subscribeTransacoesByMes, subscribeContas, subscribeFaturas, getTenantId } from '@/lib/storage';
import { Transacao, Conta, Fatura } from '@/lib/types';
import { getValorFinal } from '@/lib/financialEngine';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ordenarMovimentacoesDesc } from '@/lib/sorting';
import { 
  PlusCircle, TrendingUp, TrendingDown, DollarSign, Activity, 
  ArrowUpCircle, ArrowDownCircle, RefreshCw, Wallet, AlertTriangle, 
  ChevronLeft, ChevronRight, PieChart as PieIcon, BarChart3, 
  Clock, Zap, Bell, Volume2, VolumeX, AlertCircle, Calendar, ArrowDownRight, ArrowUpRight
} from 'lucide-react';
import { calcularMotorFinanceiro } from '@/lib/financialEngine';
import { playSound } from '@/lib/audio';
import GraficosAutocred from './GraficosAutocred';


interface Props {
  onNovoLancamento: () => void;
  onDuplicarLancamento?: (t: Transacao) => void;
  onNavigateToLancamentos?: (filtro?: string) => void;
  onEditarLancamento?: (t: Transacao) => void;
  onNavigateToCartoes?: (faturaId?: string) => void;
}

const CORES_CATEGORIAS = ['#0284c7', '#16a34a', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#64748b'];

export default function Dashboard({ onNovoLancamento, onNavigateToLancamentos, onEditarLancamento, onNavigateToCartoes }: Props) {
  const [mesSelecionado, setMesSelecionado] = useState<Date>(new Date());
  const [transacoesMes, setTransacoesMes] = useState<Transacao[]>([]);
  const [todasTransacoes, setTodasTransacoes] = useState<Transacao[]>([]);
  const [contas, setContas] = useState<Conta[]>([]);
  const [faturas, setFaturas] = useState<Fatura[]>([]);
  const [loading, setLoading] = useState(true);
  const [somTocado, setSomTocado] = useState(false);
  const [abaIndicadores, setAbaIndicadores] = useState<'todas' | 'pagar' | 'receber'>('todas');
  const [motor, setMotor] = useState({
    saldoAtual: 0, saldoProjetado: 0, receitasRealizadas: 0, despesasRealizadas: 0, despesasAPagarTotal: 0
  });

  const ano = mesSelecionado.getFullYear();
  const mes = mesSelecionado.getMonth() + 1;
  const hojeStr = new Date().toISOString().split('T')[0];
  const hojeDate = new Date(hojeStr + 'T12:00:00');
  // Subscriptions
  useEffect(() => {
    // Alerta de Atualização
    const currentVersion = '1.2.22-LOGIN-VOLATIL';
    const savedVersion = typeof window !== 'undefined' ? localStorage.getItem('app_version') : currentVersion;
    if (savedVersion !== currentVersion) {
      localStorage.setItem('app_version', currentVersion);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    const unsubs: any[] = [];
    
    let loadedMes = false;
    let loadedGlobal = false;
    let loadedContas = false;
    let loadedFaturas = false;

    const checkLoading = () => {
      if (loadedMes && loadedGlobal && loadedContas && loadedFaturas) {
        setLoading(false);
      }
    };
    
    // Transações do mês selecionado para KPIs e Gráficos
    unsubs.push(subscribeTransacoesByMes(ano, mes, (data: Transacao[]) => {
      setTransacoesMes(data);
      loadedMes = true; checkLoading();
    }));

    // Todas as transações para cálculo dos Indicadores Globais de Vencimento
    unsubs.push(subscribeTransacoes((data: Transacao[]) => {
      setTodasTransacoes(data);
      loadedGlobal = true; checkLoading();
    }));

    unsubs.push(subscribeContas((data: Conta[]) => { setContas(data); loadedContas = true; checkLoading(); }));
    unsubs.push(subscribeFaturas((data: Fatura[]) => { setFaturas(data); loadedFaturas = true; checkLoading(); }));

    return () => unsubs.forEach(u => u && typeof u === 'function' && u());
  }, [ano, mes]);


  // Motor Financeiro
  useEffect(() => {
    if (!loading) {
      const res = calcularMotorFinanceiro(todasTransacoes, faturas, contas, mesSelecionado);
      setMotor({
        saldoAtual: res.saldoEmContas || 0,
        saldoProjetado: res.saldoPrevistoFimMes || 0,
        receitasRealizadas: res.receitasPagas || 0,
        despesasRealizadas: res.despesasPagas || 0,
        despesasAPagarTotal: res.despesasAPagarTotal || 0
      });
    }
  }, [transacoesMes, contas, faturas, loading, mesSelecionado]);

  // ================= CÃLCULO DOS INDICADORES CRÃTICOS: A PAGAR E A RECEBER =================
  const hojeDataDashboard = new Date();
    const hojeStrDashboard = format(hojeDataDashboard, 'yyyy-MM-dd');
    
    // Helper: verifica se uma data (que pode conter horário, ex: "2026-09-04T17:00:00") corresponde a hoje
    const isDataHoje = (dt: string | undefined | null): boolean => {
      if (!dt) return false;
      return dt === hojeStrDashboard || dt.startsWith(hojeStrDashboard + 'T');
    };
    
    const recebidosHoje = todasTransacoes
      .filter(t => t.tipo === 'receita' && t.status === 'pago' && (isDataHoje(t.dataPagamento) || (!t.dataPagamento && t.data === hojeStrDashboard)))
      .reduce((acc, t) => acc + getValorFinal(t), 0);
      
    // Transações de despesa pagas hoje
    // Exclui transações originais de cartão de crédito (formaPagamento='cartao_crédito') 
    // pois ao pagar a fatura, o sistema cria débitos bancários separados + marca as originais como pagas,
    // o que causaria duplicidade. Apenas os débitos bancários devem ser contabilizados.
    const pagosHoje = todasTransacoes
      .filter(t => t.tipo === 'despesa' && t.status === 'pago' && t.formaPagamento !== 'cartao_crédito' && (isDataHoje(t.dataPagamento) || (!t.dataPagamento && t.data === hojeStrDashboard)))
      .reduce((acc, t) => acc + getValorFinal(t), 0);

    const inicioSemana = format(startOfWeek(hojeDataDashboard, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const fimSemana = format(endOfWeek(hojeDataDashboard, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const mesAtualStrDashboard = format(hojeDataDashboard, 'yyyy-MM');

    const recebidosSemana = todasTransacoes
      .filter(t => t.tipo === 'receita' && t.status === 'pago')
      .filter(t => {
        const d = (t.dataPagamento || t.data || '').split('T')[0];
        return d >= inicioSemana && d <= fimSemana;
      })
      .reduce((acc, t) => acc + getValorFinal(t), 0);

    const pagosSemana = todasTransacoes
      .filter(t => t.tipo === 'despesa' && t.status === 'pago' && t.formaPagamento !== 'cartao_crédito')
      .filter(t => {
        const d = (t.dataPagamento || t.data || '').split('T')[0];
        return d >= inicioSemana && d <= fimSemana;
      })
      .reduce((acc, t) => acc + getValorFinal(t), 0);

    const recebidosMes = todasTransacoes
      .filter(t => t.tipo === 'receita' && t.status === 'pago')
      .filter(t => {
        const d = (t.dataPagamento || t.data || '').split('T')[0];
        return d.startsWith(mesAtualStrDashboard);
      })
      .reduce((acc, t) => acc + getValorFinal(t), 0);

    const pagosMes = todasTransacoes
      .filter(t => t.tipo === 'despesa' && t.status === 'pago' && t.formaPagamento !== 'cartao_crédito')
      .filter(t => {
        const d = (t.dataPagamento || t.data || '').split('T')[0];
        return d.startsWith(mesAtualStrDashboard);
      })
      .reduce((acc, t) => acc + getValorFinal(t), 0);
      
    const pendentesGlobais = todasTransacoes.filter(t => {
    if (t.status === 'pago') return false;
    // Compras individuais de cartão de crédito são pagas na fatura consolidada
    if (t.formaPagamento === 'cartao_crédito' && !t.descricao.toLowerCase().includes('fatura')) return false;
    return true;
  });

  // 1. EM ATRASO (VENCIDAS)
  const atrasadas = pendentesGlobais.filter(t => {
    const dt = t.dataVencimento || t.data;
    return dt && dt < hojeStr;
  });
  const atrasadasPagarItems = atrasadas.filter(t => t.tipo === 'despesa');
  const atrasadasReceberItems = atrasadas.filter(t => t.tipo === 'receita');
  const atrasadasPagarVal = atrasadasPagarItems.reduce((a, t) => a + getValorFinal(t), 0);
  const atrasadasReceberVal = atrasadasReceberItems.reduce((a, t) => a + getValorFinal(t), 0);

  // 2. VENCE HOJE
  const vencemHoje = pendentesGlobais.filter(t => {
    const dt = t.dataVencimento || t.data;
    return dt && dt === hojeStr;
  });
  const hojePagarItems = vencemHoje.filter(t => t.tipo === 'despesa');
  const hojeReceberItems = vencemHoje.filter(t => t.tipo === 'receita');
  const hojePagarVal = hojePagarItems.reduce((a, t) => a + getValorFinal(t), 0);
  const hojeReceberVal = hojeReceberItems.reduce((a, t) => a + getValorFinal(t), 0);

  // 3. VENCE EM ATÉ 2 DIAS (ANTECIPAÇÃO 48H)
  const vencem2Dias = pendentesGlobais.filter(t => {
    const dt = t.dataVencimento || t.data;
    if (!dt || dt <= hojeStr) return false;
    const diffMs = new Date(dt + 'T12:00:00').getTime() - hojeDate.getTime();
    const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return diffDias > 0 && diffDias <= 2;
  });
  const pagar2DiasItems = vencem2Dias.filter(t => t.tipo === 'despesa');
  const receber2DiasItems = vencem2Dias.filter(t => t.tipo === 'receita');
  const pagar2DiasVal = pagar2DiasItems.reduce((a, t) => a + getValorFinal(t), 0);
  const receber2DiasVal = receber2DiasItems.reduce((a, t) => a + getValorFinal(t), 0);

  // 4. VENCE NA SEMANA (PRÏ¿½ XIMOS 7 DIAS)
  const vencemSemana = pendentesGlobais.filter(t => {
    const dt = t.dataVencimento || t.data;
    if (!dt || dt < hojeStr) return false;
    const diffMs = new Date(dt + 'T12:00:00').getTime() - hojeDate.getTime();
    const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return diffDias > 2 && diffDias <= 7;
  });
  const pagarSemanaItems = vencemSemana.filter(t => t.tipo === 'despesa');
  const receberSemanaItems = vencemSemana.filter(t => t.tipo === 'receita');
  const pagarSemanaVal = pagarSemanaItems.reduce((a, t) => a + getValorFinal(t), 0);
  const receberSemanaVal = receberSemanaItems.reduce((a, t) => a + getValorFinal(t), 0);

  // Acumulados para exibir nos cards da Semana
  const pagarSemanaAcumulado = atrasadasPagarVal + hojePagarVal + pagar2DiasVal + pagarSemanaVal;
  const receberSemanaAcumulado = atrasadasReceberVal + hojeReceberVal + receber2DiasVal + receberSemanaVal;
  const pagarSemanaCountAcumulado = atrasadasPagarItems.length + hojePagarItems.length + pagar2DiasItems.length + pagarSemanaItems.length;
  const receberSemanaCountAcumulado = atrasadasReceberItems.length + hojeReceberItems.length + receber2DiasItems.length + receberSemanaItems.length;

  // Alerta Sonoro Automático ao entrar na tela se houver contas críticas
  useEffect(() => {
    const sessaoChave = `alerta_sonoro_${hojeStr}`;
    const temCriticas = atrasadas.length > 0 || vencemHoje.length > 0 || vencem2Dias.length > 0;
    
    if (temCriticas && !sessionStorage.getItem(sessaoChave) && !somTocado) {
      setTimeout(() => {
        playSound('aviso');
        setSomTocado(true);
        sessionStorage.setItem(sessaoChave, 'tocado');
      }, 800);
    }
  }, [atrasadas.length, vencemHoje.length, vencem2Dias.length, hojeStr, somTocado]);

  const dispararSomManual = () => {
    playSound('notificacao');
  };

  const prevMes = () => {
    const d = new Date(mesSelecionado);
    d.setMonth(d.getMonth() - 1);
    setMesSelecionado(d);
  };

  const nextMes = () => {
    const d = new Date(mesSelecionado);
    d.setMonth(d.getMonth() + 1);
    setMesSelecionado(d);
  };

  const mesesStr = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const atrasadasForaDoMes = atrasadas.filter(a => !transacoesMes.some(t => t.id === a.id));
  const isTargetTenant = (() => {
      const tid = getTenantId();
      return tid === 'master' || tid === '9yxuafoC0AV9BrIKem05ponbmgn2' || tid === 'autocred-promotora-de-credito';
    })();
    const ultimas = isTargetTenant 
      ? ordenarMovimentacoesDesc([...atrasadasForaDoMes, ...transacoesMes]).slice(0, 8)
      : [...ordenarMovimentacoesDesc(atrasadasForaDoMes), ...ordenarMovimentacoesDesc(transacoesMes)].slice(0, 8);
  const fmt = formatarMoeda;

  // 1. Dados para Gráfico de Fluxo Diário
  const chartDataDiário = transacoesMes.reduce((acc: any[], t) => {
    if (t.status !== 'pago') return acc;
    // Usa data de pagamento (real fluxo de caixa), senao vencimento, senao data original
    const dataBase = t.dataPagamento || t.dataVencimento || t.data || '';
    const dia = dataBase ? dataBase.split('-')[2] : '01';
      
      const isMesAtual = mesSelecionado.getMonth() === new Date().getMonth() && mesSelecionado.getFullYear() === new Date().getFullYear();
      if (isMesAtual && dataBase > format(new Date(), 'yyyy-MM-dd')) return acc; // ignora pagamentos futuros no grafico do mes atual

      const existing = acc.find(x => x.name === dia);
    if (existing) {
      if (t.tipo === 'receita') existing.receita += getValorFinal(t);
      else existing.despesa += getValorFinal(t);
    } else {
      acc.push({ name: dia, receita: t.tipo === 'receita' ? getValorFinal(t) : 0, despesa: t.tipo === 'despesa' ? getValorFinal(t) : 0 });
    }
    return acc;
  }, []).sort((a, b) => parseInt(a.name) - parseInt(b.name));

  // 2. Dados para Gráfico de Despesas por Categoria (Donut)
  const chartDataCategorias = Object.entries(
    transacoesMes
      .filter(t => t.tipo === 'despesa')
      .reduce((acc: Record<string, number>, t) => {
        const cat = t.categoriaNome || 'Geral';
        acc[cat] = (acc[cat] || 0) + getValorFinal(t);
        return acc;
      }, {})
  ).map(([name, value]) => ({ name, value }))
   .sort((a, b) => b.value - a.value);

  // 3. Dados para Distribuição por Forma de Pagamento
  const fmtPagto: Record<string, string> = { 
    pix: 'PIX', cartao_crédito: 'Cartão Crédito', cartao_debito: 'Cartão Débito', 
    dinheiro: 'Dinheiro', boleto: 'Boleto', transferencia: 'Transferência', cheque: 'Cheque', outro: 'Outro' 
  };

  const chartDataPagamentos = Object.entries(
    transacoesMes
      .filter(t => t.tipo === 'despesa')
      .reduce((acc: Record<string, number>, t) => {
        const forma = fmtPagto[t.formaPagamento || ''] || t.formaPagamento || 'Outro';
        acc[forma] = (acc[forma] || 0) + getValorFinal(t);
        return acc;
      }, {})
  ).map(([name, value]) => ({ name, value }))
   .sort((a, b) => b.value - a.value);

  // ================= CÃLCULO PROJEï¿½!ÃO DE FLUXO DE CAIXA (30 DIAS) =================
  const projecaoData = useMemo(() => {
    if (!todasTransacoes || !todasTransacoes.length) return [];
    let saldoTemp = motor.saldoAtual || 0;
    const dados = [];
    const hojeD = new Date();
    
    for (let i = 0; i < 30; i++) {
      const d = new Date(hojeD.getTime() + i * 24 * 60 * 60 * 1000);
      const dataStr = format(d, 'yyyy-MM-dd');
      
      const txsDia = todasTransacoes.filter(t => t.data === dataStr && t.status !== 'pago');
      
      let entrada = 0;
      let saida = 0;
      
      txsDia.forEach(t => {
        if (t.tipo === 'receita') entrada += Number(t.valor) || 0;
        else saida += Math.abs(Number(t.valor) || 0);
      });
      
      // Considera Faturas
      faturas.filter(f => f.status !== 'paga' && f.dataVencimento === dataStr).forEach(f => {
        saida += Math.abs(Number(f.valorTotal || 0));
      });

      saldoTemp += entrada - saida;
      
      dados.push({
        data: format(d, 'dd/MM', { locale: ptBR }),
        saldo: saldoTemp,
        entrada,
        saida
      });
    }
    return dados;
  }, [todasTransacoes, faturas, motor.saldoAtual]);
  // =================================================================================

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600 }}>Carregando dados de {mesesStr[mesSelecionado.getMonth()]}...</div>;

  const totalCriticasPagar = atrasadasPagarItems.length + hojePagarItems.length + pagar2DiasItems.length;
  const totalCriticasReceber = atrasadasReceberItems.length + hojeReceberItems.length + receber2DiasItems.length;
  const totalCriticas = totalCriticasPagar + totalCriticasReceber;

  
  

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1400, margin: '0 auto', fontFamily: 'Ubuntu, system-ui, sans-serif' }}>

      {/* BREADCRUMB */}
      <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Início &gt; Dashboard</div>

      {/* HEADER & SELETOR DE MÊS */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-title)', margin: 0 }}>Meu Painel</h1>
          <p style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600, margin: '4px 0 0 0' }}>Visão financeira analítica e consolidada</p>
        </div>

        {/* SELETOR DE MÊS DO DASHBOARD */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 8px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <button 
            onClick={prevMes} 
            title="Mês Anterior"
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 6, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#475569' }}
          >
            <ChevronLeft size={16} />
          </button>
          
          <div style={{ padding: '0 12px', textAlign: 'center', minWidth: 160 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-title)', textTransform: 'capitalize' }}>
              {mesesStr[mesSelecionado.getMonth()]} {mesSelecionado.getFullYear()}
            </span>
          </div>

          <button 
            onClick={nextMes} 
            title="Próximo Mês"
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 6, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#475569' }}
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* BOTÃO NOVO LANÇAMENTO */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="hover-lift active-press" onClick={onNovoLancamento} style={{ display: 'flex', alignItems: 'center', gap: 6, background: (getTenantId() === 'master' || getTenantId() === '9yxuafoC0AV9BrIKem05ponbmgn2' || !getTenantId()) ? 'linear-gradient(180deg, #10b981 0%, #059669 100%)' : 'linear-gradient(180deg, var(--primary) 0%, var(--primary-dark) 100%)', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 24px', fontSize: 14, fontWeight: 900, cursor: 'pointer', transition: 'all 0.15s ease', borderBottom: (getTenantId() === 'master' || getTenantId() === '9yxuafoC0AV9BrIKem05ponbmgn2' || !getTenantId()) ? '5px solid #047857' : '5px solid color-mix(in srgb, var(--primary-dark) 80%, black)', boxShadow: (getTenantId() === 'master' || getTenantId() === '9yxuafoC0AV9BrIKem05ponbmgn2' || !getTenantId()) ? '0 4px 15px rgba(16,185,129,0.4)' : '0 4px 15px var(--primary-light)', textShadow: '0 1px 2px rgba(0,0,0,0.2)', letterSpacing: '0.5px' }}
            onMouseDown={e => { e.currentTarget.style.borderBottomWidth = '0px'; e.currentTarget.style.transform = 'translateY(5px)'; e.currentTarget.style.boxShadow = 'none'; }}
            onMouseUp={e => { e.currentTarget.style.borderBottomWidth = '5px'; e.currentTarget.style.transform = 'translateY(0px)'; e.currentTarget.style.boxShadow = (getTenantId() === 'master' || getTenantId() === '9yxuafoC0AV9BrIKem05ponbmgn2' || !getTenantId()) ? '0 4px 15px rgba(16,185,129,0.4)' : '0 4px 15px var(--primary-light)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderBottomWidth = '5px'; e.currentTarget.style.transform = 'translateY(0px)'; e.currentTarget.style.boxShadow = (getTenantId() === 'master' || getTenantId() === '9yxuafoC0AV9BrIKem05ponbmgn2' || !getTenantId()) ? '0 4px 15px rgba(16,185,129,0.4)' : '0 4px 15px var(--primary-light)'; e.currentTarget.style.filter = 'brightness(1)'; }}
            onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.1)'; }}>
            <PlusCircle size={16} /> Novo Lançamento
          </button>
        </div>
      </div>

      {/* ================= GRÃFICOS AUTOCRED (apenas tenant autocrédito) ================= */}
      <GraficosAutocred transacoes={todasTransacoes} faturas={faturas} contas={contas} />

      {/* ================= ALERTA DE FATURAS DE CARTÃO FECHADAS (PISCANDO) ================= */}
      {faturas.filter(f => f.status !== 'paga' && ((f.dataFechamento && f.dataFechamento <= hojeStr) || (f.dataVencimento && f.dataVencimento <= hojeStr) || (f.dataVencimento && (new Date(f.dataVencimento + 'T12:00:00').getTime() - hojeDate.getTime()) / (1000 * 3600 * 24) <= 7))).map(f => {
        let diasRestantesStr = '';
        if (f.dataVencimento) {
          const dtVenc = new Date(f.dataVencimento + 'T12:00:00');
          const dtHoje = new Date(hojeStr + 'T12:00:00');
          const diffMs = dtVenc.getTime() - dtHoje.getTime();
          const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          if (diffDias < 0) {
            diasRestantesStr = `(Atrasada há ${Math.abs(diffDias)} dia${Math.abs(diffDias) > 1 ? 's' : ''})`;
          } else if (diffDias === 0) {
            diasRestantesStr = `(Vence HOJE)`;
          } else {
            diasRestantesStr = `(Faltam ${diffDias} dia${diffDias > 1 ? 's' : ''})`;
          }
        }

        return (
        <div key={f.id} style={{
          background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.1) 0%, rgba(225, 29, 72, 0.15) 100%)',
          border: '3px solid rgba(225, 29, 72, 0.6)',
          boxShadow: '0 8px 24px rgba(225, 29, 72, 0.25)',
          borderRadius: 14,
          padding: '24px 24px',
          marginBottom: 24,
          display: 'flex',
          flexWrap: 'wrap' as const,
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 46,
              height: 46,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #ec4899, #e11d48)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 4px 12px rgba(225, 29, 72, 0.5)'
            }}>
              <AlertCircle size={26} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#9f1239', display: 'flex', alignItems: 'center', gap: 8 }}>
                ï¿½xï¿½ Fatura Fechada ï¿½ {f.cartaoNome || 'Cartão'}
              </div>
              <p style={{ fontSize: 15, color: '#be123c', margin: '6px 0 0 0', fontWeight: 700 }}>
                Valor: <span className="valor-sensivel">{formatarMoeda(f.valorTotal)}</span> • Vencimento: {f.dataVencimento ? format(new Date(f.dataVencimento + 'T12:00:00'), 'dd/MM/yyyy') : 'ï¿½'}
                <span style={{ marginLeft: 6, fontWeight: 900, color: '#7f1d1d', background: 'rgba(255,255,255,0.6)', padding: '2px 8px', borderRadius: 12 }}>{diasRestantesStr}</span>
              </p>
            </div>
          </div>
          {onNavigateToCartoes && (
            <button
              onClick={() => onNavigateToCartoes(f.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: '#be123c',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '12px 20px',
                fontSize: 14,
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(190, 18, 60, 0.4)'
              }}
            >
              <Wallet size={18} /> Ver Fatura
            </button>
          )}
        </div>
      )})}

      {/* ================= BANNER DE ALERTA SONORO & ANTECIPAï¿½!ÃO (2 DIAS) ================= */}
      {(atrasadas.length + vencemHoje.length + vencem2Dias.length) > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(245, 158, 11, 0.08) 100%)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: 12,
          padding: '14px 20px',
          marginBottom: 24,
          display: 'flex',
          flexWrap: 'wrap' as const,
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #ef4444, #f59e0b)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
            }}>
              <Bell size={20} className="animate-pulse" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-title)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>Alerta Financeiro Antecipado (48h)</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0 0', fontWeight: 500 }}>
                {atrasadas.length > 0 ? `${atrasadas.length} em atraso. ` : ''}
                {vencemHoje.length > 0 ? `${vencemHoje.length} vencem hoje. ` : ''}
                {vencem2Dias.length > 0 ? `${vencem2Dias.length} vencem em até 2 dias.` : ''}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* ================= SELETOR DE ABA DOS INDICADORES: TODAS | A PAGAR | A RECEBER ================= */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-title)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={18} color="#0284c7" />
          Monitoramento de Vencimentos & Prazos
        </h2>
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: 3 }}>
          <button 
            onClick={() => setAbaIndicadores('todas')}
            style={{ padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none', background: abaIndicadores === 'todas' ? '#1e293b' : 'transparent', color: abaIndicadores === 'todas' ? '#fff' : '#64748b' }}
          >
            Todos
          </button>
          <button 
            onClick={() => setAbaIndicadores('pagar')}
            style={{ padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none', background: abaIndicadores === 'pagar' ? '#dc2626' : 'transparent', color: abaIndicadores === 'pagar' ? '#fff' : '#64748b' }}
          >
            🔴 A Pagar ({atrasadasPagarItems.length + hojePagarItems.length + pagar2DiasItems.length})
          </button>
          <button 
            onClick={() => setAbaIndicadores('receber')}
            style={{ padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none', background: abaIndicadores === 'receber' ? '#16a34a' : 'transparent', color: abaIndicadores === 'receber' ? '#fff' : '#64748b' }}
          >
            🟢 A Receber ({atrasadasReceberItems.length + hojeReceberItems.length + receber2DiasItems.length})
          </button>
        </div>
      </div>

      {/* ================= BLOCO 1: CONTAS A PAGAR ================= */}
      {(abaIndicadores === 'todas' || abaIndicadores === 'pagar') && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <ArrowDownRight size={15} /> Contas a Pagar (Despesas & Compromissos)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 14 }}>
            
            {/* 1.1 ATRASADAS A PAGAR */}
            <div 
              onClick={() => onNavigateToLancamentos && onNavigateToLancamentos('atrasado_pagar')}
              className={atrasadasPagarItems.length > 0 ? 'glow-pulse-red' : ''}
              style={{
                background: atrasadasPagarItems.length > 0 ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' : '#fff',
                borderRadius: 12,
                padding: '16px 18px',
                border: atrasadasPagarItems.length > 0 ? 'none' : '1px solid #e2e8f0',
                cursor: 'pointer',
                color: atrasadasPagarItems.length > 0 ? '#fff' : '#1e293b',
                transition: 'all 0.2s ease',
                minHeight: 110,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: atrasadasPagarItems.length > 0 ? 'rgba(255,255,255,0.9)' : '#ef4444' }}>
                  🚨 Vencidas a Pagar
                </span>
                <span style={{ fontSize: 11, fontWeight: 900, background: atrasadasPagarItems.length > 0 ? 'rgba(0,0,0,0.25)' : '#fee2e2', color: atrasadasPagarItems.length > 0 ? '#fff' : '#dc2626', padding: '2px 8px', borderRadius: 20 }}>
                  {atrasadasPagarItems.length}
                </span>
              </div>
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: atrasadasPagarItems.length > 0 ? '#fff' : '#ef4444' }}>
                  <span className="valor-sensivel">{fmt(atrasadasPagarVal)}</span>
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: atrasadasPagarItems.length > 0 ? 'rgba(255,255,255,0.8)' : '#94a3b8', marginTop: 2 }}>
                  {atrasadasPagarItems.length > 0 ? 'Exige liquidação urgente' : 'Nenhuma conta atrasada'}
                </div>
              </div>
            </div>

            {/* 1.2 VENCE HOJE A PAGAR */}
            <div 
              onClick={() => onNavigateToLancamentos && onNavigateToLancamentos('hoje_pagar')}
              className={hojePagarItems.length > 0 ? 'glow-pulse-amber indicator-blinking' : ''}
              style={{
                background: hojePagarItems.length > 0 ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : '#fff',
                borderRadius: 12,
                padding: '16px 18px',
                border: hojePagarItems.length > 0 ? 'none' : '1px solid #e2e8f0',
                cursor: 'pointer',
                color: hojePagarItems.length > 0 ? '#fff' : '#1e293b',
                transition: 'all 0.2s ease',
                minHeight: 110,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: hojePagarItems.length > 0 ? '#fff' : '#f59e0b' }}>
                  ⚠️ Vence Hoje a Pagar
                </span>
                <span style={{ fontSize: 11, fontWeight: 900, background: hojePagarItems.length > 0 ? 'rgba(0,0,0,0.25)' : '#fef3c7', color: hojePagarItems.length > 0 ? '#fff' : '#d97706', padding: '2px 8px', borderRadius: 20 }}>
                  {hojePagarItems.length}
                </span>
              </div>
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: hojePagarItems.length > 0 ? '#fff' : '#f59e0b' }}>
                  <span className="valor-sensivel">{fmt(hojePagarVal)}</span>
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: hojePagarItems.length > 0 ? 'rgba(255,255,255,0.8)' : '#94a3b8', marginTop: 2 }}>
                  {hojePagarItems.length > 0 ? 'Vencimento nesta data' : 'Nenhuma conta para hoje'}
                </div>
              </div>
            </div>

            {/* 1.3 VENCE EM ATï¿½0 2 DIAS A PAGAR */}
            <div 
              onClick={() => onNavigateToLancamentos && onNavigateToLancamentos('2dias_pagar')}
              className={pagar2DiasItems.length > 0 ? 'glow-pulse-yellow' : ''}
              style={{
                background: pagar2DiasItems.length > 0 ? 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)' : '#fff',
                borderRadius: 12,
                padding: '16px 18px',
                border: pagar2DiasItems.length > 0 ? 'none' : '1px solid #e2e8f0',
                cursor: 'pointer',
                color: pagar2DiasItems.length > 0 ? '#fff' : '#1e293b',
                transition: 'all 0.2s ease',
                minHeight: 110,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: pagar2DiasItems.length > 0 ? '#fff' : '#ca8a04' }}>
                  ⏳ VENCE EM ATÉ 2 DIAS (PAGAR)
                </span>
                <span style={{ fontSize: 11, fontWeight: 900, background: pagar2DiasItems.length > 0 ? 'rgba(0,0,0,0.25)' : '#fef9c3', color: pagar2DiasItems.length > 0 ? '#fff' : '#a16207', padding: '2px 8px', borderRadius: 20 }}>
                  {pagar2DiasItems.length}
                </span>
              </div>
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: pagar2DiasItems.length > 0 ? '#fff' : '#ca8a04' }}>
                  <span className="valor-sensivel">{fmt(pagar2DiasVal)}</span>
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: pagar2DiasItems.length > 0 ? 'rgba(255,255,255,0.8)' : '#94a3b8', marginTop: 2 }}>
                  {pagar2DiasItems.length > 0 ? 'Alerta antecipado 48h' : 'Nenhuma conta em 2 dias'}
                </div>
              </div>
            </div>

            {/* 1.4 VENCE NA SEMANA A PAGAR */}
            <div 
              onClick={() => onNavigateToLancamentos && onNavigateToLancamentos('semana_pagar')}
              style={{
                background: pagarSemanaCountAcumulado > 0 ? 'linear-gradient(135deg, #475569 0%, #334155 100%)' : '#fff',
                borderRadius: 12,
                padding: '16px 18px',
                border: pagarSemanaCountAcumulado > 0 ? 'none' : '1px solid #e2e8f0',
                cursor: 'pointer',
                color: pagarSemanaCountAcumulado > 0 ? '#fff' : '#1e293b',
                transition: 'all 0.2s ease',
                minHeight: 110,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: pagarSemanaCountAcumulado > 0 ? '#fff' : '#64748b' }}>
                  📅 VENCE NA SEMANA (7D)
                </span>
                <span style={{ fontSize: 11, fontWeight: 900, background: pagarSemanaCountAcumulado > 0 ? 'rgba(0,0,0,0.25)' : '#f1f5f9', color: pagarSemanaCountAcumulado > 0 ? '#fff' : '#475569', padding: '2px 8px', borderRadius: 20 }}>
                  {pagarSemanaCountAcumulado}
                </span>
              </div>
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: pagarSemanaCountAcumulado > 0 ? '#fff' : '#475569' }}>
                  <span className="valor-sensivel">{fmt(pagarSemanaAcumulado)}</span>
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: pagarSemanaCountAcumulado > 0 ? 'rgba(255,255,255,0.8)' : '#94a3b8', marginTop: 2 }}>
                  Previsão próximos 7 dias
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ================= BLOCO 2: CONTAS A RECEBER ================= */}
      {(abaIndicadores === 'todas' || abaIndicadores === 'receber') && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <ArrowUpRight size={15} /> Contas a Receber (Receitas & Entradas Previstas)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 14 }}>
            
            {/* 2.1 ATRASADAS A RECEBER */}
            <div 
              onClick={() => onNavigateToLancamentos && onNavigateToLancamentos('atrasado_receber')}
              className={atrasadasReceberItems.length > 0 ? 'glow-pulse-red' : ''}
              style={{
                background: atrasadasReceberItems.length > 0 ? 'linear-gradient(135deg, #059669 0%, #047857 100%)' : '#fff',
                borderRadius: 12,
                padding: '16px 18px',
                border: atrasadasReceberItems.length > 0 ? 'none' : '1px solid #e2e8f0',
                cursor: 'pointer',
                color: atrasadasReceberItems.length > 0 ? '#fff' : '#1e293b',
                transition: 'all 0.2s ease',
                minHeight: 110,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: atrasadasReceberItems.length > 0 ? 'rgba(255,255,255,0.9)' : '#059669' }}>
                  🚨 Atrasadas a Receber
                </span>
                <span style={{ fontSize: 11, fontWeight: 900, background: atrasadasReceberItems.length > 0 ? 'rgba(0,0,0,0.25)' : '#dcfce7', color: atrasadasReceberItems.length > 0 ? '#fff' : '#15803d', padding: '2px 8px', borderRadius: 20 }}>
                  {atrasadasReceberItems.length}
                </span>
              </div>
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: atrasadasReceberItems.length > 0 ? '#fff' : '#059669' }}>
                  <span className="valor-sensivel">{fmt(atrasadasReceberVal)}</span>
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: atrasadasReceberItems.length > 0 ? 'rgba(255,255,255,0.8)' : '#94a3b8', marginTop: 2 }}>
                  {atrasadasReceberItems.length > 0 ? 'Cobrança pendente' : 'Nenhuma receita atrasada'}
                </div>
              </div>
            </div>

            {/* 2.2 VENCE HOJE A RECEBER */}
            <div 
              onClick={() => onNavigateToLancamentos && onNavigateToLancamentos('hoje_receber')}
              className={hojeReceberItems.length > 0 ? 'glow-pulse-green indicator-blinking' : ''}
              style={{
                background: hojeReceberItems.length > 0 ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#fff',
                borderRadius: 12,
                padding: '16px 18px',
                border: hojeReceberItems.length > 0 ? 'none' : '1px solid #e2e8f0',
                cursor: 'pointer',
                color: hojeReceberItems.length > 0 ? '#fff' : '#1e293b',
                transition: 'all 0.2s ease',
                minHeight: 110,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: hojeReceberItems.length > 0 ? '#fff' : '#10b981' }}>
                  ⚠️ Vence Hoje a Receber
                </span>
                <span style={{ fontSize: 11, fontWeight: 900, background: hojeReceberItems.length > 0 ? 'rgba(0,0,0,0.25)' : '#dcfce7', color: hojeReceberItems.length > 0 ? '#fff' : '#059669', padding: '2px 8px', borderRadius: 20 }}>
                  {hojeReceberItems.length}
                </span>
              </div>
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: hojeReceberItems.length > 0 ? '#fff' : '#10b981' }}>
                  <span className="valor-sensivel">{fmt(hojeReceberVal)}</span>
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: hojeReceberItems.length > 0 ? 'rgba(255,255,255,0.8)' : '#94a3b8', marginTop: 2 }}>
                  {hojeReceberItems.length > 0 ? 'Entrada prevista para hoje' : 'Nenhum recebimento hoje'}
                </div>
              </div>
            </div>

            {/* 2.3 VENCE EM ATï¿½0 2 DIAS A RECEBER */}
            <div 
              onClick={() => onNavigateToLancamentos && onNavigateToLancamentos('2dias_receber')}
              className={receber2DiasItems.length > 0 ? 'glow-pulse-green' : ''}
              style={{
                background: receber2DiasItems.length > 0 ? 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)' : '#fff',
                borderRadius: 12,
                padding: '16px 18px',
                border: receber2DiasItems.length > 0 ? 'none' : '1px solid #e2e8f0',
                cursor: 'pointer',
                color: receber2DiasItems.length > 0 ? '#fff' : '#1e293b',
                transition: 'all 0.2s ease',
                minHeight: 110,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: receber2DiasItems.length > 0 ? '#fff' : '#0d9488' }}>
                  ⏳ VENCE EM ATÉ 2 DIAS (RECEBER)
                </span>
                <span style={{ fontSize: 11, fontWeight: 900, background: receber2DiasItems.length > 0 ? 'rgba(0,0,0,0.25)' : '#ccfbf1', color: receber2DiasItems.length > 0 ? '#fff' : '#0f766e', padding: '2px 8px', borderRadius: 20 }}>
                  {receber2DiasItems.length}
                </span>
              </div>
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: receber2DiasItems.length > 0 ? '#fff' : '#0d9488' }}>
                  <span className="valor-sensivel">{fmt(receber2DiasVal)}</span>
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: receber2DiasItems.length > 0 ? 'rgba(255,255,255,0.8)' : '#94a3b8', marginTop: 2 }}>
                  {receber2DiasItems.length > 0 ? 'Previsão de crédito em 48h' : 'Sem recebimentos em 2 dias'}
                </div>
              </div>
            </div>

            {/* 2.4 VENCE NA SEMANA A RECEBER */}
            <div 
              onClick={() => onNavigateToLancamentos && onNavigateToLancamentos('semana_receber')}
              className={receberSemanaCountAcumulado > 0 ? 'glow-pulse-blue' : ''}
              style={{
                background: receberSemanaCountAcumulado > 0 ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : '#fff',
                borderRadius: 12,
                padding: '16px 18px',
                border: receberSemanaCountAcumulado > 0 ? 'none' : '1px solid #e2e8f0',
                cursor: 'pointer',
                color: receberSemanaCountAcumulado > 0 ? '#fff' : '#1e293b',
                transition: 'all 0.2s ease',
                minHeight: 110,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: receberSemanaCountAcumulado > 0 ? '#fff' : '#0284c7' }}>
                  📅 VENCE NA SEMANA (7D)
                </span>
                <span style={{ fontSize: 11, fontWeight: 900, background: receberSemanaCountAcumulado > 0 ? 'rgba(0,0,0,0.25)' : '#e0f2fe', color: receberSemanaCountAcumulado > 0 ? '#fff' : '#0369a1', padding: '2px 8px', borderRadius: 20 }}>
                  {receberSemanaCountAcumulado}
                </span>
              </div>
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: receberSemanaCountAcumulado > 0 ? '#fff' : '#0284c7' }}>
                  <span className="valor-sensivel">{fmt(receberSemanaAcumulado)}</span>
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: receberSemanaCountAcumulado > 0 ? 'rgba(255,255,255,0.8)' : '#94a3b8', marginTop: 2 }}>
                  Previsão entradas próximos 7 dias
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ALERTAS DE VENCIMENTO (LISTA) */}
      {(() => {
        const getBadgeStyle = (status: string) => {
          switch(status) {
            case 'VENCIDO': return { bg: '#ef4444', text: '#fff' };
            case 'HOJE': return { bg: '#f59e0b', text: '#fff' };
            case 'AMANHÃ': return { bg: '#3b82f6', text: '#fff' };
            default: return { bg: '#3b82f6', text: '#fff' };
          }
        };

        const alertOrder: Record<string, number> = { 'VENCIDO': 1, 'HOJE': 2, 'AMANHÃ': 3, 'PRÓXIMOS': 4 };
        const alertasMap = new Map<string, any>();

        const rawAlerts = [
          ...atrasadasPagarItems.map((t: any) => ({ ...t, _alertStatus: 'VENCIDO' })),
          ...atrasadasReceberItems.map((t: any) => ({ ...t, _alertStatus: 'VENCIDO' })),
          ...hojePagarItems.map((t: any) => ({ ...t, _alertStatus: 'HOJE' })),
          ...hojeReceberItems.map((t: any) => ({ ...t, _alertStatus: 'HOJE' })),
          ...pagar2DiasItems.map((t: any) => ({ ...t, _alertStatus: 'AMANHÃ' })),
          ...receber2DiasItems.map((t: any) => ({ ...t, _alertStatus: 'AMANHÃ' })),
          ...pagarSemanaItems.map((t: any) => ({ ...t, _alertStatus: 'PRÓXIMOS' })),
          ...receberSemanaItems.map((t: any) => ({ ...t, _alertStatus: 'PRÓXIMOS' }))
        ];

        rawAlerts.forEach((t: any) => {
          const key = t.id || `${t.descricao}_${t.valor}_${t.dataVencimento || t.data}`;
          const existing = alertasMap.get(key);
          if (!existing || alertOrder[t._alertStatus] < alertOrder[existing._alertStatus]) {
            alertasMap.set(key, t);
          }
        });

        const todosAlertas = Array.from(alertasMap.values()).sort((a: any, b: any) => {
          const dA = (a.dataVencimento || a.data || '').toString();
          const dB = (b.dataVencimento || b.data || '').toString();
          return dA.localeCompare(dB);
        });

        if(todosAlertas.length === 0) return null;

        return (
          <div style={{ background: '#1e293b', borderRadius: 12, padding: 20, marginBottom: 24, boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Bell size={20} color="#f87171" />
                <h3 style={{ margin: 0, color: 'white', fontSize: 16 }}>Alertas de Vencimento ({todosAlertas.length})</h3>
              </div>
              <div style={{ display: 'flex', gap: 12, fontSize: 11, fontWeight: 700 }}>
                <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: 4 }}><span style={{width: 8, height: 8, borderRadius: '50%', background: '#ef4444'}}></span> VENCIDO</span>
                <span style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 4 }}><span style={{width: 8, height: 8, borderRadius: '50%', background: '#f59e0b'}}></span> HOJE</span>
                <span style={{ color: '#3b82f6', display: 'flex', alignItems: 'center', gap: 4 }}><span style={{width: 8, height: 8, borderRadius: '50%', background: '#3b82f6'}}></span> AMANHÃ</span>
                <span style={{ color: '#3b82f6', display: 'flex', alignItems: 'center', gap: 4 }}><span style={{width: 8, height: 8, borderRadius: '50%', background: '#3b82f6'}}></span> PRÓXIMOS</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {todosAlertas.slice(0, 15).map((t, idx) => {
                const badge = getBadgeStyle(t._alertStatus);
                const isPagar = t.tipo === 'despesa' || (t.tipo === 'transferencia' && t.valor < 0);
                return (
                  <div 
                    key={t.id || idx}
                    onClick={() => onEditarLancamento && onEditarLancamento(t)}
                    style={{ 
                      display: 'grid', gridTemplateColumns: '80px 100px 1fr 140px 120px', alignItems: 'center', gap: 16,
                      background: 'rgba(255,255,255,0.05)', padding: '12px 16px', borderRadius: 8, cursor: 'pointer',
                      border: '1px solid rgba(255,255,255,0.1)', transition: 'background 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  >
                    <span style={{ background: badge.bg, color: badge.text, padding: '4px 8px', borderRadius: 12, fontSize: 10, fontWeight: 800, textAlign: 'center' }}>
                      {t._alertStatus}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: isPagar ? '#ef4444' : '#10b981', fontSize: 12, fontWeight: 600 }}>
                      {isPagar ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                      {isPagar ? 'Pagar' : 'Receber'}
                    </span>
                    <div style={{ color: 'white', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {t.descricao} <span style={{ color: '#94a3b8', fontSize: 12, fontWeight: 400 }}>• {t.clienteNome || t.fornecedorNome || t.categoriaNome || ''}</span>
                    </div>
                    <span style={{ color: '#94a3b8', fontSize: 12 }}>
                      Vence: {format(new Date((t.dataVencimento || t.data) + 'T12:00:00'), 'dd/MM/yyyy')}
                    </span>
                    <span style={{ background: isPagar ? '#ef4444' : '#10b981', color: 'white', padding: '6px 12px', borderRadius: 20, fontSize: 13, fontWeight: 800, textAlign: 'right', display: 'flex', justifyContent: 'center' }}>
                      <span className="valor-sensivel">{formatarMoeda(Math.abs(t.valor))}</span>
                    </span>
                  </div>
                );
              })}
            </div>
            {todosAlertas.length > 15 && (
              <div 
                onClick={() => onNavigateToLancamentos && onNavigateToLancamentos()}
                style={{ textAlign: 'center', marginTop: 16, color: '#f87171', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Ver todos os {todosAlertas.length} lançamentos pendentes →
              </div>
            )}
          </div>
        );
      })()}

        {/* KPI CARDS RESUMO DE EFETIVADOS (HOJE, SEMANA, MÊS) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 20 }}>
          {/* Recebidos Hoje */}
          <div 
            onClick={() => onNavigateToLancamentos && onNavigateToLancamentos('recebidos_hoje')}
            style={{ background: '#ecfdf5', borderRadius: 10, padding: '14px 18px', border: '1px solid #a7f3d0', cursor: 'pointer', transition: 'transform 0.15s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <TrendingUp size={15} color="#059669" />
              <span style={{ fontSize: 10, fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recebidos Hoje</span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#047857' }}><span className="valor-sensivel">{fmt(recebidosHoje)}</span></div>
          </div>
          
          {/* Pagos Hoje */}
          <div 
            onClick={() => onNavigateToLancamentos && onNavigateToLancamentos('pagos_hoje')}
            style={{ background: '#fef2f2', borderRadius: 10, padding: '14px 18px', border: '1px solid #fecaca', cursor: 'pointer', transition: 'transform 0.15s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <TrendingDown size={15} color="#dc2626" />
              <span style={{ fontSize: 10, fontWeight: 800, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pagos Hoje</span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#b91c1c' }}><span className="valor-sensivel">{fmt(pagosHoje)}</span></div>
          </div>

          {/* Recebidos Esta Semana */}
          <div 
            onClick={() => onNavigateToLancamentos && onNavigateToLancamentos('recebidos_semana')}
            style={{ background: '#f0fdf4', borderRadius: 10, padding: '14px 18px', border: '1px solid #bbf7d0', cursor: 'pointer', transition: 'transform 0.15s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <TrendingUp size={15} color="#16a34a" />
              <span style={{ fontSize: 10, fontWeight: 800, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recebidos Esta Semana</span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#15803d' }}><span className="valor-sensivel">{fmt(recebidosSemana)}</span></div>
          </div>

          {/* Pagos Esta Semana */}
          <div 
            onClick={() => onNavigateToLancamentos && onNavigateToLancamentos('pagos_semana')}
            style={{ background: '#fff1f2', borderRadius: 10, padding: '14px 18px', border: '1px solid #fecdd3', cursor: 'pointer', transition: 'transform 0.15s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <TrendingDown size={15} color="#e11d48" />
              <span style={{ fontSize: 10, fontWeight: 800, color: '#e11d48', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pagos Esta Semana</span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#be123c' }}><span className="valor-sensivel">{fmt(pagosSemana)}</span></div>
          </div>

          {/* Recebidos Este Mês */}
          <div 
            onClick={() => onNavigateToLancamentos && onNavigateToLancamentos('recebidos_mes')}
            style={{ background: '#eff6ff', borderRadius: 10, padding: '14px 18px', border: '1px solid #bfdbfe', cursor: 'pointer', transition: 'transform 0.15s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <TrendingUp size={15} color="#2563eb" />
              <span style={{ fontSize: 10, fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recebidos Este Mês</span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#1d4ed8' }}><span className="valor-sensivel">{fmt(recebidosMes)}</span></div>
          </div>

          {/* Pagos Este Mês */}
          <div 
            onClick={() => onNavigateToLancamentos && onNavigateToLancamentos('pagos_mes')}
            style={{ background: '#faf5ff', borderRadius: 10, padding: '14px 18px', border: '1px solid #e9d5ff', cursor: 'pointer', transition: 'transform 0.15s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <TrendingDown size={15} color="#9333ea" />
              <span style={{ fontSize: 10, fontWeight: 800, color: '#9333ea', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pagos Este Mês</span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#7e22ce' }}><span className="valor-sensivel">{fmt(pagosMes)}</span></div>
          </div>
        </div>

        {/* ================= KPI CARDS (RESUMO DO MÊS SELECIONADO) ================= */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        {/* Saldo */}
        <div 
          onClick={() => onNavigateToCartoes && onNavigateToCartoes()}
          style={{ background: '#1e293b', borderRadius: 8, padding: '20px 24px', color: '#fff', cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Wallet size={18} color="#94a3b8" />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Saldo em Caixa</span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 900 }}><span className="valor-sensivel">{fmt(motor.saldoAtual)}</span></div>
          <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, marginTop: 8 }}>Projetado: <span className="valor-sensivel">{fmt(motor.saldoProjetado)}</span></div>
        </div>

        {/* Receitas */}
        <div 
          onClick={() => onNavigateToLancamentos && onNavigateToLancamentos('receitas_mes')}
          style={{ background: 'var(--bg-card)', borderRadius: 8, padding: '20px 24px', border: '1px solid var(--border)', cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <TrendingUp size={18} color="#16a34a" />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Receitas ({mesesStr[mesSelecionado.getMonth()]})</span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#16a34a' }}><span className="valor-sensivel">{fmt(motor.receitasRealizadas)}</span></div>
        </div>

        {/* Despesas Pagas */}
        <div 
          onClick={() => onNavigateToLancamentos && onNavigateToLancamentos('despesas_pagas')}
          style={{ background: 'var(--bg-card)', borderRadius: 8, padding: '20px 24px', border: '1px solid var(--border)', cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <TrendingDown size={18} color="#ef4444" />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Despesas Pagas</span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--text-title)' }}><span className="valor-sensivel">{fmt(motor.despesasRealizadas)}</span></div>
        </div>

        {/* A Pagar */}
        <div 
          onClick={() => onNavigateToLancamentos && onNavigateToLancamentos('despesas_a_pagar')}
          style={{ background: 'var(--bg-card)', borderRadius: 8, padding: '20px 24px', border: '1px solid var(--border)', cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <AlertTriangle size={18} color="#f59e0b" />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Despesas a Pagar</span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#f59e0b' }}><span className="valor-sensivel">{fmt(motor.despesasAPagarTotal)}</span></div>
        </div>
      </div>

      
      {/* GRÃFICO PREMIUM: PROJEï¿½!ÃO FUTURA (CASHFLOW) */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 16, padding: 24, boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: '1px solid var(--border)', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={20} color="#3b82f6" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-title)' }}>Projeção de Fluxo de Caixa (Evolução de Saldo)</h3>
              <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>Evolução do Saldo projetada com base nos compromissos pendentes dos próximos 30 dias</p>
            </div>
          </div>
          <div style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', padding: '6px 14px', borderRadius: 20, color: '#fff', fontSize: 12, fontWeight: 800, boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)' }}>
            Módulo Premium
          </div>
        </div>

        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={projecaoData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="data" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} tickFormatter={(val) => 'R$ ' + (val/1000).toFixed(0) + 'k'} />
              <Tooltip 
                formatter={(value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0)}
                contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                labelStyle={{ color: '#64748b', marginBottom: 5 }}
              />
              <Area type="monotone" dataKey="saldo" name="Saldo Projetado" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorSaldo)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* SEï¿½!ÃO 1 DE GRÃFICOS: FLUXO DE CAIXA + DESPESAS POR CATEGORIA */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16, marginBottom: 24 }}>

        {/* GRÃFICO 1: FLUXO DE CAIXA DIÃRIO */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 8, padding: '24px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-title)', margin: 0 }}>Fluxo de Caixa Diário</h2>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0 0 0', fontWeight: 500 }}>Entradas vs Saídas do mês selecionado</p>
            </div>
            <Activity size={18} color="#0284c7" />
          </div>
          <div style={{ height: 260, width: '100%' }}>
            {chartDataDiário.length === 0 ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13, fontWeight: 600 }}>Sem movimentações pagas no período.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartDataDiário} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#16a34a" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorDespesa" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 600}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 600}} tickFormatter={(v) => `R$ ${(v/1000).toFixed(1)}k`} />
                  <Tooltip 
                      labelStyle={{ color: '#fff', fontWeight: 'bold' }} 
                      contentStyle={{ backgroundColor: 'var(--text-title)', borderColor: 'var(--text-secondary)', borderRadius: '8px', color: '#fff' }} 
                      formatter={(value: any) => fmt(Number(value) || 0)} 
                    />
                  <Area type="monotone" dataKey="receita" name="Receita" stroke="#16a34a" strokeWidth={2} fillOpacity={1} fill="url(#colorReceita)" />
                  <Area type="monotone" dataKey="despesa" name="Despesa" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorDespesa)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* GRÃFICO 2: DESPESAS POR CATEGORIA (PIE / DONUT) */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 8, padding: '24px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-title)', margin: 0 }}>Despesas por Categoria</h2>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0 0 0', fontWeight: 500 }}>Distribuição dos gastos no mês</p>
            </div>
            <PieIcon size={18} color="#8b5cf6" />
          </div>
          <div style={{ height: 260, width: '100%', display: 'flex', alignItems: 'center' }}>
            {chartDataCategorias.length === 0 ? (
              <div style={{ width: '100%', textAlign: 'center', color: '#94a3b8', fontSize: 13, fontWeight: 600 }}>Nenhuma despesa registrada neste mês.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartDataCategorias}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {chartDataCategorias.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CORES_CATEGORIAS[index % CORES_CATEGORIAS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                      labelStyle={{ color: '#fff', fontWeight: 'bold' }} 
                      contentStyle={{ backgroundColor: 'var(--text-title)', borderColor: 'var(--text-secondary)', borderRadius: '8px', color: '#fff' }} 
                      formatter={(value: any) => fmt(Number(value) || 0)} 
                    />
                  <Legend 
                    layout="vertical" 
                    align="right" 
                    verticalAlign="middle"
                    formatter={(value, entry: any) => (
                      <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>
                        {value} (<span className="valor-sensivel">{fmt(entry.payload.value)}</span>)
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>

      {/* SEï¿½!ÃO 2: FORMAS DE PAGAMENTO + LISTA DE MOVIMENTAÇÕES */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>

        {/* GRÃFICO 3: FORMAS DE PAGAMENTO (BAR CHART) */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 8, padding: '24px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-title)', margin: 0 }}>Meios de Pagamento</h2>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0 0 0', fontWeight: 500 }}>Volume por canal (PIX, Cartão, Boleto, etc.)</p>
            </div>
            <BarChart3 size={18} color="#10b981" />
          </div>
          <div style={{ height: 260, width: '100%' }}>
            {chartDataPagamentos.length === 0 ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13, fontWeight: 600 }}>Sem dados de pagamento no mês.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartDataPagamentos} layout="vertical" margin={{ top: 10, right: 20, left: 30, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 600}} tickFormatter={(v) => `R$ ${(v/1000).toFixed(1)}k`} />
                  <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 11, fontWeight: 600}} />
                  <Tooltip 
                      labelStyle={{ color: '#fff', fontWeight: 'bold' }} 
                      contentStyle={{ backgroundColor: 'var(--text-title)', borderColor: 'var(--text-secondary)', borderRadius: '8px', color: '#fff' }} 
                      formatter={(value: any) => fmt(Number(value) || 0)} 
                    />
                  <Bar dataKey="value" name="Total Gasto" fill="#0284c7" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ÚLTIMAS MOVIMENTAÇÕES DO MÊS */}
        <div style={{ background: 'var(--bg-card)', borderRadius: 8, padding: '24px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-title)', margin: 0 }}>Movimentações do Mês</h2>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0 0 0', fontWeight: 500 }}>{transacoesMes.length} lançamento(s) em {mesesStr[mesSelecionado.getMonth()]}</p>
            </div>
            {onNavigateToLancamentos && (
              <button onClick={() => onNavigateToLancamentos()} style={{ fontSize: 12, fontWeight: 700, color: '#0284c7', background: '#e0f2fe', border: 'none', borderRadius: 4, padding: '6px 12px', cursor: 'pointer' }}>
                Ver Tabela Completa
              </button>
            )}
          </div>

          <div style={{ flex: 1, overflow: 'auto' }}>
            {ultimas.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#94a3b8', padding: 30, fontWeight: 600 }}>Nenhuma movimentação neste mês.</p>
            ) : (
              ultimas.map((t: any) => (
                <div key={t.id} onClick={() => onEditarLancamento && onEditarLancamento(t)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.15s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: t.tipo === 'receita' ? '#dcfce7' : '#fee2e2' }}>
                      {t.tipo === 'receita' ? <ArrowUpCircle size={18} color="#16a34a" /> : <ArrowDownCircle size={18} color="#ef4444" />}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-title)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.descricao}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>{t.categoriaNome || 'Sem cat.'} • {(t.data || '').split('-').reverse().join('/')}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: t.tipo === 'receita' ? '#16a34a' : '#1e293b' }}>{t.tipo === 'receita' ? '+' : '-'} <span className="valor-sensivel">{fmt(getValorFinal(t))}</span></div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: t.status === 'pago' ? '#16a34a' : '#f59e0b', textTransform: 'uppercase' }}>{t.status === 'pago' ? 'PAGO' : 'PENDENTE'}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}

