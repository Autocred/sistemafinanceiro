'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  getTransacoes, getContas, getCategorias, getCentrosCusto,
  getCartoes, getFornecedores, getClientes, getConfiguracoes,
  formatarMoeda, getTenantId
} from '@/lib/storage';
import { Transacao, Conta, Categoria, CentroCusto, Cartao, Fornecedor, Cliente } from '@/lib/types';
import { FORMAS_PAGAMENTO_LABELS } from '@/lib/defaults';
import {
  FileText, Download, Search, Calendar,
  ArrowUpCircle, ArrowDownCircle, RefreshCw, Filter, ShieldCheck,
  RotateCcw, SlidersHorizontal, ChevronDown, ChevronUp, X, Tag,
  Building2, User, CreditCard, Layers, DollarSign
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { normalizeDate, gerarExtrato } from '@/lib/financialEngine';

export function getComportamentoTransacao(t: Transacao): 'fixa' | 'variavel' {
  const comp = ((t.comportamento || '') as string).toLowerCase().trim();
  if (comp === 'fixa') return 'fixa';
  if (comp === 'variavel' || comp === 'variável') return 'variavel';

  // Se for recorrente ou tiver frequência/grupo de recorrência, é considerada FIXA
  if (t.recorrente === true || !!t.frequenciaRecorrencia || !!t.grupoRecorrencia) {
    return 'fixa';
  }

  // Detecção inteligente por Subcategoria, Descrição ou Observações
  const sub = (((t as any).subcategoria || '') as string).toLowerCase().trim();
  const desc = ((t.descricao || '') as string).toLowerCase().trim();
  const obs = ((t.observacoes || '') as string).toLowerCase().trim();

  // Diferida é fixa por excelência (recebimento recorrente de comissão bancária)
  if (sub.includes('diferida') || desc.includes('diferida') || obs.includes('diferida')) {
    return 'fixa';
  }

  // Palavras-chave recorrentes/fixas
  if (
    sub.includes('mensal') ||
    sub.includes('trimestral') ||
    sub.includes('anual') ||
    sub.includes('parcelas mensais') ||
    sub.includes('condominio') ||
    sub.includes('condomínio') ||
    sub.includes('contabilidade') ||
    sub.includes('fone internet') ||
    desc.includes('fixa') ||
    desc.includes('fixo') ||
    sub.includes('fixa') ||
    sub.includes('fixo')
  ) {
    return 'fixa';
  }

  return 'variavel';
}

export default function ExtratoBancario() {
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [contas, setContas] = useState<Conta[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [centrosCusto, setCentrosCusto] = useState<CentroCusto[]>([]);
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [busca, setBusca] = useState('');
  const [periodo, setPeriodo] = useState<string>('mes_atual');
  const [tipoData, setTipoData] = useState<string>('pagamento');
  const [contaFiltro, setContaFiltro] = useState<string>('todas');
  const [tipoFiltro, setTipoFiltro] = useState<string>('todos');
  const hojeDate = new Date();
  const [dataInicio, setDataInicio] = useState(format(startOfMonth(hojeDate), 'yyyy-MM-dd'));
  const [dataFim, setDataFim] = useState(format(endOfMonth(hojeDate), 'yyyy-MM-dd'));

  // Novos Filtros Completos
  const [comportamentoFiltro, setComportamentoFiltro] = useState<string>('todos');
  const [subcategoriaFiltro, setSubcategoriaFiltro] = useState<string>('todas'); // 'todos' | 'fixa' | 'variavel'
  const [statusFiltro, setStatusFiltro] = useState<string>('pago'); // 'pago' | 'todos' | 'pendente' | 'atrasado' | 'agendado'
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('todas');
  const [centroCustoFiltro, setCentroCustoFiltro] = useState<string>('todos');
  const [contatoFiltro, setContatoFiltro] = useState<string>('todos');
  const [formaPagamentoFiltro, setFormaPagamentoFiltro] = useState<string>('todas');
  const [cartaoFiltro, setCartaoFiltro] = useState<string>('todos');
  const [naturezaFiltro, setNaturezaFiltro] = useState<string>('todos'); // 'todos' | 'parcelado' | 'recorrente' | 'avulso'
  const [conciliadoFiltro, setConciliadoFiltro] = useState<string>('todos'); // 'todos' | 'conciliado' | 'nao_conciliado'
  const [valorMin, setValorMin] = useState<string>('');
  const [valorMax, setValorMax] = useState<string>('');

  // Expandir / recolher filtros avançados
  const [mostrarAvancados, setMostrarAvancados] = useState(false);

  const fmt = formatarMoeda;

  // Lista única de subcategorias presentes para filtro
  const subcategoriasDisponiveis = useMemo(() => {
    const set = new Set<string>();
    transacoes.forEach(t => {
      const sub = ((t as any).subcategoria || '').trim();
      if (sub) set.add(sub);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [transacoes]);

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

      try {
        const [cats, ccs, carts, forns, clis, cfg] = await Promise.all([
          getCategorias(),
          getCentrosCusto(),
          getCartoes(),
          getFornecedores(),
          getClientes(),
          getConfiguracoes()
        ]);
        setCategorias(cats || []);
        setCentrosCusto(ccs || []);
        setCartoes(carts || []);
        setFornecedores(forns || []);
        setClientes(clis || []);
        setConfig(cfg || null);
      } catch (err) {
        console.error('Erro ao carregar dados auxiliares para filtros do extrato:', err);
      }
    })();
    return () => {
      if (unsubTrans) unsubTrans();
      if (unsubContas) unsubContas();
    };
  }, []);

  // Listas consolidadas para os dropdowns (unindo banco de dados + nomes já usados nas transações)
  const categoriasDropdown = useMemo(() => {
    const nomes = new Set<string>();
    categorias.forEach(c => { if (c.nome) nomes.add(c.nome); });
    transacoes.forEach(t => { if (t.categoriaNome) nomes.add(t.categoriaNome); });
    return Array.from(nomes).sort();
  }, [categorias, transacoes]);

  const centrosCustoDropdown = useMemo(() => {
    const nomes = new Set<string>();
    centrosCusto.forEach(c => { if (c.nome) nomes.add(c.nome); });
    transacoes.forEach(t => { if (t.centroCustoNome) nomes.add(t.centroCustoNome); });
    return Array.from(nomes).sort();
  }, [centrosCusto, transacoes]);

  const contatosDropdown = useMemo(() => {
    const nomes = new Set<string>();
    fornecedores.forEach(f => { if (f.nome) nomes.add(f.nome); });
    clientes.forEach(c => { if (c.nome) nomes.add(c.nome); });
    transacoes.forEach(t => {
      if (t.fornecedorNome) nomes.add(t.fornecedorNome);
      if (t.clienteNome) nomes.add(t.clienteNome);
    });
    return Array.from(nomes).sort();
  }, [fornecedores, clientes, transacoes]);

  const cartoesDropdown = useMemo(() => {
    const list: { id: string; nome: string }[] = [];
    const ids = new Set<string>();
    cartoes.forEach(c => {
      if (!ids.has(c.id)) {
        ids.add(c.id);
        list.push({ id: c.id, nome: c.nome });
      }
    });
    transacoes.forEach(t => {
      if (t.cartaoId && !ids.has(t.cartaoId)) {
        ids.add(t.cartaoId);
        list.push({ id: t.cartaoId, nome: t.cartaoNome || 'Cartão' });
      }
    });
    return list;
  }, [cartoes, transacoes]);

  // Contagem de filtros ativos além dos padrões
  const filtrosAtivosCount = useMemo(() => {
    let count = 0;
    if (busca.trim()) count++;
    if (periodo !== 'mes_atual') count++;
    if (tipoData !== 'pagamento') count++;
    if (contaFiltro !== 'todas') count++;
    if (tipoFiltro !== 'todos') count++;
    if (comportamentoFiltro !== 'todos') count++;
    if (subcategoriaFiltro !== 'todas') count++;
    if (statusFiltro !== 'pago') count++;
    if (categoriaFiltro !== 'todas') count++;
    if (centroCustoFiltro !== 'todos') count++;
    if (contatoFiltro !== 'todos') count++;
    if (formaPagamentoFiltro !== 'todas') count++;
    if (cartaoFiltro !== 'todos') count++;
    if (naturezaFiltro !== 'todos') count++;
    if (conciliadoFiltro !== 'todos') count++;
    if (valorMin !== '') count++;
    if (valorMax !== '') count++;
    return count;
  }, [
    busca, periodo, tipoData, contaFiltro, tipoFiltro, comportamentoFiltro,
    statusFiltro, categoriaFiltro, centroCustoFiltro, contatoFiltro,
    formaPagamentoFiltro, cartaoFiltro, naturezaFiltro, conciliadoFiltro, valorMin, valorMax
  ]);

  const filtrosAvancadosCount = useMemo(() => {
    let count = 0;
    if (cartaoFiltro !== 'todos') count++;
    if (naturezaFiltro !== 'todos') count++;
    if (conciliadoFiltro !== 'todos') count++;
    if (valorMin !== '') count++;
    if (valorMax !== '') count++;
    return count;
  }, [cartaoFiltro, naturezaFiltro, conciliadoFiltro, valorMin, valorMax]);

  const limparFiltros = () => {
    setBusca('');
    setPeriodo('mes_atual');
    setTipoData('pagamento');
    setContaFiltro('todas');
    setTipoFiltro('todos');
    setComportamentoFiltro('todos');
    setSubcategoriaFiltro('todas');
    setStatusFiltro('pago');
    setCategoriaFiltro('todas');
    setCentroCustoFiltro('todos');
    setContatoFiltro('todos');
    setFormaPagamentoFiltro('todas');
    setCartaoFiltro('todos');
    setNaturezaFiltro('todos');
    setConciliadoFiltro('todos');
    setValorMin('');
    setValorMax('');
    const dHoje = new Date();
    setDataInicio(format(startOfMonth(dHoje), 'yyyy-MM-dd'));
    setDataFim(format(endOfMonth(dHoje), 'yyyy-MM-dd'));
  };

  // Filtragem e ordenação cronológica crescente para cálculo de saldo progressivo
  const transacoesFiltradas = useMemo(() => {
    const hojeStr = format(new Date(), 'yyyy-MM-dd');
    const agora = new Date();
    const mesStr = format(agora, 'yyyy-MM');

    // 1. Normalizar dataExtrato para TODAS as transações conforme o tipo de data selecionado
    let result = transacoes.map(t => {
      let dataRef = '';
      if (tipoData === 'pagamento') {
        dataRef = t.dataPagamento || t.data;
      } else if (tipoData === 'lancamento') {
        dataRef = t.dataLancamento || t.data;
      } else if (tipoData === 'vencimento') {
        dataRef = t.dataVencimento || t.data;
      } else if (tipoData === 'competencia') {
        dataRef = t.dataCompetencia || t.dataLancamento || t.data;
      } else {
        dataRef = t.dataPagamento || t.dataLancamento || t.dataVencimento || t.data;
      }
      return {
        ...t,
        dataExtrato: normalizeDate(dataRef)
      };
    });

    // 2. Filtro de Status
    if (statusFiltro !== 'todos') {
      if (statusFiltro === 'atrasado') {
        result = result.filter(t => {
          if (t.status === 'pago') return false;
          const dV = normalizeDate(t.dataVencimento || t.data);
          return t.status === 'atrasado' || (dV !== '' && dV < hojeStr);
        });
      } else {
        result = result.filter(t => t.status === statusFiltro);
      }
    }

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

    // 5. Filtro por tipo de lançamento (débito, crédito, transferência)
    if (tipoFiltro !== 'todos') {
      result = result.filter(t => t.tipo === tipoFiltro);
    }

    // 6. Filtro por comportamento (fixa vs variável inteligente)
    if (comportamentoFiltro !== 'todos') {
      result = result.filter(t => getComportamentoTransacao(t) === comportamentoFiltro);
    }

        // 6.1 Filtro por Subcategoria
    if (subcategoriaFiltro !== 'todas') {
      result = result.filter(t => (((t as any).subcategoria || '').toLowerCase().trim()) === subcategoriaFiltro.toLowerCase().trim());
    }

// 7. Filtro por Categoria
    if (categoriaFiltro !== 'todas') {
      result = result.filter(t => t.categoriaNome === categoriaFiltro || t.categoriaId === categoriaFiltro);
    }

    // 8. Filtro por Centro de Custo
    if (centroCustoFiltro !== 'todos') {
      if (centroCustoFiltro === 'sem_cc') {
        result = result.filter(t => !t.centroCustoId && !t.centroCustoNome);
      } else {
        result = result.filter(t => t.centroCustoNome === centroCustoFiltro || t.centroCustoId === centroCustoFiltro);
      }
    }

    // 9. Filtro por Contato (Fornecedor ou Cliente)
    if (contatoFiltro !== 'todos') {
      result = result.filter(t =>
        t.fornecedorNome === contatoFiltro ||
        t.clienteNome === contatoFiltro ||
        t.fornecedorId === contatoFiltro ||
        t.clienteId === contatoFiltro
      );
    }

    // 10. Filtro por Forma de Pagamento
    if (formaPagamentoFiltro !== 'todas') {
      result = result.filter(t => t.formaPagamento === formaPagamentoFiltro);
    }

    // 11. Filtro por Cartão de Crédito
    if (cartaoFiltro !== 'todos') {
      if (cartaoFiltro === 'apenas_cartao') {
        result = result.filter(t => t.formaPagamento === 'cartao_credito' || !!t.cartaoId);
      } else if (cartaoFiltro === 'sem_cartao') {
        result = result.filter(t => t.formaPagamento !== 'cartao_credito' && !t.cartaoId);
      } else {
        result = result.filter(t => t.cartaoId === cartaoFiltro || t.cartaoNome === cartaoFiltro);
      }
    }

    // 12. Filtro por Natureza / Regime da Operação
    if (naturezaFiltro !== 'todos') {
      if (naturezaFiltro === 'parcelado') {
        result = result.filter(t => !!t.parcelado || (t.totalParcelas && t.totalParcelas > 1));
      } else if (naturezaFiltro === 'recorrente') {
        result = result.filter(t => !!t.recorrente || !!t.frequenciaRecorrencia);
      } else if (naturezaFiltro === 'avulso') {
        result = result.filter(t => !t.parcelado && !t.recorrente && (!t.totalParcelas || t.totalParcelas <= 1));
      }
    }

    // 13. Filtro por Conciliação
    if (conciliadoFiltro !== 'todos') {
      if (conciliadoFiltro === 'conciliado') {
        result = result.filter(t => !!t.conciliado);
      } else if (conciliadoFiltro === 'nao_conciliado') {
        result = result.filter(t => !t.conciliado);
      }
    }

    // 14. Filtro por Faixa de Valor
    if (valorMin !== '') {
      const vMin = parseFloat(valorMin.replace(',', '.'));
      if (!isNaN(vMin)) {
        result = result.filter(t => (Number(t.valor) || 0) >= vMin);
      }
    }
    if (valorMax !== '') {
      const vMax = parseFloat(valorMax.replace(',', '.'));
      if (!isNaN(vMax)) {
        result = result.filter(t => (Number(t.valor) || 0) <= vMax);
      }
    }

    // 15. Busca textual unificada
    if (busca.trim()) {
      const q = busca.toLowerCase();
      result = result.filter(t =>
        (t.descricao || '').toLowerCase().includes(q) ||
        (t.observacoes || '').toLowerCase().includes(q) ||
        (t.categoriaNome && t.categoriaNome.toLowerCase().includes(q)) ||
        (t.centroCustoNome && t.centroCustoNome.toLowerCase().includes(q)) ||
        (t.fornecedorNome && t.fornecedorNome.toLowerCase().includes(q)) ||
        (t.clienteNome && t.clienteNome.toLowerCase().includes(q)) ||
        (t.contaNome && t.contaNome.toLowerCase().includes(q)) ||
        (t.cartaoNome && t.cartaoNome.toLowerCase().includes(q)) ||
        String(t.valor || '').includes(q)
      );
    }

    // 16. Ordena cronologicamente da mais antiga para a mais recente baseado na data do extrato
    result = result.sort((a, b) => (a.dataExtrato || '').localeCompare(b.dataExtrato || ''));

    return result;
  }, [
    transacoes, tipoData, statusFiltro, periodo, dataInicio, dataFim,
    contaFiltro, tipoFiltro, comportamentoFiltro, categoriaFiltro,
    centroCustoFiltro, contatoFiltro, formaPagamentoFiltro, cartaoFiltro,
    naturezaFiltro, conciliadoFiltro, valorMin, valorMax, busca
  ]);

  // Cálculo de Saldo Progressivo
  const { extratoComSaldo, totalEntradas, totalSaidas, saldoFinal } = useMemo(() => {
    const considerarTodos = statusFiltro !== 'pago';
    return gerarExtrato(transacoesFiltradas, contaFiltro, considerarTodos);
  }, [transacoesFiltradas, contaFiltro, statusFiltro]);

  const handleExportPDF = async () => {
    const { gerarPDFExtrato } = await import('@/lib/pdf-generator');
    const infoPeriodo = periodo === 'personalizado'
      ? `${dataInicio.split('-').reverse().join('/')} até ${dataFim.split('-').reverse().join('/')}`
      : periodo.replace('_', ' ').toUpperCase();

    let infoConta = contaFiltro === 'todas' ? 'Todas as Contas' : (contas.find(c => c.id === contaFiltro)?.nome || 'Conta');
    if (comportamentoFiltro !== 'todos') {
      infoConta += ` | Comp: ${comportamentoFiltro === 'fixa' ? 'Fixa' : 'Variável'}`;
    }
    if (categoriaFiltro !== 'todas') {
      infoConta += ` | Cat: ${categoriaFiltro}`;
    }
    if (statusFiltro !== 'pago') {
      infoConta += ` | Status: ${statusFiltro.toUpperCase()}`;
    }

    gerarPDFExtrato(extratoComSaldo, {
      totalEntradas,
      totalSaidas,
      saldoFinal,
      contaNome: infoConta,
      periodo: infoPeriodo
    });
  };

  const handleExportCSV = () => {
    const header = 'Data,Descrição,Tipo,Comportamento,Status,Categoria,Centro de Custo,Contato,Forma Pgto,Conta,Valor (R$),Saldo Acumulado (R$)\n';
    const rows = extratoComSaldo.map(t => {
      const dt = String(((t as any).dataExtrato || t.data) || '');
      const desc = `"${(t.descricao || '').replace(/"/g, '""')}"`;
      const tipo = t.tipo;
      const comp = getComportamentoTransacao(t);
      const stat = t.status;
      const cat = `"${(t.categoriaNome || '').replace(/"/g, '""')}"`;
      const cc = `"${(t.centroCustoNome || '').replace(/"/g, '""')}"`;
      const cont = `"${(t.fornecedorNome || t.clienteNome || '').replace(/"/g, '""')}"`;
      const fp = FORMAS_PAGAMENTO_LABELS[t.formaPagamento] || t.formaPagamento || '';
      const ct = `"${(t.contaNome || '').replace(/"/g, '""')}"`;
      const valorImp = t.tipo === 'transferencia' && contaFiltro === 'todas' && ['master', '9yxuafoC0AV9BrIKem05ponbmgn2', 'autocred-promotora-de-credito'].includes(getTenantId())
        ? (-t.valor).toFixed(2)
        : t.impacto.toFixed(2);
      const saldoAc = t.saldoApos.toFixed(2);
      return `${dt},${desc},${tipo},${comp},${stat},${cat},${cc},${cont},"${fp}",${ct},${valorImp},${saldoAc}`;
    }).join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-extrato-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Carregando extrato bancário...</div>;
  }

  const isStatusDiferente = statusFiltro !== 'pago';

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', paddingBottom: 60 }}>
      {/* CABEÇALHO DO EXTRATO BANCÁRIO */}
      <div style={{
        background: 'linear-gradient(135deg, var(--primary, #cc0000) 0%, var(--primary-dark, #8b0000) 100%)',
        borderRadius: 20,
        padding: '24px 28px',
        color: 'white',
        marginBottom: 24,
        boxShadow: '0 8px 24px rgba(0,0,0,0.18)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <FileText size={24} color="#ffd700" />
              <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>Extrato Financeiro Oficial</h1>
              <span className="badge badge-gold" style={{ fontSize: 11 }}>
                {config?.nomeSistema ? `${config.nomeSistema} Reports` : 'Padrão Bancário ERP Pro'}
              </span>
            </div>
            <p style={{ fontSize: 13, color: '#fceaea', opacity: 0.9 }}>
              Demonstrativo consolidado de movimentações com saldo progressivo, conciliação e filtros analíticos multidimensionais.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={handleExportPDF} className="btn-secondary" style={{ background: 'white', color: 'var(--primary, #cc0000)', borderColor: 'white', fontSize: 13, fontWeight: 700 }}>
              <Download size={15} /> Exportar PDF Oficial
            </button>
            <button onClick={handleExportCSV} className="btn-secondary" style={{ background: 'rgba(255,255,255,0.15)', color: 'white', borderColor: 'rgba(255,255,255,0.3)', fontSize: 13, fontWeight: 600 }}>
              <FileText size={15} /> Excel / CSV Completo
            </button>
          </div>
        </div>

        {/* CARDS DE RESUMO DO EXTRATO */}
        <div className="grid-responsive-3" style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.15)' }}>
          <div style={{ background: 'linear-gradient(135deg, #166534, #15803d)', padding: 16, borderRadius: 12, border: '1px solid #22c55e' }}>
            <p style={{ fontSize: 11, color: '#dcfce7', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
              {isStatusDiferente ? 'Total Entradas Filtradas' : 'Entradas Confirmadas'}
            </p>
            <p style={{ fontSize: 20, fontWeight: 800, color: '#ffffff', marginTop: 4 }}>+{fmt(totalEntradas)}</p>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.22)', padding: '14px 18px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.1)' }}>
            <p style={{ fontSize: 11, color: '#fceaea', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
              {isStatusDiferente ? 'Total Saídas Filtradas' : 'Saídas e Débitos'}
            </p>
            <p style={{ fontSize: 20, fontWeight: 800, color: '#ffb3b3', marginTop: 4 }}>−{fmt(totalSaidas)}</p>
          </div>
          <div style={{ background: 'rgba(255,215,0,0.15)', border: '1px solid rgba(255,215,0,0.4)', padding: '14px 18px', borderRadius: 14 }}>
            <p style={{ fontSize: 11, color: '#ffd700', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>
              {isStatusDiferente ? 'Resultado dos Lançamentos' : 'Resultado do Extrato'}
            </p>
            <p style={{ fontSize: 20, fontWeight: 800, color: '#ffd700', marginTop: 4 }}>{fmt(saldoFinal)}</p>
          </div>
        </div>
      </div>

      {/* PAINEL COMPLETO DE FILTROS E BUSCA */}
      <div className="glass" style={{ padding: 18, marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* TOPO: BUSCA AMPLA + CONTADOR + BOTÕES DE AÇÃO */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 300px', minWidth: 240 }}>
            <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              className="input-field filter-select-sm"
              style={{ paddingLeft: 36, paddingRight: busca ? 32 : 12, width: '100%' }}
              placeholder="Buscar lançamento, contato, descrição, obs..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
            {busca && (
              <button
                type="button"
                onClick={() => setBusca('')}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}
                title="Limpar busca"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Botão de Toggle Filtros Avançados */}
            <button
              type="button"
              onClick={() => setMostrarAvancados(!mostrarAvancados)}
              className="btn-secondary"
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '6px 12px',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                height: 36,
                background: (mostrarAvancados || filtrosAvancadosCount > 0) ? 'rgba(204,0,0,0.08)' : 'var(--bg-body)',
                color: (mostrarAvancados || filtrosAvancadosCount > 0) ? 'var(--primary)' : 'var(--text-secondary)',
                border: `1px solid ${(mostrarAvancados || filtrosAvancadosCount > 0) ? 'var(--primary)' : 'var(--border)'}`,
                cursor: 'pointer'
              }}
            >
              <SlidersHorizontal size={13} />
              <span>Mais Filtros</span>
              {filtrosAvancadosCount > 0 && (
                <span style={{
                  background: 'var(--primary)',
                  color: 'white',
                  fontSize: 10,
                  borderRadius: 10,
                  padding: '1px 5px',
                  fontWeight: 800
                }}>
                  {filtrosAvancadosCount}
                </span>
              )}
              {mostrarAvancados ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>

            {/* Botão de Limpar Todos os Filtros */}
            {filtrosAtivosCount > 0 && (
              <button
                type="button"
                onClick={limparFiltros}
                className="btn-secondary"
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '6px 12px',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  height: 36,
                  background: 'rgba(239,68,68,0.1)',
                  color: '#dc2626',
                  borderColor: 'rgba(239,68,68,0.3)',
                  cursor: 'pointer'
                }}
                title="Limpar todos os filtros e restaurar padrão"
              >
                <RotateCcw size={12} />
                Limpar ({filtrosAtivosCount})
              </button>
            )}

            {/* Contador de movimentações */}
            <div style={{
              fontSize: 11,
              color: 'var(--text-secondary)',
              fontWeight: 800,
              whiteSpace: 'nowrap',
              padding: '6px 12px',
              height: 36,
              display: 'flex',
              alignItems: 'center',
              background: 'var(--bg-active)',
              borderRadius: 8,
              border: '1px solid var(--border)'
            }}>
              {extratoComSaldo.length} movimentações
            </div>
          </div>
        </div>

        {/* GRID DE FILTROS PRINCIPAIS COM LABELS SUPERIORES E FONTE COMPACTA */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 10,
          paddingTop: 10,
          borderTop: '1px solid var(--border)'
        }}>
          {/* Período */}
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: 4 }}>
              📅 Período
            </label>
            <select
              className="input-field filter-select-sm"
              value={periodo}
              onChange={e => setPeriodo(e.target.value)}
            >
              <option value="mes_atual">Este Mês</option>
              <option value="hoje">Hoje</option>
              <option value="ultimos_7">Últimos 7 Dias</option>
              <option value="mes_anterior">Mês Anterior</option>
              <option value="ultimos_30">Últimos 30 Dias</option>
              <option value="ultimos_90">Últimos 90 Dias</option>
              <option value="este_ano">Este Ano</option>
              <option value="todos">Todo o Histórico</option>
              <option value="personalizado">Personalizado</option>
            </select>
          </div>

          {/* Data de Referência */}
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: 4 }}>
              📆 Data de Referência
            </label>
            <select
              className="input-field filter-select-sm"
              value={tipoData}
              onChange={e => setTipoData(e.target.value)}
            >
              <option value="pagamento">Data Pagamento</option>
              <option value="lancamento">Data Lançamento</option>
              <option value="vencimento">Data Vencimento</option>
              <option value="competencia">Data Competência</option>
            </select>
          </div>

          {/* Conta Bancária */}
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: 4 }}>
              🏦 Conta Bancária
            </label>
            <select
              className="input-field filter-select-sm"
              value={contaFiltro}
              onChange={e => setContaFiltro(e.target.value)}
            >
              <option value="todas">Todas as Contas</option>
              {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>

          {/* Tipo de Lançamento */}
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: 4 }}>
              📊 Tipo
            </label>
            <select
              className="input-field filter-select-sm"
              value={tipoFiltro}
              onChange={e => setTipoFiltro(e.target.value)}
            >
              <option value="todos">Todos os Tipos</option>
              <option value="despesa">Débitos / Despesas</option>
              <option value="receita">Créditos / Receitas</option>
              <option value="transferencia">Transferências</option>
            </select>
          </div>

          {/* Comportamento (Fixa / Variável) */}
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: 4 }}>
              ⚖️ Comportamento
            </label>
            <select
              className="input-field filter-select-sm"
              style={{
                borderColor: comportamentoFiltro !== 'todos' ? 'var(--primary)' : undefined,
                fontWeight: comportamentoFiltro !== 'todos' ? 800 : 600
              }}
              value={comportamentoFiltro}
              onChange={e => setComportamentoFiltro(e.target.value)}
            >
              <option value="todos">Todos</option>
              <option value="fixa">Fixa</option>
              <option value="variavel">Variável</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: 4 }}>
              📋 Status
            </label>
            <select
              className="input-field filter-select-sm"
              style={{
                borderColor: statusFiltro !== 'pago' ? 'var(--primary)' : undefined,
                fontWeight: statusFiltro !== 'pago' ? 800 : 600
              }}
              value={statusFiltro}
              onChange={e => setStatusFiltro(e.target.value)}
            >
              <option value="pago">Pagos / Efetivados</option>
              <option value="todos">Todos os Status</option>
              <option value="pendente">Pendentes</option>
              <option value="atrasado">Atrasados</option>
              <option value="agendado">Agendados</option>
            </select>
          </div>

          {/* Categoria */}
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: 4 }}>
              🏷️ Categoria
            </label>
            <select
              className="input-field filter-select-sm"
              style={{
                borderColor: categoriaFiltro !== 'todas' ? 'var(--primary)' : undefined,
                fontWeight: categoriaFiltro !== 'todas' ? 800 : 600
              }}
              value={categoriaFiltro}
              onChange={e => setCategoriaFiltro(e.target.value)}
            >
              <option value="todas">Todas as Categorias</option>
              {categoriasDropdown.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Centro de Custo */}
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: 4 }}>
              🎯 Centro de Custo
            </label>
            <select
              className="input-field filter-select-sm"
              style={{
                borderColor: centroCustoFiltro !== 'todos' ? 'var(--primary)' : undefined,
                fontWeight: centroCustoFiltro !== 'todos' ? 800 : 600
              }}
              value={centroCustoFiltro}
              onChange={e => setCentroCustoFiltro(e.target.value)}
            >
              <option value="todos">Todos os Centros</option>
              <option value="sem_cc">Sem Centro de Custo</option>
              {centrosCustoDropdown.map(cc => <option key={cc} value={cc}>{cc}</option>)}
            </select>
          </div>

          {/* Fornecedor / Cliente (Contato) */}
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: 4 }}>
              👤 Fornecedor / Cliente
            </label>
            <select
              className="input-field filter-select-sm"
              style={{
                borderColor: contatoFiltro !== 'todos' ? 'var(--primary)' : undefined,
                fontWeight: contatoFiltro !== 'todos' ? 800 : 600
              }}
              value={contatoFiltro}
              onChange={e => setContatoFiltro(e.target.value)}
            >
              <option value="todos">Todos os Contatos</option>
              {contatosDropdown.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Forma de Pagamento */}
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: 4 }}>
              💳 Forma de Pagamento
            </label>
            <select
              className="input-field filter-select-sm"
              style={{
                borderColor: formaPagamentoFiltro !== 'todas' ? 'var(--primary)' : undefined,
                fontWeight: formaPagamentoFiltro !== 'todas' ? 800 : 600
              }}
              value={formaPagamentoFiltro}
              onChange={e => setFormaPagamentoFiltro(e.target.value)}
            >
              <option value="todas">Todas as Formas</option>
              {Object.entries(FORMAS_PAGAMENTO_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* LINHA DE PERÍODO PERSONALIZADO */}
        {periodo === 'personalizado' && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', paddingTop: 10, borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Intervalo:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>De:</label>
              <input type="date" className="input-field filter-select-sm" style={{ width: 140 }} value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Até:</label>
              <input type="date" className="input-field filter-select-sm" style={{ width: 140 }} value={dataFim} onChange={e => setDataFim(e.target.value)} />
            </div>
          </div>
        )}

        {/* FILTROS AVANÇADOS (CARTÃO, REGIME/NATUREZA, CONCILIAÇÃO, FAIXA DE VALOR) */}
        {mostrarAvancados && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: 10,
            padding: 12,
            borderRadius: 10,
            background: 'rgba(0,0,0,0.02)',
            border: '1px dashed var(--border)'
          }}>
            {/* Cartão de Crédito */}
            <div>
              <label style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                💳 Cartão de Crédito
              </label>
              <select
                className="input-field filter-select-sm"
                value={cartaoFiltro}
                onChange={e => setCartaoFiltro(e.target.value)}
              >
                <option value="todos">Todos os Cartões</option>
                <option value="apenas_cartao">Apenas Cartão</option>
                <option value="sem_cartao">Sem Cartão</option>
                {cartoesDropdown.map(cart => (
                  <option key={cart.id} value={cart.id}>{cart.nome}</option>
                ))}
              </select>
            </div>

            {/* Subcategoria / Classificação */}
            <div>
              <label style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                🏷️ Subcategoria
              </label>
              <select
                className="input-field filter-select-sm"
                style={{
                  borderColor: subcategoriaFiltro !== 'todas' ? 'var(--primary)' : undefined,
                  fontWeight: subcategoriaFiltro !== 'todas' ? 800 : 600
                }}
                value={subcategoriaFiltro}
                onChange={e => setSubcategoriaFiltro(e.target.value)}
              >
                <option value="todas">Todas as Subcategorias</option>
                {subcategoriasDisponiveis.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Regime / Operação (Parcelado / Recorrente / Avulso) */}
            <div>
              <label style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                📦 Regime da Operação
              </label>
              <select
                className="input-field filter-select-sm"
                value={naturezaFiltro}
                onChange={e => setNaturezaFiltro(e.target.value)}
              >
                <option value="todos">Todos os Regimes</option>
                <option value="parcelado">Apenas Parceladas</option>
                <option value="recorrente">Apenas Recorrentes</option>
                <option value="avulso">Apenas À Vista / Avulsas</option>
              </select>
            </div>

            {/* Status de Conciliação */}
            <div>
              <label style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                🛡️ Conciliação Bancária
              </label>
              <select
                className="input-field filter-select-sm"
                value={conciliadoFiltro}
                onChange={e => setConciliadoFiltro(e.target.value)}
              >
                <option value="todos">Todas</option>
                <option value="conciliado">Apenas Conciliadas</option>
                <option value="nao_conciliado">Não Conciliadas</option>
              </select>
            </div>

            {/* Faixa de Valor */}
            <div>
              <label style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                💵 Faixa de Valor (R$)
              </label>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="input-field filter-select-sm"
                  style={{ flex: 1 }}
                  placeholder="Mínimo"
                  value={valorMin}
                  onChange={e => setValorMin(e.target.value)}
                />
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>até</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="input-field filter-select-sm"
                  style={{ flex: 1 }}
                  placeholder="Máximo"
                  value={valorMax}
                  onChange={e => setValorMax(e.target.value)}
                />
              </div>
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
                <th style={{ textAlign: 'left', padding: '14px 16px', fontSize: 12, color: 'var(--primary, #cc0000)', textTransform: 'uppercase', fontWeight: 700 }}>Data</th>
                <th style={{ textAlign: 'left', padding: '14px 16px', fontSize: 12, color: 'var(--primary, #cc0000)', textTransform: 'uppercase', fontWeight: 700 }}>Descrição / Histórico</th>
                <th style={{ textAlign: 'left', padding: '14px 16px', fontSize: 12, color: 'var(--primary, #cc0000)', textTransform: 'uppercase', fontWeight: 700 }} className="hide-mobile">Categoria</th>
                <th style={{ textAlign: 'left', padding: '14px 16px', fontSize: 12, color: 'var(--primary, #cc0000)', textTransform: 'uppercase', fontWeight: 700 }} className="hide-mobile">Conta / Canal</th>
                <th style={{ textAlign: 'right', padding: '14px 16px', fontSize: 12, color: 'var(--primary, #cc0000)', textTransform: 'uppercase', fontWeight: 700 }}>Valor (R$)</th>
                <th style={{ textAlign: 'right', padding: '14px 16px', fontSize: 12, color: 'var(--primary, #cc0000)', textTransform: 'uppercase', fontWeight: 700 }}>Saldo Acumulado</th>
              </tr>
            </thead>
            <tbody>
              {extratoComSaldo.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
                    Nenhuma movimentação registrada para a combinação de filtros selecionada.
                  </td>
                </tr>
              ) : (
                extratoComSaldo.map((item, index) => {
                  const isDebito = item.tipo === 'despesa' || (item.tipo === 'transferencia' && item.contaId === contaFiltro);
                  const isCredito = item.tipo === 'receita' || (item.tipo === 'transferencia' && item.contaDestinãoId === contaFiltro);
                  const comp = getComportamentoTransacao(item);

                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--border)', background: index % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)' }}>
                      <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {String(((item as any).dataExtrato || item.data) || '').split('-').reverse().join('/')}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: isCredito ? 'rgba(21,128,61,0.12)' : 'rgba(139,0,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {item.tipo === 'transferencia' ? <RefreshCw size={14} color="#0284c7" /> : isCredito ? <ArrowUpCircle size={14} color="#15803d" /> : <ArrowDownCircle size={14} color="#8b0000" />}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{item.descricao}</p>
                              
                              {/* BADGE FIXA / VARIÁVEL INTELIGENTE */}
                              <span style={{
                                fontSize: 10,
                                fontWeight: 700,
                                padding: '1px 6px',
                                borderRadius: 6,
                                background: comp === 'fixa' ? 'rgba(139,92,246,0.15)' : 'rgba(245,158,11,0.15)',
                                color: comp === 'fixa' ? '#6d28d9' : '#b45309',
                                border: `1px solid ${comp === 'fixa' ? 'rgba(139,92,246,0.3)' : 'rgba(245,158,11,0.3)'}`
                              }}>
                                {comp === 'fixa' ? 'Fixa' : 'Variável'}
                              </span>

                                                            {/* BADGE DE SUBCATEGORIA */}
                              {(item as any).subcategoria && (
                                <span style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  padding: '1px 6px',
                                  borderRadius: 6,
                                  background: 'rgba(59,130,246,0.12)',
                                  color: '#2563eb',
                                  border: '1px solid rgba(59,130,246,0.25)'
                                }}>
                                  {(item as any).subcategoria}
                                </span>
                              )}

{/* BADGE DE STATUS QUANDO NÃO FOR PAGO */}
                              {item.status !== 'pago' && (
                                <span style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  padding: '1px 6px',
                                  borderRadius: 6,
                                  background: item.status === 'atrasado' ? 'rgba(239,68,68,0.15)' : item.status === 'agendado' ? 'rgba(59,130,246,0.15)' : 'rgba(234,179,8,0.15)',
                                  color: item.status === 'atrasado' ? '#dc2626' : item.status === 'agendado' ? '#2563eb' : '#d97706',
                                  border: `1px solid ${item.status === 'atrasado' ? 'rgba(239,68,68,0.3)' : item.status === 'agendado' ? 'rgba(59,130,246,0.3)' : 'rgba(234,179,8,0.3)'}`
                                }}>
                                  {item.status === 'atrasado' ? 'Atrasado' : item.status === 'agendado' ? 'Agendado' : 'Pendente'}
                                </span>
                              )}

                              {/* BADGE DE PARCELAMENTO */}
                              {item.parcelado && item.totalParcelas && item.totalParcelas > 1 && (
                                <span style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--bg-active)', padding: '1px 5px', borderRadius: 4 }}>
                                  {item.parcelaAtual || 1}/{item.totalParcelas}x
                                </span>
                              )}
                            </div>

                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 2, flexWrap: 'wrap' }}>
                              {(item.fornecedorNome || item.clienteNome) && (
                                <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>👤 {item.fornecedorNome || item.clienteNome}</p>
                              )}
                              {item.centroCustoNome && (
                                <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>🎯 {item.centroCustoNome}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="hide-mobile" style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-secondary)' }}>
                        {item.tipo === 'transferencia' ? 'Transferência' : (item.categoriaNome || '—')}
                      </td>
                      <td className="hide-mobile" style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-secondary)' }}>
                        <div>{item.contaNome || '—'}</div>
                        {item.formaPagamento && (
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                            {FORMAS_PAGAMENTO_LABELS[item.formaPagamento] || item.formaPagamento}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: 14, fontWeight: 800, color: isCredito ? '#15803d' : '#8b0000', whiteSpace: 'nowrap' }}>
                        {isCredito ? '+' : '−'}{fmt(item.valor)}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: 13, fontWeight: 700, color: item.saldoApos >= 0 ? 'var(--text-primary)' : '#8b0000', whiteSpace: 'nowrap' }}>
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
            Nenhuma movimentação para o filtro selecionado.
          </div>
        ) : (
          extratoComSaldo.map(item => {
            const isCredito = item.tipo === 'receita' || (item.tipo === 'transferencia' && item.contaDestinãoId === contaFiltro);
            const comp = getComportamentoTransacao(item);
            return (
              <div key={`mob-${item.id}`} className="bank-card-item">
                <div className="bank-card-item-left">
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: isCredito ? 'rgba(21,128,61,0.12)' : 'rgba(139,0,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {item.tipo === 'transferencia' ? <RefreshCw size={14} color="#0284c7" /> : isCredito ? <ArrowUpCircle size={14} color="#15803d" /> : <ArrowDownCircle size={14} color="#8b0000" />}
                  </div>
                  <div className="bank-card-item-text">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{item.descricao}</p>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 4px', borderRadius: 4, background: comp === 'fixa' ? 'rgba(139,92,246,0.15)' : 'rgba(245,158,11,0.15)', color: comp === 'fixa' ? '#6d28d9' : '#b45309' }}>
                        {comp === 'fixa' ? 'Fixa' : 'Variável'}
                      </span>
                    </div>
                    <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      {String(((item as any).dataExtrato || item.data) || '').split('-').reverse().join('/')} • {item.categoriaNome || item.contaNome || 'Extrato'}
                      {(item.fornecedorNome || item.clienteNome) && ` • ${item.fornecedorNome || item.clienteNome}`}
                    </p>
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
      <div className="glass" style={{ marginTop: 24, padding: 18, border: '1px solid rgba(204,0,0,0.2)', borderRadius: 16 }}>
        <h4 style={{ fontSize: 13, fontWeight: 800, color: 'var(--primary, #cc0000)', textTransform: 'uppercase', marginBottom: 12, letterSpacing: '0.4px' }}>
          📊 Quadro de Totalizadores Finais do Relatório
        </h4>
        <div className="grid-responsive-3" style={{ gap: 12 }}>
          <div style={{ background: 'rgba(21,128,61,0.08)', border: '1px solid rgba(21,128,61,0.2)', padding: '12px 14px', borderRadius: 12 }}>
            <span style={{ fontSize: 11, color: '#15803d', fontWeight: 700, display: 'block' }}>
              (+) Total Entradas {isStatusDiferente ? 'Filtradas' : 'Confirmadas'}
            </span>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#15803d' }}>+{fmt(totalEntradas)}</span>
          </div>
          <div style={{ background: 'rgba(139,0,0,0.08)', border: '1px solid rgba(139,0,0,0.2)', padding: '12px 14px', borderRadius: 12 }}>
            <span style={{ fontSize: 11, color: '#8b0000', fontWeight: 700, display: 'block' }}>
              (−) Total Saídas {isStatusDiferente ? 'Filtradas' : 'e Débitos'}
            </span>
            <span style={{ fontSize: 16, fontWeight: 800, color: '#8b0000' }}>−{fmt(totalSaidas)}</span>
          </div>
          <div style={{ background: saldoFinal >= 0 ? 'rgba(21,128,61,0.1)' : 'rgba(139,0,0,0.1)', border: `1px solid ${saldoFinal >= 0 ? '#15803d' : '#8b0000'}`, padding: '12px 14px', borderRadius: 12 }}>
            <span style={{ fontSize: 11, color: saldoFinal >= 0 ? '#15803d' : '#8b0000', fontWeight: 700, display: 'block' }}>
              (=) Resultado Final do Relatório
            </span>
            <span style={{ fontSize: 16, fontWeight: 800, color: saldoFinal >= 0 ? '#15803d' : '#8b0000' }}>{fmt(saldoFinal)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
