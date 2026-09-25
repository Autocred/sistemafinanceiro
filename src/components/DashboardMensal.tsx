'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, 
  LabelList, Legend
} from 'recharts';
import { 
  Calendar, CalendarDays, DollarSign, FileText, BarChart3, TrendingUp, TrendingDown,
  ChevronDown, Search, ArrowDownToLine, Printer, CheckCircle2, Building2
} from 'lucide-react';
import { format, parseISO, isSameMonth, isSameYear, getMonth, getYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { subscribeTransacoes, formatarMoeda } from '@/lib/storage';
import { normalizeDate } from '@/lib/financialEngine';
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
        if (statusFiltro === 'pago' && t.status !== 'pago') return false;
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

  // Cálculos Básicos
  const despesas = txMes.filter(t => t.tipo === 'despesa' && t.status === 'pago' && t.categoriaNome !== 'Pagamento de Fatura' && t.formaPagamento !== 'cartao_credito');
  const receitas = txMes.filter(t => t.tipo === 'receita' && t.status === 'pago');
  
  const totalDespesas = despesas.reduce((acc, t) => acc + (Number(t.valor) || 0), 0);
  const totalReceitas = receitas.reduce((acc, t) => acc + (Number(t.valor) || 0), 0);
  const saldoMes = totalReceitas - totalDespesas;
  
  const qtdDespesas = despesas.length;
  
  const gastosPorCentroCusto = useMemo(() => {
    const mapa = new Map<string, { total: number; qtd: number }>();
    despesas.forEach(d => {
      const cc = d.centroCustoNome || d.centroCustoId || 'Não Informado';
      const atual = mapa.get(cc) || { total: 0, qtd: 0 };
      mapa.set(cc, { total: atual.total + (Number(d.valor) || 0), qtd: atual.qtd + 1 });
    });
    return Array.from(mapa.entries()).map(([nome, dados]) => ({
      nome, valor: dados.total, qtd: dados.qtd, percentual: totalDespesas > 0 ? (dados.total / totalDespesas) * 100 : 0
    })).sort((a, b) => b.valor - a.valor);
  }, [despesas, totalDespesas]);

  const gastosPorCategoria = useMemo(() => {
    const mapa = new Map<string, { total: number; qtd: number }>();
    despesas.forEach(d => {
      const cat = d.categoriaNome || d.categoriaId || 'Outros';
      const atual = mapa.get(cat) || { total: 0, qtd: 0 };
      mapa.set(cat, { total: atual.total + (Number(d.valor) || 0), qtd: atual.qtd + 1 });
    });
    const array = Array.from(mapa.entries()).map(([nome, dados]) => ({
      nome,
      valor: dados.total,
      qtd: dados.qtd,
      percentual: totalDespesas > 0 ? (dados.total / totalDespesas) * 100 : 0,
      medio: dados.qtd > 0 ? dados.total / dados.qtd : 0
    }));
    return array.sort((a, b) => b.valor - a.valor);
  }, [despesas, totalDespesas]);

  const catMaiorGasto = gastosPorCategoria.length > 0 ? gastosPorCategoria[0] : null;
  const catMenorGasto = gastosPorCategoria.length > 0 ? gastosPorCategoria[gastosPorCategoria.length - 1] : null;

  // Evolução Ano (Despesas)
  const evolucaoAno = useMemo(() => {
    const dados = MESES.map((nome, idx) => {
      const txMesAtual = txAno.filter(t => {
      const mesStr = `${ano}-${String(idx + 1).padStart(2, '0')}`;
      
      if (t.tipo !== 'despesa' || t.formaPagamento === 'cartao_credito' || t.categoriaNome === 'Pagamento de Fatura') return false;
      if (!normalizeDate(t.dataPagamento || t.dataVencimento || t.data || '').startsWith(mesStr)) return false;
      
      if (statusFiltro !== 'Todos') {
        if (statusFiltro === 'pago' && t.status !== 'pago') return false;
        if (statusFiltro === 'pendente' && t.status !== 'pendente') return false;
      }
      
      const cat = t.categoriaNome || t.categoriaId || 'Outros';
      if (categoriaFiltro !== 'Todas' && cat !== categoriaFiltro) return false;
      
      const cc = t.centroCustoNome || t.centroCustoId || 'Não Informado';
      if (centroCustoFiltro !== 'Todos' && cc !== centroCustoFiltro) return false;
      
      return true;
    });
      const total = txMesAtual.reduce((acc, t) => acc + (Number(t.valor) || 0), 0);
      return { mes: nome, valor: total, isSelected: idx === mes };
    });
    return dados;
  }, [txAno, mes]);

  const receitasXDespesas = useMemo(() => {
    return [
      { name: 'Receitas', valor: totalReceitas, color: '#10b981' },
      { name: 'Despesas', valor: totalDespesas, color: '#ef4444' },
      { name: 'Saldo', valor: saldoMes, color: 'var(--primary)' }
    ];
  }, [totalReceitas, totalDespesas, saldoMes]);

  const resumoInteligente = useMemo(() => {
    const totalDespPrev = txMesPassado.filter(t => t.tipo === 'despesa').reduce((acc, t) => acc + (Number(t.valor) || 0), 0);
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
    const v = Number(d.valor) || 0;
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
      <div className="bi-cards-grid">
        <div className="bi-card card-blue glass-panel hover-lift fade-in-up" style={{ animationDelay: '0.2s' }}>
          <div className="card-icon"><DollarSign size={24} /></div>
          <div className="card-info">
            <h3>Total Gasto no Mês</h3>
            <h2>{formatarMoeda(totalDespesas)}</h2>
          </div>
        </div>
        <div className="bi-card card-green glass-panel hover-lift fade-in-up" style={{ animationDelay: '0.3s' }}>
          <div className="card-icon"><FileText size={24} /></div>
          <div className="card-info">
            <h3>Quantidade de Despesas</h3>
            <h2>{qtdDespesas} lançamentos</h2>
          </div>
        </div>
        <div className="bi-card card-orange glass-panel hover-lift fade-in-up" style={{ animationDelay: '0.4s' }}>
          <div className="card-icon"><BarChart3 size={24} /></div>
          <div className="card-info">
            <h3>Categoria com Maior Gasto</h3>
            <h2>{catMaiorGasto ? catMaiorGasto.nome : '-'}</h2>
            <p>{catMaiorGasto ? formatarMoeda(catMaiorGasto.valor) : ''}</p>
          </div>
        </div>
        <div className="bi-card card-purple glass-panel hover-lift fade-in-up" style={{ animationDelay: '0.5s' }}>
          <div className="card-icon"><TrendingUp size={24} /></div>
          <div className="card-info">
            <h3>Média Diária de Gastos</h3>
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

      {/* CHARTS GRID */}
      <div className="bi-charts-grid" style={{ gridTemplateColumns: '1fr' }}>
        
        {/* GRÁFICO 1: Gastos por Categoria */}
        <div className="bi-chart-container glass-panel hover-lift fade-in-up" style={{ animationDelay: '0.7s' }}>
          <h3 className="chart-title">Gastos por Categoria</h3>
          <div style={{ height: Math.max(250, gastosPorCategoria.length * 60 + 40), width: '100%' }}>
            <ResponsiveContainer>
              <BarChart layout="vertical" data={gastosPorCategoria} margin={{ top: 20, right: 120, left: 30, bottom: 5 }}>
                <defs>
                  {gastosPorCategoria.map((entry, index) => (
                    <linearGradient key={`grad-${index}`} id={`colorUv-${index}`} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="5%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.9}/>
                      <stop offset="95%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.5}/>
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--border)" opacity={0.4} />
                <XAxis type="number" hide />
                <YAxis dataKey="nome" type="category" stroke="var(--text-secondary)" fontSize={13} tickLine={false} axisLine={false} width={130} interval={0} />
                <RechartsTooltip content={customTooltip3D} cursor={{fill: 'var(--bg-hover)'}} />
                <Bar dataKey="valor" radius={[0, 6, 6, 0]} animationDuration={1500} barSize={25}>
                  {gastosPorCategoria.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={`url(#colorUv-${index})`} style={{ filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.1))' }} />
                  ))}
                  <LabelList dataKey="valor" position="right" formatter={(v: any) => formatarMoeda(Number(v) || 0)} style={{ fill: 'var(--text-primary)', fontSize: 13, fontWeight: 'bold' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRÁFICO 2: Gastos por Centro de Custo */}
        <div className="bi-chart-container glass-panel hover-lift fade-in-up" style={{ animationDelay: '0.8s' }}>
          <h3 className="chart-title">Gastos por Centro de Custo</h3>
          <div style={{ height: Math.max(250, gastosPorCategoria.length * 60 + 40), width: '100%' }}>
            <ResponsiveContainer>
              <BarChart layout="vertical" data={gastosPorCentroCusto} margin={{ top: 20, right: 120, left: 30, bottom: 5 }}>
                <defs>
                  {gastosPorCentroCusto.map((entry, index) => (
                    <linearGradient key={`grad-cc-${index}`} id={`colorCc-${index}`} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="5%" stopColor={COLORS[(index + 3) % COLORS.length]} stopOpacity={0.9}/>
                      <stop offset="95%" stopColor={COLORS[(index + 3) % COLORS.length]} stopOpacity={0.5}/>
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--border)" opacity={0.4} />
                <XAxis type="number" hide />
                <YAxis dataKey="nome" type="category" stroke="var(--text-secondary)" fontSize={13} tickLine={false} axisLine={false} width={130} interval={0} />
                <RechartsTooltip content={customTooltip3D} cursor={{fill: 'var(--bg-hover)'}} />
                <Bar dataKey="valor" radius={[0, 6, 6, 0]} animationDuration={1500} barSize={25}>
                  {gastosPorCentroCusto.map((entry, index) => (
                    <Cell key={`cell-cc-${index}`} fill={`url(#colorCc-${index})`} style={{ filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.1))' }} />
                  ))}
                  <LabelList dataKey="valor" position="right" formatter={(v: any) => formatarMoeda(Number(v) || 0)} style={{ fill: 'var(--text-primary)', fontSize: 13, fontWeight: 'bold' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRÁFICO 3: Evolução dos Gastos do Ano */}
        <div className="bi-chart-container glass-panel hover-lift fade-in-up" style={{ animationDelay: '0.9s' }}>
          <h3 className="chart-title">Evolução dos Gastos (Últimos Meses)</h3>
          <div style={{ height: Math.max(250, gastosPorCentroCusto.length * 60 + 40), width: '100%' }}>
            <ResponsiveContainer>
              <BarChart data={evolucaoAno.slice(Math.max(0, mes - 5), mes + 1)} margin={{ top: 30, right: 30, left: 20, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorEvolucao" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.9}/>
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.4}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.4} />
                <XAxis dataKey="mes" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis hide />
                <RechartsTooltip cursor={{fill: 'var(--bg-hover)'}} content={({ active, payload, label }: any) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bi-tooltip">
                        <p className="title">{label}</p>
                        <div className="row"><span className="dot" style={{background: payload[0].color || payload[0].fill}}/> Total: <b>{formatarMoeda(payload[0].value || 0)}</b></div>
                      </div>
                    );
                  }
                  return null;
                }} />
                <Bar dataKey="valor" radius={[6, 6, 0, 0]} animationDuration={1500} barSize={40}>
                  {evolucaoAno.slice(Math.max(0, mes - 5), mes + 1).map((entry, index) => (
                    <Cell key={`cell-ev-${index}`} fill={entry.isSelected ? 'var(--primary)' : 'url(#colorEvolucao)'} style={{ filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.1))' }} />
                  ))}
                  <LabelList dataKey="valor" position="top" formatter={(v: any) => formatarMoeda(Number(v) || 0)} style={{ fill: 'var(--text-primary)', fontSize: 12, fontWeight: 'bold' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* INDICADORES AUTOMÁTICOS & TABELA */}
      <div className="bi-bottom-section fade-in-up" style={{ animationDelay: '1.1s' }}>
        
        {/* INDICADORES */}
        <div className="bi-indicators-panel glass-panel">
          <h3 className="chart-title" style={{ marginBottom: 16 }}>Indicadores Automáticos</h3>
          <div className="indicators-grid">
            <div className="ind-item"><span>Maior Despesa</span> <b>{formatarMoeda(maiorLcto)}</b></div>
            <div className="ind-item"><span>Menor Despesa</span> <b>{formatarMoeda(menorLcto)}</b></div>
            <div className="ind-item"><span>Cat. Mais Gastou</span> <b>{catMaiorGasto?.nome || '-'}</b></div>
            <div className="ind-item"><span>Cat. Menos Gastou</span> <b>{catMenorGasto?.nome || '-'}</b></div>
            <div className="ind-item"><span>Receitas Pagas</span> <b style={{color: '#10b981'}}>{formatarMoeda(totalReceitas)}</b></div>
            <div className="ind-item"><span>Despesas Pagas</span> <b style={{color: '#ef4444'}}>{formatarMoeda(totalDespesas)}</b></div>
            <div className="ind-item"><span>Saldo do Mês</span> <b style={{color: saldoMes >= 0 ? '#10b981' : '#ef4444'}}>{formatarMoeda(saldoMes)}</b></div>
            <div className="ind-item"><span>Média por Lcto.</span> <b>{qtdDespesas > 0 ? formatarMoeda(totalDespesas / qtdDespesas) : 'R$ 0,00'}</b></div>
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
                          <div style={{height: '100%', width: `${Math.min(c.percentual, 100)}%`, background: COLORS[idx % COLORS.length]}} />
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