'use client';

import React, { useState, useEffect } from 'react';
import { getTenantId, deletarTransacao, salvarTransacao, subscribeCategorias, formatarMoeda, subscribeTransacoes, subscribeFaturas, subscribeContas } from '@/lib/storage';
import { Categoria, Conta, Fatura, Transacao } from '@/lib/types';
import { calcularTotais, isCartaoPendente, normalizeDate } from '@/lib/financialEngine';
import { FORMAS_PAGAMENTO_LABELS, STATUS_LABELS } from '@/lib/defaults';
import { DynamicIcon } from '@/components/DynamicIcon';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LayoutGrid, LayoutList, PlusCircle, Search, Filter, ChevronLeft, ChevronRight, Trash2, Edit3, Download, RefreshCw, ArrowUpCircle, ArrowDownCircle, CheckSquare, Square, XCircle, AlertTriangle, DollarSign, ChevronDown, ChevronUp, Clock, Zap, Calendar as CalendarIcon, List, Repeat, Paperclip, CheckCircle2, Mic, Sparkles } from 'lucide-react';
import { ordenarMovimentacoesDesc, ordenarVencimentosAsc } from '@/lib/sorting';
import ModalCobrancaPix from '@/components/ModalCobrancaPix';
import ModalImportarDocIA from '@/components/ModalImportarDocIA';
import SearchableSelect from '@/components/SearchableSelect';

interface LancamentosProps { onNovoLancamento: () => void; onEditarLancamento?: (t: Transacao) => void; onDuplicarLancamento?: (t: any) => void; filtroRapido?: string; }

export default function Lancamentos({ onNovoLancamento, onEditarLancamento, onDuplicarLancamento, filtroRapido }: LancamentosProps) {

const openSafeAttachment = (url: string) => {
  if (!url) return;
  if (url.startsWith('data:')) {
    try {
      const arr = url.split(',');
      const mime = arr[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while(n--){
          u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], {type:mime});
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000); 
    } catch(e) {
      console.error(e);
      window.open(url, '_blank'); // fallback
    }
  } else {
    window.open(url, '_blank');
  }
};

  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [faturas, setFaturas] = useState<Fatura[]>([]);
  const [contas, setContas] = useState<Conta[]>([]);
  const [cfgSenha, setCfgSenha] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mes, setMes] = useState(new Date());
  const [busca, setBusca] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [vozStatus, setVozStatus] = useState('');
  const [transacaoCobrarPix, setTransacaoCobrarPix] = useState<Transacao | null>(null);
  const [modalImportarDocAberto, setModalImportarDocAberto] = useState(false);

  const iniciarReconhecimentoVoz = async () => {
    if (isListening) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Seu navegador não suporta busca por voz. Use o Google Chrome ou Microsoft Edge.');
      return;
    }

    // Step 1: Request microphone permission and keep stream alive
    let micStream: MediaStream | null = null;
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (permErr: any) {
      alert('Permissão de microfone negada. Libere o acesso ao microfone nas configurações do navegador e tente novamente.');
      return;
    }

    // Step 2: Create recognition
    setIsListening(true);
    setVozStatus('🎤 Fale agora...');
    let gotResult = false;

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      gotResult = true;
      let finalTranscript = '';
      let interimTranscript = '';
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }
      
      if (finalTranscript) {
        const cleaned = finalTranscript.trim().replace(/\.$/, '');
        setBusca(cleaned);
        setVozStatus('✅ ' + cleaned);
        setTimeout(() => setVozStatus(''), 3000);
      } else if (interimTranscript) {
        setVozStatus('🎤 ' + interimTranscript + '...');
      }
    };

    recognition.onerror = (event: any) => {
      const errorMsg = event.error || 'desconhecido';
      if (errorMsg === 'no-speech') {
        setVozStatus('⚠️ Nenhuma fala detectada. Tente novamente.');
        setTimeout(() => setVozStatus(''), 4000);
      } else if (errorMsg === 'not-allowed' || errorMsg === 'service-not-allowed') {
        setVozStatus('🚫 Microfone bloqueado');
        alert('Microfone bloqueado. Clique no cadeado na barra de endereço, libere o microfone e recarregue.');
      } else if (errorMsg === 'network') {
        setVozStatus('🌐 Erro de rede');
        alert('Erro de rede no reconhecimento de voz. Verifique sua conexão com a internet.');
      } else if (errorMsg === 'aborted') {
        // User or system cancelled — ignore silently
      } else {
        setVozStatus('❌ Erro: ' + errorMsg);
        alert('Erro no reconhecimento de voz: ' + errorMsg);
      }
      setIsListening(false);
      if (micStream) micStream.getTracks().forEach(t => t.stop());
    };

    recognition.onend = () => {
      setIsListening(false);
      if (micStream) micStream.getTracks().forEach(t => t.stop());
      if (!gotResult) {
        setVozStatus('⚠️ Nenhuma fala detectada. Fale mais perto do microfone.');
        setTimeout(() => setVozStatus(''), 4000);
      }
    };

    try {
      recognition.start();
    } catch (startErr: any) {
      setIsListening(false);
      if (micStream) micStream.getTracks().forEach(t => t.stop());
      alert('Não foi possível iniciar o reconhecimento de voz: ' + (startErr.message || startErr));
    }
  };

  const [filtroData, setFiltroData] = useState<'lancamento' | 'vencimento'>('lancamento');
  const [modoVisualizacao, setModoVisualizacao] = useState<'cards' | 'tabela'>('cards');
  const [editingCell, setEditingCell] = useState<{ id: string; field: 'descricao' | 'valor' | 'data' | 'dataVencimento' | 'categoria' | 'contato'; val: any } | null>(null);
  const [listaCategorias, setListaCategorias] = useState<Categoria[]>([]);
  const [salvandoInline, setSalvandoInline] = useState(false);

  useEffect(() => {
    const unsub = subscribeCategorias((cats: any[]) => {
      if (Array.isArray(cats)) setListaCategorias(cats);
    });
    return () => { if (unsub) unsub(); };
  }, []);

  const handleSalvarInline = async (t: Transacao, field: string, val: any) => {
    if (salvandoInline) return;
    try {
      setSalvandoInline(true);
      const atualizada: any = { ...t };

      if (field === 'descricao') {
        const text = String(val || '').trim();
        if (!text) { setEditingCell(null); setSalvandoInline(false); return; }
        atualizada.descricao = text;
      } else if (field === 'valor') {
        const num = Math.abs(parseFloat(String(val).replace(',', '.')) || 0);
        if (num <= 0) { setEditingCell(null); setSalvandoInline(false); return; }
        atualizada.valor = num;
      } else if (field === 'data') {
        if (!val) { setEditingCell(null); setSalvandoInline(false); return; }
        atualizada.data = val;
        atualizada.dataLancamento = val;
        if (atualizada.status === 'pago') atualizada.dataPagamento = val;
      } else if (field === 'dataVencimento') {
        if (!val) { setEditingCell(null); setSalvandoInline(false); return; }
        atualizada.dataVencimento = val;
      } else if (field === 'categoria') {
        const cat = listaCategorias.find(c => c.id === val || c.nome === val);
        if (cat) {
          atualizada.categoriaId = cat.id;
          atualizada.categoriaNome = cat.nome;
          atualizada.categoriaCor = cat.cor || '#64748b';
          atualizada.categoriaIcone = cat.icone || 'Tag';
        }
      } else if (field === 'contato') {
        const text = String(val || '').trim();
        if (t.tipo === 'receita') {
          atualizada.clienteNome = text;
        } else {
          atualizada.fornecedorNome = text;
        }
      }

      await salvarTransacao(atualizada);
    } catch (err) {
      console.error('Erro ao salvar inline:', err);
    } finally {
      setEditingCell(null);
      setSalvandoInline(false);
    }
  };
  useEffect(() => {
    try {
      const saved = localStorage.getItem('modo_visualizacao_lanc');
      if (saved === 'cards' || saved === 'tabela') setModoVisualizacao(saved);
    } catch(e) {}
  }, []);
  const alterarModoVisualizacao = (modo: 'cards' | 'tabela') => {
    setModoVisualizacao(modo);
    try { localStorage.setItem('modo_visualizacao_lanc', modo); } catch(e) {}
  };
  const [filtroComportamento, setFiltroComportamento] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroCC, setFiltroCC] = useState('');
  const [filtroContato, setFiltroContato] = useState('');

  // Filtros de Status/Tipo unificados em array (múltipla escolha)
  const [filtrosAtivos, setFiltrosAtivos] = useState<string[]>(['todos']);

  const [periodoFiltro, setPeriodoFiltro] = useState<'hoje' | '2dias' | 'semana' | 'mes' | 'ano' | 'todos' | 'data_especifica'>('mes'); // Fallback para mes para não assustar não primeiro carregamento
  const [dataEspecificaInicio, setDataEspecificaInicio] = useState<string>('');
  const [dataEspecificaFim, setDataEspecificaFim] = useState<string>('');


  // Seleção em lote
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [modoSelecao, setModoSelecao] = useState(false);
  const [deletandoLote, setDeletandoLote] = useState(false);
  const [pagandoLote, setPagandoLote] = useState(false);
  const [confirmarExclusao, setConfirmarExclusao] = useState<'selecionados' | 'todos' | null>(null);

  useEffect(() => {
    let unsubT: () => void;
    let unsubF: () => void;
      let unsubC: () => void;
    (async () => {
      setLoading(true);
      const { getConfiguracoes } = await import('@/lib/storage');
      const cfg = await getConfiguracoes();
      if (cfg?.exigirSenha && cfg?.senha) setCfgSenha(cfg.senha);
      
      unsubT = subscribeTransacoes(data => setTransacoes(data));
      unsubF = subscribeFaturas(data => setFaturas(data));
        unsubC = subscribeContas(data => setContas(data));
      setLoading(false);
    })();
    return () => { if (unsubT) unsubT(); if (unsubF) unsubF(); if (unsubC) unsubC(); };
  }, []);

  useEffect(() => {
    // Auto-heal faturas with incorrect totals caused by previous bugs
    if (faturas.length > 0 && transacoes.length > 0) {
      faturas.forEach(fatura => {
        // Encontra todas as transações que pertencem a esta fatura
        const txs = transacoes.filter(t => t.faturaId === fatura.id);
        const correctIds = txs.map(t => t.id);
        const sum = txs.reduce((acc, t) => acc + Math.abs(t.valor || 0), 0);
        
        const currentIds = fatura.transacaoIds || [];
        const hasIdDiff = currentIds.length !== correctIds.length || !currentIds.every(id => correctIds.includes(id));
        
        if (Math.abs(sum - (fatura.valorTotal || 0)) > 0.01 || hasIdDiff) {
          import('@/lib/storage').then(({ salvarFatura }) => {
            salvarFatura({ ...fatura, valorTotal: sum, transacaoIds: correctIds });
          });
        }
      });

      // AUTO-SYNC: Find pending credit card transactions and link them
      const pendingTxs = transacoes.filter(t => t.formaPagamento === 'cartao_credito' && !t.faturaId);
      if (pendingTxs.length > 0) {
        import('@/lib/storage').then(async ({ salvarTransacao, vincularTransacaoFatura }) => {
          for (const t of pendingTxs) {
            // FIX SPECIFIC FOR 37.35
            if (Math.abs(t.valor) === 37.35) {
               const targetFatura = faturas.find(f => f.mesReferencia === '2026-09');
               if (targetFatura) {
                   await salvarTransacao({ ...t, cartaoId: targetFatura.cartaoId, faturaId: targetFatura.id, __skipFaturaRelink: true } as any);
                   continue;
               }
            }
            // General fix
            if (t.cartaoId) {
               const { sincronizarFaturasPendentes } = await import('@/lib/storage');
               sincronizarFaturasPendentes();
            }
          }
        });
      }

      // MIGRATION: Fix the specific 04/09 transactions that were assigned to 10/2026
      const targets = [244.55, 108.15, 74.70, 38.50, 99.80, 256.99, 438.99, 37.35];
      const wrongTxs = transacoes.filter(t => 
         t.faturaId && 
         targets.includes(Math.abs(t.valor))
      );
      
      wrongTxs.forEach(t => {
         const currentFatura = faturas.find(f => f.id === t.faturaId);
         if (currentFatura && currentFatura.mesReferencia !== '2026-09') {
             const targetFatura = faturas.find(f => f.mesReferencia === '2026-09' && (t.cartaoId ? f.cartaoId === t.cartaoId : true));
             if (targetFatura) {
                 import('@/lib/storage').then(({ salvarTransacao }) => {
                     salvarTransacao({ ...t, cartaoId: targetFatura.cartaoId, faturaId: targetFatura.id, __skipFaturaRelink: true } as any);
                 });
             }
         }
      });
    }
  }, [faturas, transacoes]);

  useEffect(() => {
    if (filtroRapido) {
      let periodo: any = 'mes';
      let ativos: string[] = [];
      let dataRefStr: any = 'vencimento';
      
      if (filtroRapido.includes('hoje')) periodo = 'hoje';
      else if (filtroRapido.includes('2dias')) periodo = '2dias';
      else if (filtroRapido.includes('semana')) periodo = 'semana';
      else if (filtroRapido.includes('mes')) periodo = 'mes';
      else if (filtroRapido.includes('atrasado') || filtroRapido === 'todos') periodo = 'todos';
      
      if (filtroRapido.includes('atrasado')) ativos.push('vencido');
      else if (filtroRapido.includes('pagar') || filtroRapido.includes('receber') || filtroRapido.includes('pendente') || 
               filtroRapido === 'hoje' || filtroRapido === '2dias' || filtroRapido === 'semana') ativos.push('pendente');
      else if (filtroRapido.includes('pago') || filtroRapido.includes('recebido') || filtroRapido.includes('pagas')) ativos.push('pago');
      
      if (filtroRapido.includes('pagar') || filtroRapido.includes('despesa') || filtroRapido.includes('pagos') || filtroRapido.includes('a_pagar')) ativos.push('despesa');
      if (filtroRapido.includes('receber') || filtroRapido.includes('receita') || filtroRapido.includes('recebidos') || filtroRapido.includes('receitas')) ativos.push('receita');
      
      if (ativos.length === 0) ativos = ['todos'];
      
      if (ativos.includes('pago')) dataRefStr = 'lancamento';

      setPeriodoFiltro(periodo);
      setFiltrosAtivos(ativos);
      setFiltroData(dataRefStr);
    }
  }, [filtroRapido]);

  const mesStr = format(mes, 'yyyy-MM');

  const checkCartaoPendente = (t: Transacao) => {
    return isCartaoPendente(t, faturas);
  };

  // Filtrar base (todos, o filtro refinado cuida do resto). Esconde Juros da Fatura para não poluir a tela.
  const filtradas = React.useMemo(() => {
    const filtradasBase = transacoes.filter(t => !(t.faturaId && t.descricao.startsWith('Juros/Multa')));
    
      const filtradasSemOrdem = filtradasBase.filter(t => {
        const rawRef = filtroData === 'lancamento' ? (t.dataPagamento || t.dataLancamento || t.data) : (t.dataVencimento || t.data);
        const dataRef = normalizeDate(rawRef);
        
        let naoPeriodo = true;
        const hojeData = new Date();
        const hojeStr = format(hojeData, 'yyyy-MM-dd');
        if (periodoFiltro === 'hoje') {
          naoPeriodo = dataRef === hojeStr;
        } else if (periodoFiltro === '2dias') {
          const hoje = format(hojeData, 'yyyy-MM-dd');
          const doisDiasFrente = format(new Date(hojeData.getTime() + 2 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
          naoPeriodo = dataRef >= hoje && dataRef <= doisDiasFrente;
        } else if (periodoFiltro === 'semana') {
          const inicioSemana = format(startOfWeek(hojeData, { weekStartsOn: 1 }), 'yyyy-MM-dd');
          const fimSemana = format(endOfWeek(hojeData, { weekStartsOn: 1 }), 'yyyy-MM-dd');
          naoPeriodo = dataRef >= inicioSemana && dataRef <= fimSemana;
        } else if (periodoFiltro === 'mes') {
          const inicioMes = format(startOfMonth(hojeData), 'yyyy-MM-dd');
          const fimMes = format(endOfMonth(hojeData), 'yyyy-MM-dd');
          naoPeriodo = dataRef >= inicioMes && dataRef <= fimMes;
        } else if (periodoFiltro === 'ano') {
          const anoAtual = format(hojeData, 'yyyy');
          naoPeriodo = String(dataRef || '').startsWith(anoAtual);
        } else if (periodoFiltro === 'data_especifica') {
          const dataItem = dataRef || '';
          if (dataEspecificaInicio && dataEspecificaFim) {
            naoPeriodo = dataItem >= dataEspecificaInicio && dataItem <= dataEspecificaFim;
          } else if (dataEspecificaInicio) {
            naoPeriodo = dataItem >= dataEspecificaInicio;
          } else if (dataEspecificaFim) {
            naoPeriodo = dataItem <= dataEspecificaFim;
          } else {
            naoPeriodo = true;
          }
        }
    
        // Pesquisa Inteligente Unificada
        const matchBusca = !busca || [
          t.descricao, t.fornecedorNome, t.clienteNome, t.categoriaNome, t.contaNome, t.observacoes, String(t.valor)
        ].some(v => v?.toLowerCase()?.includes(busca.toLowerCase()));
        
        // Múltipla escolha:
        const showAll = filtrosAtivos.includes('todos');
        
        // Tipo:
        const checkReceita = filtrosAtivos.includes('receita');
        const checkDespesa = filtrosAtivos.includes('despesa');
          const checkTransferencia = filtrosAtivos.includes('transferencia');
          const checkCartao = filtrosAtivos.includes('cartao');
          let matchTipo = true;
          if (!showAll && (checkReceita || checkDespesa || checkTransferencia || checkCartao)) {
            matchTipo = (checkReceita && t.tipo === 'receita') || (checkDespesa && t.tipo === 'despesa') || (checkTransferencia && t.tipo === 'transferencia') || (checkCartao && t.formaPagamento === 'cartao_credito');
          }
    
        // Status:
        const checkPago = filtrosAtivos.includes('pago');
        const checkPendente = filtrosAtivos.includes('pendente');
        const checkVencido = filtrosAtivos.includes('vencido');
        let matchStatus = true;
        if (!showAll && (checkPago || checkPendente || checkVencido)) {
          const isPago = t.status === 'pago';
          let isPend = false;
          if (t.formaPagamento === 'cartao_credito') {
            isPend = checkCartaoPendente(t);
          } else {
            isPend = t.status === 'pendente' || t.status === 'atrasado';
          }
          const dVenc = normalizeDate(t.dataVencimento || t.data || '');
          let isVenc = (t.status === 'atrasado' || t.status === 'pendente') && dVenc !== '' && dVenc < hojeStr;
          if (t.formaPagamento === 'cartao_credito' && !t.descricao.toLowerCase().includes('fatura')) {
            isVenc = false;
          }
          
          matchStatus = (checkPago && isPago) || (checkPendente && isPend) || (checkVencido && isVenc);
        }
        
        // Recorrente:
        const checkRecorrente = filtrosAtivos.includes('recorrente');
        let matchRecorrente = true;
        if (!showAll && checkRecorrente) {
          matchRecorrente = t.recorrente === true;
        }
    
        const matchCat = !filtroCategoria || t.categoriaNome === filtroCategoria;
        const matchCC = !filtroCC || t.centroCustoNome === filtroCC;
        const matchCont = !filtroContato || t.fornecedorNome === filtroContato || t.clienteNome === filtroContato;
        const compItem = t.comportamento || (t.recorrente ? 'fixa' : 'variavel');
        const matchComp = !filtroComportamento || compItem === filtroComportamento;
        return naoPeriodo && matchBusca && matchTipo && matchStatus && matchRecorrente && matchCat && matchCC && matchCont && matchComp;
      });
    
      const filtradasTemp = filtroData === 'vencimento' 
        ? ordenarVencimentosAsc(filtradasSemOrdem)
        : ordenarMovimentacoesDesc(filtradasSemOrdem);
    return filtradasTemp;
  }, [transacoes, filtroData, periodoFiltro, busca, filtrosAtivos, filtroComportamento, filtroCategoria, filtroCC, filtroContato, dataEspecificaInicio, dataEspecificaFim, faturas]);

  const {
    totalReceitas, receitasPagas, receitasPendentes,
    despesasPagas,
    despesasPendentesCartao,
    despesasPendentesComuns,
    despesasAPagarTotal, despesasAPagarTotal: despesasAPagar,
    totalDespesas,
    saldoProjetado: saldo
  } = React.useMemo(() => calcularTotais(filtradas, faturas), [filtradas, faturas]);
  const fmt = formatarMoeda;

  const checkSenha = () => {
    if (!cfgSenha) return true;
    const s = window.prompt('Digite a senha de segurança para continuar:');
    if (s === cfgSenha) return true;
    if (s !== null) window.alert('Senha incorreta!');
    return false;
  };

  // Seleção
  const toggleSelecionado = (id: string) => {
    setSelecionados(prev => {
      const novo = new Set(prev);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  };

  const selecionarTodos = () => {
    if (selecionados.size === filtradas.length) {
      setSelecionados(new Set());
    } else {
      setSelecionados(new Set(filtradas.map(t => t.id)));
    }
  };

  const cancelarSelecao = () => {
    setSelecionados(new Set());
    setModoSelecao(false);
  };

  const checarFaturaPaga = (faturaId?: string) => {
    if (!faturaId) return true;
    const fat = faturas.find(f => f.id === faturaId);
    if (fat && fat.status === 'paga') {
      const p = window.prompt('Fatura já paga! Digite a senha (1020) para alterar:');
      if (p !== '1020') {
        if (p !== null) alert('Senha incorreta.');
        return false;
      }
    }
    return true;
  };

  // Deletar individual
  const handleDeletar = async (id: string) => {
    const t = transacoes.find(x => x.id === id);
    if (!t) return;
    const p = window.prompt('Digite a senha (1020) para excluir:');
    if (p !== '1020') {
      if (p !== null) alert('Senha incorreta.');
      return;
    }
    if (!checkSenha()) return;
    if (!confirm('Deletar este lançamento?')) return;
    await deletarTransacao(id);
    selecionados.delete(id);
    setSelecionados(new Set(selecionados));
  };

  const handleEditar = (t: Transacao) => {
    if (!checarFaturaPaga(t.faturaId)) return;
    if (onEditarLancamento) onEditarLancamento(t);
  };

  const handleMarcarPago = async (t: Transacao) => {
    if (!checarFaturaPaga(t.faturaId)) return;
    try {
      let novaContaId = t.contaId;
      let novaFormaPgto = t.formaPagamento;

      if (!novaContaId) {
        const cId = window.prompt(`Qual a conta para este lançamento?`);
        if (cId === null) return;
        novaContaId = cId;
      }
      
      if (!novaFormaPgto) {
        const fPgto = window.prompt(`Qual a forma de pagamento? (pix, boleto, transferencia, dinheiro)`);
        if (fPgto === null) return;
        novaFormaPgto = fPgto as any;
      }

      const hoje = format(new Date(), 'yyyy-MM-dd');
      const dataSugerida = (t.dataVencimento && t.dataVencimento <= hoje) ? t.dataVencimento : hoje;
      const dataSugeridaFormatada = String(dataSugerida).split('-').reverse().join('/');
      let dataPagamentoStr = window.prompt(`Data efetiva do pagamento/recebimento (DD/MM/AAAA):`, dataSugeridaFormatada);
      if (dataPagamentoStr === null) return; // Cancelou
      
      if (dataPagamentoStr.includes('/')) {
          const parts = dataPagamentoStr.split('/');
          if (parts.length === 3) {
              dataPagamentoStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
          }
      }
      
      const { atualizarTransacao } = await import('@/lib/storage');
      await atualizarTransacao(t.id, { 
        status: 'pago', 
        dataPagamento: dataPagamentoStr,
        contaId: novaContaId,
        formaPagamento: novaFormaPgto
      });
    } catch (err: any) {
      alert(err.message || 'Erro ao marcar pagamento.');
    }
  };

  // Deletar selecionados em lote
  const handleDeletarSelecionados = async () => {
    const ids = Array.from(selecionados);
    const p = window.prompt('Digite a senha (1020) para excluir:');
    if (p !== '1020') {
      if (p !== null) alert('Senha incorreta.');
      return;
    }
    if (!checkSenha()) return;
    setDeletandoLote(true);
    const idsToDel = Array.from(selecionados);
    for (const id of idsToDel) {
      await deletarTransacao(id);
    }
    setSelecionados(new Set());
    setModoSelecao(false);
    setConfirmarExclusao(null);
    setDeletandoLote(false);
  };

  // Pagar selecionados em lote (Contas a Pagar -> Pago)
  const handlePagarSelecionados = async () => {
    if (!checkSenha()) return;
    setPagandoLote(true);
    const { salvarTransacao } = await import('@/lib/storage');
    const ids = Array.from(selecionados);
    const hoje = new Date().toISOString().split('T')[0];
    for (const id of ids) {
      const transacao = transacoes.find(t => t.id === id);
      if (transacao && transacao.status === 'pendente') {
        const comp = transacao.comportamento || (transacao.recorrente ? 'fixa' : 'variavel');
        await salvarTransacao({ ...transacao, status: 'pago', dataPagamento: hoje, comportamento: comp });
      }
    }
    setSelecionados(new Set());
    setModoSelecao(false);
    setPagandoLote(false);
  };

  // Deletar todos visíveis
  const handleDeletarTodos = async () => {
    const p = window.prompt('Digite a senha (1020) para excluir:');
    if (p !== '1020') {
      if (p !== null) alert('Senha incorreta.');
      return;
    }
    if (!checkSenha()) return;
    setDeletandoLote(true);
    for (const t of filtradas) {
      await deletarTransacao(t.id);
    }
    setSelecionados(new Set());
    setModoSelecao(false);
    setConfirmarExclusao(null);
    setDeletandoLote(false);
  };

  const exportarCSV = () => {
    const header = 'Tipo,Descrição,Valor,Data Lançamento,Data Vencimento,Categoria,Fornecedor,Conta,Forma Pgto,Status';
    const rows = filtradas.map(t =>
      `${t.tipo},"${t.descricao}",${t.valor},${t.data},${t.dataVencimento || t.data},"${t.categoriaNome || ''}","${t.fornecedorNome || ''}","${t.contaNome || ''}",${t.formaPagamento},${t.status}`
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lancamentos-${mesStr}.csv`;
    a.click();
  };

  // Categorias únicas do mes
  const categorias = [...new Set(transacoes.filter(t => String(t.data || '').startsWith(mesStr)).map(t => t.categoriaId))];
  const categoriasNomes = transacoes.reduce((acc, t) => {
    if (t.categoriaId && t.categoriaNome) acc[t.categoriaId] = t.categoriaNome;
    return acc;
  }, {} as Record<string, string>);

  const categoriasSet = new Set<string>();
  const ccSet = new Set<string>();
  const contatosSet = new Set<string>();
  
  transacoes.forEach(t => {
     if (t.categoriaNome) categoriasSet.add(t.categoriaNome);
     if (t.centroCustoNome) ccSet.add(t.centroCustoNome);
     if (t.fornecedorNome) contatosSet.add(t.fornecedorNome);
     if (t.clienteNome) contatosSet.add(t.clienteNome);
  });
  
  const categoriasDropdown = Array.from(categoriasSet).sort();
  const ccDropdown = Array.from(ccSet).sort();
  const contatosDropdown = Array.from(contatosSet).sort();

  const todosSelected = filtradas.length > 0 && selecionados.size === filtradas.length;
  const algunsSelected = selecionados.size > 0 && selecionados.size < filtradas.length;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>Lancamentos</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Alternador de Visualização Cards / Tabela Compacta */}
          <div style={{ display: 'flex', background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 10, padding: 3, gap: 2 }}>
            <button
              onClick={() => alterarModoVisualizacao('cards')}
              title="Visualização em Cards"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 8, border: 'none',
                cursor: 'pointer', fontSize: 11.5, fontWeight: 700,
                background: modoVisualizacao === 'cards' ? 'var(--primary)' : 'transparent',
                color: modoVisualizacao === 'cards' ? '#ffffff' : 'var(--text-muted)',
                transition: 'all 0.15s ease',
              }}
            >
              <LayoutGrid size={14} />
              <span>Cards</span>
            </button>
            <button
              onClick={() => alterarModoVisualizacao('tabela')}
              title="Visualização em Linhas Compactas (~25 por tela)"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 8, border: 'none',
                cursor: 'pointer', fontSize: 11.5, fontWeight: 700,
                background: modoVisualizacao === 'tabela' ? 'var(--primary)' : 'transparent',
                color: modoVisualizacao === 'tabela' ? '#ffffff' : 'var(--text-muted)',
                transition: 'all 0.15s ease',
              }}
            >
              <LayoutList size={14} />
              <span>Tabela</span>
            </button>
          </div>
          <button
            onClick={() => setModalImportarDocAberto(true)}
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: 'white',
              border: 'none',
              borderRadius: 10,
              padding: '7px 14px',
              fontSize: 12,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(139, 92, 246, 0.35)',
              transition: 'all 0.2s'
            }}
            title="Importar Boleto, Nota Fiscal ou Recibo com OCR e IA"
          >
            <Sparkles size={14} /> Ler com IA (Boleto/NF/Recibo)
          </button>
          <button className="btn-secondary" style={{ borderColor: '#ef4444', color: '#ef4444', fontWeight: 600, fontSize: 10.5 }} onClick={async () => {
             if (confirm('Deseja corrigir a sincronização? Isso forçará o download dos dados reais do servidor. Use isso se os valores estiverem diferentes do Dashboard.')) {
                try {
                   indexedDB.deleteDatabase('firestore/[DEFAULT]/sistemafinan/main');
                   localStorage.clear();
                   window.location.reload();
                } catch(e) {}
             }
          }}>
             <RefreshCw size={13} style={{ marginRight: 6 }} /> Corrigir Sincronização
          </button>
          <button onClick={exportarCSV} className="btn-secondary" title="Exportar CSV">
            <Download size={13} />
          </button>
        </div>
      </div>

      {/* Removidas as abas, agora é tudo unificado nãos botões de filtro abaixo */}

      {/* Central de Filtros Avançada */}
      <div style={{
        background: 'var(--bg-card)', 
        border: '1px solid var(--border)', 
        borderRadius: 16, 
        padding: '16px 20px', 
        marginBottom: 24,
        display: 'flex', 
        flexDirection: 'column', 
        gap: 16,
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
      }}>
        
        {/* Linha 1: Pesquisa e Controles Principais */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-body)', border: '1px solid var(--border)', borderRadius: 24, padding: '10px 16px', flex: 1, minWidth: 260, transition: 'all 0.2s', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}>
            <Search size={18} color="var(--text-muted)" style={{ marginRight: 10 }} />
            <input 
              type="text" 
              placeholder="Busque por descrição, cliente, fornecedor, categoria, conta, valor, vencimento ou digite: pagar hoje..." 
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', color: 'var(--text-primary)', fontSize: 14, fontWeight: 500 }}
            />
          </div>
          
          <button type="button" onClick={iniciarReconhecimentoVoz}
            title="Pesquisar por voz"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 20px',
              borderRadius: '24px',
              background: isListening ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-body)',
              border: '1px solid #ef4444',
              color: '#ef4444',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 14,
              transition: 'all 0.2s'
            }}
          >
            {isListening ? <Square size={13} color="#ef4444" /> : <Mic size={13} color="#ef4444" />}
            {isListening ? 'Ouvindo...' : 'Voz'}
          </button>
          
          {vozStatus && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: 8,
              padding: '8px 12px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--text-primary)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              zIndex: 10,
              animation: 'fadeIn 0.2s ease-in-out'
            }}>
              {vozStatus}
            </div>
          )}
          <select 
            style={{ width: 'auto', minWidth: 160, padding: '10px 16px', fontSize: 13, fontWeight: 600, borderRadius: 12, cursor: 'pointer', border: '1px solid var(--border)', background: 'var(--bg-body)', color: 'var(--text-primary)' }} 
            value={filtroData} 
            onChange={e => setFiltroData(e.target.value as any)}
          >
            <option value="lancamento">📅 Data da Compra</option>
            <option value="vencimento">📅 Data de Vencimento</option>
          </select>
          
          <button
            onClick={() => {
              if (modoSelecao) cancelarSelecao();
              else setModoSelecao(true);
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 16px', fontSize: 13, fontWeight: 600,
              borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s',
              background: modoSelecao ? 'rgba(239,68,68,0.1)' : 'var(--bg-body)',
              color: modoSelecao ? '#f87171' : 'var(--text-primary)',
              border: `1px solid ${modoSelecao ? 'rgba(239,68,68,0.3)' : 'var(--border)'}`,
            }}
            title="Modo de seleção em lote"
          >
            {modoSelecao ? <><XCircle size={13} /> Cancelar Lote</> : <><CheckSquare size={13} /> Ações em Lote</>}
          </button>
        </div>

        {/* Linha 2: Filtros de Período */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'nowrap' }}>
          <span style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', minWidth: 60 }}>Período</span>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, flex: 1, WebkitOverflowScrolling: 'touch' }}>
            {[
              { id: 'hoje', label: 'Hoje' },
              { id: '2dias', label: 'Até 2 dias' },
              { id: 'semana', label: 'Semana' },
              { id: 'mes', label: 'Mes' },
              { id: 'ano', label: 'Ano' },
              { id: 'data_especifica', label: 'Data Específica' },
              { id: 'todos', label: 'Todos Períodos' }
            ].map(f => (
              <button 
                key={f.id}
                onClick={() => setPeriodoFiltro(f.id as any)}
                style={{
                  padding: '6px 14px', borderRadius: '10px',
                  background: periodoFiltro === f.id ? 'var(--primary)' : 'var(--bg-body)',
                  color: periodoFiltro === f.id ? '#ffffff' : 'var(--text-primary)',
                  border: `1px solid ${periodoFiltro === f.id ? 'transparent' : 'var(--border)'}`,
                  fontSize: 10.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                  transition: 'all 0.2s',
                }}>
                {f.label}
              </button>
            ))}
            
            {periodoFiltro === 'data_especifica' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-body)', padding: '4px 12px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)' }}>De:</span>
                <input
                  type="date"
                  value={dataEspecificaInicio}
                  onChange={(e) => setDataEspecificaInicio(e.target.value)}
                  style={{ background: 'transparent', color: 'var(--text-primary)', border: 'none', fontSize: 10.5, fontWeight: 600, outline: 'none', cursor: 'pointer' }}
                />
                <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)' }}>Até:</span>
                <input
                  type="date"
                  value={dataEspecificaFim}
                  onChange={(e) => setDataEspecificaFim(e.target.value)}
                  style={{ background: 'transparent', color: 'var(--text-primary)', border: 'none', fontSize: 10.5, fontWeight: 600, outline: 'none', cursor: 'pointer' }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Linha 3: Filtros de Status/Tipo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'nowrap' }}>
          <span style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', minWidth: 60 }}>Tipos</span>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, flex: 1, WebkitOverflowScrolling: 'touch' }}>
            {[
              { id: 'todos', label: 'Todos os Tipos' },
              { id: 'receita', label: 'Receitas' },
              { id: 'despesa', label: 'Despesas' },
                { id: 'transferencia', label: 'Transferências' },
                { id: 'transferencia', label: 'Transferências' },
              { id: 'pago', label: 'Pagos / Recebidos' },
              { id: 'pendente', label: 'Pendentes' },
              { id: 'vencido', label: 'Vencidos' },
              { id: 'cartao', label: '💳 Cartão' },
              { id: 'recorrente', label: 'Recorrentes' }
            ].map(f => {
              const isActive = filtrosAtivos.includes(f.id);
              return (
                <button 
                  key={f.id}
                  onClick={() => {
                    if (f.id === 'todos') {
                      setFiltrosAtivos(['todos']);
                    } else {
                      let next = [...filtrosAtivos];
                      if (next.includes('todos')) next = [];
                      if (next.includes(f.id)) {
                        next = next.filter(x => x !== f.id);
                        if (next.length === 0) next = ['todos'];
                      } else {
                        next.push(f.id);
                      }
                      setFiltrosAtivos(next);
                    }
                  }}
                  style={{
                    padding: '6px 14px', borderRadius: '10px',
                    background: isActive ? 'var(--primary)' : 'var(--bg-body)',
                    color: isActive ? '#ffffff' : 'var(--text-primary)',
                    border: `1px solid ${isActive ? 'transparent' : 'var(--border)'}`,
                    fontSize: 10.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                    transition: 'all 0.2s',
                  }}>
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Linha 4: Filtros Específicos */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', paddingTop: 12, borderTop: '1px solid var(--border)', marginTop: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Filtros:</span>
            
            {/* Filtro Fixa / Variável */}
            <select 
              value={filtroComportamento} 
              onChange={e => setFiltroComportamento(e.target.value)} 
              style={{ 
                padding: '4px 8px', fontSize: 10.5, fontWeight: filtroComportamento ? 700 : 500, 
                borderRadius: 8, border: `1px solid ${filtroComportamento ? 'var(--primary)' : 'var(--border)'}`, 
                background: filtroComportamento ? 'rgba(var(--primary-rgb, 59, 130, 246), 0.08)' : 'var(--bg-body)', 
                color: filtroComportamento ? 'var(--primary)' : 'var(--text-primary)', 
                outline: 'none', minWidth: 135, height: 28, cursor: 'pointer' 
              }}
            >
                <option value="">Fixo ou Variável (Todos)</option>
                <option value="fixa">🔒 Fixa (Custos Fixos)</option>
                <option value="variavel">⚡ Variável (Custos Variáveis)</option>
            </select>

            {/* Filtro Categorias */}
            <select 
              value={filtroCategoria} 
              onChange={e => setFiltroCategoria(e.target.value)} 
              style={{ 
                padding: '4px 8px', fontSize: 10.5, fontWeight: filtroCategoria ? 700 : 500, 
                borderRadius: 8, border: `1px solid ${filtroCategoria ? 'var(--primary)' : 'var(--border)'}`, 
                background: filtroCategoria ? 'rgba(var(--primary-rgb, 59, 130, 246), 0.08)' : 'var(--bg-body)', 
                color: filtroCategoria ? 'var(--primary)' : 'var(--text-primary)', 
                outline: 'none', minWidth: 130, height: 28, cursor: 'pointer' 
              }}
            >
                <option value="">Todas Categorias</option>
                {categoriasDropdown.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            {/* Filtro Centro de Custo */}
            <select 
              value={filtroCC} 
              onChange={e => setFiltroCC(e.target.value)} 
              style={{ 
                padding: '4px 8px', fontSize: 10.5, fontWeight: filtroCC ? 700 : 500, 
                borderRadius: 8, border: `1px solid ${filtroCC ? 'var(--primary)' : 'var(--border)'}`, 
                background: filtroCC ? 'rgba(var(--primary-rgb, 59, 130, 246), 0.08)' : 'var(--bg-body)', 
                color: filtroCC ? 'var(--primary)' : 'var(--text-primary)', 
                outline: 'none', minWidth: 120, height: 28, cursor: 'pointer' 
              }}
            >
                <option value="">Todos C. Custo</option>
                {ccDropdown.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            {/* Filtro Fornecedores/Clientes com Busca Moderna ao Digitar */}
            <SearchableSelect
              value={filtroContato}
              onChange={setFiltroContato}
              options={contatosDropdown}
              placeholder="Digite o nome..."
              emptyLabel="Todos Fornecedores/Clientes"
              minWidth={175}
              maxWidth={220}
            />

            {/* Botão Limpar Filtros Específicos se algum estiver ativo */}
            {(filtroComportamento || filtroCategoria || filtroCC || filtroContato) && (
              <button
                type="button"
                onClick={() => {
                  setFiltroComportamento('');
                  setFiltroCategoria('');
                  setFiltroCC('');
                  setFiltroContato('');
                }}
                style={{
                  padding: '3px 8px',
                  borderRadius: 6,
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#ef4444',
                  fontSize: '10px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  height: 28,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                ✕ Limpar Filtros
              </button>
            )}
        </div>
      </div>

      {/* Barra de ações em lote */}
      {modoSelecao && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
          background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12,
          padding: '12px 20px', marginBottom: 16,
          animation: 'fadeIn 0.2s ease',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#f87171' }}>
              {selecionados.size} {selecionados.size === 1 ? 'selecionado' : 'selecionados'}
            </span>
            <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>de {filtradas.length}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={selecionarTodos}
              className="btn-secondary" style={{ fontSize: 10.5, padding: '6px 14px' }}>
              {todosSelected ? 'Desmarcar Todos' : 'Selecionar Todos'}
            </button>
            <button onClick={handlePagarSelecionados} disabled={selecionados.size === 0 || pagandoLote}
              className="btn-primary" style={{ fontSize: 10.5, padding: '6px 14px', background: 'var(--primary)' }}>
              {pagandoLote ? 'Processando...' : <><CheckCircle2 size={13} /> Pagar Lote</>}
            </button>
            <button
              onClick={() => setConfirmarExclusao('selecionados')}
              disabled={selecionados.size === 0}
              className="btn-danger"
              style={{
                fontSize: 10.5, padding: '6px 14px',
                opacity: selecionados.size === 0 ? 0.4 : 1,
                cursor: selecionados.size === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              <Trash2 size={13} />
              Excluir
            </button>
            <button onClick={cancelarSelecao}
              className="btn-secondary" style={{ fontSize: 10.5, padding: '6px 14px' }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Modal de confirmação */}
      {confirmarExclusao && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setConfirmarExclusao(null)}>
          <div className="modal-box slide-up" style={{ maxWidth: 440, textAlign: 'center', padding: 32 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <AlertTriangle size={28} color="#ef4444" />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
              Confirmar Exclusão
            </h3>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 6 }}>
              {confirmarExclusao === 'todos'
                ? `Você está prestes a excluir TODOS os ${filtradas.length} lançamentos do período filtrado.`
                : `Você está prestes a excluir ${selecionados.size} lançamento(s) selecionado(s).`
              }
            </p>
            <p style={{ fontSize: 13, color: '#ef4444', fontWeight: 600, marginBottom: 24 }}>
              ⚠️ Esta ação não pode ser desfeita!
            </p>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
              <button onClick={() => setConfirmarExclusao(null)} className="btn-secondary" style={{ flex: 1 }}>
                Cancelar
              </button>
              <button
                onClick={confirmarExclusao === 'todos' ? handleDeletarTodos : handleDeletarSelecionados}
                disabled={deletandoLote}
                className="btn-danger"
                style={{ flex: 1, justifyContent: 'center' }}
              >
                {deletandoLote ? (
                  <>⏳ Excluindo...</>
                ) : (
                  <><Trash2 size={13} /> Sim, Excluir</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navegação de Mes (Escondida se o filtro não for por Mes, pois os botões rápidos controlam isso agora) */}
      {periodoFiltro === 'mes' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 20px', marginBottom: 20 }}>
          <button onClick={() => setMes(m => subMonths(m, 1))} className="btn-secondary" style={{ padding: '4px 6px', fontSize: 10.5 }}>
            <ChevronLeft size={13} />
          </button>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
              {format(mes, "MMMM 'de' yyyy", { locale: ptBR })}
            </p>
            <p style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 2 }}>{filtradas.length} lançamentos</p>
          </div>
          <button onClick={() => setMes(m => addMonths(m, 1))} className="btn-secondary" style={{ padding: '4px 6px', fontSize: 10.5 }}>
            <ChevronRight size={13} />
          </button>
        </div>
      )}

      {/* Resumo rápido */}
      <div className="grid-responsive-4" style={{ marginBottom: 20 }}>
        <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
          <p style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Receitas</p>
          <p style={{ fontSize: 20, fontWeight: 800, color: '#10b981' }}><span className="valor-sensivel">{fmt(totalReceitas)}</span></p>
        </div>
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
          <p style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Despesas Pagas</p>
          <p style={{ fontSize: 20, fontWeight: 800, color: '#ef4444' }}><span className="valor-sensivel">{fmt(despesasPagas)}</span></p>
        </div>
        <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
          <p style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Despesas a Pagar</p>
          <p style={{ fontSize: 20, fontWeight: 800, color: '#f59e0b' }}><span className="valor-sensivel">{fmt(despesasAPagar)}</span></p>
        </div>
        <div style={{ background: saldo >= 0 ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${saldo >= 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}`, borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
          <p style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Saldo</p>
          <p style={{ fontSize: 20, fontWeight: 800, color: saldo >= 0 ? '#10b981' : '#ef4444' }}><span className="valor-sensivel">{fmt(saldo)}</span></p>
        </div>
      </div>



      {/* Tabela (Transformada em Timeline V2) */}
      <div style={{ marginTop: 20 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
            Carregando...
          </div>
        ) : filtradas.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
            <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Nenhum lançamento encontrado</p>
            <p style={{ fontSize: 13 }}>Tente ajustar os filtros ou adicione um novo lançamento.</p>
            <button onClick={onNovoLancamento} className="btn-primary" style={{ margin: '20px auto 0', display: 'inline-flex' }}>
              <PlusCircle size={13} />
              Novo Lancamento
            </button>
          </div>
        ) : modoVisualizacao === 'tabela' ? (
          /* ── MODO TABELA COMPACTA (ALTA DENSIDADE) ──────────────── */
          <div className="lancamentos-table-container" style={{ overflowX: 'auto', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
            <table className="lancamentos-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-body)', borderBottom: '2px solid var(--border)' }}>
                  {modoSelecao && <th style={{ width: 34, padding: '10px 8px' }}></th>}
                  <th style={{ width: 85, padding: '10px 10px', textAlign: 'left', fontSize: '10.5px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Data</th>
                  <th style={{ width: 105, padding: '10px 10px', textAlign: 'left', fontSize: '10.5px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Vencimento</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '10.5px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Descrição & Categoria</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '10.5px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Contato</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '10.5px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Conta</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '10.5px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Forma</th>
                  <th style={{ width: 110, padding: '10px 12px', textAlign: 'center', fontSize: '10.5px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                  <th style={{ width: 120, padding: '10px 12px', textAlign: 'right', fontSize: '10.5px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Valor</th>
                  <th style={{ minWidth: 195, width: 195, padding: '10px 8px', textAlign: 'center', fontSize: '10.5px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((t, idx) => {
                  const hojeIso = new Date().toISOString().split('T')[0];
                  const [yH, mH, dH] = hojeIso.split('-').map(Number);
                  const dHoje = new Date(yH, mH - 1, dH);
                  const vIso = String(t.dataVencimento || t.data || '').substring(0, 10);
                  const [yV, mV, dV] = (vIso || hojeIso).split('-').map(Number);
                  const dVenc = new Date(yV, (mV || 1) - 1, dV || 1);
                  const diffDias = Math.round((dVenc.getTime() - dHoje.getTime()) / (1000 * 60 * 60 * 24));
                  const isPago = t.status === 'pago';
                  const isAtrasado = !isPago && diffDias < 0;
                  const isHoje = !isPago && diffDias === 0;
                  const isFuturo = !isPago && diffDias > 0;
                  const atrasado = isAtrasado;
                  const dateToDisplay = filtroData === 'vencimento' ? (t.dataVencimento || t.data) : (t.dataPagamento || t.dataLancamento || t.data);
                  const isReceita = t.tipo === 'receita';
                  const isTransf = t.tipo === 'transferencia';
                  const valorFinal = Math.max(0, (Number(t.valor) || 0) + (Number(t.juros) || 0) + (Number(t.multa) || 0) - (Number(t.desconto) || 0));
                  const rowBg = selecionados.has(t.id) ? 'rgba(239,68,68,0.08)' : (idx % 2 === 1 ? 'rgba(255,255,255,0.02)' : 'transparent');

                  return (
                    <tr key={t.id} style={{ background: rowBg, borderBottom: '1px solid var(--border)', borderLeft: atrasado ? '3px solid #ef4444' : isReceita ? '3px solid #10b981' : '3px solid transparent' }} className="hover:bg-white/5 transition-colors">
                      {modoSelecao && (
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          <button onClick={() => toggleSelecionado(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'inline-flex' }}>
                            {selecionados.has(t.id) ? <CheckSquare size={16} color="#10b981" /> : <Square size={16} color="var(--text-muted)" />}
                          </button>
                        </td>
                      )}

                      {/* DATA LANÇAMENTO (DUPLO CLIQUE PARA EDITAR) */}
                      <td
                        onDoubleClick={() => setEditingCell({ id: t.id, field: 'data', val: String(t.dataLancamento || t.data || '').substring(0, 10) })}
                        title="Duplo clique para editar data de lançamento"
                        style={{ padding: '6px 10px', fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', cursor: 'pointer' }}
                      >
                        {editingCell?.id === t.id && editingCell.field === 'data' ? (
                          <input
                            type="date"
                            autoFocus
                            defaultValue={editingCell.val}
                            onBlur={(e) => handleSalvarInline(t, 'data', e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSalvarInline(t, 'data', (e.target as HTMLInputElement).value);
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            style={{ fontSize: '11px', padding: '3px 6px', borderRadius: '6px', border: '1px solid var(--primary)', background: 'var(--bg-body)', color: 'var(--text-primary)', outline: 'none' }}
                          />
                        ) : (
                          <span style={{ borderBottom: '1px dashed rgba(255,255,255,0.2)' }}>
                            {String(t.dataLancamento || t.data || '').split('-').reverse().join('/')}
                          </span>
                        )}
                      </td>

                      {/* DATA VENCIMENTO (DUPLO CLIQUE PARA EDITAR) */}
                      <td
                        onDoubleClick={() => setEditingCell({ id: t.id, field: 'dataVencimento', val: String(t.dataVencimento || t.data || '').substring(0, 10) })}
                        title="Duplo clique para editar vencimento"
                        style={{ padding: '6px 10px', fontSize: '11px', whiteSpace: 'nowrap', cursor: 'pointer' }}
                      >
                        {editingCell?.id === t.id && editingCell.field === 'dataVencimento' ? (
                          <input
                            type="date"
                            autoFocus
                            defaultValue={editingCell.val}
                            onBlur={(e) => handleSalvarInline(t, 'dataVencimento', e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSalvarInline(t, 'dataVencimento', (e.target as HTMLInputElement).value);
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            style={{ fontSize: '11px', padding: '3px 6px', borderRadius: '6px', border: '1px solid var(--primary)', background: 'var(--bg-body)', color: 'var(--text-primary)', outline: 'none' }}
                          />
                        ) : (
                          <div>
                            <span style={{
                              fontWeight: 700,
                              color: 'var(--text-primary)',
                              borderBottom: '1px dashed rgba(255,255,255,0.2)'
                            }}>
                              {String(t.dataVencimento || t.data || '').split('-').reverse().join('/')}
                            </span>
                            <div style={{ marginTop: 4 }}>
                              {isPago ? (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  background: 'rgba(16, 185, 129, 0.15)',
                                  color: '#10b981',
                                  border: '1px solid rgba(16, 185, 129, 0.35)',
                                  padding: '2px 7px',
                                  borderRadius: '5px',
                                  fontSize: '10px',
                                  fontWeight: 800
                                }}>
                                  🟢 Pago
                                </span>
                              ) : isAtrasado ? (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  background: 'rgba(239, 68, 68, 0.18)',
                                  color: '#ef4444',
                                  border: '1px solid rgba(239, 68, 68, 0.4)',
                                  padding: '2px 7px',
                                  borderRadius: '5px',
                                  fontSize: '10px',
                                  fontWeight: 800
                                }}>
                                  🔴 Atrasado ({Math.abs(diffDias)}d)
                                </span>
                              ) : isHoje ? (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  background: 'rgba(245, 158, 11, 0.18)',
                                  color: '#f59e0b',
                                  border: '1px solid rgba(245, 158, 11, 0.4)',
                                  padding: '2px 7px',
                                  borderRadius: '5px',
                                  fontSize: '10px',
                                  fontWeight: 800
                                }}>
                                  🟠 Vence Hoje
                                </span>
                              ) : (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  background: 'rgba(59, 130, 246, 0.15)',
                                  color: '#3b82f6',
                                  border: '1px solid rgba(59, 130, 246, 0.35)',
                                  padding: '2px 7px',
                                  borderRadius: '5px',
                                  fontSize: '10px',
                                  fontWeight: 800
                                }}>
                                  🔵 Em {diffDias}d
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* DESCRIÇÃO & CATEGORIA (DUPLO CLIQUE PARA EDITAR) */}
                      <td style={{ padding: '6px 10px' }}>
                        {/* Descrição inline */}
                        {editingCell?.id === t.id && editingCell.field === 'descricao' ? (
                          <input
                            type="text"
                            autoFocus
                            defaultValue={editingCell.val}
                            onBlur={(e) => handleSalvarInline(t, 'descricao', e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSalvarInline(t, 'descricao', (e.target as HTMLInputElement).value);
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '6px', border: '1px solid var(--primary)', background: 'var(--bg-body)', color: 'var(--text-primary)', width: '100%', maxWidth: 280, outline: 'none' }}
                          />
                        ) : (
                          <div
                            onDoubleClick={() => setEditingCell({ id: t.id, field: 'descricao', val: t.descricao })}
                            title="Duplo clique para editar descrição"
                            style={{ fontWeight: 700, fontSize: '12.5px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}
                          >
                            <span style={{ borderBottom: '1px dashed transparent' }} className="hover:border-white/30">{t.descricao}</span>
                            {(() => {
                              const comp = t.comportamento || (t.recorrente ? 'fixa' : 'variavel');
                              return comp ? (
                                <span style={{ fontSize: '9.5px', padding: '1px 5px', borderRadius: '4px', fontWeight: 700, background: comp === 'fixa' ? 'rgba(59,130,246,0.15)' : 'rgba(245,158,11,0.15)', color: comp === 'fixa' ? '#3b82f6' : '#f59e0b', border: `1px solid ${comp === 'fixa' ? 'rgba(59,130,246,0.3)' : 'rgba(245,158,11,0.3)'}` }}>
                                  {comp === 'fixa' ? '🔒 Fixa' : '⚡ Variável'}
                                </span>
                              ) : null;
                            })()}
                            {t.conciliado && <span title="Conciliado"><CheckCircle2 size={12} color="#10b981" /></span>}
                          </div>
                        )}

                        {/* Categoria inline */}
                        {editingCell?.id === t.id && editingCell.field === 'categoria' ? (
                          <select
                            autoFocus
                            defaultValue={t.categoriaId || t.categoriaNome}
                            onChange={(e) => handleSalvarInline(t, 'categoria', e.target.value)}
                            onBlur={() => setEditingCell(null)}
                            onKeyDown={(e) => { if (e.key === 'Escape') setEditingCell(null); }}
                            style={{ fontSize: '10.5px', padding: '2px 4px', borderRadius: '6px', border: '1px solid var(--primary)', background: 'var(--bg-body)', color: 'var(--text-primary)', marginTop: 2, outline: 'none' }}
                          >
                            {listaCategorias.length > 0 ? (
                              listaCategorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)
                            ) : (
                              categoriasDropdown.map(c => <option key={c} value={c}>{c}</option>)
                            )}
                          </select>
                        ) : (
                          <div
                            onDoubleClick={() => setEditingCell({ id: t.id, field: 'categoria', val: t.categoriaId || t.categoriaNome })}
                            title="Duplo clique para trocar categoria"
                            style={{ fontSize: '10.5px', color: t.categoriaCor || 'var(--text-muted)', fontWeight: 500, marginTop: 1, cursor: 'pointer', display: 'inline-block' }}
                          >
                            <span style={{ borderBottom: '1px dashed rgba(255,255,255,0.15)' }}>
                              {isTransf ? 'Transferência' : t.categoriaNome || 'Sem categoria'}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* CONTATO (DUPLO CLIQUE PARA EDITAR) */}
                      <td
                        onDoubleClick={() => setEditingCell({ id: t.id, field: 'contato', val: t.fornecedorNome || t.clienteNome || '' })}
                        title="Duplo clique para editar contato"
                        style={{ padding: '6px 10px', fontSize: '11px', color: 'var(--text-secondary)', cursor: 'pointer' }}
                      >
                        {editingCell?.id === t.id && editingCell.field === 'contato' ? (
                          <input
                            type="text"
                            autoFocus
                            defaultValue={editingCell.val}
                            placeholder="Nome do cliente/fornecedor"
                            onBlur={(e) => handleSalvarInline(t, 'contato', e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSalvarInline(t, 'contato', (e.target as HTMLInputElement).value);
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            style={{ fontSize: '11px', padding: '3px 6px', borderRadius: '6px', border: '1px solid var(--primary)', background: 'var(--bg-body)', color: 'var(--text-primary)', outline: 'none', width: '100%', maxWidth: 160 }}
                          />
                        ) : (
                          <span style={{ borderBottom: '1px dashed rgba(255,255,255,0.15)' }}>
                            {t.fornecedorNome || t.clienteNome || '—'}
                          </span>
                        )}
                      </td>

                      {/* CONTA */}
                      <td style={{ padding: '6px 10px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {isTransf ? (
                          <span>{t.contaNome || '-'} ➔ {((t as any)['contaDestinãoNome']) || ((t as any)['contaDestinoNome']) || '-'}</span>
                        ) : (
                          t.contaNome || '-'
                        )}
                      </td>

                      {/* FORMA */}
                      <td style={{ padding: '6px 10px', fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {isTransf ? '—' : (FORMAS_PAGAMENTO_LABELS[t.formaPagamento] || t.formaPagamento)}
                      </td>

                      {/* STATUS */}
                      <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                        {checkCartaoPendente(t) ? (
                          <span className="badge badge-yellow" style={{ fontSize: '9.5px', padding: '2px 6px' }}>Fatura Aberta</span>
                        ) : isPago ? (
                          <span className="badge badge-green" style={{ fontSize: '10px', padding: '3px 7px', fontWeight: 800 }}>✅ Pago</span>
                        ) : isAtrasado ? (
                          <span className="badge badge-red" style={{ fontSize: '10px', padding: '3px 7px', fontWeight: 800 }}>🔴 Atrasado ({Math.abs(diffDias)}d)</span>
                        ) : isHoje ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: 'rgba(245, 158, 11, 0.2)', color: '#d97706', border: '1px solid rgba(245, 158, 11, 0.45)', padding: '3px 7px', borderRadius: '4px', fontSize: '10px', fontWeight: 800 }}>🟠 Vence Hoje</span>
                        ) : (
                          <span className="badge badge-yellow" style={{ fontSize: '10px', padding: '3px 7px', fontWeight: 700 }}>{isReceita ? '⏳ A Receber' : '⏳ A Pagar'}</span>
                        )}
                      </td>

                      {/* VALOR (DUPLO CLIQUE PARA EDITAR) */}
                      <td
                        onDoubleClick={() => setEditingCell({ id: t.id, field: 'valor', val: t.valor })}
                        title="Duplo clique para editar valor"
                        style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 800, fontSize: '13px', color: isReceita ? '#15803d' : isTransf ? 'var(--text-primary)' : '#dc2626', whiteSpace: 'nowrap', cursor: 'pointer' }}
                      >
                        {editingCell?.id === t.id && editingCell.field === 'valor' ? (
                          <input
                            type="number"
                            step="0.01"
                            autoFocus
                            defaultValue={editingCell.val}
                            onBlur={(e) => handleSalvarInline(t, 'valor', e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSalvarInline(t, 'valor', (e.target as HTMLInputElement).value);
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            style={{ fontSize: '12px', fontWeight: 700, padding: '3px 6px', borderRadius: '6px', border: '1px solid var(--primary)', background: 'var(--bg-body)', color: 'var(--text-primary)', outline: 'none', width: 90, textAlign: 'right' }}
                          />
                        ) : (
                          <span style={{ borderBottom: '1px dashed rgba(255,255,255,0.2)' }}>
                            {isTransf ? '' : isReceita ? '+' : '-'} <span className="valor-sensivel">{fmt(valorFinal)}</span>
                          </span>
                        )}
                      </td>

                      {/* AÇÕES */}
                      <td style={{ padding: '6px 8px', textAlign: 'center', whiteSpace: 'nowrap', width: 195, minWidth: 195 }}>
                        <div className="tbl-actions-wrapper">
                          {!checkCartaoPendente(t) && t.status !== 'pago' && t.formaPagamento !== 'cartao_credito' && (
                            <button
                              onClick={() => handleMarcarPago(t)}
                              title="Baixar Lançamento"
                              className="tbl-action-btn"
                              style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.35)', color: '#10b981' }}
                            >
                              <CheckCircle2 size={14} color="#10b981" />
                            </button>
                          )}
                          {isReceita && t.status !== 'pago' && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setTransacaoCobrarPix(t); }}
                              title="Cobrar PIX"
                              className="tbl-action-btn"
                              style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.35)', color: '#10b981' }}
                            >
                              <Zap size={14} color="#10b981" />
                            </button>
                          )}
                          <button
                            onClick={() => import('@/lib/pdf-generator').then(m => m.gerarReciboPDF(t))}
                            title="Gerar Recibo PDF"
                            className="tbl-action-btn"
                            style={{ background: 'var(--bg-active)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                          >
                            <Download size={14} color="currentColor" />
                          </button>
                          <button
                            onClick={() => onDuplicarLancamento && onDuplicarLancamento(t)}
                            title="Duplicar Lançamento"
                            className="tbl-action-btn"
                            style={{ background: 'var(--bg-active)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                          >
                            <Repeat size={14} color="currentColor" />
                          </button>
                          <button
                            onClick={() => handleEditar(t)}
                            title="Editar Lançamento"
                            className="tbl-action-btn"
                            style={{ background: 'var(--bg-active)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                          >
                            <Edit3 size={14} color="currentColor" />
                          </button>
                          <button
                            onClick={() => handleDeletar(t.id)}
                            title="Excluir Lançamento"
                            className="tbl-action-btn"
                            style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444' }}
                          >
                            <Trash2 size={14} color="#ef4444" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* ── MODO CARDS VISUAIS ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtradas.map(t => {
              const hojeIso = new Date().toISOString().split('T')[0];
                  const [yH, mH, dH] = hojeIso.split('-').map(Number);
                  const dHoje = new Date(yH, mH - 1, dH);
                  const vIso = String(t.dataVencimento || t.data || '').substring(0, 10);
                  const [yV, mV, dV] = (vIso || hojeIso).split('-').map(Number);
                  const dVenc = new Date(yV, (mV || 1) - 1, dV || 1);
                  const diffDias = Math.round((dVenc.getTime() - dHoje.getTime()) / (1000 * 60 * 60 * 24));
                  const isPago = t.status === 'pago';
                  const isAtrasado = !isPago && diffDias < 0;
                  const isHoje = !isPago && diffDias === 0;
                  const isFuturo = !isPago && diffDias > 0;
                  const atrasado = isAtrasado;
                  const diff = diffDias;
                  const dateToDisplay = filtroData === 'vencimento' ? (t.dataVencimento || t.data) : (t.dataPagamento || t.dataLancamento || t.data);
              let alertaCss = '';
              if (t.tipo === 'despesa' && t.status !== 'pago') {
                if (diff < 0) alertaCss = 'piscar-vermelho';
                else if (diff === 0) alertaCss = 'piscar-vermelho';
                else if (diff <= 2) alertaCss = 'piscar-laranja';
              }
              const isReceita = t.tipo === 'receita';
              const isTransf = t.tipo === 'transferencia';
              const colorBg = 'rgba(204,9,47,0.15)';
              const colorIcon = '#cc092f';

              return (
                <div key={t.id} className={`glass hover-lift lancamento-card ${alertaCss}`} style={{ 
                  borderLeft: `4px solid ${colorIcon}`,
                  background: selecionados.has(t.id) ? 'rgba(239,68,68,0.06)' : undefined,
                }}>
                  <div className="lancamento-card-left">
                      {modoSelecao && (
                         <button onClick={() => toggleSelecionado(t.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }}>
                            {selecionados.has(t.id)
                              ? <CheckSquare size={20} color="#10b981" />
                              : <Square size={20} color="var(--text-muted)" />
                            }
                          </button>
                      )}
                      <div className="lancamento-icon-wrapper" style={{ borderRadius: '50%', background: colorBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                         <DynamicIcon name={isTransf ? 'RefreshCw' : (t.categoriaIcone || 'Package')} size={22} color={colorIcon} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <h4 className="lancamento-title" style={{ fontWeight: 800 }}>
                          {t.descricao}
                          {t.conciliado && <span title="Conciliado"><CheckCircle2 size={13} color="#10b981" /></span>}
                        </h4>
                        <p className="lancamento-subtitle" style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span>Lanc: {String(t.dataLancamento || t.data || '').split('-').reverse().join('/')}</span>
                            <span style={{ fontWeight: 600 }}>• Venc: {String(t.dataVencimento || t.data || '').split('-').reverse().join('/')}</span>
                            {isPago ? (
                              <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.35)', padding: '2px 6px', borderRadius: 4, fontSize: '9.5px', fontWeight: 800 }}>🟢 Pago</span>
                            ) : isAtrasado ? (
                              <span style={{ background: 'rgba(239, 68, 68, 0.18)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.4)', padding: '2px 6px', borderRadius: 4, fontSize: '9.5px', fontWeight: 800 }}>🔴 Atrasado ({Math.abs(diffDias)}d)</span>
                            ) : isHoje ? (
                              <span style={{ background: 'rgba(245, 158, 11, 0.18)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.4)', padding: '2px 6px', borderRadius: 4, fontSize: '9.5px', fontWeight: 800 }}>🟠 Vence Hoje</span>
                            ) : (
                              <span style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.35)', padding: '2px 6px', borderRadius: 4, fontSize: '9.5px', fontWeight: 800 }}>🔵 Em {diffDias}d</span>
                            )}
                          </span>
                          
                          {/* Contador de Dias Modernão */}
                          {t.status !== 'pago' && !isTransf && (
                            <span style={{
                              background: t.tipo === 'despesa' ? '#ef4444' : '#10b981',
                              color: 'white',
                              padding: '1px 6px',
                              borderRadius: 12,
                              fontSize: 9,
                              fontWeight: 800,
                              textTransform: 'uppercase', letterSpacing: '0.5px', display: 'inline-flex', whiteSpace: 'nowrap',
                              alignItems: 'center',
                              boxShadow: `0 2px 4px ${t.tipo === 'despesa' ? 'rgba(239,68,68,0.4)' : 'rgba(16,185,129,0.4)'}`
                            }}>
                              {diff < 0 
                                ? `Atrasado ${Math.abs(diff)} dia${Math.abs(diff) > 1 ? 's' : ''}` 
                                : diff === 0 
                                  ? 'Hoje' 
                                  : `Falta${diff > 1 ? 'm' : ''} ${diff} dia${diff > 1 ? 's' : ''}`}
                            </span>
                          )}

                          <span className="hide-on-mobile">•</span>
                          <span style={{ color: t.categoriaCor || 'var(--text-secondary)', fontWeight: 600 }}>{isTransf ? 'Transferência' : t.categoriaNome}</span>
                        </p>
                      </div>
                  </div>

                  <div className="lancamento-card-middle">
                    <div className="lancamento-tags" style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 5 }}>
{t.tipo === 'transferencia' ? (
                         <span style={{ background: 'var(--bg-active)', padding: '3px 6px', fontSize: 10.5, borderRadius: 8, fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0, color: 'var(--primary)' }}>
                           {t.contaNome || '-'} ➔ {((t as any)['contaDestinãoNome']) || ((t as any)['contaDestinoNome']) || (contas.find(c => c.id === ((t as any)['contaDestinãoId'] || (t as any)['contaDestinoId']))?.nome) || '-'}
                         </span>
                       ) : (
                         <>
                           <span style={{ background: 'var(--bg-active)', padding: '3px 6px', fontSize: 10.5, borderRadius: 8, fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0 }}>{t.contaNome || '-'}</span>
                           <span style={{ background: 'var(--bg-active)', padding: '3px 6px', fontSize: 10.5, borderRadius: 8, fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0 }}>{FORMAS_PAGAMENTO_LABELS[t.formaPagamento] || t.formaPagamento}</span>
                         </>
                       )}
                       {['master', '9yxuafoC0AV9BrIKem05ponbmgn2', 'autocred-promotora-de-credito'].includes(getTenantId()) && t.comportamento && (
                         <span style={{ background: t.comportamento === 'fixa' ? 'rgba(139,92,246,0.15)' : 'rgba(245,158,11,0.15)', color: t.comportamento === 'fixa' ? '#6d28d9' : '#b45309', border: `1px solid ${t.comportamento === 'fixa' ? 'var(--primary)' : '#f59e0b'}`, padding: '3px 6px', fontSize: 10.5 }}>
                           {t.comportamento === 'fixa' ? 'Fixa' : 'Variável'}
                         </span>
                       )}
                       {(t.fornecedorNome || t.clienteNome) && (
                          <span title={t.fornecedorNome || t.clienteNome} style={{ background: 'var(--bg-active)', padding: '3px 7px', fontSize: 10.5, borderRadius: 6, fontWeight: 600, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>👤 {t.fornecedorNome || t.clienteNome}</span>
                       )}
                       
                         
                    </div>
                  </div>

                  <div className="lancamento-card-right">
                     <div className="lancamento-valor-box">
                       <p className="lancamento-valor" style={{ fontWeight: 900, color: isReceita ? '#15803d' : 'var(--text-primary)' }}>
                          {isTransf ? '' : isReceita ? '+' : '-'} <span className="valor-sensivel">{fmt(Math.max(0, (Number(t.valor) || 0) + (Number(t.juros) || 0) + (Number(t.multa) || 0) - (Number(t.desconto) || 0)))}</span>
                           {(t.juros || t.multa || t.desconto) ? (
                             <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2, fontWeight: 500 }}>
                               {t.juros ? `Juros: ${fmt(t.juros)} ` : ''}
                               {t.multa ? `Multa: ${fmt(t.multa)} ` : ''}
                               {t.desconto ? `Desc: ${fmt(t.desconto)}` : ''}
                             </div>
                           ) : null}
                       </p>
                       <div className="lancamento-badge-wrapper" style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          {(t.formaPagamento === 'cartao_credito' || (t.observacoes && t.observacoes.includes('Baixa ref. fatura'))) && t.status === 'pago' && (
                            <span className="badge" style={{ fontSize: 10.5, background: 'rgba(139,92,246,0.15)', color: '#7c3aed', border: '1px solid rgba(139,92,246,0.3)' }}>💳 Pgto Cartão</span>
                          )}

                          {checkCartaoPendente(t) ? (
                            <span className="badge badge-yellow" style={{ fontSize: 10.5 }}>Fatura Aberta</span>
                          ) : isPago ? (
                            <span className="badge badge-green" style={{ fontSize: 10.5, fontWeight: 800 }}>✅ Pago</span>
                          ) : isAtrasado ? (
                            <span className="badge badge-red" style={{ fontSize: 10.5, fontWeight: 800 }}>🔴 Atrasado ({Math.abs(diffDias)}d)</span>
                          ) : isHoje ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: 'rgba(245, 158, 11, 0.2)', color: '#d97706', border: '1px solid rgba(245, 158, 11, 0.45)', padding: '2px 7px', borderRadius: 5, fontSize: 10.5, fontWeight: 800 }}>🟠 Vence Hoje</span>
                          ) : (
                            <span className="badge badge-yellow" style={{ fontSize: 10.5, fontWeight: 700 }}>{STATUS_LABELS[t.tipo]?.[t.status] || t.status}</span>
                          )}
                       </div>
                     </div>
                     <div className="lancamento-actions">
                         {!checkCartaoPendente(t) && t.status !== 'pago' && t.formaPagamento !== 'cartao_credito' && (
                           <button onClick={() => handleMarcarPago(t)} style={{ background: 'var(--primary-light)', border: '1px solid var(--primary-light)', borderRadius: 10, padding: '3px 6px', fontSize: 10.5, fontWeight: 600, transition: 'all 0.15s' }}>
                             <CheckCircle2 size={13} /> Baixar
                           </button>
                         )}
                         {isReceita && t.status !== 'pago' && (
                           <button onClick={(e) => { e.stopPropagation(); setTransacaoCobrarPix(t); }} style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', borderRadius: 10, padding: '3px 6px', fontSize: 10.5, fontWeight: 700, transition: 'all 0.15s', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }} title="Gerar QR Code PIX e Cobrar via WhatsApp">
                            <Zap size={13} /> Cobrar PIX
                          </button>
                         )}
                         
                           {t.comprovanteBase64 && !t.anexos && (
                             <button onClick={(e) => { e.stopPropagation(); openSafeAttachment(t.comprovanteBase64 as string); }} 
                               style={{ background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: 10, padding: '3px 6px', fontSize: 10.5, fontWeight: 600, transition: 'all 0.15s' }} title="Ver Anexo">
                               <Paperclip size={13} /> Anexo
                             </button>
                           )}
                           {t.anexos && t.anexos.map((a, idx) => (
                             <button key={idx} onClick={(e) => { e.stopPropagation(); openSafeAttachment(a.url); }} 
                               style={{ background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: 10, padding: '3px 6px', fontSize: 10.5, fontWeight: 600, transition: 'all 0.15s' }} title={a.nome}>
                               <Paperclip size={13} /> {t.anexos!.length > 1 ? 'Anexo ' + (idx + 1) : 'Anexo'}
                             </button>
                           ))}


<button onClick={() => import('@/lib/pdf-generator').then(m => m.gerarReciboPDF(t))} style={{ background: 'var(--bg-active)', border: '1px solid var(--border)', borderRadius: 10, padding: '3px 6px', fontSize: 10.5, fontWeight: 600, transition: 'all 0.15s' }}>
  <Download size={13} /> Recibo
</button>
<button onClick={() => onDuplicarLancamento && onDuplicarLancamento(t)} style={{ background: 'var(--bg-active)', border: '1px solid var(--border)', borderRadius: 10, padding: '3px 6px', fontSize: 10.5, fontWeight: 600, transition: 'all 0.15s' }}>
  <Repeat size={13} /> Duplicar
</button>
<button onClick={() => handleEditar(t)} style={{ background: 'var(--bg-active)', border: '1px solid var(--border)', borderRadius: 10, padding: '3px 6px', fontSize: 10.5, fontWeight: 600, transition: 'all 0.15s' }}>
  <Edit3 size={13} /> Editar
</button>

                         <button onClick={() => handleDeletar(t.id)} style={{ background: 'var(--bg-active)', border: '1px solid var(--border)', borderRadius: 10, padding: '4px 6px', fontSize: 10.5, cursor: 'pointer', color: 'var(--text-secondary)', transition: 'all 0.15s' }}>
                           <Trash2 size={13} />
                         </button>
                     </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Total rodapé */}
      <div style={{ marginTop: 12, textAlign: 'right', color: 'var(--text-muted)', fontSize: 13 }}>
        {filtradas.length} lançamentos encontrados neste período.
      </div>

      {filtradas.length > 0 && (
        <div style={{ marginTop: 16, display: 'flex', gap: 20, justifyContent: 'flex-end', fontSize: 13, background: 'var(--bg-card)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <div>
            <strong style={{ color: 'var(--text-primary)', marginBottom: 8, display: 'block' }}>RECEITAS</strong>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px 16px', color: 'var(--text-muted)' }}>
              <span>Efetivadas (Pagas):</span> <strong style={{ color: '#10b981' }}>{formatarMoeda(receitasPagas)}</strong>
              <span>Pendentes:</span> <span>{formatarMoeda(receitasPendentes)}</span>
              <span style={{ borderTop: '1px solid var(--border)', paddingTop: 4, marginTop: 4 }}>Total do Mês:</span> 
              <strong style={{ borderTop: '1px solid var(--border)', paddingTop: 4, marginTop: 4, color: '#059669' }}>{formatarMoeda(totalReceitas)}</strong>
            </div>
          </div>
          <div style={{ width: 1, background: 'var(--border)' }}></div>
          <div>
            <strong style={{ color: 'var(--text-primary)', marginBottom: 8, display: 'block' }}>DESPESAS</strong>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px 16px', color: 'var(--text-muted)' }}>
              <span>Efetivadas (Pagas):</span> <strong style={{ color: '#f87171' }}>{formatarMoeda(despesasPagas)}</strong>
              <span>Pendentes a Pagar:</span> <span>{formatarMoeda(despesasAPagarTotal)}</span>
              <span style={{ borderTop: '1px solid var(--border)', paddingTop: 4, marginTop: 4 }}>Total do Mês:</span> 
              <strong style={{ borderTop: '1px solid var(--border)', paddingTop: 4, marginTop: 4, color: '#dc2626' }}>{formatarMoeda(totalDespesas)}</strong>
            </div>
          </div>
        </div>
      )}

      {modalImportarDocAberto && (
        <ModalImportarDocIA
          onClose={() => setModalImportarDocAberto(false)}
          onSuccess={() => setModalImportarDocAberto(false)}
        />
      )}

      {transacaoCobrarPix && (
        <ModalCobrancaPix
          transacao={transacaoCobrarPix}
          onClose={() => setTransacaoCobrarPix(null)}
          onBaixaSucesso={(id) => {
            setTransacaoCobrarPix(null);
          }}
        />
      )}
    </div>
  );
}
