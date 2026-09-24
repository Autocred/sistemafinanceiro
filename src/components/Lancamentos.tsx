'use client';

import React, { useState, useEffect } from 'react';
import { getTenantId, deletarTransacao, formatarMoeda, subscribeTransacoes, subscribeFaturas, subscribeContas } from '@/lib/storage';
import { Categoria, Conta, Fatura, Transacao } from '@/lib/types';
import { calcularTotais, isCartaoPendente, normalizeDate } from '@/lib/financialEngine';
import { FORMAS_PAGAMENTO_LABELS, STATUS_LABELS } from '@/lib/defaults';
import { DynamicIcon } from '@/components/DynamicIcon';
import { format, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PlusCircle, Search, Filter, ChevronLeft, ChevronRight, Trash2, Edit3, Download, RefreshCw, ArrowUpCircle, ArrowDownCircle, CheckSquare, Square, XCircle, AlertTriangle, DollarSign, ChevronDown, ChevronUp, Clock, Zap, Calendar as CalendarIcon, List, Repeat, Paperclip, CheckCircle2, Mic } from 'lucide-react';
import { ordenarMovimentacoesDesc, ordenarVencimentosAsc } from '@/lib/sorting';

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
      const doisDiasFrente = format(new Date(hojeData.getTime() + 2 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
        const doisDiasAtras = format(new Date(hojeData.getTime() - 2 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
        naoPeriodo = dataRef >= doisDiasAtras && dataRef <= doisDiasFrente;
    } else if (periodoFiltro === 'semana') {
      const umaSemanaAtras = format(new Date(hojeData.getTime() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
      const umaSemanaFrente = format(new Date(hojeData.getTime() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
      naoPeriodo = dataRef >= umaSemanaAtras && dataRef <= umaSemanaFrente;
    } else if (periodoFiltro === 'mes') {
      naoPeriodo = String(dataRef || '').startsWith(mesStr);
    } else if (periodoFiltro === 'ano') {
      naoPeriodo = String(dataRef || '').startsWith(mesStr.substring(0, 4));
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
    return naoPeriodo && matchBusca && matchTipo && matchStatus && matchRecorrente && matchCat && matchCC && matchCont;
  });

  const filtradas = filtroData === 'vencimento' 
    ? ordenarVencimentosAsc(filtradasSemOrdem)
    : ordenarMovimentacoesDesc(filtradasSemOrdem);

  const {
    totalReceitas, receitasPagas, receitasPendentes,
    despesasPagas,
    despesasPendentesCartao,
    despesasPendentesComuns,
    despesasAPagarTotal, despesasAPagarTotal: despesasAPagar,
    totalDespesas,
    saldoProjetado: saldo
  } = calcularTotais(filtradas, faturas);
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
        await salvarTransacao({ ...transacao, status: 'pago', dataPagamento: hoje });
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
    const header = 'Tipo,Descrição,Valor,Data,Categoria,Fornecedor,Conta,Forma Pgto,Status';
    const rows = filtradas.map(t =>
      `${t.tipo},"${t.descricao}",${t.valor},${t.data},"${t.categoriaNome || ''}","${t.fornecedorNome || ''}","${t.contaNome || ''}",${t.formaPagamento},${t.status}`
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
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn-secondary" style={{ borderColor: '#ef4444', color: '#ef4444', fontWeight: 600, fontSize: 11 }} onClick={async () => {
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
          <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', minWidth: 60 }}>Período</span>
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
                  fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                  transition: 'all 0.2s',
                }}>
                {f.label}
              </button>
            ))}
            
            {periodoFiltro === 'data_especifica' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-body)', padding: '4px 12px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>De:</span>
                <input
                  type="date"
                  value={dataEspecificaInicio}
                  onChange={(e) => setDataEspecificaInicio(e.target.value)}
                  style={{ background: 'transparent', color: 'var(--text-primary)', border: 'none', fontSize: 11, fontWeight: 600, outline: 'none', cursor: 'pointer' }}
                />
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>Até:</span>
                <input
                  type="date"
                  value={dataEspecificaFim}
                  onChange={(e) => setDataEspecificaFim(e.target.value)}
                  style={{ background: 'transparent', color: 'var(--text-primary)', border: 'none', fontSize: 11, fontWeight: 600, outline: 'none', cursor: 'pointer' }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Linha 3: Filtros de Status/Tipo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'nowrap' }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', minWidth: 60 }}>Tipos</span>
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
                    fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                    transition: 'all 0.2s',
                  }}>
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Linha 4: Filtros Específicos */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', paddingTop: 16, borderTop: '1px solid var(--border)', marginTop: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', minWidth: 60 }}>Filtros</span>
            <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)} style={{ padding: '4px 6px', fontSize: 11, fontWeight: 600, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-body)', color: 'var(--text-primary)', outline: 'none', minWidth: 180 }}>
                <option value="">Todas as Categorias</option>
                {categoriasDropdown.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filtroCC} onChange={e => setFiltroCC(e.target.value)} style={{ padding: '4px 6px', fontSize: 11, fontWeight: 600, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-body)', color: 'var(--text-primary)', outline: 'none', minWidth: 180 }}>
                <option value="">Todos os C. de Custo</option>
                {ccDropdown.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filtroContato} onChange={e => setFiltroContato(e.target.value)} style={{ padding: '4px 6px', fontSize: 11, fontWeight: 600, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-body)', color: 'var(--text-primary)', outline: 'none', minWidth: 180 }}>
                <option value="">Todos Fornecedores/Clientes</option>
                {contatosDropdown.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
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
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>de {filtradas.length}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={selecionarTodos}
              className="btn-secondary" style={{ fontSize: 11, padding: '6px 14px' }}>
              {todosSelected ? 'Desmarcar Todos' : 'Selecionar Todos'}
            </button>
            <button onClick={handlePagarSelecionados} disabled={selecionados.size === 0 || pagandoLote}
              className="btn-primary" style={{ fontSize: 11, padding: '6px 14px', background: 'var(--primary)' }}>
              {pagandoLote ? 'Processando...' : <><CheckCircle2 size={13} /> Pagar Lote</>}
            </button>
            <button
              onClick={() => setConfirmarExclusao('selecionados')}
              disabled={selecionados.size === 0}
              className="btn-danger"
              style={{
                fontSize: 11, padding: '6px 14px',
                opacity: selecionados.size === 0 ? 0.4 : 1,
                cursor: selecionados.size === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              <Trash2 size={13} />
              Excluir
            </button>
            <button onClick={cancelarSelecao}
              className="btn-secondary" style={{ fontSize: 11, padding: '6px 14px' }}>
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
          <button onClick={() => setMes(m => subMonths(m, 1))} className="btn-secondary" style={{ padding: '4px 6px', fontSize: 11 }}>
            <ChevronLeft size={13} />
          </button>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
              {format(mes, "MMMM 'de' yyyy", { locale: ptBR })}
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{filtradas.length} lançamentos</p>
          </div>
          <button onClick={() => setMes(m => addMonths(m, 1))} className="btn-secondary" style={{ padding: '4px 6px', fontSize: 11 }}>
            <ChevronRight size={13} />
          </button>
        </div>
      )}

      {/* Resumo rápido */}
      <div className="grid-responsive-4" style={{ marginBottom: 20 }}>
        <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Receitas</p>
          <p style={{ fontSize: 20, fontWeight: 800, color: '#10b981' }}><span className="valor-sensivel">{fmt(totalReceitas)}</span></p>
        </div>
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Despesas Pagas</p>
          <p style={{ fontSize: 20, fontWeight: 800, color: '#ef4444' }}><span className="valor-sensivel">{fmt(despesasPagas)}</span></p>
        </div>
        <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Despesas a Pagar</p>
          <p style={{ fontSize: 20, fontWeight: 800, color: '#f59e0b' }}><span className="valor-sensivel">{fmt(despesasAPagar)}</span></p>
        </div>
        <div style={{ background: saldo >= 0 ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${saldo >= 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}`, borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Saldo</p>
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
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtradas.map(t => {
              const hoje = new Date();
              const dateToDisplay = filtroData === 'vencimento' ? (t.dataVencimento || t.data) : (t.dataPagamento || t.dataLancamento || t.data);
                const dataVenc = t.dataVencimento || t.data;
                const diff = Math.ceil((new Date(dataVenc).getTime() - hoje.getTime()) / (1000 * 3600 * 24));
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
                          <span>{String(dateToDisplay || '').split('-').reverse().join('/')} {filtroData === 'vencimento' && !t.dataVencimento ? '(Data da Compra)' : ''} {filtroData === 'lancamento' && t.dataVencimento && t.dataVencimento !== t.data ? ` (Venc. ${String(t.dataVencimento).split('-').reverse().join('/')})` : ''}</span>
                          
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
                    <div className="lancamento-tags" style={{ display: 'flex', flexWrap: 'nowrap', overflowX: 'auto', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', gap: 6 }}>
{t.tipo === 'transferencia' ? (
                         <span style={{ background: 'var(--bg-active)', padding: '4px 8px', fontSize: 11, borderRadius: 8, fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0, color: '#0284c7' }}>
                           {t.contaNome || '-'} ➔ {t.contaNome || '-'} \u2794 {((t as any)['contaDestin\u01DCoNome']) || ((t as any)['contaDestinoNome']) || (contas.find(c => c.id === ((t as any)['contaDestin\u01DCoId'] || (t as any)['contaDestinoId']))?.nome) || '-'}
                         </span>
                       ) : (
                         <>
                           <span style={{ background: 'var(--bg-active)', padding: '4px 8px', fontSize: 11, borderRadius: 8, fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0 }}>{t.contaNome || '-'}</span>
                           <span style={{ background: 'var(--bg-active)', padding: '4px 8px', fontSize: 11, borderRadius: 8, fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0 }}>{FORMAS_PAGAMENTO_LABELS[t.formaPagamento] || t.formaPagamento}</span>
                         </>
                       )}
                       {['master', '9yxuafoC0AV9BrIKem05ponbmgn2', 'autocred-promotora-de-credito'].includes(getTenantId()) && t.comportamento && (
                         <span style={{ background: t.comportamento === 'fixa' ? 'rgba(139,92,246,0.15)' : 'rgba(245,158,11,0.15)', color: t.comportamento === 'fixa' ? '#6d28d9' : '#b45309', border: `1px solid ${t.comportamento === 'fixa' ? '#8b5cf6' : '#f59e0b'}`, padding: '4px 8px', fontSize: 11 }}>
                           {t.comportamento === 'fixa' ? 'Fixa' : 'Variável'}
                         </span>
                       )}
                       {(t.fornecedorNome || t.clienteNome) && (
                          <span style={{ background: 'var(--bg-active)', padding: '4px 8px', fontSize: 11, borderRadius: 8, fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0 }}>👤 {t.fornecedorNome || t.clienteNome}</span>
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
                            <span className="badge" style={{ fontSize: 11, background: 'rgba(139,92,246,0.15)', color: '#7c3aed', border: '1px solid rgba(139,92,246,0.3)' }}>💳 Pgto Cartão</span>
                          )}

                          {checkCartaoPendente(t) ? (
                            <span className="badge badge-yellow" style={{ fontSize: 11 }}>Fatura Aberta</span>
                          ) : (
                            <span className={`badge ${t.status === 'pago' ? 'badge-green' : t.status === 'atrasado' ? 'badge-red' : 'badge-yellow'}`} style={{ fontSize: 11 }}>
                              {STATUS_LABELS[t.tipo]?.[t.status] || t.status}
                            </span>
                          )}
                       </div>
                     </div>
                     <div className="lancamento-actions">
                         {!checkCartaoPendente(t) && t.status !== 'pago' && t.formaPagamento !== 'cartao_credito' && (
                           <button onClick={() => handleMarcarPago(t)} style={{ background: 'var(--primary-light)', border: '1px solid var(--primary-light)', borderRadius: 10, padding: '4px 8px', fontSize: 11, fontWeight: 600, transition: 'all 0.15s' }}>
                             <CheckCircle2 size={13} /> Baixar
                           </button>
                         )}
                         {isReceita && t.status !== 'pago' && (
                           <button onClick={() => alert('Emissão de QRCode PIX disponível apenas com VAPID configurado na Vercel.')} style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, padding: '4px 8px', fontSize: 11, fontWeight: 600, transition: 'all 0.15s' }}>
                             <Zap size={13} /> Cobrar
                           </button>
                         )}
                         
                           {t.comprovanteBase64 && !t.anexos && (
                             <button onClick={(e) => { e.stopPropagation(); openSafeAttachment(t.comprovanteBase64 as string); }} 
                               style={{ background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: 10, padding: '4px 8px', fontSize: 11, fontWeight: 600, transition: 'all 0.15s' }} title="Ver Anexo">
                               <Paperclip size={13} /> Anexo
                             </button>
                           )}
                           {t.anexos && t.anexos.map((a, idx) => (
                             <button key={idx} onClick={(e) => { e.stopPropagation(); openSafeAttachment(a.url); }} 
                               style={{ background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: 10, padding: '4px 8px', fontSize: 11, fontWeight: 600, transition: 'all 0.15s' }} title={a.nome}>
                               <Paperclip size={13} /> {t.anexos!.length > 1 ? 'Anexo ' + (idx + 1) : 'Anexo'}
                             </button>
                           ))}


<button onClick={() => import('@/lib/pdf-generator').then(m => m.gerarReciboPDF(t))} style={{ background: 'var(--bg-active)', border: '1px solid var(--border)', borderRadius: 10, padding: '4px 8px', fontSize: 11, fontWeight: 600, transition: 'all 0.15s' }}>
  <Download size={13} /> Recibo
</button>
<button onClick={() => onDuplicarLancamento && onDuplicarLancamento(t)} style={{ background: 'var(--bg-active)', border: '1px solid var(--border)', borderRadius: 10, padding: '4px 8px', fontSize: 11, fontWeight: 600, transition: 'all 0.15s' }}>
  <Repeat size={13} /> Duplicar
</button>
<button onClick={() => handleEditar(t)} style={{ background: 'var(--bg-active)', border: '1px solid var(--border)', borderRadius: 10, padding: '4px 8px', fontSize: 11, fontWeight: 600, transition: 'all 0.15s' }}>
  <Edit3 size={13} /> Editar
</button>

                         <button onClick={() => handleDeletar(t.id)} style={{ background: 'var(--bg-active)', border: '1px solid var(--border)', borderRadius: 10, padding: '4px 6px', fontSize: 11, cursor: 'pointer', color: 'var(--text-secondary)', transition: 'all 0.15s' }}>
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
    </div>
  );
}
