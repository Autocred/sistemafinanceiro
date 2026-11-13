'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, 
  LabelList, Legend
} from 'recharts';
import { 
  Calendar, CalendarDays, DollarSign, FileText, BarChart3, TrendingUp, TrendingDown,
  ChevronDown, Search, ArrowDownToLine, Printer, CheckCircle2, Building2, Users, AlertTriangle, Repeat, Zap
} from 'lucide-react';
import { format, parseISO, isSameMonth, isSameYear, getMonth, getYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { subscribeTransacoes, formatarMoeda } from '@/lib/storage';
import { getComportamentoTransacao, getInfoSerieParcelamento } from './ExtratoBancario';
import { normalizeDate, getValorFinal } from '@/lib/financialEngine';
import WaterfallAttribution from './WaterfallAttribution';
import { Transacao } from '@/lib/types';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

// Cores vibrantes premium
const COLORS = [
      'var(--primary)', 'var(--primary-hover)', 'var(--primary-dark)', '#f59e0b', '#10b981', '#ef4444',
    //
  'var(--primary)', '#10b981', '#f59e0b', 'var(--primary)', '#ef4444', 
  '#06b6d4', '#ec4899', '#f97316', '#14b8a6', '#6366f1',
  '#84cc16', '#d946ef', '#0ea5e9'
];

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];
const ANOS = ['2024', '2025', '2026', '2027', '2028', '2029', '2030'];

export default function DashboardMensal() {
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const today = new Date();
  const [ano, setAno] = useState<number>(today.getFullYear());
  const [mes, setMes] = useState<number>(today.getMonth()); // 0 a 11
  const [statusFiltro, setStatusFiltro] = useState<'Todos' | 'pago' | 'pendente'>('pago');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('Todas');
  const [centroCustoFiltro, setCentroCustoFiltro] = useState<string>('Todos');
  const [modoEvolucao, setModoEvolucao] = useState<'ano' | 'ultimos6'>('ano');
  const [modoEvolucaoReceitas, setModoEvolucaoReceitas] = useState<'ano' | 'ultimos6'>('ano');
  
  // Tabela
  const [pesquisa, setPesquisa] = useState('');
  const [ordenacao, setOrdenacao] = useState<'categoria' | 'quantidade' | 'valor' | 'percentual' | 'medio'>('valor');
  const [ordemDesc, setOrdemDesc] = useState(true);

  // Animação de montagem
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const unsub = subscribeTransacoes((data) => {
      setTransacoes(data as Transacao[]);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const categoriasUnicas = useMemo(() => {
    return Array.from(new Set(transacoes.filter(t => t.tipo === 'despesa').map(t => t.categoriaNome || t.categoriaId || 'Outros'))).sort();
  }, [transacoes]);

  const centrosCustoUnicos = useMemo(() => {
    return Array.from(new Set(transacoes.filter(t => t.tipo === 'despesa').map(t => t.centroCustoNome || t.centroCustoId || 'Não Informado'))).sort();
  }, [transacoes]);

  // Dados Filtrados (Ano e Mês)
  const txAno = useMemo(() => {
    const anoStr = String(ano);
    return transacoes.filter(t => normalizeDate(t.dataPagamento || t.dataVencimento || t.data || '').startsWith(anoStr));
  }, [transacoes, ano]);

  const txMes = useMemo(() => {
    const mesStr = `${ano}-${String(mes + 1).padStart(2, '0')}`;
    return transacoes.filter(t => {
      if (!normalizeDate(t.dataPagamento || t.dataVencimento || t.data || '').startsWith(mesStr)) return false;
      
      if (statusFiltro !== 'Todos') {
        if (statusFiltro === 'pago' && (t.status as string) !== 'pago' && (t.status as string) !== 'recebido') return false;
        if (statusFiltro === 'pendente' && t.status !== 'pendente') return false;
      }
      
      const cat = t.categoriaNome || t.categoriaId || 'Outros';
      if (categoriaFiltro !== 'Todas' && cat !== categoriaFiltro) return false;
      
      const cc = t.centroCustoNome || t.centroCustoId || 'Não Informado';
      if (centroCustoFiltro !== 'Todos' && cc !== centroCustoFiltro) return false;
      
      return true;
    });
  }, [transacoes, ano, mes, statusFiltro, categoriaFiltro, centroCustoFiltro]);

  const txMesPassado = useMemo(() => {
    const prevM = mes === 0 ? 12 : mes;
    const prevAno = mes === 0 ? ano - 1 : ano;
    const mesStr = `${prevAno}-${String(prevM).padStart(2, '0')}`;
    return transacoes.filter(t => normalizeDate(t.dataPagamento || t.dataVencimento || t.data || '').startsWith(mesStr));
  }, [transacoes, ano, mes]);

  // Cálculos Básicos (remove parcelamentos já encerrados sem parcelas a vencer)
  const despesas = txMes.filter(t => {
    if (t.tipo !== 'despesa' || ((t.status as string) !== 'pago' && (t.status as string) !== 'recebido') || t.formaPagamento === 'cartao_credito') return false;
    const infoParc = getInfoSerieParcelamento(t, transacoes);
    if (infoParc.isParcelamento && infoParc.terminado) return false;
    return true;
  });
  const receitas = txMes.filter(t => t.tipo === 'receita' && ((t.status as string) === 'pago' || (t.status as string) === 'recebido'));
  
  const totalDespesas = despesas.reduce((acc, t) => acc + Math.abs(getValorFinal(t)), 0);
  const totalReceitas = receitas.reduce((acc, t) => acc + Math.abs(getValorFinal(t)), 0);
  const saldoMes = totalReceitas - totalDespesas;

  // --- NOVAS MÉTRICAS ---
  // Receitas fixas e variáveis
  const receitasFixas = receitas.filter(t => getComportamentoTransacao(t) === 'fixa');
  const receitasVariaveis = receitas.filter(t => getComportamentoTransacao(t) === 'variavel');
  const totalReceitasFixas = receitasFixas.reduce((acc, t) => acc + Math.abs(getValorFinal(t)), 0);
  const totalReceitasVariaveis = receitasVariaveis.reduce((acc, t) => acc + Math.abs(getValorFinal(t)), 0);

  // Juros e multas nas despesas pagas no mês
  const totalJurosMes = despesas.reduce((acc, t) => acc + (Number(t.juros) || 0), 0);
  const totalMultasMes = despesas.reduce((acc, t) => acc + (Number(t.multa) || 0), 0);
  const totalJurosMultas = totalJurosMes + totalMultasMes;

  // Despesas fixas e variáveis
  const despesasFixas = despesas.filter(t => getComportamentoTransacao(t, transacoes) === 'fixa');
  const despesasVariaveis = despesas.filter(t => getComportamentoTransacao(t, transacoes) === 'variavel');
  const totalDespesasFixas = despesasFixas.reduce((acc, t) => acc + Math.abs(getValorFinal(t)), 0);
  const totalDespesasVariaveis = despesasVariaveis.reduce((acc, t) => acc + Math.abs(getValorFinal(t)), 0);
  
  const qtdDespesas = despesas.length;
  
  const gastosPorCentroCusto = useMemo(() => {
    const mapa = new Map<string, { total: number; qtd: number }>();
    despesas.forEach(d => {
      const cc = d.centroCustoNome || d.centroCustoId || 'Não Informado';
      const atual = mapa.get(cc) || { total: 0, qtd: 0 };
      mapa.set(cc, { total: atual.total + Math.abs(getValorFinal(d)), qtd: atual.qtd + 1 });
    });
    return Array.from(mapa.entries()).map(([nome, dados]) => ({
      nome, valor: dados.total, qtd: dados.qtd, percentual: totalDespesas > 0 ? (dados.total / totalDespesas) * 100 : 0
    })).sort((a, b) => b.valor - a.valor);
  }, [despesas, totalDespesas]);

  // Receitas por cliente (fixas e variáveis)
  const receitasPorCliente = useMemo(() => {
    const mapa = new Map<string, { fixa: number; variavel: number; total: number }>();
    receitas.forEach(r => {
      const cliente = r.clienteNome || r.clienteId || 'Sem Cliente';
      const atual = mapa.get(cliente) || { fixa: 0, variavel: 0, total: 0 };
      const valor = Math.abs(getValorFinal(r));
      if (getComportamentoTransacao(r) === 'fixa') {
        mapa.set(cliente, { ...atual, fixa: atual.fixa + valor, total: atual.total + valor });
      } else {
        mapa.set(cliente, { ...atual, variavel: atual.variavel + valor, total: atual.total + valor });
      }
    });
    return Array.from(mapa.entries())
      .map(([nome, dados]) => ({ nome, ...dados, percentual: totalReceitas > 0 ? (dados.total / totalReceitas) * 100 : 0 }))
      .sort((a, b) => b.total - a.total);
  }, [receitas, totalReceitas]);

  const clienteMaiorReceita = receitasPorCliente.length > 0 ? receitasPorCliente[0] : null;
  const mediaReceitaCliente = receitasPorCliente.length > 0 ? totalReceitas / receitasPorCliente.length : 0;

  const gastosPorCategoria = useMemo(() => {
    const mapa = new Map<string, { fixa: number; variavel: number; total: number; qtd: number }>();
    despesas.forEach(d => {
      const cat = d.categoriaNome || d.categoriaId || 'Outros';
      const atual = mapa.get(cat) || { fixa: 0, variavel: 0, total: 0, qtd: 0 };
      const val = Math.abs(getValorFinal(d));
      if (getComportamentoTransacao(d, transacoes) === 'fixa') {
        mapa.set(cat, { ...atual, fixa: atual.fixa + val, total: atual.total + val, qtd: atual.qtd + 1 });
      } else {
        mapa.set(cat, { ...atual, variavel: atual.variavel + val, total: atual.total + val, qtd: atual.qtd + 1 });
      }
    });
    const array = Array.from(mapa.entries()).map(([nome, dados]) => ({
      nome,
      fixa: dados.fixa,
      variavel: dados.variavel,
      valor: dados.total,
      total: dados.total,
      qtd: dados.qtd,
      percentual: totalDespesas > 0 ? (dados.total / totalDespesas) * 100 : 0,
      medio: dados.qtd > 0 ? dados.total / dados.qtd : 0
    }));
    return array.sort((a, b) => b.valor - a.valor);
  }, [despesas, totalDespesas]);

  const catMaiorGasto = gastosPorCategoria.length > 0 ? gastosPorCategoria[0] : null;
  const catMenorGasto = gastosPorCategoria.length > 0 ? gastosPorCategoria[gastosPorCategoria.length - 1] : null;

// Evolução Ano (Receitas e Despesas)
  const evolucaoAno = useMemo(() => {
    const mesesAbrev = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return MESES.map((nome, idx) => {
      const mesStr = `${ano}-${String(idx + 1).padStart(2, '0')}`;
      
      const txMesAtual = txAno.filter(t => {
        // SEMPRE data de pagamento/recebimento com fallback para vencimento/data, NUNCA dataCompetencia
        const d = normalizeDate(t.dataPagamento || t.dataVencimento || t.data || '');
        if (!d.startsWith(mesStr)) return false;
        if (statusFiltro !== 'Todos') {
          if (statusFiltro === 'pago' && (t.status as string) !== 'pago' && (t.status as string) !== 'recebido') return false;
          if (statusFiltro === 'pendente' && t.status !== 'pendente') return false;
        }
        const cat = t.categoriaNome || t.categoriaId || 'Outros';
        if (categoriaFiltro !== 'Todas' && cat !== categoriaFiltro) return false;
        const cc = t.centroCustoNome || t.centroCustoId || 'Não Informado';
        if (centroCustoFiltro !== 'Todos' && cc !== centroCustoFiltro) return false;
        return true;
      });

      const tDespesas = txMesAtual
        .filter(t => t.tipo === 'despesa' && ((t.status as string) === 'pago' || (t.status as string) === 'recebido') && t.formaPagamento !== 'cartao_credito')
        .reduce((acc, t) => acc + Math.abs(getValorFinal(t)), 0);
        
      const tReceitas = txMesAtual
        .filter(t => t.tipo === 'receita' && ((t.status as string) === 'pago' || (t.status as string) === 'recebido'))
        .reduce((acc, t) => acc + Math.abs(getValorFinal(t)), 0);

      return {
        mes: mesesAbrev[idx],
        mesCompleto: nome,
        valor: tDespesas,
        despesas: tDespesas,
        receitas: tReceitas,
        saldo: tReceitas - tDespesas,
        isSelected: idx === mes
      };
    });
  }, [txAno, mes, ano, statusFiltro, categoriaFiltro, centroCustoFiltro]);

  const receitasXDespesas = useMemo(() => {
    return [
      { name: 'Receitas', valor: totalReceitas, color: '#10b981' },
      { name: 'Despesas', valor: totalDespesas, color: '#ef4444' },
      { name: 'Saldo', valor: saldoMes, color: 'var(--primary)' }
    ];
  }, [totalReceitas, totalDespesas, saldoMes]);

  const resumoInteligente = useMemo(() => {
    const totalDespPrev = txMesPassado.filter(t => t.tipo === 'despesa' && ((t.status as string) === 'pago' || (t.status as string) === 'recebido') && t.formaPagamento !== 'cartao_credito').reduce((acc, t) => acc + Math.abs(getValorFinal(t)), 0);
    let diffPercentual = 0;
    if (totalDespPrev > 0) {
      diffPercentual = ((totalDespesas - totalDespPrev) / totalDespPrev) * 100;
    }

    let texto = `No mês de ${MESES[mes]} de ${ano} foram registradas ${qtdDespesas} despesas totalizando ${formatarMoeda(totalDespesas)}.`;
    if (catMaiorGasto) {
      texto += ` A categoria que apresentou maior gasto foi ${catMaiorGasto.nome}, representando ${catMaiorGasto.percentual.toFixed(1)}% do total das despesas.`;
    }
    if (totalDespPrev > 0) {
      texto += ` Em comparação com o mês anterior, houve um ${diffPercentual >= 0 ? 'aumento' : 'redução'} de ${Math.abs(diffPercentual).toFixed(1)}% nos gastos.`;
    } else {
      texto += ` Não há registros suficientes no mês anterior para comparar gastos.`;
    }
    return texto;
  }, [mes, ano, qtdDespesas, totalDespesas, catMaiorGasto, txMesPassado]);

  const dadosTabela = useMemo(() => {
    let filtrado = gastosPorCategoria.filter(c => c.nome.toLowerCase().includes(pesquisa.toLowerCase()));
    return filtrado.sort((a, b) => {
      const valA = a[ordenacao as keyof typeof a];
      const valB = b[ordenacao as keyof typeof b];
      if (valA < valB) return ordemDesc ? 1 : -1;
      if (valA > valB) return ordemDesc ? -1 : 1;
      return 0;
    });
  }, [gastosPorCategoria, pesquisa, ordenacao, ordemDesc]);

  const mediaDiaria = totalDespesas / 30;

  let maiorLcto = 0;
  let menorLcto = Infinity;
  despesas.forEach(d => {
    const v = Math.abs(getValorFinal(d));
    if (v > maiorLcto) maiorLcto = v;
    if (v > 0 && v < menorLcto) menorLcto = v;
  });
  if (menorLcto === Infinity) menorLcto = 0;

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(dadosTabela.map(c => ({
      Categoria: c.nome,
      Quantidade: c.qtd,
      'Valor Total': c.valor,
      'Percentual %': c.percentual.toFixed(2),
      'Valor Médio': c.medio
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Gastos");
    XLSX.writeFile(wb, `Gastos_${MESES[mes]}_${ano}.xlsx`);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text(`Relatório de Gastos - ${MESES[mes]} de ${ano}`, 14, 15);
    const tableColumn = ["Categoria", "Quantidade", "Valor Total (R$)", "Percentual (%)", "Valor Médio (R$)"];
    const tableRows = dadosTabela.map(c => [
      c.nome, 
      c.qtd, 
      formatarMoeda(c.valor), 
      c.percentual.toFixed(2), 
      formatarMoeda(c.medio)
    ]);
    (doc as any).autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 20,
    });
    doc.save(`Gastos_${MESES[mes]}_${ano}.pdf`);
  };

  const customTooltip3D = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bi-tooltip">
          <p className="title">{label || data.nome}</p>
          <div className="row"><span className="dot" style={{background: payload[0].color || payload[0].fill}}/> Valor: <b>{formatarMoeda(data.valor || 0)}</b></div>
          {data.percentual !== undefined && <div className="row"><span className="dot" style={{background: 'var(--text-secondary)'}}/> Participação: <b>{data.percentual.toFixed(1)}%</b></div>}
          {data.qtd !== undefined && <div className="row"><span className="dot" style={{background: 'var(--text-secondary)'}}/> Lançamentos: <b>{data.qtd}</b></div>}
        </div>
      );
    }
    return null;
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>Carregando dados financeiros...</div>;

  return (
    <div className={`bi-dashboard-container ${mounted ? 'fade-in' : 'opacity-0'}`}>
      
      {/* HEADER E FILTROS */}
      <div className="bi-header glass-panel fade-in-up" style={{ animationDelay: '0.1s' }}>
        <div>
          <h1 className="bi-title">Dashboard Financeiro Mensal</h1>
          <p className="bi-subtitle">Análise profunda dos seus gastos e receitas no estilo Power BI</p>
        </div>
        <div className="bi-filters" style={{ flexWrap: 'wrap' }}>
          <div className="filter-group">
            <CalendarDays size={18} color="var(--text-secondary)" />
            <select value={ano} onChange={(e) => setAno(Number(e.target.value))} className="bi-select">
              {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <Calendar size={18} color="var(--text-secondary)" />
            <select value={mes} onChange={(e) => setMes(Number(e.target.value))} className="bi-select">
              {MESES.map((m, idx) => <option key={m} value={idx}>{m}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <CheckCircle2 size={18} color="var(--text-secondary)" />
            <select value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value as any)} className="bi-select">
              <option value="Todos">Todos (Status)</option>
              <option value="pago">Pago / Recebido</option>
              <option value="pendente">Pendente</option>
            </select>
          </div>
          <div className="filter-group">
            <FileText size={18} color="var(--text-secondary)" />
            <select value={categoriaFiltro} onChange={(e) => setCategoriaFiltro(e.target.value)} className="bi-select">
              <option value="Todas">Todas Categorias</option>
              {categoriasUnicas.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <Building2 size={18} color="var(--text-secondary)" />
            <select value={centroCustoFiltro} onChange={(e) => setCentroCustoFiltro(e.target.value)} className="bi-select">
              <option value="Todos">Todos Centros</option>
              {centrosCustoUnicos.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* CARDS SUPERIORES */}
      <style>{`
        .card-red .card-icon { background: linear-gradient(135deg, #ef4444, #dc2626); }
        .card-emerald .card-icon { background: linear-gradient(135deg, #10b981, #059669); }
        .card-darkblue .card-icon { background: linear-gradient(135deg, #1e3a8a, #172554); }
        .card-cyan .card-icon { background: linear-gradient(135deg, #06b6d4, #0891b2); }
        .section-divider { display: flex; align-items: center; gap: 14px; margin: 8px 0 4px; }
        .section-divider-line { flex: 1; height: 2px; border-radius: 2px; }
        .section-divider-label { display: flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; white-space: nowrap; padding: 4px 14px; border-radius: 20px; }
      `}</style>

      {/* ─── BLOCO RECEITAS ─── */}
      <div className="section-divider fade-in-up" style={{ animationDelay: '0.08s' }}>
        <div className="section-divider-line" style={{ background: 'linear-gradient(90deg, transparent, #10b981)' }} />
        <div className="section-divider-label" style={{ background: 'linear-gradient(135deg,#059669,#10b981)', color: '#fff', boxShadow: '0 2px 10px rgba(16,185,129,0.35)' }}>
          <TrendingUp size={15} /> RECEITAS
        </div>
        <div className="section-divider-line" style={{ background: 'linear-gradient(90deg, #10b981, transparent)' }} />
      </div>
      <div className="bi-cards-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: 0 }}>
        <div className="bi-card card-emerald glass-panel hover-lift fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="card-icon"><TrendingUp size={24} /></div>
          <div className="card-info">
            <h3>Total de Receitas</h3>
            <h2>{formatarMoeda(totalReceitas)}</h2>
          </div>
        </div>
        <div className="bi-card card-emerald glass-panel hover-lift fade-in-up" style={{ animationDelay: '0.15s' }}>
          <div className="card-icon"><Repeat size={24} /></div>
          <div className="card-info">
            <h3>Receita Fixa</h3>
            <h2>{formatarMoeda(totalReceitasFixas)}</h2>
            <p>{totalReceitas > 0 ? ((totalReceitasFixas / totalReceitas) * 100).toFixed(1) + '% do total' : ''}</p>
          </div>
        </div>
        <div className="bi-card card-cyan glass-panel hover-lift fade-in-up" style={{ animationDelay: '0.18s' }}>
          <div className="card-icon"><Zap size={24} /></div>
          <div className="card-info">
            <h3>Receita Variável</h3>
            <h2>{formatarMoeda(totalReceitasVariaveis)}</h2>
            <p>{totalReceitas > 0 ? ((totalReceitasVariaveis / totalReceitas) * 100).toFixed(1) + '% do total' : ''}</p>
          </div>
        </div>
        <div className="bi-card card-emerald glass-panel hover-lift fade-in-up" style={{ animationDelay: '0.21s' }}>
          <div className="card-icon"><Users size={24} /></div>
          <div className="card-info">
            <h3>Cliente Maior Receita</h3>
            <h2 style={{ fontSize: 15 }}>{clienteMaiorReceita ? clienteMaiorReceita.nome : '-'}</h2>
            <p>{clienteMaiorReceita ? formatarMoeda(clienteMaiorReceita.total) + ' (' + clienteMaiorReceita.percentual.toFixed(1) + '%)' : ''}</p>
          </div>
        </div>
        <div className="bi-card card-cyan glass-panel hover-lift fade-in-up" style={{ animationDelay: '0.23s' }}>
          <div className="card-icon"><BarChart3 size={24} /></div>
          <div className="card-info">
            <h3>Média Receita/Cliente</h3>
            <h2>{formatarMoeda(mediaReceitaCliente)}</h2>
            <p>{receitasPorCliente.length} cliente{receitasPorCliente.length !== 1 ? 's' : ''} no período</p>
          </div>
        </div>
      </div>

      {/* ─── DIVISOR CENTRAL ─── */}
      <div className="section-divider fade-in-up" style={{ animationDelay: '0.26s', margin: '16px 0 4px' }}>
        <div className="section-divider-line" style={{ background: 'linear-gradient(90deg, transparent, #ef4444)' }} />
        <div className="section-divider-label" style={{ background: 'linear-gradient(135deg,#dc2626,#ef4444)', color: '#fff', boxShadow: '0 2px 10px rgba(239,68,68,0.35)' }}>
          <TrendingDown size={15} /> DESPESAS
        </div>
        <div className="section-divider-line" style={{ background: 'linear-gradient(90deg, #ef4444, transparent)' }} />
      </div>
      <div className="bi-cards-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div className="bi-card card-red glass-panel hover-lift fade-in-up" style={{ animationDelay: '0.2s' }}>
          <div className="card-icon"><TrendingDown size={24} /></div>
          <div className="card-info">
            <h3>Total de Despesas</h3>
            <h2>{formatarMoeda(totalDespesas)}</h2>
          </div>
        </div>
        <div className="bi-card card-red glass-panel hover-lift fade-in-up" style={{ animationDelay: '0.22s' }}>
          <div className="card-icon"><Repeat size={24} /></div>
          <div className="card-info">
            <h3>Despesa Fixa</h3>
            <h2>{formatarMoeda(totalDespesasFixas)}</h2>
            <p>{totalDespesas > 0 ? ((totalDespesasFixas / totalDespesas) * 100).toFixed(1) + '% do total' : ''}</p>
          </div>
        </div>
        <div className="bi-card card-red glass-panel hover-lift fade-in-up" style={{ animationDelay: '0.24s' }}>
          <div className="card-icon"><Zap size={24} /></div>
          <div className="card-info">
            <h3>Despesa Variável</h3>
            <h2>{formatarMoeda(totalDespesasVariaveis)}</h2>
            <p>{totalDespesas > 0 ? ((totalDespesasVariaveis / totalDespesas) * 100).toFixed(1) + '% do total' : ''}</p>
          </div>
        </div>
        <div className="bi-card card-darkblue glass-panel hover-lift fade-in-up" style={{ animationDelay: '0.25s' }}>
          <div className="card-icon"><AlertTriangle size={24} /></div>
          <div className="card-info">
            <h3>Juros + Multas (Mês)</h3>
            <h2 style={{ color: totalJurosMultas > 0 ? '#ef4444' : 'inherit' }}>{formatarMoeda(totalJurosMultas)}</h2>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Juros: {formatarMoeda(totalJurosMes)} | Multas: {formatarMoeda(totalMultasMes)}</p>
          </div>
        </div>
        <div className="bi-card card-blue glass-panel hover-lift fade-in-up" style={{ animationDelay: '0.3s' }}>
          <div className="card-icon"><DollarSign size={24} /></div>
          <div className="card-info">
            <h3>Saldo do Mês</h3>
            <h2 style={{ color: saldoMes >= 0 ? '#10b981' : '#ef4444' }}>{formatarMoeda(saldoMes)}</h2>
          </div>
        </div>
        <div className="bi-card card-red glass-panel hover-lift fade-in-up" style={{ animationDelay: '0.4s' }}>
          <div className="card-icon"><FileText size={24} /></div>
          <div className="card-info">
            <h3>Qtd. Despesas</h3>
            <h2>{qtdDespesas} lançamentos</h2>
          </div>
        </div>
        <div className="bi-card card-red glass-panel hover-lift fade-in-up" style={{ animationDelay: '0.5s' }}>
          <div className="card-icon"><BarChart3 size={24} /></div>
          <div className="card-info">
            <h3>Categoria (Maior Gasto)</h3>
            <h2>{catMaiorGasto ? catMaiorGasto.nome : '-'}</h2>
            <p>{catMaiorGasto ? formatarMoeda(catMaiorGasto.valor) : ''}</p>
          </div>
        </div>
        <div className="bi-card card-red glass-panel hover-lift fade-in-up" style={{ animationDelay: '0.6s' }}>
          <div className="card-icon"><TrendingUp size={24} /></div>
          <div className="card-info">
            <h3>Média Diária (Gastos)</h3>
            <h2>{formatarMoeda(mediaDiaria)}</h2>
          </div>
        </div>
      </div>

      {/* RESUMO INTELIGENTE */}
      <div className="bi-smart-summary glass-panel fade-in-up" style={{ animationDelay: '0.6s' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: 'var(--blue)', fontSize: 16, fontWeight: 700 }}>
          <TrendingUp size={20} /> Resumo Inteligente
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.6 }}>{resumoInteligente}</p>
      </div>

      {/* FERRAMENTA AMERICANA (STRIPE SIGMA / WALL STREET): RAIO-X DE DESTINO DE CADA R$ 100,00 */}
      <WaterfallAttribution
        transacoes={transacoes}
        mesFormatado={`${ano}-${String(mes + 1).padStart(2, '0')}`}
        nomeMes={`${MESES[mes]} / ${ano}`}
        receitasRealizadas={totalReceitas}
        receitasAReceber={0}
        despesasRealizadas={totalDespesas}
        despesasAPagar={0}
        compactOnDashboard={false}
      />

      {/* CHARTS GRID */}
      <div className="bi-charts-grid" style={{ gridTemplateColumns: '1fr' }}>
        
        {/* GRÁFICO 1: Gastos por Categoria — Estilo 3D Dinâmico Premium (Fixa vs Variável) */}
        <div className="bi-chart-container glass-panel hover-lift fade-in-up" style={{ animationDelay: '0.7s' }}>
          <style>{`
            .despesa-bar-row { display: flex; align-items: center; gap: 14px; padding: 8px 0; border-bottom: 1px solid var(--border); }
            .despesa-bar-row:last-child { border-bottom: none; }
            .despesa-bar-label { width: 175px; min-width: 175px; font-size: 13px; font-weight: 600; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .despesa-seg-fixa { height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #991b1b 0%, #dc2626 40%, #ef4444 70%, #f87171 100%); box-shadow: inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -1px 0 rgba(0,0,0,0.15), 2px 0 8px rgba(239,68,68,0.4); position: relative; overflow: hidden; transition: all 0.3s; }
            .despesa-seg-fixa::after { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 50%; background: linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 100%); border-radius: 8px 0 0 0; }
            .despesa-seg-variavel { height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #ea580c 0%, #f97316 40%, #fb923c 70%, #fed7aa 100%); box-shadow: inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -1px 0 rgba(0,0,0,0.15), 2px 0 8px rgba(249,115,22,0.4); position: relative; overflow: hidden; transition: all 0.3s; border-radius: 0 8px 8px 0; }
            .despesa-seg-variavel::after { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 50%; background: linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 100%); border-radius: 0 8px 0 0; }
            .despesa-seg-label { font-size: 12px; font-weight: 800; color: #fff; white-space: nowrap; padding: 0 8px; text-shadow: 0 1px 3px rgba(0,0,0,0.7); position: relative; z-index: 1; display: flex; align-items: center; justify-content: center; letter-spacing: -0.2px; }
            .despesa-legend { display: flex; gap: 20px; padding: 14px 0 4px; justify-content: center; }
            .despesa-legend-dot { width: 14px; height: 14px; border-radius: 3px; }
          `}</style>

          <h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <TrendingDown size={18} color="#ef4444" /> Gastos por Categoria — Fixa vs Variável
          </h3>

          {/* Legenda Fixa vs Variável */}
          <div className="despesa-legend">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <div className="despesa-legend-dot" style={{ background: 'linear-gradient(135deg,#991b1b,#ef4444)' }} />
              <span style={{ color: 'var(--text-secondary)' }}>Despesa Fixa</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <div className="despesa-legend-dot" style={{ background: 'linear-gradient(135deg,#ea580c,#fb923c)' }} />
              <span style={{ color: 'var(--text-secondary)' }}>Despesa Variável</span>
            </div>
          </div>

          {gastosPorCategoria.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Nenhuma despesa encontrada para o período.
            </div>
          ) : (
            <div style={{ padding: '8px 0' }}>
              {gastosPorCategoria.map((cat, idx) => {
                const maxTotal = gastosPorCategoria[0]?.valor || 1;
                const minBarPct = 36;
                const trackPct = minBarPct + ((cat.valor / maxTotal) * (100 - minBarPct));
                const fixaPct = cat.valor > 0 ? (cat.fixa / cat.valor) * 100 : 0;
                const varPct = cat.valor > 0 ? (cat.variavel / cat.valor) * 100 : 0;
                return (
                  <div key={idx} className="despesa-bar-row">
                    <div className="despesa-bar-label" title={cat.nome}>{cat.nome}</div>
                    <div style={{ flex: 1, position: 'relative' }}>
                      <div style={{ width: `${trackPct}%`, height: 38, background: 'var(--bg-hover)', borderRadius: 8, overflow: 'hidden', display: 'flex', boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.12)', minWidth: 210 }}>
                        {/* Segmento FIXA */}
                        {cat.fixa > 0 && (
                          <div
                            className="despesa-seg-fixa"
                            style={{ width: `${fixaPct}%`, borderRadius: varPct > 0 ? '8px 0 0 8px' : '8px' }}
                            title={`Fixa: ${formatarMoeda(cat.fixa)}`}
                          >
                            <span className="despesa-seg-label">🔒 {varPct > 0 && fixaPct < 25 ? '' : formatarMoeda(cat.fixa)}</span>
                          </div>
                        )}
                        {/* Segmento VARIÁVEL */}
                        {cat.variavel > 0 && (
                          <div
                            className="despesa-seg-variavel"
                            style={{ width: `${varPct}%`, borderRadius: fixaPct > 0 ? '0 8px 8px 0' : '8px' }}
                            title={`Variável: ${formatarMoeda(cat.variavel)}`}
                          >
                            <span className="despesa-seg-label">⚡ {fixaPct > 0 && varPct < 25 ? '' : formatarMoeda(cat.variavel)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="receita-bar-total" style={{ color: '#ef4444' }}>{formatarMoeda(cat.valor)}</div>
                    <div className="receita-bar-pct">{cat.percentual.toFixed(1)}%</div>
                  </div>
                );
              })}
            </div>
          )}

          {gastosPorCategoria.length > 0 && (
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)', padding: '8px 0 0', borderTop: '1px solid var(--border)' }}>
              <span>🔒 Total Fixo: <b style={{ color: '#ef4444' }}>{formatarMoeda(totalDespesasFixas)}</b></span>
              <span>⚡ Total Variável: <b style={{ color: '#f97316' }}>{formatarMoeda(totalDespesasVariaveis)}</b></span>
              <span>🏷️ {gastosPorCategoria.length} categorias</span>
            </div>
          )}
        </div>

        {/* GRÁFICO: Receitas por Cliente (Fixa vs Variável) — versão 3D premium */}
        <div className="bi-chart-container glass-panel hover-lift fade-in-up" style={{ animationDelay: '0.75s' }}>
          <style>{`
            .receita-bar-row { display: flex; align-items: center; gap: 14px; padding: 8px 0; border-bottom: 1px solid var(--border); }
            .receita-bar-row:last-child { border-bottom: none; }
            .receita-bar-label { width: 175px; min-width: 175px; font-size: 13px; font-weight: 600; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .receita-bar-track { flex: 1; height: 38px; background: var(--bg-hover); border-radius: 8px; overflow: hidden; display: flex; position: relative; box-shadow: inset 0 2px 6px rgba(0,0,0,0.12); }
            .receita-seg-fixa { height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #059669 0%, #10b981 40%, #34d399 70%, #6ee7b7 100%); box-shadow: inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 0 rgba(0,0,0,0.15), 2px 0 8px rgba(16,185,129,0.4); position: relative; overflow: hidden; transition: all 0.3s; }
            .receita-seg-fixa::after { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 50%; background: linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 100%); border-radius: 8px 0 0 0; }
            .receita-seg-variavel { height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #0891b2 0%, #06b6d4 40%, #22d3ee 70%, #67e8f9 100%); box-shadow: inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 0 rgba(0,0,0,0.15), 2px 0 8px rgba(6,182,212,0.4); position: relative; overflow: hidden; transition: all 0.3s; border-radius: 0 8px 8px 0; }
            .receita-seg-variavel::after { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 50%; background: linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 100%); border-radius: 0 8px 0 0; }
            .receita-seg-label { font-size: 11.5px; font-weight: 700; color: #fff; white-space: nowrap; padding: 0 8px; text-shadow: 0 1px 3px rgba(0,0,0,0.7); position: relative; z-index: 1; display: flex; align-items: center; justify-content: center; letter-spacing: 0.01em; }
            .receita-bar-total { min-width: 110px; text-align: right; font-size: 13px; font-weight: 700; color: var(--text-primary); }
            .receita-bar-pct { min-width: 44px; text-align: right; font-size: 12px; color: var(--text-secondary); }
            .receita-legend { display: flex; gap: 20px; padding: 14px 0 4px; justify-content: center; }
            .receita-legend-dot { width: 14px; height: 14px; border-radius: 3px; }
          `}</style>

          <h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Users size={18} color="#10b981" /> Receitas por Cliente — Fixa vs Variável
          </h3>

          {/* Legenda */}
          <div className="receita-legend">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <div className="receita-legend-dot" style={{ background: 'linear-gradient(135deg,#059669,#34d399)' }} />
              <span style={{ color: 'var(--text-secondary)' }}>Receita Fixa</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <div className="receita-legend-dot" style={{ background: 'linear-gradient(135deg,#0891b2,#22d3ee)' }} />
              <span style={{ color: 'var(--text-secondary)' }}>Receita Variável</span>
            </div>
          </div>

          {receitasPorCliente.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Nenhuma receita encontrada para o período.
            </div>
          ) : (
            <div style={{ padding: '8px 0' }}>
              {receitasPorCliente.map((cli, idx) => {
                const maxTotal = receitasPorCliente[0]?.total || 1;
                const minBarPct = 36;
                const trackPct = minBarPct + ((cli.total / maxTotal) * (100 - minBarPct));
                const fixaPct = cli.total > 0 ? (cli.fixa / cli.total) * 100 : 0;
                const varPct = cli.total > 0 ? (cli.variavel / cli.total) * 100 : 0;
                return (
                  <div key={idx} className="receita-bar-row">
                    <div className="receita-bar-label" title={cli.nome}>{cli.nome}</div>
                    <div style={{ flex: 1, position: 'relative' }}>
                      {/* Trilha total */}
                      <div style={{ width: `${trackPct}%`, height: 38, background: 'var(--bg-hover)', borderRadius: 8, overflow: 'hidden', display: 'flex', boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.12)', minWidth: 210 }}>
                        {/* Segmento FIXA */}
                        {cli.fixa > 0 && (
                          <div
                            className="receita-seg-fixa"
                            style={{ width: `${fixaPct}%`, borderRadius: varPct > 0 ? '8px 0 0 8px' : '8px' }}
                            title={`Fixa: ${formatarMoeda(cli.fixa)}`}
                          >
                            {fixaPct > 18 && (
                              <span className="receita-seg-label">🔁 {fixaPct > 28 ? formatarMoeda(cli.fixa) : 'Fixa'}</span>
                            )}
                          </div>
                        )}
                        {/* Segmento VARIÁVEL */}
                        {cli.variavel > 0 && (
                          <div
                            className="receita-seg-variavel"
                            style={{ width: `${varPct}%`, borderRadius: fixaPct > 0 ? '0 8px 8px 0' : '8px' }}
                            title={`Variável: ${formatarMoeda(cli.variavel)}`}
                          >
                            {varPct > 18 && (
                              <span className="receita-seg-label">⚡ {varPct > 28 ? formatarMoeda(cli.variavel) : 'Variável'}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="receita-bar-total">{formatarMoeda(cli.total)}</div>
                    <div className="receita-bar-pct">{cli.percentual.toFixed(1)}%</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Mini legenda de valores */}
          {receitasPorCliente.length > 0 && (
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)', padding: '8px 0 0', borderTop: '1px solid var(--border)' }}>
              <span>🔁 Total Fixo: <b style={{color:'#10b981'}}>{formatarMoeda(totalReceitasFixas)}</b></span>
              <span>⚡ Total Variável: <b style={{color:'#06b6d4'}}>{formatarMoeda(totalReceitasVariaveis)}</b></span>
              <span>👥 {receitasPorCliente.length} cliente{receitasPorCliente.length !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        {/* GRÁFICO: Juros e Multas nas Despesas do Mês */}
        <div className="bi-chart-container glass-panel hover-lift fade-in-up" style={{ animationDelay: '0.78s' }}>
          <h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={18} color="#f59e0b" /> Juros e Multas Pagos no Mês (Acumulado)
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, padding: '16px 8px' }}>
            <div style={{ background: 'var(--bg-hover)', borderRadius: 12, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f59e0b', fontWeight: 700, fontSize: 14 }}>
                <AlertTriangle size={18} /> Total Juros
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: totalJurosMes > 0 ? '#ef4444' : 'var(--text-secondary)' }}>
                {formatarMoeda(totalJurosMes)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {despesas.filter(t => (t.juros || 0) > 0).length} lançamentos com juros
              </div>
            </div>
            <div style={{ background: 'var(--bg-hover)', borderRadius: 12, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f97316', fontWeight: 700, fontSize: 14 }}>
                <AlertTriangle size={18} /> Total Multas
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: totalMultasMes > 0 ? '#ef4444' : 'var(--text-secondary)' }}>
                {formatarMoeda(totalMultasMes)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {despesas.filter(t => (t.multa || 0) > 0).length} lançamentos com multa
              </div>
            </div>
            <div style={{ background: 'linear-gradient(135deg, #ef444422, #ef444411)', border: '1px solid #ef444433', borderRadius: 12, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ef4444', fontWeight: 700, fontSize: 14 }}>
                <AlertTriangle size={18} /> Total Acumulado
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: totalJurosMultas > 0 ? '#ef4444' : 'var(--text-secondary)' }}>
                {formatarMoeda(totalJurosMultas)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {totalDespesas > 0 ? ((totalJurosMultas / totalDespesas) * 100).toFixed(2) + '% das despesas totais' : 'Sem despesas no período'}
              </div>
            </div>
          </div>
          {/* Mini lista de lançamentos com juros/multas */}
          {despesas.filter(t => ((t.juros || 0) > 0) || ((t.multa || 0) > 0)).length > 0 && (
            <div style={{ marginTop: 12, padding: '0 8px' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Lançamentos com encargos:</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }} className="hide-scroll">
                {despesas.filter(t => ((t.juros || 0) > 0) || ((t.multa || 0) > 0)).map((t, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-hover)', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.descricao}</span>
                    <div style={{ display: 'flex', gap: 12, marginLeft: 12 }}>
                      {(t.juros || 0) > 0 && <span style={{ color: '#f59e0b', fontWeight: 600 }}>Juros: {formatarMoeda(t.juros || 0)}</span>}
                      {(t.multa || 0) > 0 && <span style={{ color: '#f97316', fontWeight: 600 }}>Multa: {formatarMoeda(t.multa || 0)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* GRÁFICO 2: Gastos por Centro de Custo — Estilo 3D Dinâmico Premium com Totais Centrais */}
        <div className="bi-chart-container glass-panel hover-lift fade-in-up" style={{ animationDelay: '0.8s' }}>
          <style>{`
            .cc-seg-bar { height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #c2410c 0%, #ea580c 40%, #f97316 70%, #fdba74 100%); box-shadow: inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -1px 0 rgba(0,0,0,0.15), 0 3px 10px rgba(234,88,12,0.35); position: relative; overflow: hidden; border-radius: 8px; transition: all 0.3s; }
            .cc-seg-bar::after { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 50%; background: linear-gradient(180deg, rgba(255,255,255,0.3) 0%, transparent 100%); border-radius: 8px 8px 0 0; }
          `}</style>

          <h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Building2 size={18} color="#ea580c" /> Gastos por Centro de Custo
          </h3>

          {gastosPorCentroCusto.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Nenhum centro de custo encontrado para o período.
            </div>
          ) : (
            <div style={{ padding: '8px 0' }}>
              {gastosPorCentroCusto.map((cc, idx) => {
                const maxTotal = gastosPorCentroCusto[0]?.valor || 1;
                const minBarPct = 36;
                const trackPct = minBarPct + ((cc.valor / maxTotal) * (100 - minBarPct));
                return (
                  <div key={idx} className="despesa-bar-row">
                    <div className="despesa-bar-label" title={cc.nome}>{cc.nome}</div>
                    <div style={{ flex: 1, position: 'relative' }}>
                      <div style={{ width: `${trackPct}%`, height: 38, background: 'var(--bg-hover)', borderRadius: 8, overflow: 'hidden', display: 'flex', boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.12)', minWidth: 210 }}>
                        <div
                          className="cc-seg-bar"
                          style={{ width: '100%' }}
                          title={`${cc.nome}: ${formatarMoeda(cc.valor)}`}
                        >
                          {trackPct > 18 && (
                            <span className="despesa-seg-label">🏢 {formatarMoeda(cc.valor)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="receita-bar-total" style={{ color: '#ea580c' }}>{formatarMoeda(cc.valor)}</div>
                    <div className="receita-bar-pct">{cc.percentual.toFixed(1)}%</div>
                  </div>
                );
              })}
            </div>
          )}

          {gastosPorCentroCusto.length > 0 && (
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)', padding: '8px 0 0', borderTop: '1px solid var(--border)' }}>
              <span>🏢 Total Centros: <b style={{ color: '#ea580c' }}>{formatarMoeda(totalDespesas)}</b></span>
              <span>📍 {gastosPorCentroCusto.length} centros de custo</span>
            </div>
          )}
        </div>

        {/* GRÁFICO 3: Evolução dos Gastos do Ano */}
        <div className="bi-chart-container glass-panel hover-lift fade-in-up" style={{ animationDelay: '0.9s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
            <div>
              <h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                <TrendingDown size={18} color="#ef4444" /> Evolução dos Gastos ({ano})
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                Histórico mensal de gastos com destaque para o mês ativo ({MESES[mes]})
              </p>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                onClick={() => setModoEvolucao('ano')}
                style={{
                  padding: '5px 12px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: '1px solid ' + (modoEvolucao === 'ano' ? '#ef4444' : 'var(--border)'),
                  background: modoEvolucao === 'ano' ? '#ef4444' : 'var(--bg-hover)',
                  color: modoEvolucao === 'ano' ? '#ffffff' : 'var(--text-secondary)',
                  transition: 'all 0.2s'
                }}
              >
                Ano Completo (12M)
              </button>
              <button
                type="button"
                onClick={() => setModoEvolucao('ultimos6')}
                style={{
                  padding: '5px 12px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: '1px solid ' + (modoEvolucao === 'ultimos6' ? '#ef4444' : 'var(--border)'),
                  background: modoEvolucao === 'ultimos6' ? '#ef4444' : 'var(--bg-hover)',
                  color: modoEvolucao === 'ultimos6' ? '#ffffff' : 'var(--text-secondary)',
                  transition: 'all 0.2s'
                }}
              >
                Últimos 6 Meses
              </button>
            </div>
          </div>

          <div style={{ height: 320, width: '100%' }}>
            <ResponsiveContainer>
              <BarChart
                data={modoEvolucao === 'ano' ? evolucaoAno : evolucaoAno.slice(Math.max(0, mes >= 5 ? mes - 5 : 0), Math.max(6, mes + 1))}
                margin={{ top: 25, right: 20, left: 10, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="colorEvolucaoDesp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#dc2626" stopOpacity={0.5} />
                  </linearGradient>
                  <linearGradient id="colorEvolucaoSelected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f87171" stopOpacity={1} />
                    <stop offset="50%" stopColor="#ef4444" stopOpacity={1} />
                    <stop offset="100%" stopColor="#991b1b" stopOpacity={1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                <XAxis
                  dataKey="mes"
                  stroke="#94a3b8"
                  fontSize={12}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  tickFormatter={(v) => v >= 1000 ? `R$ ${(v / 1000).toFixed(0)}k` : `R$ ${v}`}
                  domain={[0, 'auto']}
                />
                <RechartsTooltip
                  cursor={{ fill: 'rgba(239, 68, 68, 0.08)' }}
                  content={({ active, payload, label }: any) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div style={{ background: '#0f172a', color: '#ffffff', padding: '10px 14px', borderRadius: 8, boxShadow: '0 4px 14px rgba(0,0,0,0.3)', border: '1px solid #334155' }}>
                          <p style={{ fontWeight: 800, color: '#ffffff', marginBottom: 4, fontSize: 13 }}>
                            {data.mesCompleto || label} ({ano}) {data.isSelected ? '★ Mês Selecionado' : ''}
                          </p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#f87171' }}>
                            <span>●</span> Despesas: <b style={{ color: '#ffffff' }}>{formatarMoeda(data.valor || 0)}</b>
                          </div>
                          {data.receitas > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#34d399', marginTop: 4 }}>
                              <span>●</span> Receitas: <b style={{ color: '#ffffff' }}>{formatarMoeda(data.receitas || 0)}</b>
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="valor" radius={[6, 6, 0, 0]} animationDuration={1000} barSize={32}>
                  {(modoEvolucao === 'ano' ? evolucaoAno : evolucaoAno.slice(Math.max(0, mes >= 5 ? mes - 5 : 0), Math.max(6, mes + 1))).map((entry, index) => (
                    <Cell
                      key={`cell-ev-${index}`}
                      fill={entry.isSelected ? 'url(#colorEvolucaoSelected)' : 'url(#colorEvolucaoDesp)'}
                      stroke={entry.isSelected ? '#991b1b' : 'transparent'}
                      strokeWidth={entry.isSelected ? 2 : 0}
                      style={{ filter: entry.isSelected ? 'drop-shadow(0 4px 8px rgba(239,68,68,0.45))' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
                    />
                  ))}
                  <LabelList
                    dataKey="valor"
                    position="top"
                    formatter={(v: any) => {
                      const num = Number(v) || 0;
                      return num > 0 ? formatarMoeda(num) : '';
                    }}
                    style={{ fill: '#475569', fontSize: 11, fontWeight: 700 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Mini resumo do ano */}
          <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, fontSize: 12, color: 'var(--text-secondary)', padding: '10px 0 0', borderTop: '1px solid var(--border)' }}>
            <span>🔴 Total Despesas ({ano}): <b style={{ color: '#ef4444' }}>{formatarMoeda(evolucaoAno.reduce((acc, m) => acc + m.valor, 0))}</b></span>
            <span>🟢 Total Receitas ({ano}): <b style={{ color: '#10b981' }}>{formatarMoeda(evolucaoAno.reduce((acc, m) => acc + m.receitas, 0))}</b></span>
            <span>⭐ Mês Ativo: <b style={{ color: '#ef4444' }}>{MESES[mes]}</b></span>
          </div>
        </div>

        {/* GRÁFICO 4: Evolução das Receitas do Ano */}
        <div className="bi-chart-container glass-panel hover-lift fade-in-up" style={{ animationDelay: '0.95s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
            <div>
              <h3 className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                <TrendingUp size={18} color="#10b981" /> Evolução das Receitas ({ano})
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                Histórico mensal de faturamento e entradas com destaque para o mês ativo ({MESES[mes]})
              </p>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                onClick={() => setModoEvolucaoReceitas('ano')}
                style={{
                  padding: '5px 12px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: '1px solid ' + (modoEvolucaoReceitas === 'ano' ? '#10b981' : 'var(--border)'),
                  background: modoEvolucaoReceitas === 'ano' ? '#10b981' : 'var(--bg-hover)',
                  color: modoEvolucaoReceitas === 'ano' ? '#ffffff' : 'var(--text-secondary)',
                  transition: 'all 0.2s'
                }}
              >
                Ano Completo (12M)
              </button>
              <button
                type="button"
                onClick={() => setModoEvolucaoReceitas('ultimos6')}
                style={{
                  padding: '5px 12px',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: '1px solid ' + (modoEvolucaoReceitas === 'ultimos6' ? '#10b981' : 'var(--border)'),
                  background: modoEvolucaoReceitas === 'ultimos6' ? '#10b981' : 'var(--bg-hover)',
                  color: modoEvolucaoReceitas === 'ultimos6' ? '#ffffff' : 'var(--text-secondary)',
                  transition: 'all 0.2s'
                }}
              >
                Últimos 6 Meses
              </button>
            </div>
          </div>

          <div style={{ height: 320, width: '100%' }}>
            <ResponsiveContainer>
              <BarChart
                data={modoEvolucaoReceitas === 'ano' ? evolucaoAno : evolucaoAno.slice(Math.max(0, mes >= 5 ? mes - 5 : 0), Math.max(6, mes + 1))}
                margin={{ top: 25, right: 20, left: 10, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="colorEvolucaoRec" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.5} />
                  </linearGradient>
                  <linearGradient id="colorEvolucaoRecSelected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity={1} />
                    <stop offset="50%" stopColor="#10b981" stopOpacity={1} />
                    <stop offset="100%" stopColor="#047857" stopOpacity={1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                <XAxis
                  dataKey="mes"
                  stroke="#94a3b8"
                  fontSize={12}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  tickFormatter={(v) => v >= 1000 ? `R$ ${(v / 1000).toFixed(0)}k` : `R$ ${v}`}
                  domain={[0, 'auto']}
                />
                <RechartsTooltip
                  cursor={{ fill: 'rgba(16, 185, 129, 0.08)' }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div style={{ background: '#0f172a', color: '#ffffff', padding: '10px 14px', borderRadius: 8, boxShadow: '0 4px 14px rgba(0,0,0,0.3)', border: '1px solid #334155' }}>
                          <p style={{ fontWeight: 800, color: '#ffffff', marginBottom: 4, fontSize: 13 }}>
                            {data.mesCompleto || label} ({ano}) {data.isSelected ? '★ Mês Selecionado' : ''}
                          </p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#34d399' }}>
                            <span>●</span> Receitas: <b style={{ color: '#ffffff' }}>{formatarMoeda(data.receitas || 0)}</b>
                          </div>
                          {data.valor > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#f87171', marginTop: 4 }}>
                              <span>●</span> Despesas: <b style={{ color: '#ffffff' }}>{formatarMoeda(data.valor || 0)}</b>
                            </div>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: data.saldo >= 0 ? '#6ee7b7' : '#fca5a5', marginTop: 4, borderTop: '1px solid #334155', paddingTop: 4 }}>
                            <span>Saldo Líquido:</span> <b style={{ color: '#ffffff' }}>{formatarMoeda(data.saldo || 0)}</b>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="receitas" radius={[6, 6, 0, 0]} animationDuration={1000} barSize={32}>
                  {(modoEvolucaoReceitas === 'ano' ? evolucaoAno : evolucaoAno.slice(Math.max(0, mes >= 5 ? mes - 5 : 0), Math.max(6, mes + 1))).map((entry, index) => (
                    <Cell
                      key={`cell-ev-rec-${index}`}
                      fill={entry.isSelected ? 'url(#colorEvolucaoRecSelected)' : 'url(#colorEvolucaoRec)'}
                      stroke={entry.isSelected ? '#047857' : 'transparent'}
                      strokeWidth={entry.isSelected ? 2 : 0}
                      style={{ filter: entry.isSelected ? 'drop-shadow(0 4px 8px rgba(16,185,129,0.45))' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
                    />
                  ))}
                  <LabelList
                    dataKey="receitas"
                    position="top"
                    formatter={(v) => {
                      const num = Number(v) || 0;
                      return num > 0 ? formatarMoeda(num) : '';
                    }}
                    style={{ fill: '#059669', fontSize: 11, fontWeight: 700 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Mini resumo do ano */}
          <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, fontSize: 12, color: 'var(--text-secondary)', padding: '10px 0 0', borderTop: '1px solid var(--border)' }}>
            <span>🟢 Total Receitas ({ano}): <b style={{ color: '#10b981' }}>{formatarMoeda(evolucaoAno.reduce((acc, m) => acc + m.receitas, 0))}</b></span>
            <span>📈 Média Mensal: <b style={{ color: '#059669' }}>{formatarMoeda(evolucaoAno.reduce((acc, m) => acc + m.receitas, 0) / 12)}</b></span>
            <span>⭐ Mês Ativo: <b style={{ color: '#10b981' }}>{MESES[mes]}</b></span>
          </div>
        </div>

      </div>

      {/* INDICADORES AUTOMÁTICOS & TABELA */}
      <div className="bi-bottom-section fade-in-up" style={{ animationDelay: '1.1s' }}>
        
        {/* INDICADORES */}
        <div className="bi-indicators-panel glass-panel">
          <h3 className="chart-title" style={{ marginBottom: 16 }}>Indicadores Automáticos</h3>
          <div className="indicators-grid">
            <div className="ind-item"><span>Maior Despesa</span> <b style={{color: '#ef4444'}}>{formatarMoeda(maiorLcto)}</b></div>
            <div className="ind-item"><span>Menor Despesa</span> <b style={{color: '#ef4444'}}>{formatarMoeda(menorLcto)}</b></div>
            <div className="ind-item"><span>Cat. Mais Gastou</span> <b style={{color: '#ef4444'}}>{catMaiorGasto?.nome || '-'}</b></div>
            <div className="ind-item"><span>Cat. Menos Gastou</span> <b style={{color: '#ef4444'}}>{catMenorGasto?.nome || '-'}</b></div>
            <div className="ind-item"><span>Receitas Pagas</span> <b style={{color: '#10b981'}}>{formatarMoeda(totalReceitas)}</b></div>
            <div className="ind-item"><span>Despesas Pagas</span> <b style={{color: '#ef4444'}}>{formatarMoeda(totalDespesas)}</b></div>
            <div className="ind-item"><span>Saldo do Mês</span> <b style={{color: '#1e3a8a'}}>{formatarMoeda(saldoMes)}</b></div>
            <div className="ind-item"><span>Média por Lcto.</span> <b style={{color: '#ef4444'}}>{qtdDespesas > 0 ? formatarMoeda(totalDespesas / qtdDespesas) : 'R$ 0,00'}</b></div>
            <div className="ind-item"><span>Receita Fixa</span> <b style={{color: '#10b981'}}>{formatarMoeda(totalReceitasFixas)}</b></div>
            <div className="ind-item"><span>Receita Variável</span> <b style={{color: '#06b6d4'}}>{formatarMoeda(totalReceitasVariaveis)}</b></div>
            <div className="ind-item"><span>Juros Pagos</span> <b style={{color: totalJurosMes > 0 ? '#ef4444' : 'var(--text-secondary)'}}>{formatarMoeda(totalJurosMes)}</b></div>
            <div className="ind-item"><span>Despesa Fixa</span> <b style={{color: '#ef4444'}}>{formatarMoeda(totalDespesasFixas)}</b></div>
            <div className="ind-item"><span>Despesa Variável</span> <b style={{color: '#f97316'}}>{formatarMoeda(totalDespesasVariaveis)}</b></div>
            <div className="ind-item"><span>Multas Pagas</span> <b style={{color: totalMultasMes > 0 ? '#ef4444' : 'var(--text-secondary)'}}>{formatarMoeda(totalMultasMes)}</b></div>
          </div>
        </div>

        {/* TABELA */}
        <div className="bi-table-panel glass-panel">
          <div className="table-header-controls">
            <h3 className="chart-title">Tabela Resumida</h3>
            <div className="table-actions">
              <div className="search-box">
                <Search size={16} />
                <input type="text" placeholder="Pesquisar categoria..." value={pesquisa} onChange={(e) => setPesquisa(e.target.value)} />
              </div>
              <button onClick={exportExcel} className="btn-export excel"><ArrowDownToLine size={14}/> Excel</button>
              <button onClick={exportPDF} className="btn-export pdf"><Printer size={14}/> PDF</button>
            </div>
          </div>
          
          <div className="table-responsive hide-scroll">
            <table className="bi-table">
              <thead>
                <tr>
                  <th onClick={() => {setOrdenacao('categoria'); setOrdemDesc(!ordemDesc)}}>Categoria {ordenacao === 'categoria' && <ChevronDown size={14} className={!ordemDesc ? 'rotate-180' : ''}/>}</th>
                  <th onClick={() => {setOrdenacao('quantidade'); setOrdemDesc(!ordemDesc)}}>Quantidade {ordenacao === 'quantidade' && <ChevronDown size={14} className={!ordemDesc ? 'rotate-180' : ''}/>}</th>
                  <th onClick={() => {setOrdenacao('valor'); setOrdemDesc(!ordemDesc)}}>Valor Total {ordenacao === 'valor' && <ChevronDown size={14} className={!ordemDesc ? 'rotate-180' : ''}/>}</th>
                  <th onClick={() => {setOrdenacao('percentual'); setOrdemDesc(!ordemDesc)}}>Percentual {ordenacao === 'percentual' && <ChevronDown size={14} className={!ordemDesc ? 'rotate-180' : ''}/>}</th>
                  <th onClick={() => {setOrdenacao('medio'); setOrdemDesc(!ordemDesc)}}>Valor Médio {ordenacao === 'medio' && <ChevronDown size={14} className={!ordemDesc ? 'rotate-180' : ''}/>}</th>
                </tr>
              </thead>
              <tbody>
                {dadosTabela.length > 0 ? dadosTabela.map((c, idx) => (
                  <tr key={idx}>
                    <td>{c.nome}</td>
                    <td>{c.qtd}</td>
                    <td style={{ fontWeight: 600 }}>{formatarMoeda(c.valor)}</td>
                    <td>
                      <div style={{display: 'flex', alignItems: 'center', gap: 6}}>
                        <div style={{flex: 1, height: 6, background: 'var(--bg-hover)', borderRadius: 3, overflow: 'hidden'}}>
                          <div style={{height: '100%', width: `${Math.min(c.percentual, 100)}%`, background: '#ef4444'}} />
                        </div>
                        <span style={{fontSize: 12, minWidth: 40}}>{c.percentual.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td>{formatarMoeda(c.medio)}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} style={{textAlign: 'center', padding: '20px !important'}}>Nenhum dado encontrado para o filtro.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
}