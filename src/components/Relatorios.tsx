'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area
} from 'recharts';
import { DynamicIcon } from '@/components/DynamicIcon';
import { getTransacoes, getCategorias, getCentrosCusto, getContas, getFornecedores, getClientes, getFaturas, formatarMoeda, getTenantId } from '@/lib/storage';
import { Transacao, Categoria, CentroCusto, Conta, Fornecedor, Cliente, Fatura } from '@/lib/types';
import { getValorFinal } from '@/lib/financialEngine';
import { calcularTotais, normalizeDate } from '@/lib/financialEngine';
import { FORMAS_PAGAMENTO_LABELS, MESES } from '@/lib/defaults';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Download, BarChart3, TrendingUp, PieChartIcon, RefreshCw, Calendar, Filter, FileText, FileSpreadsheet, ChevronDown, ChevronUp } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DREGerencial } from './DREGerencial';

type TipoRelatorio = 'mensal' | 'categorias' | 'fornecedores' | 'formas-pgto' | 'fluxo' | 'comparativo' | 'diario' | 'centros-custo' | 'dre';

export default function Relatorios() {
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [formasPgto, setFormasPgto] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipoRelatorio, setTipoRelatorio] = useState<TipoRelatorio>('mensal');
  
  // Listas para filtros
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [centrosCusto, setCentrosCusto] = useState<CentroCusto[]>([]);
  const [contas, setContas] = useState<Conta[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  
  // Estado dos filtros
  const [mostrarFiltros, setMostrarFiltros] = useState(true);
  const hoje = new Date();
  const [filtros, setFiltros] = useState({
    dataInicio: format(startOfMonth(hoje), 'yyyy-MM-dd'),
    dataFim: format(endOfMonth(hoje), 'yyyy-MM-dd'),
    categoriaId: '',
    centroCustoId: '',
    contaId: '',
    formaPagamento: '',
    contatoNome: '', // Cliente ou Fornecedor
    tipo: 'ambos', // despesa, receita, ambos
    status: 'pago', // todos, pago, pendente
    tipoData: 'pagamento' // vencimento, lancamento, pagamento
  });

  const fmt = formatarMoeda;

  const [faturas, setFaturas] = useState<Fatura[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [t, cats, ccs, conts, forns, clis, fats] = await Promise.all([
        getTransacoes(), getCategorias(), getCentrosCusto(), getContas(), getFornecedores(), getClientes(), getFaturas()
      ]);
      setTransacoes(t);
      setCategorias(cats);
      setCentrosCusto(ccs);
      setContas(conts);
      setFornecedores(forns);
      setClientes(clis);
      setFaturas(fats);
      setLoading(false);
    })();
  }, []);

  // Motor de filtragem
  const transacoesFiltradas = useMemo(() => {
    return transacoes.filter(t => {
      const rawRef = filtros.tipoData === 'lancamento' ? (t.dataLancamento || t.data) : 
                    filtros.tipoData === 'pagamento' ? (t.dataPagamento || t.data) :
                    (t.dataPagamento || t.dataVencimento || t.data);
        const dataRef = normalizeDate(rawRef);
        const matchData = dataRef >= filtros.dataInicio && dataRef <= filtros.dataFim;
      
      const matchCat = !filtros.categoriaId || t.categoriaId === filtros.categoriaId;
      const matchCC = !filtros.centroCustoId || t.centroCustoId === filtros.centroCustoId;
      const matchConta = !filtros.contaId || t.contaId === filtros.contaId;
      const matchForma = !filtros.formaPagamento || t.formaPagamento === filtros.formaPagamento;
      const matchTipo = filtros.tipo === 'ambos' || t.tipo === filtros.tipo;
      
      let matchStatus = true;
      if (filtros.status === 'pago') matchStatus = t.status === 'pago';
      if (filtros.status === 'pendente') matchStatus = t.status === 'pendente' || t.status === 'atrasado';

      const matchContato = !filtros.contatoNome || 
        (t.tipo === 'despesa' && t.fornecedorNome === filtros.contatoNome) || 
        (t.tipo === 'receita' && t.clienteNome === filtros.contatoNome);
        
      // Remover duplicidade de fatura (o gasto real já está registrado nos lançamentos individuais do cartão)
      if (t.categoriaNome === 'Pagamento de Fatura' || (t.descricao && t.descricao.includes('Pagamento de Fatura'))) return false;

      // Os lançamentos do cartão são duplicados como débitos bancários quando a fatura é paga.
      // Omitimos o lançamento original do cartão de crédito para evitar duplicidade na soma.
      // (Removido: Lançamentos de cartão DEVEM aparecer para categorizar corretamente as despesas)

      return matchData && matchCat && matchCC && matchConta && matchForma && matchContato && matchTipo && matchStatus;
    });
  }, [transacoes, filtros]);

  // Cálculos baseados nãos filtros (Em relatórios usamos soma direta, não o motor de saldos)
  const totalReceitas = transacoesFiltradas.filter(t => t.tipo === 'receita').reduce((acc, t) => acc + getValorFinal(t), 0);
  const totalDespesas = transacoesFiltradas.filter(t => t.tipo === 'despesa').reduce((acc, t) => acc + getValorFinal(t), 0);
  const saldo = totalReceitas - totalDespesas;

  // Por categoria (DESPESAS SEMPRE VERMELHAS)
  const CORES_DESPESAS = ['#cc0000', '#8b0000', '#dc2626', '#b91c1c', '#991b1b', '#ef4444', '#be123c', '#9f1239', '#881337'];
  const porCategoriaMap: Record<string, { valor: number; cor: string; icone: string; qtd: number }> = {};
  const isTargetTenant = ['master', '9yxuafoC0AV9BrIKem05ponbmgn2', 'autocred-promotora-de-credito'].includes(getTenantId());
    const despesasBase = transacoesFiltradas.filter(t => t.tipo === 'despesa' || (isTargetTenant && t.tipo === 'transferencia'));
  for (const t of despesasBase) {
    const cat = t.categoriaNome || 'Outros';
    if (!porCategoriaMap[cat]) porCategoriaMap[cat] = { valor: 0, cor: '#cc0000', icone: t.categoriaIcone || 'Package', qtd: 0 };
    porCategoriaMap[cat].valor += getValorFinal(t);
    porCategoriaMap[cat].qtd++;
  }
  const porCategoria = Object.entries(porCategoriaMap).sort((a, b) => b[1].valor - a[1].valor).map(([name, d], idx) => ({ name, ...d, cor: CORES_DESPESAS[idx % CORES_DESPESAS.length] }));

  // Por fornecedor
  const porFornecedorMap: Record<string, number> = {};
  transacoesFiltradas.filter(t => t.tipo === 'despesa' && t.fornecedorNome).forEach(t => {
    porFornecedorMap[t.fornecedorNome!] = (porFornecedorMap[t.fornecedorNome!] || 0) + getValorFinal(t);
  });
  const porFornecedor = Object.entries(porFornecedorMap).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([nome, valor]) => ({ nome, valor }));

  // Por centro de custo
  const porCCMap: Record<string, number> = {};
  transacoesFiltradas.filter(t => t.tipo === 'despesa' && t.centroCustoNome).forEach(t => {
    porCCMap[t.centroCustoNome!] = (porCCMap[t.centroCustoNome!] || 0) + getValorFinal(t);
  });
  const porCC = Object.entries(porCCMap).sort((a, b) => b[1] - a[1]).map(([nome, valor]) => ({ nome, valor }));

  // Por forma de pagamento
  const porFormaMap: Record<string, number> = {};
  transacoesFiltradas.filter(t => t.tipo === 'despesa').forEach(t => {
    const label = FORMAS_PAGAMENTO_LABELS[t.formaPagamento] || t.formaPagamento;
    porFormaMap[label] = (porFormaMap[label] || 0) + getValorFinal(t);
  });
  const porForma = Object.entries(porFormaMap).map(([nome, valor]) => ({ nome, valor }));

  // Diário
  const diasPeriodo: Record<string, { receitas: number; despesas: number }> = {};
  transacoesFiltradas.forEach(t => {
    const dia = t.data;
    if (!diasPeriodo[dia]) diasPeriodo[dia] = { receitas: 0, despesas: 0 };
    if (t.tipo === 'receita') diasPeriodo[dia].receitas += getValorFinal(t);
    else diasPeriodo[dia].despesas += getValorFinal(t);
  });
  const dadosDiarios = Object.entries(diasPeriodo).sort((a, b) => a[0].localeCompare(b[0])).map(([dia, d]) => ({ dia: dia.split('-')[2] + '/' + dia.split('-')[1], ...d }));

  const CORES = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', 'var(--primary)', '#06b6d4', '#f97316', '#ec4899', '#84cc16', '#14b8a6'];

  // ===== EXPORTAÇÕES =====

  const getTabelaExportacao = () => {
    return transacoesFiltradas.map(t => ({
      Data: t.data.split('-').reverse().join('/'),
      Tipo: t.tipo === 'receita' ? 'Receita' : 'Despesa',
      Descricao: t.descricao,
      Valor: getValorFinal(t),
      Categoria: t.categoriaNome || 'Outros',
      CentroCusto: t.centroCustoNome || '-',
      Conta: t.contaNome || '-',
      Pagamento: FORMAS_PAGAMENTO_LABELS[t.formaPagamento] || t.formaPagamento,
      Contato: t.tipo === 'receita' ? (t.clienteNome || '-') : (t.fornecedorNome || '-'),
      Status: t.status === 'pago' ? 'Pago' : 'Pendente'
    }));
  };

  const exportarCSV = () => {
    const dados = getTabelaExportacao();
    if (dados.length === 0) return alert('Nenhum dado para exportar.');
    const header = Object.keys(dados[0]).join(',');
    const rows = dados.map(d => Object.values(d).map(v => `"${v}"`).join(','));
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `relatorio-financeiro.csv`; a.click();
  };

  const exportarExcel = () => {
    const dados = getTabelaExportacao();
    if (dados.length === 0) return alert('Nenhum dado para exportar.');
    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Relatório");
    XLSX.writeFile(wb, "relatorio-financeiro.xlsx");
  };

  const exportarPDF = () => {
    const dados = getTabelaExportacao();
    if (dados.length === 0) return alert('Nenhum dado para exportar.');
    
    const doc = new jsPDF('landscape');
    
    doc.setFontSize(18);
    doc.text('Relatório Financeiro', 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Período: ${filtros.dataInicio.split('-').reverse().join('/')} a ${filtros.dataFim.split('-').reverse().join('/')}`, 14, 30);
    
    // Resumo
    doc.text(`Receitas: R$ ${totalReceitas.toFixed(2)} | Despesas: R$ ${totalDespesas.toFixed(2)} | Saldo: R$ ${saldo.toFixed(2)}`, 14, 36);

    const head = [['Data', 'Tipo', 'Descrição', 'Valor (R$)', 'Categoria', 'C.Custo', 'Conta', 'Pgto', 'Contato', 'Status']];
    const body = dados.map(d => [
      d.Data, d.Tipo, d.Descricao, d.Valor.toFixed(2), d.Categoria, d.CentroCusto, d.Conta, d.Pagamento, d.Contato, d.Status
    ]);

    autoTable(doc, {
      startY: 45,
      head: head,
      body: body,
      theme: 'grid',
      headStyles: { fillColor: [204, 0, 0] },
      styles: { fontSize: 8 },
    });

    doc.save('relatorio-financeiro.pdf');
  };

  const TIPOS_RELATORIO = [
    { id: 'mensal' as TipoRelatorio, label: '📅 Resumo', desc: 'Visão geral' },
    { id: 'dre' as TipoRelatorio, label: '📊 DRE Gerencial', desc: 'DRE Avançado' },
    { id: 'categorias' as TipoRelatorio, label: '🏷️ Categorias', desc: 'Por categoria' },
    { id: 'fornecedores' as TipoRelatorio, label: '💼 Contatos', desc: 'Top gastos' },
    { id: 'formas-pgto' as TipoRelatorio, label: '💳 Formas Pgto', desc: 'Como pagou' },
    { id: 'centros-custo' as TipoRelatorio, label: '🎯 Centro Custo', desc: 'Por área' },
    { id: 'diario' as TipoRelatorio, label: '📆 Diário', desc: 'Evolução' },
  ];

  const setFiltro = (campo: keyof typeof filtros, valor: string) => {
    setFiltros(f => ({ ...f, [campo]: valor }));
  };

  // Contatos combinados para o datalist
  const contatosSugestao = [...fornecedores.map(f => f.nome), ...clientes.map(c => c.nome)];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>Relatórios e Filtros</h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={exportarCSV} className="btn-secondary" title="Exportar CSV"><FileText size={15} /> CSV</button>
          <button onClick={exportarExcel} className="btn-secondary" style={{ background: 'rgba(204,0,0,0.06)', color: '#cc0000', borderColor: 'rgba(204,0,0,0.2)' }} title="Exportar Excel"><FileSpreadsheet size={15} /> Excel</button>
          <button onClick={exportarPDF} className="btn-primary" style={{ padding: '8px 16px', fontSize: 13 }} title="Exportar PDF"><Download size={15} /> Exportar PDF Oficial</button>
        </div>
      </div>

      {/* FILTROS AVANÇADOS */}
      <div className="glass" style={{ marginBottom: 24 }}>
        <div 
          onClick={() => setMostrarFiltros(!mostrarFiltros)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', paddingBottom: mostrarFiltros ? 16 : 0, borderBottom: mostrarFiltros ? '1px solid var(--border)' : 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)', fontWeight: 600 }}>
            <Filter size={16} /> Filtros Avançados
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, color: '#cc0000', fontWeight: 700 }}>{transacoesFiltradas.length} registros</span>
            {mostrarFiltros ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
          </div>
        </div>

        {mostrarFiltros && (
          <div style={{ paddingTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
            {/* Primeira Linha */}
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Data Início</label>
              <input type="date" className="input-field" value={filtros.dataInicio} onChange={e => setFiltro('dataInicio', e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Data Fim</label>
              <input type="date" className="input-field" value={filtros.dataFim} onChange={e => setFiltro('dataFim', e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Tipo de Transação</label>
              <select className="input-field" value={filtros.tipo} onChange={e => setFiltro('tipo', e.target.value)}>
                <option value="ambos">Todas</option>
                <option value="despesa">Despesas</option>
                <option value="receita">Receitas</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Categoria</label>
              <select className="input-field" value={filtros.categoriaId} onChange={e => setFiltro('categoriaId', e.target.value)}>
                <option value="">Todas</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Centro de Custo</label>
              <select className="input-field" value={filtros.centroCustoId} onChange={e => setFiltro('centroCustoId', e.target.value)}>
                <option value="">Todos</option>
                {centrosCusto.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            
            {/* Segunda Linha */}
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Conta</label>
              <select className="input-field" value={filtros.contaId} onChange={e => setFiltro('contaId', e.target.value)}>
                <option value="">Todas</option>
                {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Forma Pgto</label>
              <select className="input-field" value={filtros.formaPagamento} onChange={e => setFiltro('formaPagamento', e.target.value)}>
                <option value="">Todas</option>
                {Object.entries(FORMAS_PAGAMENTO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              {formasPgto.map((f: any) => <option key={f.id} value={f.nome}>{f.nome}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Considerar Data de</label>
              <select className="input-field" value={filtros.tipoData} onChange={e => setFiltro('tipoData', e.target.value as any)}>
                <option value="pagamento">Data do Pagamento</option>
                <option value="vencimento">Vencimento/Competência</option>
                <option value="lancamento">Lançamento da Compra</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Status</label>
              <select className="input-field" value={filtros.status} onChange={e => setFiltro('status', e.target.value as any)}>
                <option value="todos">Todos</option>
                <option value="pago">Pago / Recebido</option>
                <option value="pendente">A Pagar / Pendente</option>
              </select>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Cliente / Fornecedor</label>
              <input type="text" className="input-field" placeholder="Filtrar por nome" value={filtros.contatoNome} onChange={e => setFiltro('contatoNome', e.target.value)} list="contatos-list" />
              <datalist id="contatos-list">
                {contatosSugestao.map((c, i) => <option key={i} value={c} />)}
              </datalist>
            </div>
          </div>
        )}
      </div>

      {/* Resumo Rápido */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="glass" style={{ padding: 20 }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Receitas no período</p>
          <p style={{ fontSize: 24, fontWeight: 800, color: '#10b981' }}>{fmt(totalReceitas)}</p>
        </div>
        <div className="glass" style={{ padding: 20 }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Despesas no período</p>
          <p style={{ fontSize: 24, fontWeight: 800, color: '#ef4444' }}>{fmt(totalDespesas)}</p>
        </div>
        <div className="glass" style={{ padding: 20 }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Saldo no período</p>
          <p style={{ fontSize: 24, fontWeight: 800, color: saldo >= 0 ? '#10b981' : '#ef4444' }}>{fmt(saldo)}</p>
        </div>
      </div>

      {/* Navegação de Abas dos Gráficos */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {TIPOS_RELATORIO.map(t => (
          <button key={t.id} onClick={() => setTipoRelatorio(t.id)}
            style={{
              padding: '8px 16px', borderRadius: 10, cursor: 'pointer', fontSize: 12, fontWeight: 600,
              border: `1px solid ${tipoRelatorio === t.id ? 'rgba(99,102,241,0.4)' : 'var(--border)'}`,
              background: tipoRelatorio === t.id ? 'rgba(99,102,241,0.1)' : 'var(--bg-glass)',
              color: tipoRelatorio === t.id ? '#818cf8' : 'var(--text-muted)', transition: 'all 0.15s',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="glass" style={{ padding: 24, borderRadius: 24, minHeight: 400, overflow: 'hidden' }}>
        {tipoRelatorio === 'dre' && (
          <div style={{ marginTop: 24 }}>
             {/* Dynamic import do DREGerencial que acabei de criar, mas vou importar não topo se quiser ou renderizar inline, vou importar não topo */}
             <DREGerencial transacoes={transacoesFiltradas} dataInicio={filtros.dataInicio} dataFim={filtros.dataFim} />
          </div>
        )}
        {tipoRelatorio === 'mensal' && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 24, textAlign: 'center' }}>Visão Geral do Período Filtrado</h2>
            {transacoesFiltradas.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', padding: '40px 0' }}>Nenhum dado encontrado para os filtros atuais.</p>
            ) : (
              <div className="grid-responsive-2" style={{ gap: 20 }}>
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 16 }}>Top Despesas por Categoria</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {porCategoria.slice(0, 5).map((c, i) => (
                      <div key={i}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 13, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 4 }}><DynamicIcon name={c.icone} size={13} /> {c.name}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{fmt(c.valor)}</span>
                        </div>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${totalDespesas > 0 ? (c.valor / totalDespesas) * 100 : 0}%`, background: c.cor }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 16 }}>Evolução Diária</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={dadosDiarios}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-glass)" />
                      <XAxis dataKey="dia" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip labelStyle={{ color: '#fff', fontWeight: 'bold' }}  contentStyle={{ background: '#1f2937', border: '1px solid var(--border-hover)', borderRadius: 10 }} formatter={(v: unknown) => [fmt(Number(v))]} />
                      <Area type="monotone" dataKey="despesas" stroke="#ef4444" fill="rgba(239,68,68,0.1)" strokeWidth={2} name="Despesas" />
                      <Area type="monotone" dataKey="receitas" stroke="#10b981" fill="transparent" strokeWidth={2} strokeDasharray="4 4" name="Receitas" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}

        {tipoRelatorio === 'categorias' && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 24, textAlign: 'center' }}>Por Categoria (Despesas)</h2>
            <div className="grid-responsive-2" style={{ gap: 24 }}>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={porCategoria} dataKey="valor" nameKey="name" cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={4}>
                    {porCategoria.map((c, i) => <Cell key={i} fill={c.cor} />)}
                  </Pie>
                  <Tooltip labelStyle={{ color: '#fff', fontWeight: 'bold' }}  contentStyle={{ background: '#1f2937', border: '1px solid var(--border-hover)', borderRadius: 10 }} formatter={(v: unknown) => [fmt(Number(v))]} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {porCategoria.map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-glass)', borderRadius: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: c.cor + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.cor, fontSize: 16 }}><DynamicIcon name={c.icone} size={16} /></div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</p>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.qtd} {c.qtd === 1 ? 'lançamento' : 'lançamentos'}</p>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#ef4444' }}>{fmt(c.valor)}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{totalDespesas > 0 ? ((c.valor / totalDespesas) * 100).toFixed(1) : 0}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tipoRelatorio === 'fornecedores' && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 24, textAlign: 'center' }}>Top 10 Contatos (Despesas)</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={porFornecedor} layout="vertical" margin={{ left: 50 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--bg-glass)" />
                <XAxis type="number" tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="nome" type="category" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip labelStyle={{ color: '#fff', fontWeight: 'bold' }}  contentStyle={{ background: '#1f2937', border: '1px solid var(--border-hover)', borderRadius: 10 }} formatter={(v: unknown) => [fmt(Number(v))]} />
                <Bar dataKey="valor" fill="#ef4444" radius={[0, 4, 4, 0]} name="Gasto Total" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {tipoRelatorio === 'formas-pgto' && (
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 }}>Por Forma de Pagamento (Despesas)</h2>
            <div className="grid-responsive-2" style={{ gap: 24 }}>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={porForma} dataKey="valor" nameKey="nome" cx="50%" cy="50%" outerRadius={100} paddingAngle={3}>
                    {porForma.map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]} />)}
                  </Pie>
                  <Tooltip labelStyle={{ color: '#fff', fontWeight: 'bold' }}  contentStyle={{ background: '#1f2937', border: '1px solid var(--border-hover)', borderRadius: 10 }} formatter={(v: unknown) => [fmt(Number(v))]} />
                  <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'center' }}>
                {porForma.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-glass)', borderRadius: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: CORES[i % CORES.length] }} />
                      <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{f.nome}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{fmt(f.valor)}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{totalDespesas > 0 ? ((f.valor / totalDespesas) * 100).toFixed(1) : 0}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tipoRelatorio === 'centros-custo' && (
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 }}>Por Centro de Custo (Despesas)</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={porCC}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-glass)" />
                <XAxis dataKey="nome" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v.toFixed(0)}`} />
                <Tooltip labelStyle={{ color: '#fff', fontWeight: 'bold' }}  contentStyle={{ background: '#1f2937', border: '1px solid var(--border-hover)', borderRadius: 10 }} formatter={(v: unknown) => [fmt(Number(v))]} />
                <Bar dataKey="valor" fill="var(--primary)" radius={[4, 4, 0, 0]} name="Total" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {tipoRelatorio === 'diario' && (
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 }}>Análise Diária do Período</h2>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={dadosDiarios}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-glass)" />
                <XAxis dataKey="dia" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v.toFixed(0)}`} />
                <Tooltip labelStyle={{ color: '#fff', fontWeight: 'bold' }}  contentStyle={{ background: '#1f2937', border: '1px solid var(--border-hover)', borderRadius: 10 }} formatter={(v: unknown) => [fmt(Number(v))]} />
                <Area type="monotone" dataKey="despesas" stroke="#ef4444" fill="rgba(239,68,68,0.1)" strokeWidth={2} name="Despesas" />
                <Area type="monotone" dataKey="receitas" stroke="#10b981" fill="transparent" strokeWidth={2} strokeDasharray="5 5" name="Receitas" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {(getTenantId() === 'autocred-promotora-de-credito' || getTenantId() === 'master' || getTenantId() === '9yxuafoC0AV9BrIKem05ponbmgn2') && (
          <div style={{ marginTop: 40, padding: 24, background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 16, color: '#1e293b' }}>Relatório Detalhado de Lançamentos</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>
                    <th style={{ padding: '12px 8px', fontWeight: 700 }}>Data</th>
                    <th style={{ padding: '12px 8px', fontWeight: 700 }}>Descrição</th>
                    <th style={{ padding: '12px 8px', fontWeight: 700 }}>Categoria</th>
                    <th style={{ padding: '12px 8px', fontWeight: 700 }}>Conta</th>
                    <th style={{ padding: '12px 8px', fontWeight: 700, textAlign: 'right' }}>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {transacoesFiltradas.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime()).map(t => (
                    <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 8px', color: '#475569' }}>{t.data.split('-').reverse().join('/')}</td>
                      <td style={{ padding: '12px 8px' }}>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{t.descricao}</div>
                        {t.fornecedorNome && <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{t.fornecedorNome}</div>}
                      </td>
                      <td style={{ padding: '12px 8px', color: '#475569' }}>{t.categoriaNome || '-'}</td>
                      <td style={{ padding: '12px 8px', color: '#475569' }}>{t.contaNome || '-'}</td>
                      <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 700, color: t.tipo === 'receita' ? '#16a34a' : '#dc2626' }}>
                        {t.tipo === 'receita' ? '+' : '-'}{fmt(getValorFinal(t))}
                      </td>
                    </tr>
                  ))}
                  {transacoesFiltradas.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: '24px 8px', textAlign: 'center', color: '#94a3b8' }}>
                        Nenhum lançamento no período filtrado.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#f8fafc' }}>
                    <td colSpan={4} style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 700, color: '#475569' }}>TOTAL RECEITAS:</td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 800, color: '#16a34a' }}>{fmt(totalReceitas)}</td>
                  </tr>
                  <tr style={{ background: '#f8fafc' }}>
                    <td colSpan={4} style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 700, color: '#475569' }}>TOTAL DESPESAS:</td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 800, color: '#dc2626' }}>{fmt(totalDespesas)}</td>
                  </tr>
                  <tr style={{ background: '#f1f5f9' }}>
                    <td colSpan={4} style={{ padding: '16px 8px', textAlign: 'right', fontWeight: 800, color: '#1e293b', fontSize: 14 }}>SALDO LÍQUIDO DO PERÍODO:</td>
                    <td style={{ padding: '16px 8px', textAlign: 'right', fontWeight: 900, color: saldo >= 0 ? '#16a34a' : '#dc2626', fontSize: 15 }}>{fmt(saldo)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
