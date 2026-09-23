'use client';

import { useState, useEffect, useMemo } from 'react';
import { getTransacoes, getContas, formatarMoeda, getTenantId } from '@/lib/storage';
import { Transacao, Conta } from '@/lib/types';
import {
  FileText, Download, Search, Calendar,
  ArrowUpCircle, ArrowDownCircle, RefreshCw, Filter, ShieldCheck
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ordenarMovimentacoesDesc, ordenarVencimentosAsc } from '@/lib/sorting';
import { normalizeDate } from '@/lib/financialEngine';
import { gerarExtrato } from '@/lib/financialEngine';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export default function ExtratoBancario() {
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [contas, setContas] = useState<Conta[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [contaFiltro, setContaFiltro] = useState<string>('todas');
  const [tipoFiltro, setTipoFiltro] = useState<string>('todos');
  const [busca, setBusca] = useState('');
  const [tipoData, setTipoData] = useState<string>('pagamento');
  const [periodo, setPeriodo] = useState<string>('mes_atual');
  const hojeDate = new Date();
  const [dataInicio, setDataInicio] = useState(format(startOfMonth(hojeDate), 'yyyy-MM-dd'));
  const [dataFim, setDataFim] = useState(format(endOfMonth(hojeDate), 'yyyy-MM-dd'));

  const fmt = formatarMoeda;

  useEffect(() => {
    let unsubTrans: () => void;
    let unsubContas: () => void;
    (async () => {
      setLoading(true);
      const { subscribeTransacoes, subscribeContas } = await import('@/lib/storage');
      unsubTrans = subscribeTransacoes(data => {
        setTransacoes(data);
        setLoading(false);
      });
      unsubContas = subscribeContas(data => {
        setContas(data);
      });
    })();
    return () => {
      if (unsubTrans) unsubTrans();
      if (unsubContas) unsubContas();
    };
  }, []);

  // Filtragem e ordenação cronológica crescente para cálculo de saldo progressivo
  const transacoesFiltradas = useMemo(() => {
    // 1. Normalizar dataExtrato para TODAS as transações
    let result = transacoes.map(t => ({
      ...t,
      dataExtrato: normalizeDate(
        tipoData === 'pagamento' ? (t.dataPagamento || t.data) :
        tipoData === 'lancamento' ? (t.dataLancamento || t.data) :
        tipoData === 'vencimento' ? (t.dataVencimento || t.data) :
        (t.dataPagamento || t.dataLancamento || t.dataVencimento || t.data)
      )
    }));

    // 2. Apenas pagas não Extrato Bancário
    result = result.filter(t => t.status === 'pago');

    const agora = new Date();
    const hojeStr = format(agora, 'yyyy-MM-dd');
    const mesStr = format(agora, 'yyyy-MM');

    // 3. Filtro por período usando a data efetiva do extrato
    if (periodo === 'hoje') {
      result = result.filter(t => t.dataExtrato === hojeStr);
    } else if (periodo === 'ultimos_7') {
      const seteDiasAtras = format(subDays(agora, 7), 'yyyy-MM-dd');
      result = result.filter(t => t.dataExtrato >= seteDiasAtras && t.dataExtrato <= hojeStr);
    } else if (periodo === 'mes_atual') {
      result = result.filter(t => String(t.dataExtrato || '').startsWith(mesStr));
    } else if (periodo === 'mes_anterior') {
      const mesAntStr = format(subMonths(agora, 1), 'yyyy-MM');
      result = result.filter(t => String(t.dataExtrato || '').startsWith(mesAntStr));
    } else if (periodo === 'ultimos_30') {
      const trintaDiasAtras = format(subDays(agora, 30), 'yyyy-MM-dd');
      result = result.filter(t => String(t.dataExtrato || '') >= trintaDiasAtras && String(t.dataExtrato || '') <= hojeStr);
    } else if (periodo === 'ultimos_90') {
      const noventaDiasAtras = format(subDays(agora, 90), 'yyyy-MM-dd');
      result = result.filter(t => String(t.dataExtrato || '') >= noventaDiasAtras && String(t.dataExtrato || '') <= hojeStr);
    } else if (periodo === 'este_ano') {
      const anoStr = format(agora, 'yyyy');
      result = result.filter(t => String(t.dataExtrato || '').startsWith(anoStr));
    } else if (periodo === 'personalizado') {
      if (dataInicio) result = result.filter(t => t.dataExtrato >= dataInicio);
      if (dataFim) result = result.filter(t => t.dataExtrato <= dataFim);
    }

    // 4. Filtro por conta
    if (contaFiltro !== 'todas') {
      result = result.filter(t => t.contaId === contaFiltro || t.contaDestinãoId === contaFiltro);
    }

    // 5. Filtro por tipo
    if (tipoFiltro !== 'todos') {
      result = result.filter(t => t.tipo === tipoFiltro);
    }

    // 6. Busca textual
    if (busca.trim()) {
      const q = busca.toLowerCase();
      result = result.filter(t =>
        (t.descricao || '').toLowerCase().includes(q) ||
        (t.categoriaNome && t.categoriaNome.toLowerCase().includes(q)) ||
        (t.fornecedorNome && t.fornecedorNome.toLowerCase().includes(q)) ||
        (t.clienteNome && t.clienteNome.toLowerCase().includes(q))
      );
    }

    // 7. Ordena da mais antiga para a mais recente baseado na data do extrato
    result = result.sort((a, b) => a.dataExtrato.localeCompare(b.dataExtrato));

    return result;
  }, [transacoes, contaFiltro, tipoFiltro, busca, periodo, dataInicio, dataFim]);

  // Cálculo de Saldo Progressivo
  const { extratoComSaldo, totalEntradas, totalSaidas, saldoFinal } = useMemo(() => {
    return gerarExtrato(transacoesFiltradas, contaFiltro);
  }, [transacoesFiltradas, contaFiltro]);

  const handleExportPDF = async () => {
    const { gerarPDFExtrato } = await import('@/lib/pdf-generator');
    gerarPDFExtrato(extratoComSaldo, {
      totalEntradas,
      totalSaidas,
      saldoFinal,
      contaNome: contaFiltro === 'todas' ? 'Todas as Contas' : (contas.find(c => c.id === contaFiltro)?.nome || 'Conta'),
      periodo: periodo === 'personalizado' ? `${dataInicio} até ${dataFim}` : periodo.replace('_', ' ').toUpperCase()
    });
  };

  const handleExportCSV = () => {
    const header = 'Data,Descrição,Tipo,Categoria,Forma Pgto,Conta,Valor (R$),Saldo Acumulado (R$)\n';
    const rows = extratoComSaldo.map(t =>
      `${t.data},"${t.descricao}",${t.tipo},"${t.categoriaNome || ''}",${t.formaPagamento},"${t.contaNome || ''}",${t.tipo === 'transferencia' && contaFiltro === 'todas' && ['master', '9yxuafoC0AV9BrIKem05ponbmgn2', 'autocred-promotora-de-credito'].includes(getTenantId()) ? (-t.valor).toFixed(2) : t.impacto.toFixed(2)},${t.saldoApos.toFixed(2)}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `extrato-bancario-${new Date().toISOString().split('T')[0]}.csv`; a.click();
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Carregando extrato bancário...</div>;
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 60 }}>
      {/* CABEÇALHO DO EXTRATO BANCÁRIO */}
      <div style={{ background: 'linear-gradient(135deg, #cc0000 0%, #8b0000 100%)', borderRadius: 20, padding: '24px 28px', color: 'white', marginBottom: 24, boxShadow: '0 8px 24px rgba(204,0,0,0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <FileText size={24} color="#ffd700" />
              <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>Extrato Financeiro Oficial</h1>
              <span className="badge badge-gold" style={{ fontSize: 11 }}>Padrão Bancário ERP Pro</span>
            </div>
            <p style={{ fontSize: 13, color: '#fceaea', opacity: 0.9 }}>
              Demonstrativo consolidado de movimentações com saldo progressivo e conciliação em tempo real.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={handleExportPDF} className="btn-secondary" style={{ background: 'white', color: '#cc0000', borderColor: 'white', fontSize: 13, fontWeight: 700 }}>
              <Download size={15} /> Exportar PDF Oficial
            </button>
            <button onClick={handleExportCSV} className="btn-secondary" style={{ background: 'rgba(255,255,255,0.15)', color: 'white', borderColor: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
              <FileText size={15} /> Excel / CSV
            </button>
          </div>
        </div>

        {/* CARDS DE RESUMO DO EXTRATO */}
        <div className="grid-responsive-3" style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.15)' }}>
          {/* ENTRADAS CONFIRMADAS */}
          <div style={{ background: 'linear-gradient(135deg, #166534, #15803d)', padding: 16, borderRadius: 12, border: '1px solid #22c55e' }}>
            <p style={{ fontSize: 11, color: '#dcfce7', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Entradas Confirmadas</p>
            <p style={{ fontSize: 20, fontWeight: 800, color: '#ffffff', marginTop: 4 }}>+{fmt(totalEntradas)}</p>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '14px 18px', borderRadius: 14 }}>
            <p style={{ fontSize: 11, color: '#fceaea', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Saídas e Débitos</p>
            <p style={{ fontSize: 20, fontWeight: 800, color: '#ffb3b3', marginTop: 4 }}>−{fmt(totalSaidas)}</p>
          </div>
          <div style={{ background: 'rgba(255,215,0,0.15)', border: '1px solid rgba(255,215,0,0.4)', padding: '14px 18px', borderRadius: 14 }}>
            <p style={{ fontSize: 11, color: '#ffd700', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>Resultado do Extrato</p>
            <p style={{ fontSize: 20, fontWeight: 800, color: '#ffd700', marginTop: 4 }}>{fmt(saldoFinal)}</p>
          </div>
        </div>
      </div>

      {/* BARRA DE FILTROS E BUSCA COMPLETA */}
      <div className="glass" style={{ padding: 18, marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', flex: 1 }}>
            <div style={{ position: 'relative', minWidth: 200 }}>
              <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                className="input-field"
                style={{ paddingLeft: 36, fontSize: 13 }}
                placeholder="Buscar lançamento..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
              />
            </div>

            {/* SELEÇÃO DE PERÍODO BANCÁRIO */}
            <select className="input-field" style={{ width: 'auto', minWidth: 160, fontSize: 13 }} value={periodo} onChange={e => setPeriodo(e.target.value)}>
              <option value="mes_atual">📅 Este Mês</option>
              <option value="hoje">📌 Hoje</option>
              <option value="ultimos_7">📆 Últimos 7 Dias</option>
              <option value="mes_anterior">⏮️ Mês Anterior</option>
              <option value="ultimos_30">📊 Últimos 30 Dias</option>
              <option value="ultimos_90">📈 Últimos 90 Dias</option>
              <option value="este_ano">📅 Este Ano</option>
              <option value="todos">🌐 Todo o Histórico</option>
              <option value="personalizado">⚙️ Período Personalizado</option>
            </select>

            <select className="input-field" style={{ width: 'auto', minWidth: 160, fontSize: 13 }} value={contaFiltro} onChange={e => setContaFiltro(e.target.value)}>
              <option value="todas">🏦 Todas as Contas</option>
              {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>

            <select className="input-field" style={{ width: 'auto', minWidth: 140, fontSize: 13 }} value={tipoFiltro} onChange={e => setTipoFiltro(e.target.value)}>
              <option value="todos">📊 Todos os Tipos</option>
              <option value="despesa">Débitos / Despesas</option>
              <option value="receita">Créditos / Receitas</option>
              <option value="transferencia">Transferências</option>
            </select>

            <select className="input-field" style={{ width: 'auto', minWidth: 160, fontSize: 13 }} value={tipoData} onChange={e => setTipoData(e.target.value)}>
              <option value="pagamento">📅 Data Pagamento</option>
              <option value="lancamento">📝 Data Lançamento</option>
              <option value="vencimento">📆 Data Vencimento</option>
            </select>
          </div>

          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
            {extratoComSaldo.length} movimentações
          </div>
        </div>

        {/* INPUTS DE PERÍODO PERSONALIZADO */}
        {periodo === 'personalizado' && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', paddingTop: 10, borderTop: '1px solid var(--border)' }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Data Início</label>
              <input type="date" className="input-field" style={{ fontSize: 13 }} value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>Data Fim</label>
              <input type="date" className="input-field" style={{ fontSize: 13 }} value={dataFim} onChange={e => setDataFim(e.target.value)} />
            </div>
          </div>
        )}
      </div>

      {/* TABELA DE EXTRATO BANCÁRIO (DESKTOP) */}
      <div className="glass desktop-table-extrato" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-responsive">
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-active)', borderBottom: '2px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '14px 16px', fontSize: 12, color: '#cc0000', textTransform: 'uppercase', fontWeight: 700 }}>Data</th>
                <th style={{ textAlign: 'left', padding: '14px 16px', fontSize: 12, color: '#cc0000', textTransform: 'uppercase', fontWeight: 700 }}>Descrição / Histórico</th>
                <th style={{ textAlign: 'left', padding: '14px 16px', fontSize: 12, color: '#cc0000', textTransform: 'uppercase', fontWeight: 700 }} className="hide-mobile">Categoria</th>
                <th style={{ textAlign: 'left', padding: '14px 16px', fontSize: 12, color: '#cc0000', textTransform: 'uppercase', fontWeight: 700 }} className="hide-mobile">Conta / Canal</th>
                <th style={{ textAlign: 'right', padding: '14px 16px', fontSize: 12, color: '#cc0000', textTransform: 'uppercase', fontWeight: 700 }}>Valor (R$)</th>
                <th style={{ textAlign: 'right', padding: '14px 16px', fontSize: 12, color: '#cc0000', textTransform: 'uppercase', fontWeight: 700 }}>Saldo Acumulado</th>
              </tr>
            </thead>
            <tbody>
              {extratoComSaldo.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
                    Nenhuma movimentação registrada para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                extratoComSaldo.map((item, index) => {
                  const isDebito = item.tipo === 'despesa' || (item.tipo === 'transferencia' && item.contaId === contaFiltro);
                  const isCredito = item.tipo === 'receita' || (item.tipo === 'transferencia' && item.contaDestinãoId === contaFiltro);

                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border)', background: index % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)' }}>
                      <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {String(((item as any).dataExtrato || item.data) || '').split('-').reverse().join('/')}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: isCredito ? 'rgba(21,128,61,0.12)' : 'rgba(139,0,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {item.tipo === 'transferencia' ? <RefreshCw size={14} color="#0284c7" /> : isCredito ? <ArrowUpCircle size={14} color="#15803d" /> : <ArrowDownCircle size={14} color="#8b0000" />}
                          </div>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{item.descricao}</p>
                            {(item.fornecedorNome || item.clienteNome) && (
                              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.fornecedorNome || item.clienteNome}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="hide-mobile" style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-secondary)' }}>
                        {item.tipo === 'transferencia' ? 'Transferência' : (item.categoriaNome || '—')}
                      </td>
                      <td className="hide-mobile" style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-secondary)' }}>
                        {item.contaNome || '—'}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: 14, fontWeight: 800, color: isCredito ? '#15803d' : '#8b0000' }}>
                        {isCredito ? '+' : '−'}{fmt(item.valor)}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: 13, fontWeight: 700, color: item.saldoApos >= 0 ? 'var(--text-primary)' : '#8b0000' }}>
                        {fmt(item.saldoApos)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EXTRATO EM LISTA NATIVA BANCÁRIA PARA MOBILE (< 768px) */}
      <div className="mobile-only-extrato" style={{ display: 'none', flexDirection: 'column', gap: 8 }}>
        {extratoComSaldo.length === 0 ? (
          <div className="glass" style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            Nenhuma movimentação para o filtro.
          </div>
        ) : (
          extratoComSaldo.map(item => {
            const isCredito = item.tipo === 'receita' || (item.tipo === 'transferencia' && item.contaDestinãoId === contaFiltro);
            return (
              <div key={`mob-${item.id}`} className="bank-card-item">
                <div className="bank-card-item-left">
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: isCredito ? 'rgba(21,128,61,0.12)' : 'rgba(139,0,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {item.tipo === 'transferencia' ? <RefreshCw size={14} color="#0284c7" /> : isCredito ? <ArrowUpCircle size={14} color="#15803d" /> : <ArrowDownCircle size={14} color="#8b0000" />}
                  </div>
                  <div className="bank-card-item-text">
                    <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{item.descricao}</p>
                    <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>{String(item.data || '').split('-').reverse().join('/')} • {item.categoriaNome || item.contaNome || 'Extrato'}</p>
                  </div>
                </div>
                <div className="bank-card-item-right">
                  <span className="bank-card-value" style={{ fontSize: 13, color: isCredito ? '#15803d' : '#8b0000' }}>
                    {isCredito ? '+' : '−'}{fmt(item.valor)}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    Acum: {fmt(item.saldoApos)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* QUADRO DE TOTALIZADORES FINAIS NO EXTRATO */}
      <div className="glass" style={{ marginTop: 24, padding: 18, border: '1px solid rgba(204,0,0,0.3)', borderRadius: 16 }}>
        <h4 style={{ fontSize: 13, fontWeight: 800, color: '#cc0000', textTransform: 'uppercase', marginBottom: 12, letterSpacing: '0.4px' }}>
          📊 Quadro de Totalizadores Finais do Extrato
        </h4>
        <div className="grid-responsive-3" style={{ gap: 12 }}>
          <div style={{ background: 'rgba(21,128,61,0.08)', border: '1px solid rgba(21,128,61,0.2)', padding: '12px 14px', borderRadius: 12 }}>
            <span style={{ fontSize: 11, color: '#15803d', fontWeight: 700, display: 'block' }}>(+) Total Entradas Confirmadas</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#15803d' }}>+{fmt(totalEntradas)}</span>
          </div>
          <div style={{ background: 'rgba(139,0,0,0.08)', border: '1px solid rgba(139,0,0,0.2)', padding: '12px 14px', borderRadius: 12 }}>
            <span style={{ fontSize: 11, color: '#8b0000', fontWeight: 700, display: 'block' }}>(−) Total Saídas e Débitos</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#8b0000' }}>−{fmt(totalSaidas)}</span>
          </div>
          <div style={{ background: saldoFinal >= 0 ? 'rgba(21,128,61,0.1)' : 'rgba(139,0,0,0.1)', border: `1px solid ${saldoFinal >= 0 ? '#15803d' : '#8b0000'}`, padding: '12px 14px', borderRadius: 12 }}>
            <span style={{ fontSize: 11, color: saldoFinal >= 0 ? '#15803d' : '#8b0000', fontWeight: 700, display: 'block' }}>(=) Resultado Final do Extrato</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: saldoFinal >= 0 ? '#15803d' : '#8b0000' }}>{fmt(saldoFinal)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
