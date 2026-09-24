import { getFormasPagamentoCustom } from '@/lib/firebase';
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { PreLancamento, Transacao } from '@/lib/types';
import { interpretarTexto, aprenderPadrao, calcularDataVencimentoCartao } from '@/lib/ai-engine';
import { extrairDadosDocumento } from '@/lib/ocr-pipeline';
import { DynamicIcon } from '@/components/DynamicIcon';
import { getTenantId, getHistoricoIA, salvarTransacao, atualizarTransacao, salvarTransacoesRecorrentes, salvarTransacoesParceladas, getCategorias, getCentrosCusto, getContas, getCartoes, getFornecedores, getClientes, salvarFornecedor, salvarCliente, formatarMoeda, gerarIdPublico, salvarConta } from '@/lib/storage';
import { calcularCicloFatura } from '@/lib/cartao-utils';
import { FORMAS_PAGAMENTO_LABELS, FREQUENCIA_LABELS } from '@/lib/defaults';
import { format } from 'date-fns';

const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      if (!file.type.startsWith('image/')) {
        resolve(event.target?.result as string);
        return;
      }
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

import {
  Mic, MicOff, Send, X, Check, Edit3, Loader2,
  Zap, MessageSquare, PenLine, AlertCircle, CheckCircle2, RefreshCw, Plus, ChevronRight, Building2, Camera, Paperclip, Trash2, Eye
} from 'lucide-react';

type Modo = 'chat' | 'manual';

interface Props {
  onClose: () => void;
  onSalvo: () => void;
  transacaoEditar?: Transacao;
}

const formatarMoedaInput = (valor: string | number) => {
  if (valor === undefined || valor === null) return '';
  let v = '';
  if (typeof valor === 'number') {
    v = (valor * 100).toFixed(0);
  } else {
    v = String(valor).replace(/\D/g, '');
  }
  if (!v) return '';
  const num = (parseInt(v, 10) / 100).toFixed(2);
  return 'R$ ' + num.replace('.', ',').replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
};

const parseMoedaInput = (valorStr: string) => {
  const v = valorStr.replace(/\D/g, '');
  if (!v) return 0;
  return parseInt(v, 10) / 100;
};


export const openSafeAttachment = (url: string) => {
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

export default function ModalLancamento({ onClose, onSalvo, transacaoEditar }: Props) {
  const [modo, setModo] = useState<Modo>(transacaoEditar ? 'manual' : 'chat');
  const [texto, setTexto] = useState('');
  const [interpretando, setInterpretando] = useState(false);
  
  const [prelancamento, setPrelancamento] = useState<PreLancamento | null>(
    transacaoEditar ? {
      ...transacaoEditar,
      confianca: 1,
      textoOriginal: ''
    } as PreLancamento : null
  );
  
  // Ambiguity Resolution
  const [resolvendoAmbiguidade, setResolvendoAmbiguidade] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [criandoNovo, setCriandoNovo] = useState(false);
  const [criandoNovaContaModal, setCriandoNovaContaModal] = useState(false);
  const [nomeNovaConta, setNomeNovaConta] = useState('');

  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [gravando, setGravando] = useState(false);
  const [salvandoNovaConta, setSalvandoNovaConta] = useState(false);
  const [feedbackVoz, setFeedbackVoz] = useState('');
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState(false);
  const [ensinarIA, setEnsinarIA] = useState(true);
  
  // AI Photo Scanning Global
  const [isScanningPhoto, setIsScanningPhoto] = useState(false);
  const [scanMessagePhoto, setScanMessagePhoto] = useState('');
  const [scanData, setScanData] = useState<any>(null);

  const handleScanReceiptGlobal = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanningPhoto(true);
    setScanMessagePhoto('Analisando documento...');
    try {
      const base64 = await compressImage(file);
      try {
        const resultado = await extrairDadosDocumento(base64, (msg) => {
          setScanMessagePhoto(msg);
        });
        
        setScanData({
          comprovanteBase64: base64,
          descricao: resultado.fornecedor !== 'Fornecedor Diversos' ? resultado.fornecedor : resultado.tipoDocumento,
          fornecedorNome: resultado.fornecedor !== 'Fornecedor Diversos' ? resultado.fornecedor : '',
          clienteNome: resultado.fornecedor !== 'Fornecedor Diversos' ? resultado.fornecedor : '',
          valor: Math.round(resultado.valorTotal * 100).toString(),
          data: resultado.data,
          observacoes: (resultado.observacoes ? resultado.observacoes + '\n' : '') + 
            (resultado.produtos?.length ? `Produtos:\n${resultado.produtos.map((p:any) => `- ${p.nome}: ${p.quantidade}x R$ ${p.valorUnitario}`).join('\n')}` : '')
        });
        setModo('manual');
        
      } catch (err: any) {
        setErro('Erro na IA: ' + err.message);
      } finally {
        setIsScanningPhoto(false);
        setScanMessagePhoto('');
      }
    } catch (err) {
      setErro('Erro ao processar imagem.');
      setIsScanningPhoto(false);
      setScanMessagePhoto('');
    }
  };

  const [categorias, setCategorias] = useState<{ id: string; nome: string; icone: string; cor: string }[]>([]);
  const [centrosCusto, setCentrosCusto] = useState<{ id: string; nome: string }[]>([]);
  const [contas, setContas] = useState<{ id: string; nome: string }[]>([]);
  const [cartoes, setCartoes] = useState<{ id: string; nome: string; dataFechamento?: number; dataVencimento?: number }[]>([]);
  const [fornecedores, setFornecedores] = useState<{ id: string; nome: string }[]>([]);
  const [clientes, setClientes] = useState<{ id: string; nome: string }[]>([]);
  const [formasPgto, setFormasPgto] = useState<{ id: string; nome: string }[]>([]);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any | null>(null);

  useEffect(() => {
    (async () => {
      const [cats, ccs, conts, carts, forns, clis, fpgts] = await Promise.all([getCategorias(), getCentrosCusto(), getContas(), getCartoes(), getFornecedores(), getClientes(), getFormasPagamentoCustom()]);
      setCategorias(cats);
      setCentrosCusto(ccs);
      setContas(conts);
      setCartoes(carts);
      setFornecedores(forns);
      setClientes(clis);
      setFormasPgto(fpgts);
      if (transacaoEditar) {
        setEditando(true);
      }
    })();
    if (!transacaoEditar) setTimeout(() => textareaRef.current?.focus(), 100);
  }, [transacaoEditar]);

  const interpretar = useCallback(async (textoParaInterpretar: string) => {
    if (!textoParaInterpretar.trim()) return;
    setInterpretando(true);
    setErro('');
    setResolvendoAmbiguidade(false);
    try {
      const result = await interpretarTexto(textoParaInterpretar);
      if (result) {
        setPrelancamento(result);
        setEditando(false);
        // Checar ambiguidade
        const opcoes = result.tipo === 'despesa' ? result.fornecedorOpcoes : result.clienteOpcoes;
        const idDetectado = result.tipo === 'despesa' ? result.fornecedorId : result.clienteId;
        
        if (!idDetectado && ((opcoes && opcoes.length > 0) || result.fornecedorNome || result.clienteNome)) {
          setResolvendoAmbiguidade(true);
        }
      } else {
        setErro('Não consegui interpretar. Tente ser mais específico ou use o modo manual.');
      }
    } catch {
      setErro('Erro ao processar. Tente novamente.');
    } finally {
      setInterpretando(false);
    }
  }, []);

  // Removido o salvamento automático para forçar o usuário a clicar em "Confirmar e Salvar"

  const iniciarVoz = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErro('Reconhecimento de voz não suportado neste navegador. Use Chrome ou Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setGravando(true);
      setFeedbackVoz('Ouvindo...');
    };

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results).map((r: any) => r[0].transcript).join('');
      setFeedbackVoz(transcript);
      if (event.results[0].isFinal) {
        setTexto(transcript);
        interpretar(transcript);
      }
    };

    recognition.onerror = (event: any) => {
      setGravando(false);
      setFeedbackVoz('');
      if (event.error === 'não-speech') setErro('Nenhuma fala detectada. Tente novamente.');
      else setErro('Erro não reconhecimento de voz. Tente novamente.');
    };

    recognition.onend = () => setGravando(false);

    recognitionRef.current = recognition;
    recognition.start();
  };

  const pararVoz = () => {
    recognitionRef.current?.stop();
    setGravando(false);
  };

  const resolverEntidade = async (id?: string, nome?: string) => {
    if (!prelancamento) return;
    
    let novoId = id;
    let novoNomeFinal = nome;

    if (!id && nome) {
      // Criar novo
      novoId = gerarIdPublico();
      if (prelancamento.tipo === 'despesa') {
        await salvarFornecedor({ id: novoId, nome });
        fornecedores.push({ id: novoId, nome });
      } else {
        await salvarCliente({ id: novoId, nome });
        clientes.push({ id: novoId, nome });
      }
    }

    if (prelancamento.tipo === 'despesa') {
      setPrelancamento({ ...prelancamento, fornecedorId: novoId, fornecedorNome: novoNomeFinal });
    } else {
      setPrelancamento({ ...prelancamento, clienteId: novoId, clienteNome: novoNomeFinal });
    }
    setResolvendoAmbiguidade(false);
    setCriandoNovo(false);
  };

  const confirmarESalvar = async () => {
    if (!prelancamento) return;
    if (prelancamento.valor <= 0) {
      setErro('Por favor, informe um valor válido.');
      return;
    }
    
    if (prelancamento.tipo === 'despesa' && !prelancamento.fornecedorId && !prelancamento.fornecedorNome) {
      setErro('Por favor, selecione ou informe o fornecedor.');
      return;
    }

    setSalvando(true);
    try {
      const transacaoData = {
        id: prelancamento.id,
        tipo: prelancamento.tipo,
        descricao: prelancamento.descricao,
        valor: prelancamento.valor,
        multa: prelancamento.multa,
        juros: prelancamento.juros,
        desconto: prelancamento.desconto,
        data: prelancamento.data,
        dataLancamento: prelancamento.dataLancamento,
        dataVencimento: prelancamento.dataVencimento,
        dataPagamento: prelancamento.dataPagamento,
        dataCompetencia: prelancamento.dataCompetencia,
        status: prelancamento.status,
        categoriaId: prelancamento.categoriaId,
        categoriaNome: prelancamento.categoriaNome,
        categoriaIcone: prelancamento.categoriaIcone,
        categoriaCor: prelancamento.categoriaCor,
        centroCustoId: prelancamento.centroCustoId,
        centroCustoNome: prelancamento.centroCustoNome,
        fornecedorId: prelancamento.fornecedorId,
        fornecedorNome: prelancamento.fornecedorNome,
        clienteId: prelancamento.clienteId,
        clienteNome: prelancamento.clienteNome,
        contaId: prelancamento.contaId,
        contaNome: prelancamento.contaNome,
        contaDestinãoId: prelancamento.contaDestinãoId,
        contaDestinãoNome: prelancamento.contaDestinãoNome,
        cartaoId: prelancamento.cartaoId,
        cartaoNome: prelancamento.cartaoNome,
        formaPagamento: prelancamento.formaPagamento,
        observacoes: prelancamento.observacoes,
        recorrente: prelancamento.recorrente,
        frequenciaRecorrencia: prelancamento.frequenciaRecorrencia,
        quantidadeRecorrencias: prelancamento.quantidadeRecorrencias,
        rateio: prelancamento.rateio,
        parcelado: prelancamento.parcelado,
        totalParcelas: prelancamento.totalParcelas,
        parcelaAtual: prelancamento.parcelado ? 1 : undefined,
        grupoParcelamento: prelancamento.parcelado ? gerarIdPublico() : undefined,
      };

      
      // FORÇAR REGRAS DO CARTÃO DE CRÉDITO
      if (transacaoData.formaPagamento === 'cartao_credito' && transacaoData.cartaoId) {
        const cartaoSelecionado = cartoes.find(c => c.id === transacaoData.cartaoId);
        if (cartaoSelecionado) {
          const ciclo = calcularCicloFatura(
            transacaoData.dataLancamento || transacaoData.data, 
            cartaoSelecionado.dataFechamento || 1, 
            cartaoSelecionado.dataVencimento || 10
          );
          
          transacaoData.status = 'pendente';
          transacaoData.dataPagamento = '';
          transacaoData.dataVencimento = ciclo.dataVencimento;
        }
      }

      const transacaoDataLimpa = Object.fromEntries(
        Object.entries(transacaoData).filter(([_, v]) => v !== undefined)
      ) as unknown as Omit<Transacao, 'id' | 'criadoEm' | 'atualizadoEm'>;

      if (prelancamento.id) {
        const updateData: any = { ...transacaoDataLimpa };
        if (transacaoEditar) {
          updateData.__oldCartaoId = transacaoEditar.cartaoId || '';
          updateData.__oldFaturaId = transacaoEditar.faturaId || '';
        }
        await atualizarTransacao(prelancamento.id, updateData, transacaoEditar || undefined);
      } else if (prelancamento.parcelado && prelancamento.totalParcelas && prelancamento.totalParcelas > 1 && prelancamento.formaPagamento === 'cartao_credito') {
        await salvarTransacoesParceladas(transacaoDataLimpa, prelancamento.totalParcelas);
      } else if (prelancamento.recorrente && prelancamento.frequenciaRecorrencia && prelancamento.quantidadeRecorrencias && prelancamento.quantidadeRecorrencias > 1) {
        await salvarTransacoesRecorrentes(transacaoDataLimpa, prelancamento.frequenciaRecorrencia, prelancamento.quantidadeRecorrencias);
      } else {
        await salvarTransacao(transacaoDataLimpa);
      }

      if (texto && ensinarIA) {
        const fn = prelancamento.tipo === 'despesa' ? fornecedores.find(x => x.id === prelancamento.fornecedorId)?.nome : clientes.find(x => x.id === prelancamento.clienteId)?.nome;
        await aprenderPadrao(texto, prelancamento.categoriaId, prelancamento.centroCustoId, prelancamento.contaId, prelancamento.formaPagamento, prelancamento.tipo === 'despesa' ? prelancamento.fornecedorId : prelancamento.clienteId, fn as string);
      }

      setSucesso(true);
      setTimeout(() => onSalvo(), 900);
    } catch (err: any) {
      let msg = err.message || 'Erro ao salvar. Tente novamente.'; if(msg.includes('Quota exceeded')) msg = 'A cota diária gratuita do banco de dados foi excedida (Firebase). Volte amanhã ou faça o upgrade do plano (Blaze).'; setErro(msg);
      setSalvando(false);
    }
  };

  if (sucesso) {
    return (
      <div className="modal-overlay">
        <div className="modal-box" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 56, marginBottom: 16, animation: 'fadeIn 0.4s ease' }}>✅</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Lançamento salvo!</h2>
          <p style={{ color: '#10b981', fontSize: 24, fontWeight: 800 }}>
            {prelancamento && formatarMoeda(prelancamento.valor)}
          </p>
          <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>
            {prelancamento?.descricao}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box slide-up" style={{ padding: 24 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: transacaoEditar ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {transacaoEditar ? <Edit3 size={18} color="white" /> : <Zap size={18} color="white" />}
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                {transacaoEditar ? 'Editar Lançamento' : 'Lançamento Inteligente'}
              </h2>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                {transacaoEditar ? 'Edite os dados abaixo' : 'Fale ou digite naturalmente'}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'var(--border)', border: '1px solid var(--border-hover)', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <X size={18} />
          </button>
        </div>

        {erro && (
          <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, color: '#ef4444', fontWeight: 600, fontSize: 13 }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>{erro}</div>
            <button onClick={() => setErro('')} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}><X size={14} /></button>
          </div>
        )}

        {/* MODO CHAT */}
        {modo === 'chat' && !prelancamento && (
          <div className="fade-in">
            <div style={{ position: 'relative', marginBottom: 12, borderRadius: 16, border: '2px solid rgba(16,185,129,0.3)', background: 'var(--bg-glass)', overflow: 'hidden', transition: 'all 0.2s' }}
                 onFocus={e => e.currentTarget.style.borderColor = '#10b981'}
                 onBlur={e => e.currentTarget.style.borderColor = 'rgba(16,185,129,0.3)'}>
              <textarea
                ref={textareaRef}
                value={texto}
                onChange={e => setTexto(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && e.ctrlKey && interpretar(texto)}
                placeholder="Ex: Paguei R$ 185,90 não Posto Ipiranga com cartão Nubank..."
                style={{ width: '100%', minHeight: 120, resize: 'none', padding: '16px 16px 60px 16px', background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: 16, lineHeight: 1.5, outline: 'none' }}
              />
              
              <div style={{ position: 'absolute', bottom: 12, left: 16, right: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  onClick={gravando ? pararVoz : iniciarVoz}
                  className={`voice-btn ${gravando ? 'recording' : ''}`}
                  style={{ width: 40, height: 40, borderRadius: '50%', background: gravando ? '#ef4444' : 'var(--border)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', boxShadow: gravando ? '0 0 15px rgba(239,68,68,0.5)' : 'none' }}>
                  {gravando ? <MicOff size={20} color="white" /> : <Mic size={20} color="var(--text-primary)" />}
                </button>

                <button
                  onClick={() => interpretar(texto)}
                  disabled={!texto.trim() || interpretando}
                  style={{
                    padding: '8px 16px', borderRadius: 99,
                    background: texto.trim() ? 'linear-gradient(135deg, #10b981, #059669)' : 'var(--border)',
                    border: 'none', cursor: texto.trim() ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', gap: 8, color: 'white',
                    fontWeight: 600, fontSize: 13, transition: 'all 0.2s',
                  }}>
                  {interpretando ? (
                    <><Loader2 size={16} className="animate-spin" /> Processando...</>
                  ) : (
                    <>Interpretar <Send size={14} /></>
                  )}
                </button>
              </div>
            </div>

            {gravando && (
              <p style={{ textAlign: 'center', color: '#ef4444', fontSize: 13, fontWeight: 600, animation: 'pulse 1.5s infinite' }}>
                Ouvindo... {feedbackVoz}
              </p>
            )}

            {!gravando && !interpretando && (
              <>
                {/* AI PHOTO SCANNER NO CHAT */}
                <div style={{ padding: '16px', background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(59,130,246,0.08))', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 16, marginTop: 16, position: 'relative', overflow: 'hidden' }}>
                  {isScanningPhoto && (
                    <div style={{ position: 'absolute', inset: 0, background: 'var(--bg-primary)', opacity: 0.95, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10, gap: 12 }}>
                      <Loader2 size={32} color="#10b981" className="spin" />
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#10b981', textAlign: 'center' }}>🤖 IA Lendo Foto...<br/><span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{scanMessagePhoto}</span></p>
                      <div style={{ width: '80%', maxWidth: 200, height: 6, background: 'rgba(16, 185, 129, 0.2)', borderRadius: 10, overflow: 'hidden' }}>
                         <div style={{ 
                             width: scanMessagePhoto.includes('Enviando') ? '40%' : (scanMessagePhoto.includes('extraídos') || scanMessagePhoto.includes('Validando')) ? '80%' : scanMessagePhoto.includes('conclu') ? '100%' : '15%',
                             height: '100%', 
                             background: '#10b981',
                             transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
                         }}></div>
                      </div>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ background: 'linear-gradient(135deg, #10b981, #3b82f6)', color: 'white', padding: 8, borderRadius: 10 }}>
                      <Camera size={20} />
                    </div>
                    <div>
                      <label style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 800, display: 'block' }}>Lançar por Foto ⚡</label>
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>Tire foto de uma nota e a IA preenche o formulário.</p>
                    </div>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 16px', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer', border: 'none' }}>
                    <Camera size={18} />
                    <span>Tirar Foto / Anexar</span>
                    <input type="file" accept="image/*,.pdf" capture="environment" style={{ display: 'none' }} onChange={handleScanReceiptGlobal} />
                  </label>
                </div>

                <div style={{ textAlign: 'center', marginTop: 16 }}>
                  <button onClick={() => setModo('manual')} style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-hover)', color: 'var(--text-secondary)', padding: '10px 16px', borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 }} onMouseOver={e => e.currentTarget.style.borderColor = 'var(--text-muted)'} onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border-hover)'}>
                    ✏️ Preencher Manualmente
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* AMBIGUIDADE (Fornecedor/Cliente não exato) */}
        {prelancamento && resolvendoAmbiguidade && (
          <div className="fade-in" style={{ padding: '20px 0' }}>
            <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#f59e0b', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertCircle size={18} />
                {prelancamento.tipo === 'despesa' ? 'Fornecedor' : 'Cliente'} não exato
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                A IA identificou "{prelancamento.tipo === 'despesa' ? prelancamento.fornecedorNome : prelancamento.clienteNome}", mas encontrou registros parecidos não banco de dados. Qual você deseja usar?
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(prelancamento.tipo === 'despesa' ? prelancamento.fornecedorOpcoes : prelancamento.clienteOpcoes)?.map(op => (
                  <button key={op.id} onClick={() => resolverEntidade(op.id, op.nome)}
                    style={{ background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', color: 'var(--text-primary)', fontWeight: 600, fontSize: 13, transition: 'all 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#10b981'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                    {op.nome}
                    <ChevronRight size={16} color="var(--text-muted)" />
                  </button>
                ))}
              </div>

              <div style={{ marginTop: 16, borderTop: '1px solid rgba(245,158,11,0.2)', paddingTop: 16 }}>
                {!criandoNovo ? (
                  <button onClick={() => setCriandoNovo(true)} className="btn-secondary hover-lift active-press" style={{ width: '100%', justifyContent: 'center' }}>
                    <Plus size={16} /> Não é nenhum desses. Criar novo cadastro.
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input className="input-field" autoFocus placeholder="Nome correto..." value={novoNome} onChange={e => setNovoNome(e.target.value)} style={{ flex: 1 }} />
                    <button onClick={() => resolverEntidade(undefined, novoNome)} disabled={!novoNome.trim()} className="btn-primary hover-lift active-press">
                      Salvar
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PRÉ-LANÇAMENTO CONFIRMAÇÃO */}
        {prelancamento && !resolvendoAmbiguidade && !editando && (
          <PreLancamentoCard
            prelancamento={prelancamento}
            onConfirmar={confirmarESalvar}
            onEditar={() => setEditando(true)}
            onRefazer={() => { setPrelancamento(null); setErro(''); }}
            salvando={salvando}
            ensinarIA={ensinarIA}
            setEnsinarIA={setEnsinarIA}
          />
        )}

        {/* EDIÇÃO RÁPIDA */}
        {prelancamento && editando && (
          <EditarPreLancamento
            prelancamento={prelancamento}
            categorias={categorias}
            centrosCusto={centrosCusto}
            contas={contas}
            cartoes={cartoes}
            fornecedores={fornecedores}
            clientes={clientes}
            onChange={setPrelancamento}
            onConfirmar={() => {
              if (transacaoEditar) {
                confirmarESalvar();
              } else {
                confirmarESalvar(); // Sempre salva direto ao clicar em Confirmar e Salvar
              }
            }}
            ensinarIA={ensinarIA}
            setEnsinarIA={setEnsinarIA}
          />
        )}

        {/* MANUAL */}
        {modo === 'manual' && !prelancamento && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <button onClick={() => setModo('chat')} style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', gap: 6, alignItems: 'center' }}>
                <Zap size={14} /> Voltar para IA
              </button>
            </div>
            <ManualForm
              categorias={categorias}
              centrosCusto={centrosCusto}
              contas={contas}
              cartoes={cartoes}
              fornecedores={fornecedores}
              clientes={clientes}
              initialData={scanData}
              onSubmit={(data) => setPrelancamento({ ...data, confianca: 1, textoOriginal: '', contaExplicitamenteMencionada: true, formaExplicitamenteMencionada: true } as any)}
            />
          </div>
        )}

        {/* ERRO GERAL */}
        {erro && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 14px', marginTop: 12, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <AlertCircle size={15} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 13, color: '#f87171' }}>{erro}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== PRÉ-LANÇAMENTO CARD =====
function PreLancamentoCard({ prelancamento: p, onConfirmar, onEditar, onRefazer, salvando, ensinarIA, setEnsinarIA }: {
  prelancamento: PreLancamento;
  onConfirmar: () => void;
  onEditar: () => void;
  onRefazer: () => void;
  salvando: boolean;
  ensinarIA: boolean;
  setEnsinarIA: (v: boolean) => void;
}) {
  const confiancaPct = Math.round(p.confianca * 100);
  
  // Validações estritas de UI
  const faltaConta = (!p.contaId && p.formaPagamento !== 'cartao_credito' && p.status === 'pago') || (!p.contaId && p.tipo === 'transferencia');
  const faltaCartao = p.formaPagamento === 'cartao_credito' && !p.cartaoId;
  const faltaContaDestinão = p.tipo === 'transferencia' && !p.contaDestinãoId;
  const faltaFornecedor = p.tipo === 'despesa' && !p.fornecedorId && !p.fornecedorNome;
  const faltaCategoria = !p.categoriaId || p.categoriaId === 'outros_despesa' || p.categoriaId === 'outros_receita';
  const isValid = !faltaConta && !faltaCartao && !faltaContaDestinão && !faltaFornecedor && p.valor > 0 && p.descricao.trim() !== '';

  return (
    <div className="fade-in">
      {/* Texto original */}
      {p.textoOriginal && (
        <div style={{ background: 'var(--bg-glass)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, border: '1px solid var(--border)' }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Interpretei:</p>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic' }}>"{p.textoOriginal}"</p>
        </div>
      )}

      {/* Confiança */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Zap size={14} color={confiancaPct >= 70 ? '#10b981' : confiancaPct >= 40 ? '#f59e0b' : '#ef4444'} />
          <span style={{ fontSize: 12, fontWeight: 700, color: confiancaPct >= 70 ? '#10b981' : confiancaPct >= 40 ? '#f59e0b' : '#ef4444' }}>
            Confiança: {confiancaPct >= 70 ? 'Alta' : confiancaPct >= 40 ? 'Média' : 'Baixa'} ({confiancaPct}%)
          </span>
        </div>
      </div>

      {/* Card */}
      <div className="confirm-card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <span className={`badge ${p.tipo === 'receita' ? 'badge-green' : 'badge-red'}`}>
              {p.tipo === 'receita' ? '↑ Receita' : '↓ Despesa'}
            </span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className={`amount-large ${p.tipo === 'receita' ? 'positive' : 'negative'}`}>
              {p.tipo === 'despesa' ? '-' : '+'}{formatarMoeda(p.valor)}
            </div>
          </div>
        </div>

        <div className="grid-responsive-2">
          <Campo label="Descrição" valor={p.descricao} />
          <Campo label="Data de Vencimento" valor={p.dataVencimento ? `${(p.dataVencimento || '').split('-')[2]}/${(p.dataVencimento || '').split('-')[1]}/${(p.dataVencimento || '').split('-')[0]}` : `${(p.data || '').split('-')[2]}/${(p.data || '').split('-')[1]}/${(p.data || '').split('-')[0]}`} />
          {p.dataPagamento && <Campo label="Data de Pagamento" valor={`${p.dataPagamento.split('-')[2]}/${p.dataPagamento.split('-')[1]}/${p.dataPagamento.split('-')[0]}`} />}
          <Campo label="Categoria" valor={faltaCategoria ? <span style={{color: '#ef4444'}}>⚠ Não identificada</span> : <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><DynamicIcon name={p.categoriaIcone || 'Package'} size={14} /> {p.categoriaNome}</span>} cor={faltaCategoria ? '#ef4444' : p.categoriaCor} />
          {p.centroCustoNome && <Campo label="Centro de Custo" valor={p.centroCustoNome} />}
          <Campo label={p.tipo === 'receita' ? 'Cliente' : 'Fornecedor'} valor={faltaFornecedor ? <span style={{color: '#ef4444'}}>⚠ Não identificado</span> : (p.tipo === 'receita' ? p.clienteNome || '-' : p.fornecedorNome || '-')} />
          <Campo label="Forma de Pagto" valor={FORMAS_PAGAMENTO_LABELS[p.formaPagamento] || p.formaPagamento} />
          <Campo label={p.formaPagamento === 'cartao_credito' ? 'Cartão' : 'Conta'} valor={(faltaConta || faltaCartao) ? <span style={{color: '#ef4444'}}>⚠ Não identificada</span> : (p.formaPagamento === 'cartao_credito' ? p.cartaoNome : p.contaNome)} />
          {p.tipo === 'transferencia' && <Campo label="Conta de Destinão" valor={faltaContaDestinão ? <span style={{color: '#ef4444'}}>⚠ Não identificada</span> : p.contaDestinãoNome} />}
          {p.parcelado && <Campo label="Parcelamento" valor={`${p.totalParcelas}x de ${formatarMoeda(p.valor)}`} />}
          {p.recorrente && <Campo label="Recorrência" valor="Mensal" />}
          <Campo label="Status" valor={p.status === 'pago' ? '✅ Pago' : '⏳ Pendente'} />
        </div>
      </div>

      {p.textoOriginal && (
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--bg-glass)', borderRadius: 10, border: '1px solid var(--border)' }}>
          <input type="checkbox" id="ensinar" checked={ensinarIA} onChange={e => setEnsinarIA(e.target.checked)} style={{ accentColor: '#10b981', cursor: 'pointer', width: 16, height: 16 }} />
          <label htmlFor="ensinar" style={{ fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer', flex: 1 }}>
            <strong>Ensinar a IA</strong> a classificar gastos parecidos desta forma na próxima vez
          </label>
        </div>
      )}

      {/* Ações */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onRefazer} className="btn-secondary hover-lift active-press" style={{ flex: 1, justifyContent: 'center' }}>
          <RefreshCw size={15} />
          Cancelar
        </button>
        <button onClick={onEditar} className="btn-secondary hover-lift active-press" style={{ flex: 1 }}>
          <Edit3 size={15} />
          Editar
        </button>
        <button onClick={onConfirmar} disabled={salvando || !isValid} className={isValid ? "btn-primary" : "btn-secondary"} style={{ flex: 2, justifyContent: 'center', opacity: (!isValid && !salvando) ? 0.6 : 1 }}>
          {salvando ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          {salvando ? 'Salvando...' : (isValid ? 'Confirmar e Salvar' : 'Faltam Dados')}
        </button>
      </div>
    </div>
  );
}

function Campo({ label, valor, cor }: { label: string; valor: React.ReactNode; cor?: string }) {
  return (
    <div>
      <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3 }}>{label}</p>
      <div style={{ fontSize: 14, fontWeight: 600, color: cor || 'var(--text-primary)' }}>{valor}</div>
    </div>
  );
}

// ===== EDITAR PRÉ-LANÇAMENTO =====
function EditarPreLancamento({ prelancamento, categorias, centrosCusto, contas, cartoes, fornecedores, clientes, onChange, onConfirmar, ensinarIA, setEnsinarIA }: {
  prelancamento: PreLancamento;
  categorias: { id: string; nome: string; icone: string; cor: string }[];
  centrosCusto: { id: string; nome: string }[];
  contas: { id: string; nome: string }[];
  cartoes: { id: string; nome: string; dataFechamento?: number; dataVencimento?: number }[];
  fornecedores: { id: string; nome: string }[];
  clientes: { id: string; nome: string }[];
  onChange: (p: PreLancamento) => void;
  onConfirmar: () => void;
  ensinarIA: boolean;
  setEnsinarIA: (v: boolean) => void;
}) {
  const p = prelancamento;
  const set = (campo: Partial<PreLancamento>) => onChange({ ...p, ...campo });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      compressImage(file).then(base64 => {
        set({ comprovanteBase64: base64 });
      });
    }
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>✏️ Editar Lançamento</h3>

      <div className="grid-responsive-2">
        <div>
          <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>Tipo</label>
          <select className="input-field" value={p.tipo} onChange={e => set({ tipo: e.target.value as 'despesa' | 'receita' | 'transferencia' })}>
            <option value="despesa">Despesa</option>
            <option value="receita">Receita</option>
            <option value="transferencia">Transferência</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>Valor (R$)</label>
          <input className="input-field" type="text" value={formatarMoedaInput(p.valor || '')} onChange={e => set({ valor: parseMoedaInput(e.target.value) })} />
        </div>
      </div>

      <div>
        <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>Descrição</label>
        <input className="input-field" value={p.descricao} onChange={e => set({ descricao: e.target.value })} />
      </div>

      
      {p.tipo === 'despesa' && (
        <div className="grid-responsive-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>Multa</label>
            <input className="input-field" type="text" style={p.multa ? { color: '#ef4444', borderColor: '#ef4444' } : {}} value={formatarMoedaInput(p.multa || '')} onChange={e => set({ multa: parseMoedaInput(e.target.value) })} placeholder="R$ 0,00" />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>Juros</label>
            <input className="input-field" type="text" style={p.juros ? { color: '#ef4444', borderColor: '#ef4444' } : {}} value={formatarMoedaInput(p.juros || '')} onChange={e => set({ juros: parseMoedaInput(e.target.value) })} placeholder="R$ 0,00" />
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#ef4444', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>Desconto</label>
            <input className="input-field" type="text" style={{ color: '#ef4444', borderColor: p.desconto ? '#ef4444' : 'var(--border)', backgroundColor: p.desconto ? 'rgba(239, 68, 68, 0.05)' : 'transparent', fontWeight: p.desconto ? 700 : 400 }} value={formatarMoedaInput(p.desconto || '')} onChange={e => set({ desconto: parseMoedaInput(e.target.value) })} placeholder="- R$ 0,00" />
          </div>
        </div>
        )}

      {(p.multa || p.juros || p.desconto) && (
        <div style={{ marginTop: 12, padding: 8, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 6, border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', justifyContent: 'space-between' }}>
           <span style={{ fontSize: 12, fontWeight: 600, color: '#ef4444' }}>Valor Final a ser pago:</span>
           <span style={{ fontSize: 12, fontWeight: 700, color: '#ef4444' }}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.max(0, ((Number(p.valor) || 0) + (Number(p.multa) || 0) + (Number(p.juros) || 0) - (Number(p.desconto) || 0))))}</span>
        </div>
      )}

        {p.tipo !== 'transferencia' && (
        <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 12, padding: 16, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: p.formaPagamento === 'cartao_credito' ? 12 : 0 }}>
            <input type="checkbox" id="cartao-edit" checked={p.formaPagamento === 'cartao_credito'} onChange={e => {
              const isCC = e.target.checked;
              const defaultCartaoId = cartoes[0]?.id || '';
              let updates = { formaPagamento: isCC ? 'cartao_credito' : 'pix', cartaoId: isCC ? defaultCartaoId : undefined } as any;
              if (isCC && cartoes[0]) {
                const dataBase = p.dataLancamento || p.data || new Date().toISOString().split('T')[0];
                const ciclo = calcularCicloFatura(dataBase, cartoes[0].dataFechamento || 1, cartoes[0].dataVencimento || 10);
                updates.status = 'pendente';
                updates.dataVencimento = ciclo.dataVencimento;
                updates.dataPagamento = '';
              }
              set(updates);
            }} style={{ accentColor: '#3b82f6', width: 16, height: 16 }} />
            <label htmlFor="cartao-edit" style={{ fontSize: 13, fontWeight: 600, color: '#3b82f6', cursor: 'pointer' }}>💳 Compra no Cartão de Crédito?</label>
          </div>
          
          {p.formaPagamento === 'cartao_credito' ? (
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>Selecione o Cartão</label>
              <select className="input-field" value={p.cartaoId || ''} onChange={e => {
                const cartaoIdSel = e.target.value;
                const cartaoObj = cartoes.find(c => c.id === cartaoIdSel);
                let dataVenc = p.dataVencimento || p.data;
                let dataPag = '';
                if (cartaoObj) {
                  const ciclo = calcularCicloFatura(p.dataLancamento || p.data || new Date().toISOString().split('T')[0], cartaoObj.dataFechamento || 1, cartaoObj.dataVencimento || 10);
                  dataVenc = ciclo.dataVencimento;
                  dataPag = '';
                }
                set({
                  cartaoId: cartaoIdSel,
                  cartaoNome: cartaoObj?.nome || '',
                  dataVencimento: dataVenc,
                  status: 'pendente',
                  dataPagamento: dataPag
                });
              }}>
                <option value="">Selecione o cartão...</option>
                {cartoes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
          ) : (
            <div className="grid-responsive-2">
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>Forma de Pgto</label>
                <select className="input-field" value={p.formaPagamento} onChange={e => set({ formaPagamento: e.target.value as any })}>
                  {Object.entries(FORMAS_PAGAMENTO_LABELS).filter(([k]) => k !== 'cartao_credito').map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>Conta de Saída</label>
                <select className="input-field" value={p.contaId} onChange={e => {
                  const conta = contas.find(c => c.id === e.target.value);
                  set({ contaId: e.target.value, contaNome: conta?.nome || '', contaDestinãoId: e.target.value === p.contaDestinãoId ? '' : p.contaDestinãoId });
                }}>
                  <option value="">Selecione a conta...</option>
                  {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
            </div>
          )}
        </div>
        )}

      
      {(p.multa || p.juros || p.desconto) && (
        <div style={{ marginTop: 2, marginBottom: 12, padding: 8, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 6, border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', justifyContent: 'space-between' }}>
           <span style={{ fontSize: 12, fontWeight: 600, color: '#ef4444' }}>Valor Final a ser pago:</span>
           <span style={{ fontSize: 12, fontWeight: 700, color: '#ef4444' }}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.max(0, ((Number(p.valor) || 0) + (Number(p.multa) || 0) + (Number(p.juros) || 0) - (Number(p.desconto) || 0))))}</span>
        </div>
      )}

      <div className="grid-responsive-2">
        <div>
          <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>Data da Compra / Lançamento</label>
          <input className="input-field" type="date" value={p.dataLancamento || p.data} onChange={e => set({ dataLancamento: e.target.value, data: e.target.value })} />
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>Data de Vencimento</label>
          <input className="input-field" type="date" value={p.dataVencimento || p.data} onChange={e => {
            const val = e.target.value;
            const hojeFmt = format(new Date(), 'yyyy-MM-dd');
            set({ dataVencimento: val, dataCompetencia: val.substring(0, 7), status: val > hojeFmt ? 'pendente' : p.status, dataPagamento: (val > hojeFmt || p.status === 'pendente') ? '' : val });
          }} />
        </div>
      </div>
      
      <div className="grid-responsive-2">
        <div>
          <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>Status</label>
          <select className="input-field" value={p.status} onChange={e => {
            const val = e.target.value as 'pago' | 'pendente' | 'agendado';
            set({ status: val, dataPagamento: val === 'pago' ? (p.dataPagamento || format(new Date(), 'yyyy-MM-dd')) : '' });
          }}>
            <option value="pago">{p.tipo === 'receita' ? 'Recebida' : 'Pago'}</option>
            <option value="pendente">{p.tipo === 'receita' ? 'A Receber' : 'A Pagar'}</option>
            <option value="agendado">Agendado</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>Data de Pagamento</label>
          <input className="input-field" type="date" value={p.dataPagamento || ''} onChange={e => set({ dataPagamento: e.target.value, status: e.target.value ? 'pago' : 'pendente' })} />
        </div>
      </div>

      <div>
        <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>Categoria</label>
        <input list="cats-list-edit" className="input-field" placeholder="Buscar categoria..." value={p.categoriaNome || ''} onChange={e => {
          const nome = e.target.value;
          const cat = categorias.find(c => c.nome.toLowerCase() === nome.toLowerCase());
          if (cat) set({ categoriaId: cat.id, categoriaNome: cat.nome, categoriaIcone: cat.icone, categoriaCor: cat.cor });
          else set({ categoriaId: '', categoriaNome: nome });
        }} />
        <datalist id="cats-list-edit">
          {categorias.map(c => <option key={c.id} value={c.nome} />)}
        </datalist>
      </div>

      <div className="grid-responsive-2">
        <div>
          <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>Centro de Custo</label>
          <input list="cc-list-edit" className="input-field" placeholder="Buscar centro de custo..." value={p.centroCustoNome || ''} onChange={e => {
            const nome = e.target.value;
            const cc = centrosCusto.find(c => c.nome.toLowerCase() === nome.toLowerCase());
            if (cc) set({ centroCustoId: cc.id, centroCustoNome: cc.nome });
            else set({ centroCustoId: '', centroCustoNome: nome });
          }} />
          <datalist id="cc-list-edit">
            {centrosCusto.map(c => <option key={c.id} value={c.nome} />)}
          </datalist>
        </div>
      </div>
      
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>Observações</label>
        <textarea className="input-field" rows={2} value={p.observacoes || ''} onChange={e => set({ observacoes: e.target.value })} placeholder="Anotações opcionais..."></textarea>
      </div>

      {p.tipo === 'transferencia' && (
        <div className="grid-responsive-2" style={{ marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>Conta de Origem</label>
            <select className="input-field" value={p.contaId} onChange={e => {
              const conta = contas.find(c => c.id === e.target.value);
              set({ contaId: e.target.value, contaNome: conta?.nome || '', contaDestinãoId: e.target.value === p.contaDestinãoId ? '' : p.contaDestinãoId });
            }}>
              {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>Conta de Destinão</label>
            <select className="input-field" value={p.contaDestinãoId || ''} onChange={e => {
              const conta = contas.find(c => c.id === e.target.value);
              set({ contaDestinãoId: e.target.value, contaDestinãoNome: conta?.nome || '' });
            }}>
              <option value="">Selecione a conta destinão...</option>
              {contas.filter(c => c.id !== p.contaId).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
        </div>
      )}

      <div className="grid-responsive-2">
        <div>
          <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>{p.tipo === 'receita' ? 'Cliente' : 'Fornecedor'}</label>
          <input list="clientes-fornecedores-list-edit" className="input-field" placeholder={`Buscar ${p.tipo === 'receita' ? 'cliente' : 'fornecedor'}...`} value={p.tipo === 'receita' ? (p.clienteNome || '') : (p.fornecedorNome || '')} onChange={e => {
            const nome = e.target.value;
            if (p.tipo === 'receita') {
              const cli = clientes.find(c => c.nome.toLowerCase() === nome.toLowerCase());
              if (cli) set({ clienteId: cli.id, clienteNome: cli.nome });
              else set({ clienteId: '', clienteNome: nome });
            } else {
              const forn = fornecedores.find(f => f.nome.toLowerCase() === nome.toLowerCase());
              if (forn) set({ fornecedorId: forn.id, fornecedorNome: forn.nome });
              else set({ fornecedorId: '', fornecedorNome: nome });
            }
          }} />
          <datalist id="clientes-fornecedores-list-edit">
            {p.tipo === 'receita' ? clientes.map(c => <option key={c.id} value={c.nome} />) : fornecedores.map(f => <option key={f.id} value={f.nome} />)}
          </datalist>
        </div>
      </div>

      <div>
        <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>Observações</label>
        <textarea className="input-field" value={p.observacoes || ''} onChange={e => set({ observacoes: e.target.value })} rows={2} style={{ resize: 'none' }} />
      </div>

      {/* Rateio de Despesas */}
      {p.tipo !== 'transferencia' && (
      <div style={{ marginBottom: 12, marginTop: 12 }}>
        <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 10, padding: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block' }}>Rateio de Lançamento</label>
            <button type="button" onClick={() => set({ rateio: [...(p.rateio || []), { id: gerarIdPublico(), categoriaId: '', categoriaNome: '', categoriaIcone: '', categoriaCor: '', valor: 0 }] as any })} className="btn-secondary hover-lift" style={{ padding: '4px 10px', fontSize: 11, gap: 4 }}>
              <Plus size={12} /> Adicionar Item
            </button>
          </div>
          
          {(!p.rateio || p.rateio.length === 0) ? (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Divida este lançamento em várias categorias.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {p.rateio.map((r, i) => (
                <div key={r.id} style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'var(--bg-card)', padding: 8, borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ flex: 1 }}>
                    <input list="cats-list-rateio-edit" className="input-field" placeholder="Categoria" value={r.categoriaNome || ''} onChange={e => {
                      const nome = e.target.value;
                      const cat = categorias.find(c => c.nome.toLowerCase() === nome.toLowerCase());
                      const novos = [...(p.rateio || [])];
                      novos[i] = { ...novos[i], categoriaId: cat?.id || '', categoriaNome: nome, categoriaIcone: cat?.icone || 'Package', categoriaCor: cat?.cor || '#64748b' };
                      set({ rateio: novos });
                    }} style={{ padding: '6px', fontSize: 12 }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <input className="input-field" type="text" value={formatarMoedaInput(r.valor)} onChange={e => {
                      const novos = [...(p.rateio || [])];
                      novos[i] = { ...novos[i], valor: parseMoedaInput(e.target.value) };
                      set({ rateio: novos });
                    }} placeholder="R$ 0,00" style={{ padding: '6px', fontSize: 12 }} />
                  </div>
                  <button type="button" onClick={() => {
                    const novos = [...(p.rateio || [])];
                    novos.splice(i, 1);
                    set({ rateio: novos });
                  }} style={{ color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTop: '1px dashed rgba(59,130,246,0.3)' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Soma do Rateio:</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: (p.rateio.reduce((acc: number, curr: any) => acc + curr.valor, 0) === p.valor) ? '#10b981' : '#ef4444' }}>
                  {formatarMoeda(p.rateio.reduce((acc: number, curr: any) => acc + curr.valor, 0))} / {formatarMoeda(p.valor)}
                </span>
              </div>
            </div>
          )}
          <datalist id="cats-list-rateio-edit">
            {categorias.map(c => <option key={c.id} value={c.nome} />)}
          </datalist>
        </div>
      </div>
      )}

      {/* Conciliado & Comprovante movidos para o final */}
      <div className="grid-responsive-2" style={{ marginBottom: 12, marginTop: 12 }}>
        <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 12, padding: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" id="conciliado-edit" checked={!!p.conciliado} onChange={e => set({ conciliado: e.target.checked })} style={{ accentColor: '#10b981', width: 16, height: 16 }} />
            <label htmlFor="conciliado-edit" style={{ fontSize: 13, fontWeight: 600, color: '#10b981', cursor: 'pointer' }}>Conciliado (Bate com Banco)</label>
          </div>
        </div>
        <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 12, padding: 12 }}>
          <label style={{ fontSize: 11, color: '#3b82f6', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>📎 Anexar Comprovante (Opcional)</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <label className="btn-secondary hover-lift active-press" style={{ flex: 1, padding: '8px', fontSize: 12, justifyContent: 'center', cursor: 'pointer', textAlign: 'center', border: '1px solid rgba(59,130,246,0.2)' }}>
              <Camera size={14} style={{ marginRight: 6, display: 'inline' }} />
              Tirar Foto
              <input type="file" accept="image/*" capture="environment" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>
            <label className="btn-secondary hover-lift active-press" style={{ flex: 1, padding: '8px', fontSize: 12, justifyContent: 'center', cursor: 'pointer', textAlign: 'center', border: '1px solid rgba(59,130,246,0.2)' }}>
              <Paperclip size={14} style={{ marginRight: 6, display: 'inline' }} />
              Arquivo
              <input type="file" accept="image/*,.pdf" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>
          </div>
          {p.comprovanteBase64 && <span style={{ fontSize: 11, color: '#10b981', display: 'block', marginTop: 8, textAlign: 'center', fontWeight: 600 }}>✓ Comprovante Anexado!</span>}
        </div>
      </div>


      {p.textoOriginal && (
        <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(16,185,129,0.06)', borderRadius: 10, border: '1px solid rgba(16,185,129,0.2)' }}>
          <input type="checkbox" id="ensinar-edit" checked={ensinarIA} onChange={e => setEnsinarIA(e.target.checked)} style={{ accentColor: '#10b981', cursor: 'pointer', width: 16, height: 16 }} />
          <label htmlFor="ensinar-edit" style={{ fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer', flex: 1 }}>
            <strong>Ensinar a IA</strong> a usar estes mesmos dados quando eu disser algo parecido
          </label>
        </div>
      )}

      <button onClick={() => {
        if (p.tipo === 'despesa' && !p.fornecedorId) { alert('O Fornecedor é obrigatório'); return; }
        if (p.tipo === 'receita' && !p.clienteId) { alert('O Cliente é obrigatório'); return; }
        onConfirmar();
      }} className="btn-primary hover-lift active-press" style={{ width: '100%', justifyContent: 'center' }}>
        <CheckCircle2 size={16} />
        Confirmar Edição
      </button>
    </div>
  );
}

// ===== FORMULÁRIO MANUAL =====
function ManualForm({ categorias, centrosCusto, contas, cartoes, fornecedores, clientes, initialData, onSubmit }: {
  categorias: { id: string; nome: string; icone: string; cor: string }[];
  centrosCusto: { id: string; nome: string }[];
  contas: { id: string; nome: string }[];
  cartoes: { id: string; nome: string; dataFechamento?: number; dataVencimento?: number }[];
  fornecedores: { id: string; nome: string }[];
  clientes: { id: string; nome: string }[];
  initialData?: any;
  onSubmit: (data: Omit<PreLancamento, 'confianca' | 'textoOriginal'>) => void;
}) {
  const [historico, setHistorico] = useState<any[]>([]);
  useEffect(() => {
      getHistoricoIA().then(setHistorico);
  }, []);

  const handleDescricaoBlur = () => {
      if (!form.descricao || form.descricao.length < 3) return;
      const descLower = form.descricao.toLowerCase().trim();
      const match = historico.sort((a,b)=>b.count-a.count).find(h => h.texto && descLower.includes(h.texto.toLowerCase()));
      if (match) {
          setForm(prev => {
              const nf = { ...prev };
              if (match.categoriaId && !prev.categoriaId) nf.categoriaId = match.categoriaId;
              if (match.centroCustoId && !prev.centroCustoId) nf.centroCustoId = match.centroCustoId;
              if (match.contaId && !prev.contaId) nf.contaId = match.contaId;
              if (match.formaPagamento && !prev.formaPagamento) nf.formaPagamento = match.formaPagamento;
              if (match.fornecedorId && !prev.fornecedorId) nf.fornecedorId = match.fornecedorId;
              return nf;
          });
      }
  };

  const [ensinarIA, setEnsinarIA] = useState(true);

  const hoje = format(new Date(), 'yyyy-MM-dd');
  const [form, setForm] = useState({
    tipo: (initialData?.tipo || 'despesa') as 'despesa' | 'receita' | 'transferencia',
    taxa: (initialData as any)?.taxa || '',
    tipoTransferencia: (initialData as any)?.tipoTransferencia || 'Interna',
    descricao: initialData?.descricao || '',
          fornecedorNome: initialData?.fornecedorNome || '',
          valor: initialData?.valor || '',
    multa: initialData?.multa || '',
    juros: initialData?.juros || '',
    desconto: initialData?.desconto || '',
    data: initialData?.data || hoje,
    dataLancamento: initialData?.data || hoje,
    dataVencimento: initialData?.data || hoje,
    dataPagamento: initialData?.data || hoje,
    status: 'pago' as 'pago' | 'pendente' | 'agendado',
    categoriaId: '',
    centroCustoId: '',
    fornecedorId: '',
    clienteId: '',
    contaId: '',
    contaDestinãoId: '',
    cartaoId: '',
    formaPagamento: 'pix' as 'pix' | 'dinheiro' | 'cartao_credito' | 'cartao_debito' | 'transferencia' | 'boleto',
    observacoes: initialData?.observacoes || '',
      comportamento: initialData?.comportamento || 'fixa',
    parcelado: false,
    totalParcelas: 1,
    recorrente: false,
    frequenciaRecorrencia: 'mensal' as 'semanal' | 'mensal' | 'trimestral' | 'anual',
    quantidadeRecorrencias: 2,
    conciliado: false,
    comprovanteBase64: initialData?.comprovanteBase64 || '',
    rateio: initialData?.rateio || [],
  });

  useEffect(() => {
    if (initialData?.descricao) {
      handleDescricaoChange(initialData.descricao, true);
    }
  }, [initialData]);

  const [novoCadastro, setNovoCadastro] = useState<'fornecedor' | 'cliente' | 'categoria' | 'centroCusto' | null>(null);
  const [novoNome, setNovoNome] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState('');

  // AI OCR Scanning
  const handleScanReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setScanMessage('Iniciando análise do documento...');
    try {
      const base64 = await compressImage(file);
        try {
          const resultado = await extrairDadosDocumento(base64, (msg) => {
            setScanMessage(msg);
          });
          
          setForm(f => ({
            ...f,
            comprovanteBase64: base64, // Já anexa a foto
            descricao: resultado.fornecedor !== 'Fornecedor Diversos' ? resultado.fornecedor : resultado.tipoDocumento,
          fornecedorNome: resultado.fornecedor !== 'Fornecedor Diversos' ? resultado.fornecedor : '',
          clienteNome: resultado.fornecedor !== 'Fornecedor Diversos' ? resultado.fornecedor : '',
            valor: (resultado.valorTotal * 100).toString(), // o form usa valor * 100 para máscara
            data: resultado.data || f.data,
            dataVencimento: resultado.data || f.data,
            dataLancamento: resultado.data || f.data,
            tipo: 'despesa', // Assume-se despesa para NF na maioria das vezes, a IA não detecta tipo na nova prompt, é custom
            observacoes: (f.observacoes ? f.observacoes + '\n' : '') + 
              (resultado.observacoes ? resultado.observacoes + '\n' : '') +
              (resultado.produtos?.length ? `Produtos:\n${resultado.produtos.map(p => `- ${p.nome}: ${p.quantidade}x R$ ${p.valorUnitario}`).join('\n')}` : '')
          }));
          
          // Tentar aprender/autocompletar a categoria usando o dicionário com a nova descrição
          if (resultado.fornecedor) {
            handleDescricaoChange(resultado.fornecedor, true); // true para indicar que é do scanner
          }
          
        } catch (err: any) {
          alert('Erro na IA: ' + err.message);
        } finally {
          setIsScanning(false);
          setScanMessage('');
        }
    } catch (err) {
      console.error(err);
      setIsScanning(false);
      setScanMessage('');
    }
  };

  // AI Learning function
  const handleDescricaoChange = (val: string, fromScanner = false) => {
    if (!fromScanner) setForm(f => ({ ...f, descricao: val }));
    
    // Check if we have learned this description
    if (val.trim().length > 2) {
      try {
        const dict = JSON.parse(localStorage.getItem('ai_learning_dictionary') || '{}');
        const lowerVal = val.toLowerCase().trim();
        // exact match first
        let learned = dict[lowerVal];
        // or partial match
        if (!learned) {
          const matchKey = Object.keys(dict).find(k => lowerVal.includes(k));
          if (matchKey) learned = dict[matchKey];
        }
        
        if (learned) {
          setForm(f => {
            const novaForma = learned.formaPagamento || f.formaPagamento;
            const novoCartaoId = f.cartaoId || learned.cartaoId || '';
            let extraUpdates = {} as any;
            
            // Regra de Ouro: Se a IA aprendeu que é cartão de crédito, recalcular fatura!
            if (novaForma === 'cartao_credito' && novoCartaoId) {
                const c = cartoes.find(x => x.id === novoCartaoId);
                if (c) {
                    const hoje = new Date().toISOString().split('T')[0];
                    const dataBase = f.data || hoje;
                    const ciclo = calcularCicloFatura(dataBase, c.dataFechamento || 1, c.dataVencimento || 10);
                    extraUpdates = {
                        status: 'pendente',
                        dataPagamento: '',
                        dataVencimento: ciclo.dataVencimento
                    };
                }
            }

            return {
              ...f,
              ...extraUpdates,
              categoriaId: f.categoriaId || learned.categoriaId || '',
              centroCustoId: f.centroCustoId || learned.centroCustoId || '',
              fornecedorId: f.fornecedorId || learned.fornecedorId || '',
              clienteId: f.clienteId || learned.clienteId || '',
              formaPagamento: novaForma,
              contaId: f.contaId || learned.contaId || '',
              cartaoId: novoCartaoId
            };
          });
        }
      } catch (e) {}
    }
  };

  const aprenderDescricao = () => {
    if (!form.descricao.trim()) {
      alert('Preencha a descrição primeiro.');
      return;
    }
    try {
      const dict = JSON.parse(localStorage.getItem('ai_learning_dictionary') || '{}');
      dict[form.descricao.toLowerCase().trim()] = {
        categoriaId: form.categoriaId,
        centroCustoId: form.centroCustoId,
        fornecedorId: form.fornecedorId,
        clienteId: form.clienteId,
        formaPagamento: form.formaPagamento,
        contaId: form.contaId,
        cartaoId: form.cartaoId
      };
      localStorage.setItem('ai_learning_dictionary', JSON.stringify(dict));
      alert('🧠 O sistema aprendeu! No próximo lançamento, basta digitar essa descrição e os campos de Categoria, Conta, Forma de Pagamento e Cliente/Fornecedor serão preenchidos sozinhos.');
    } catch (e) {}
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm(f => ({ ...f, comprovanteBase64: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Campos iniciam limpos conforme solicitação do usuário

  const handleQuickAdd = async () => {
    if (!novoNome.trim()) return;
    const id = gerarIdPublico();
    if (novoCadastro === 'fornecedor') {
      await salvarFornecedor({ id, nome: novoNome });
      fornecedores.push({ id, nome: novoNome });
      setForm(f => ({ ...f, fornecedorId: id }));
    } else if (novoCadastro === 'cliente') {
      await salvarCliente({ id, nome: novoNome });
      clientes.push({ id, nome: novoNome });
      setForm(f => ({ ...f, clienteId: id }));
    } else if (novoCadastro === 'categoria') {
      const { salvarCategoria } = await import('@/lib/storage');
      const novaCat = { id, nome: novoNome, icone: 'Package', cor: '#881337', tipo: form.tipo, subcategorias: [] };
      await salvarCategoria(novaCat);
      categorias.push(novaCat);
      setForm(f => ({ ...f, categoriaId: id }));
    } else if (novoCadastro === 'centroCusto') {
      const { salvarCentroCusto } = await import('@/lib/storage');
      const novoCC = { id, nome: novoNome, icone: 'Building2', cor: '#64748b' };
      await salvarCentroCusto(novoCC);
      centrosCusto.push(novoCC);
      setForm(f => ({ ...f, centroCustoId: id }));
    }
    setNovoCadastro(null);
    setNovoNome('');
  };

  const handleSave = async () => {
    // AUTO CADASTRO DE FORNECEDOR / CLIENTE
    try {
        if ((form.tipo as string) === 'despesa' && !form.fornecedorId && (form as any).fornecedorNome) {
            const { salvarFornecedor } = await import('@/lib/storage');
            const id = 'forn_' + Date.now() + Math.random().toString(36).substring(2,9);
            const nome = (form as any).fornecedorNome.trim();
            await salvarFornecedor({ id, nome });
            fornecedores.push({ id, nome });
            form.fornecedorId = id;
        } else if ((form.tipo as string) === 'receita' && !form.clienteId && (form as any).clienteNome) {
            const { salvarCliente } = await import('@/lib/storage');
            const id = 'cli_' + Date.now() + Math.random().toString(36).substring(2,9);
            const nome = (form as any).clienteNome.trim();
            await salvarCliente({ id, nome });
            clientes.push({ id, nome });
            form.clienteId = id;
        }
    } catch (e) {
        console.error("Falha ao autocadastrar entidade:", e);
    }

    if (!form.descricao.trim()) { alert('A descrição é obrigatória'); return; }
    if (!form.valor) { alert('O valor é obrigatório'); return; }
    if (!form.categoriaId) { alert('A categoria é obrigatória'); return; }
    if (form.formaPagamento !== 'cartao_credito' && !form.contaId) { alert('A conta é obrigatória'); return; }
    if (form.formaPagamento === 'cartao_credito' && !form.cartaoId) { alert('O cartão é obrigatório'); return; }
    if ((form.tipo as string) === 'despesa' && !form.fornecedorId) { alert('O fornecedor é obrigatório'); return; }
    if ((form.tipo as string) === 'receita' && !form.clienteId) { alert('O cliente é obrigatório'); return; }

    const valorFloat = parseMoedaInput(form.valor.toString());
    if (valorFloat <= 0) { alert('O valor deve ser maior que zero'); return; }

    const cat = categorias.find(c => c.id === form.categoriaId);
    const cc = centrosCusto.find(c => c.id === form.centroCustoId);
    const cli = clientes.find(c => c.id === form.clienteId);
    const forn = fornecedores.find(c => c.id === form.fornecedorId);
    const conta = contas.find(c => c.id === form.contaId);
    const cartao = cartoes.find(c => c.id === form.cartaoId);

    
    if (ensinarIA && form.descricao) {
        const fnName = (form.tipo as string) === 'despesa' ? fornecedores.find(x => x.id === form.fornecedorId)?.nome : clientes.find(x => x.id === form.clienteId)?.nome;
        aprenderPadrao(form.descricao, form.categoriaId, form.centroCustoId, form.contaId, form.formaPagamento as any, (form.tipo as string) === 'despesa' ? form.fornecedorId : form.clienteId, fnName as string).catch(console.error);
    }
    onSubmit({
      ...form,
      valor: valorFloat,
      categoriaNome: cat?.nome,
      categoriaIcone: cat?.icone,
      categoriaCor: cat?.cor,
      centroCustoNome: cc?.nome,
      clienteNome: cli?.nome,
      fornecedorNome: forn?.nome,
      contaNome: conta?.nome,
      cartaoNome: cartao?.nome,
    } as any);
  };

  const [erroForm, setErroForm] = useState('');
  const set = (campo: Partial<typeof form>) => setForm(f => ({ ...f, ...campo }));

  const handleSubmit = async () => {
    try {
        if ((form.tipo as string) === 'despesa' && !form.fornecedorId && (form as any).fornecedorNome) {
            const { salvarFornecedor } = await import('@/lib/storage');
            const id = 'forn_' + Date.now() + Math.random().toString(36).substring(2,9);
            const nome = (form as any).fornecedorNome.trim();
            await salvarFornecedor({ id, nome });
            fornecedores.push({ id, nome });
            form.fornecedorId = id;
        } else if ((form.tipo as string) === 'receita' && !form.clienteId && (form as any).clienteNome) {
            const { salvarCliente } = await import('@/lib/storage');
            const id = 'cli_' + Date.now() + Math.random().toString(36).substring(2,9);
            const nome = (form as any).clienteNome.trim();
            await salvarCliente({ id, nome });
            clientes.push({ id, nome });
            form.clienteId = id;
        }
    } catch (e) {
        console.error("Falha ao autocadastrar entidade:", e);
    }

    if (!form.descricao.trim()) { setErroForm('Informe a descrição'); return; }
    const parsedValor = parseInt(form.valor || '0', 10) / 100;
    const parsedMulta = parseInt(form.multa || '0', 10) / 100;
    const parsedJuros = parseInt(form.juros || '0', 10) / 100;
    const parsedDesconto = parseInt(form.desconto || '0', 10) / 100;
    
    if (!parsedValor || parsedValor <= 0) { setErroForm('Informe um valor válido'); return; }
    const cat = categorias.find(c => c.id === form.categoriaId);
    const cc = centrosCusto.find(c => c.id === form.centroCustoId);
    const conta = contas.find(c => c.id === form.contaId);
    const cartao = cartoes.find(c => c.id === form.cartaoId);
    const forn = fornecedores.find(f => f.id === form.fornecedorId);
    const cli = clientes.find(c => c.id === form.clienteId);

    if (form.rateio && form.rateio.length > 0) {
      const somaRateio = form.rateio.reduce((acc: number, curr: any) => acc + curr.valor, 0);
      if (Math.abs(somaRateio - parsedValor) > 0.01) { 
        setErroForm('A soma do rateio (' + formatarMoeda(somaRateio) + ') difere do valor total (' + formatarMoeda(parsedValor) + ').');
        return;
      }
      if (form.rateio.some((r: any) => !r.categoriaId)) {
        setErroForm('Preencha as categorias de todos os itens do rateio.');
        return;
      }
    }

    if ((form.tipo as string) === 'despesa' && !forn) { setErroForm('Selecione o Fornecedor'); return; }
    if ((form.tipo as string) === 'receita' && !cli) { setErroForm('Selecione o Cliente'); return; }
    if ((form.tipo as string) === 'transferencia') {
      if (!form.contaDestinãoId) { setErroForm('Selecione a Conta de Destinão'); return; }
      if (form.contaId === form.contaDestinãoId) { setErroForm('A conta de origem e destinão devem ser diferentes'); return; }
    }
    if (form.formaPagamento === 'cartao_credito' && !cartao) { setErroForm('Selecione o Cartão de Crédito'); return; }

    onSubmit({
      ...form,
      valor: parsedValor,
      multa: parsedMulta,
      juros: parsedJuros,
      desconto: parsedDesconto,
      dataCompetencia: form.data.substring(0, 7),
      categoriaNome: cat?.nome || 'Outros',
      categoriaCor: cat?.cor || 'var(--text-muted)',
      categoriaIcone: cat?.icone || 'Package',
      centroCustoNome: cc?.nome,
      contaNome: conta?.nome || '',
      contaDestinãoId: (form.tipo as string) === 'transferencia' ? form.contaDestinãoId : undefined,
      contaDestinãoNome: (form.tipo as string) === 'transferencia' ? contas.find(c => c.id === form.contaDestinãoId)?.nome : undefined,
      cartaoNome: cartao?.nome,
      fornecedorNome: forn?.nome,
      clienteNome: cli?.nome,
      frequenciaRecorrencia: form.recorrente ? form.frequenciaRecorrencia : undefined,
      quantidadeRecorrencias: form.recorrente ? form.quantidadeRecorrencias : undefined,
    } as any);

  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="grid-responsive-3">
        {['despesa', 'receita', 'transferencia'].map(t => (
          <button key={t}
            onClick={() => set({ tipo: t as 'despesa' | 'receita' | 'transferencia', descricao: t === 'transferencia' ? 'Transferência entre contas' : form.descricao })}
            style={{
              padding: '10px', borderRadius: 10,
              border: `1px solid ${form.tipo === t ? (t === 'despesa' ? 'rgba(239,68,68,0.4)' : t === 'receita' ? 'rgba(16,185,129,0.4)' : 'rgba(59,130,246,0.4)') : 'var(--border)'}`,
              background: form.tipo === t ? (t === 'despesa' ? 'rgba(239,68,68,0.1)' : t === 'receita' ? 'rgba(16,185,129,0.1)' : 'rgba(59,130,246,0.1)') : 'transparent',
              color: form.tipo === t ? (t === 'despesa' ? '#f87171' : t === 'receita' ? '#34d399' : '#60a5fa') : 'var(--text-muted)',
              cursor: 'pointer', fontWeight: 700, fontSize: 13,
            }}>
            {t === 'despesa' ? '↓ Despesa' : t === 'receita' ? '↑ Receita' : '↔ Transferência'}
          </button>
        ))}
      </div>

      {(form.tipo as string) === 'transferencia' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#3b82f6', fontWeight: 800, fontSize: 16, marginBottom: 4 }}>
            <span>⇄ Nova Transferência</span>
          </div>

          {/* Descrição */}
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>Descrição</label>
            <input className="input-field" value={form.descricao} onChange={e => set({ descricao: e.target.value })} placeholder="Ex: Transferência para investimento" />
          </div>

          {/* Conta de Origem e Conta de Destino */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>Conta de Origem *</label>
              <select className="input-field" value={form.contaId} onChange={e => {
                const selectedId = e.target.value;
                const c = contas.find(x => x.id === selectedId);
                setForm(f => ({
                  ...f,
                  contaId: selectedId,
                  contaNome: c?.nome || '',
                  contaDestinãoId: selectedId === f.contaDestinãoId ? '' : f.contaDestinãoId,
                  contaDestinoId: selectedId === (f as any).contaDestinoId ? '' : (f as any).contaDestinoId
                } as any));
              }}>
                <option value="">Selecione a conta origem</option>
                {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>Conta de Destino *</label>
              <select className="input-field" value={form.contaDestinãoId || (form as any).contaDestinoId || ''} onChange={e => {
                const selectedId = e.target.value;
                const c = contas.find(x => x.id === selectedId);
                setForm(f => ({
                  ...f,
                  contaDestinãoId: selectedId,
                  contaDestinãoNome: c?.nome || '',
                  contaDestinoId: selectedId,
                  contaDestinoNome: c?.nome || ''
                } as any));
              }}>
                <option value="">{form.contaId ? 'Selecione a conta destino' : 'Selecione origem primeiro'}</option>
                {contas.filter(c => c.id !== form.contaId).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
          </div>

          {/* Valor, Taxa e Data */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>Valor *</label>
              <input className="input-field" type="text" value={formatarMoedaInput(form.valor)} onChange={e => set({ valor: e.target.value.replace(/\D/g, '') })} placeholder="R$ 0,00" />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>Taxa (opcional)</label>
              <input className="input-field" type="text" value={formatarMoedaInput((form as any).taxa || '')} onChange={e => set({ taxa: e.target.value.replace(/\D/g, '') } as any)} placeholder="R$ 0,00" />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>Data</label>
              <input className="input-field" type="date" value={form.data || form.dataLancamento} onChange={e => set({ data: e.target.value, dataLancamento: e.target.value, dataVencimento: e.target.value })} />
            </div>
          </div>

          {/* Tipo e Status */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>Tipo</label>
              <select className="input-field" value={(form as any).tipoTransferencia || 'Interna'} onChange={e => set({ tipoTransferencia: e.target.value } as any)}>
                <option value="Interna">Interna</option>
                <option value="Externa">Externa</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>Status</label>
              <select className="input-field" value={form.status} onChange={e => {
                const val = e.target.value as any;
                set({ status: val, dataPagamento: val === 'pago' ? (form.dataPagamento || form.dataLancamento) : '' });
              }}>
                <option value="pago">Concluída (atualiza saldos)</option>
                <option value="pendente">Pendente</option>
                <option value="agendado">Agendada</option>
              </select>
            </div>
          </div>

          {/* Observações */}
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>Observações</label>
            <textarea className="input-field" rows={3} value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} placeholder="Informações adicionais..." style={{ resize: 'vertical' }}></textarea>
          </div>

          {/* Erro se houver */}
          {erroForm && (
            <p style={{ fontSize: 13, color: '#f87171', background: 'rgba(239,68,68,0.1)', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.2)' }}>{erroForm}</p>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
            <button type="button" onClick={handleSubmit} className="btn-primary hover-lift active-press" style={{ padding: '10px 24px', borderRadius: 20, width: '100%', justifyContent: 'center' }}>
              Realizar Transferência
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      <div className="grid-responsive-2">
        <div>
          <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>Descrição *</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="input-field" style={{ flex: 1 }} value={form.descricao} onChange={e => handleDescricaoChange(e.target.value)} placeholder="Ex: Gasolina" />
            <button type="button" onClick={aprenderDescricao} className="btn-secondary hover-lift active-press" title="Fazer a IA aprender esta descrição" style={{ padding: '0 12px' }}>
              🧠 Aprender
            </button>
          </div>
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>Valor *</label>
          <input className="input-field" type="text" value={formatarMoedaInput(form.valor)} onChange={e => set({ valor: e.target.value.replace(/\D/g, '') })} placeholder="R$ 0,00" />
        </div>
      </div>

      {(form.tipo as string) !== 'transferencia' && (
        <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 12, padding: 16, marginBottom: 12 }} id="cartao-manual">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: form.formaPagamento === 'cartao_credito' ? 12 : 0 }}>
            <input type="checkbox" id="cartao-manual-check" checked={form.formaPagamento === 'cartao_credito'} onChange={e => {
              const isCC = e.target.checked;
              const defaultCartaoId = cartoes[0]?.id || '';
              
              let updates = { formaPagamento: isCC ? 'cartao_credito' : 'pix', cartaoId: isCC ? defaultCartaoId : undefined } as any;
              
              if (isCC && defaultCartaoId) {
                const c = cartoes.find(x => x.id === defaultCartaoId);
                if (c) {
                  const hoje = new Date().toISOString().split('T')[0];
                  const dataRef = form.data || hoje;
                  const ciclo = calcularCicloFatura(dataRef, c.dataFechamento || 1, c.dataVencimento || 10);
                  updates.status = 'pendente';
                  updates.dataPagamento = '';
                  updates.dataVencimento = ciclo.dataVencimento;
                }
              }
              setForm(f => ({ ...f, ...updates }));
            }} style={{ accentColor: '#3b82f6', width: 16, height: 16, cursor: 'pointer' }} />
            <label htmlFor="cartao-manual-check" style={{ fontSize: 13, fontWeight: 700, color: '#3b82f6', cursor: 'pointer' }}>Compra no Cartão de Crédito?</label>
          </div>
          
          {form.formaPagamento === 'cartao_credito' ? (
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>Selecione o Cartão</label>
              <select className="input-field" value={form.cartaoId} onChange={e => {
                const selectedCartaoId = e.target.value;
                const cartaoObj = cartoes.find(c => c.id === selectedCartaoId);
                const hoje = new Date().toISOString().split('T')[0];
                let dataVenc = form.dataVencimento || hoje;
                let dataPag = '';
                if (cartaoObj) {
                  const ciclo = calcularCicloFatura(form.data || hoje, cartaoObj.dataFechamento || 1, cartaoObj.dataVencimento || 10);
                  dataVenc = ciclo.dataVencimento;
                  dataPag = '';
                }
                setForm(f => ({
                  ...f,
                  cartaoId: selectedCartaoId,
                  dataVencimento: dataVenc,
                  status: 'pendente',
                  dataPagamento: dataPag
                }));
              }}>
                <option value="">Selecione um cartão...</option>
                {cartoes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
          ) : (
            <div className="grid-responsive-2">
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>Conta Bancária</label>
                <select className="input-field" value={form.contaId} onChange={e => {
                  const conta = contas.find(c => c.id === e.target.value);
                  setForm(f => ({ ...f, contaId: e.target.value, contaNome: conta?.nome || '' }));
                }}>
                  <option value="">Selecione uma conta...</option>
                  {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>Forma de Pag.</label>
                <select className="input-field" value={form.formaPagamento} onChange={e => setForm(f => ({ ...f, formaPagamento: e.target.value as any }))}>
                  {Object.entries(FORMAS_PAGAMENTO_LABELS).filter(([k]) => k !== 'cartao_credito').map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
          )}
        </div>
      )}

      {(form.tipo as string) === 'despesa' && (
        <div className="grid-responsive-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '16px', marginTop: 12 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>Multa</label>
            <input className="input-field" type="text" style={form.multa ? { color: '#ef4444', borderColor: '#ef4444' } : {}} value={formatarMoedaInput(form.multa)} onChange={e => setForm({ ...form,  multa: e.target.value.replace(/\D/g, '') })} placeholder="R$ 0,00" />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>Juros</label>
            <input className="input-field" type="text" style={form.juros ? { color: '#ef4444', borderColor: '#ef4444' } : {}} value={formatarMoedaInput(form.juros)} onChange={e => setForm({ ...form, juros: e.target.value.replace(/\D/g, '') })} placeholder="R$ 0,00" />
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#ef4444', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>Desconto</label>
            <input className="input-field" type="text" style={{ color: '#ef4444', borderColor: form.desconto ? '#ef4444' : 'var(--border)', backgroundColor: form.desconto ? 'rgba(239, 68, 68, 0.05)' : 'transparent', fontWeight: form.desconto ? 700 : 400 }} value={formatarMoedaInput(form.desconto || '')} onChange={e => setForm({ ...form, desconto: e.target.value.replace(/\D/g, '') })} placeholder="- R$ 0,00" />
          </div>
        </div>
      )}
      
      {(form.multa || form.juros || form.desconto) && (
        <div style={{ marginTop: 8, padding: 8, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 6, border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', justifyContent: 'space-between' }}>
           <span style={{ fontSize: 12, fontWeight: 600, color: '#ef4444' }}>Valor Final a ser pago:</span>
           <span style={{ fontSize: 12, fontWeight: 700, color: '#ef4444' }}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.max(0, ((Number(form.valor) || 0) + (Number(form.multa) || 0) + (Number(form.juros) || 0) - (Number(form.desconto) || 0)) / 100))}</span>
        </div>
      )}

      <div className="grid-responsive-2">
        <div>
          <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>
            {form.formaPagamento === 'cartao_credito' ? 'Data da Compra *' : 'Data de Vencimento *'}
          </label>
          <input className="input-field" type="date" value={form.formaPagamento === 'cartao_credito' ? form.data : form.dataVencimento} onChange={e => {
            const val = e.target.value;
            if (form.formaPagamento === 'cartao_credito') {
              if (form.cartaoId) {
                const cartaoObj = cartoes.find(c => c.id === form.cartaoId);
                if (cartaoObj) {
                  const ciclo = calcularCicloFatura(val, cartaoObj.dataFechamento || 1, cartaoObj.dataVencimento || 10);
                  setForm(f => ({
                    ...f,
                    data: val,
                    dataLancamento: val,
                    dataVencimento: ciclo.dataVencimento,
                    status: 'pendente',
                    dataPagamento: ''
                  }));
                } else {
                  setForm(f => ({ ...f, data: val, dataLancamento: val }));
                }
              } else {
                setForm(f => ({ ...f, data: val, dataLancamento: val }));
              }
            } else {
              setForm(f => ({ ...f, dataVencimento: val, data: val, dataLancamento: val, status: val > f.dataLancamento ? 'pendente' : f.status, dataPagamento: (val > f.dataLancamento || f.status === 'pendente') ? '' : val }));
            }
          }} />
        </div>
        
        {form.formaPagamento === 'cartao_credito' ? (
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>
              Fatura (Vencimento) *
            </label>
            <input className="input-field" type="date" value={form.dataVencimento} onChange={e => {
              set({ dataVencimento: e.target.value });
            }} title="A data em que a fatura deste cartão será paga" />
          </div>
        ) : (
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>Status</label>
            <select className="input-field" value={form.status} onChange={e => {
              const val = e.target.value as 'pago' | 'pendente' | 'agendado';
              set({ status: val, dataPagamento: val === 'pago' ? (form.dataPagamento || form.dataLancamento) : '' });
            }}>
              <option value="pago">{(form.tipo as string) === 'receita' ? 'Recebida' : 'Pago'}</option>
              <option value="pendente">{(form.tipo as string) === 'receita' ? 'A Receber' : 'A Pagar'}</option>
              <option value="agendado">Agendado</option>
            </select>
          </div>
        )}
      </div>

      <div className="grid-responsive-2">
        {form.formaPagamento === 'cartao_credito' && (
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>Status</label>
            <select className="input-field" value={form.status} onChange={e => {
              const val = e.target.value as 'pago' | 'pendente' | 'agendado';
              set({ status: val, dataPagamento: val === 'pago' ? (form.dataPagamento || form.dataLancamento) : '' });
            }}>
              <option value="pago">{(form.tipo as string) === 'receita' ? 'Recebida' : 'Pago'}</option>
              <option value="pendente">{(form.tipo as string) === 'receita' ? 'A Receber' : 'A Pagar'}</option>
              <option value="agendado">Agendado</option>
            </select>
          </div>
        )}
        <div>
          <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>Data de Pagamento</label>
          <input className="input-field" type="date" value={form.dataPagamento || ''} onChange={e => set({ dataPagamento: e.target.value, status: e.target.value ? 'pago' : 'pendente' })} />
        </div>
      </div>

      {(form.tipo as string) !== 'transferencia' && (
      <div className="grid-responsive-2">
        <div>
          <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>Categoria</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <input list="cats-list-manual" className="input-field" placeholder="Buscar categoria..." value={categorias.find(c => c.id === form.categoriaId)?.nome || (form as any).categoriaNome || ''} onChange={e => {
                const nome = e.target.value;
                const cat = categorias.find(c => c.nome.toLowerCase() === nome.toLowerCase());
                if (cat) setForm(f => ({ ...f, categoriaId: cat.id, categoriaNome: cat.nome } as any));
                else setForm(f => ({ ...f, categoriaId: '', categoriaNome: nome } as any));
              }} />
              <datalist id="cats-list-manual">
                {categorias.map(c => <option key={c.id} value={c.nome} />)}
              </datalist>
            </div>
            <button type="button" onClick={() => setNovoCadastro('categoria')} className="btn-secondary hover-lift active-press" style={{ padding: '0 12px', flexShrink: 0 }}>
              <Plus size={16} />
            </button>
          </div>
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>Centro de Custo</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <input list="cc-list-manual" className="input-field" placeholder="Buscar centro de custo..." value={centrosCusto.find(c => c.id === form.centroCustoId)?.nome || (form as any).centroCustoNome || ''} onChange={e => {
                const nome = e.target.value;
                const cc = centrosCusto.find(c => c.nome.toLowerCase() === nome.toLowerCase());
                if (cc) setForm(f => ({ ...f, centroCustoId: cc.id, centroCustoNome: cc.nome } as any));
                else setForm(f => ({ ...f, centroCustoId: '', centroCustoNome: nome } as any));
              }} />
              <datalist id="cc-list-manual">
                {centrosCusto.map(c => <option key={c.id} value={c.nome} />)}
              </datalist>
            </div>
            <button type="button" onClick={() => setNovoCadastro('centroCusto')} className="btn-secondary hover-lift active-press" style={{ padding: '0 12px', flexShrink: 0 }}>
              <Plus size={16} />
            </button>
          </div>
        </div>
      </div>
      )}

      {(form.tipo as string) === 'transferencia' && (
        <div className="grid-responsive-2" style={{ marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>Conta de Origem</label>
            <select className="input-field" value={form.contaId} onChange={e => set({ contaId: e.target.value, contaDestinãoId: e.target.value === form.contaDestinãoId ? '' : form.contaDestinãoId })}>
              {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>Conta de Destinão</label>
            <select className="input-field" value={form.contaDestinãoId || ''} onChange={e => set({ contaDestinãoId: e.target.value })}>
              <option value="">Selecione a conta destinão...</option>
              {contas.filter(c => c.id !== form.contaId).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
        </div>
      )}

      {(form.tipo as string) !== 'transferencia' && (
      <div>
        <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>{(form.tipo as string) === 'receita' ? 'Cliente' : 'Fornecedor'}</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <input list="clientes-fornecedores-list-manual" className="input-field" placeholder={`Buscar ${(form.tipo as string) === 'receita' ? 'cliente' : 'fornecedor'}...`} value={(form.tipo as string) === 'receita' ? (clientes.find(c => c.id === form.clienteId)?.nome || (form as any).clienteNome || '') : (fornecedores.find(f => f.id === form.fornecedorId)?.nome || (form as any).fornecedorNome || '')} onChange={e => {
              const nome = e.target.value;
              if ((form.tipo as string) === 'receita') {
                const cli = clientes.find(c => c.nome.toLowerCase() === nome.toLowerCase());
                if (cli) setForm(f => ({ ...f, clienteId: cli.id, clienteNome: cli.nome } as any));
                else setForm(f => ({ ...f, clienteId: '', clienteNome: nome } as any));
              } else {
                const forn = fornecedores.find(f => f.nome.toLowerCase() === nome.toLowerCase());
                if (forn) setForm(f => ({ ...f, fornecedorId: forn.id, fornecedorNome: forn.nome } as any));
                else setForm(f => ({ ...f, fornecedorId: '', fornecedorNome: nome } as any));
              }
            }} />
            <datalist id="clientes-fornecedores-list-manual">
              {(form.tipo as string) === 'receita' ? clientes.map(c => <option key={c.id} value={c.nome} />) : fornecedores.map(f => <option key={f.id} value={f.nome} />)}
            </datalist>
          </div>
          <button type="button" onClick={() => setNovoCadastro((form.tipo as string) === 'receita' ? 'cliente' : 'fornecedor')} className="btn-secondary hover-lift active-press" style={{ padding: '0 12px', flexShrink: 0 }}>
            <Plus size={16} />
          </button>
        </div>

        {novoCadastro && (
          <div style={{ marginTop: 8, padding: 12, background: 'var(--bg-glass)', borderRadius: 10, border: '1px solid var(--border-hover)', display: 'flex', gap: 8 }}>
            <input className="input-field" style={{ flex: 1, padding: '8px 12px' }} value={novoNome} onChange={e => setNovoNome(e.target.value)} placeholder={`Novo ${novoCadastro}`} autoFocus />
            <button type="button" onClick={handleQuickAdd} className="btn-primary hover-lift active-press" style={{ padding: '8px 12px' }}>Salvar</button>
            <button type="button" onClick={() => setNovoCadastro(null)} className="btn-secondary hover-lift active-press" style={{ padding: '8px' }}><X size={16} /></button>
          </div>
        )}
      </div>
      )}

      {/* Parcelamento (Apenas para Cartão de Crédito) */}
      {form.formaPagamento === 'cartao_credito' && (
      <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: form.parcelado ? 12 : 0 }}>
          <input type="checkbox" id="parcelado-manual" checked={form.parcelado} onChange={e => set({ parcelado: e.target.checked })} style={{ accentColor: '#3b82f6' }} />
          <label htmlFor="parcelado-manual" style={{ fontSize: 13, fontWeight: 600, color: '#3b82f6' }}>💳 Compra Parcelada</label>
        </div>
        {form.parcelado && (
          <div className="grid-responsive-2">
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>Total de Parcelas</label>
              <select className="input-field" value={form.totalParcelas} onChange={e => set({ totalParcelas: parseInt(e.target.value) || 2 })}>
                {Array.from({ length: 17 }).map((_, i) => (
                  <option key={i+2} value={i+2}>{i+2}x de {formatarMoeda(parseMoedaInput(form.valor.toString()) / (i+2))}</option>
                ))}
              </select>
              <div style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: '#3b82f6' }}>
                {form.totalParcelas}x parcelas de {formatarMoeda(parseMoedaInput(form.valor.toString()) / form.totalParcelas)}
              </div>
            </div>
            <div>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginTop: 24 }}>A 1ª parcela vai para a fatura atual.</span>
            </div>
          </div>
        )}
      </div>
      )}

      {/* Recorrência */}
      {(form.tipo as string) !== 'transferencia' && form.formaPagamento !== 'cartao_credito' && (
      <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 12, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: form.recorrente ? 12 : 0 }}>
          <input type="checkbox" id="recorrente-manual" checked={form.recorrente} onChange={e => set({ recorrente: e.target.checked })} style={{ accentColor: '#f59e0b' }} />
          <label htmlFor="recorrente-manual" style={{ fontSize: 13, fontWeight: 600, color: '#fbbf24' }}>🔄 Lançamento Recorrente</label>
        </div>
        {form.recorrente && (
          <div className="grid-responsive-2">
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>Frequência</label>
              <select className="input-field" value={form.frequenciaRecorrencia} onChange={e => set({ frequenciaRecorrencia: e.target.value as 'semanal' | 'mensal' | 'trimestral' | 'anual' })}>
                {Object.entries(FREQUENCIA_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>Quantidade</label>
              <input className="input-field" type="number" min="2" max="60" value={form.quantidadeRecorrencias} onChange={e => set({ quantidadeRecorrencias: parseInt(e.target.value) || 2 })} />
            </div>
          </div>
        )}
      </div>
      )}

      {/* Observações moved to bottom */}
<div style={{ marginBottom: 20, display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>Observações Gerais</label>
            <textarea className="input-field" rows={3} value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} placeholder="Deseja anotar mais algum detalhe sobre esse lançamento?" style={{ resize: 'vertical' }}></textarea>
          </div>
          {['master', '9yxuafoC0AV9BrIKem05ponbmgn2', 'autocred-promotora-de-credito'].includes(getTenantId()) && (form.tipo as string) !== 'transferencia' && (
            <div style={{ width: 150 }}>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>Comportamento</label>
              <select className="input-field" value={form.comportamento} onChange={e => setForm(f => ({ ...f, comportamento: e.target.value }))}>
                <option value="fixa">Fixa</option>
                <option value="variavel">Variável</option>
              </select>
            </div>
          )}
        </div>

      {/* Rateio, Conciliado & Comprovante - Movidos para o final da tela */}
      <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
        <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Opções Avançadas</h4>
        
        <div className="grid-responsive-2" style={{ marginBottom: 12 }}>
          <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 10, padding: 12 }}>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>Rateio de Despesas</label>
            <button type="button" onClick={() => alert('Para salvar rateios complexos, a transação deve ser convertida em lote. Funcionalidade em beta.')} className="btn-secondary" style={{ padding: '8px 16px', fontSize: 13, gap: 8, width: '100%', justifyContent: 'center' }}>
              <Plus size={16} /> Adicionar Rateio
            </button>
          </div>
          
          <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 10, padding: 12, display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
              <input type="checkbox" id="conciliado-manual" checked={form.conciliado} onChange={e => setForm(f => ({ ...f, conciliado: e.target.checked }))} style={{ accentColor: '#10b981', width: 20, height: 20 }} />
              <label htmlFor="conciliado-manual" style={{ fontSize: 13, fontWeight: 600, color: '#10b981', cursor: 'pointer', flex: 1 }}>Conciliado (Bate com o Banco)</label>
            </div>
          </div>
        </div>

        <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 10, padding: 12 }}>
          <label style={{ fontSize: 11, color: '#3b82f6', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>📎 Anexar Comprovante / Nota (Opcional)</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <label className="btn-secondary hover-lift active-press" style={{ flex: 1, padding: '8px', fontSize: 12, justifyContent: 'center', cursor: 'pointer', textAlign: 'center', border: '1px solid rgba(59,130,246,0.2)' }}>
              <Camera size={14} style={{ marginRight: 6, display: 'inline' }} />
              Tirar Foto
              <input type="file" accept="image/*" capture="environment" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>
            <label className="btn-secondary hover-lift active-press" style={{ flex: 1, padding: '8px', fontSize: 12, justifyContent: 'center', cursor: 'pointer', textAlign: 'center', border: '1px solid rgba(59,130,246,0.2)' }}>
              <Paperclip size={14} style={{ marginRight: 6, display: 'inline' }} />
              Arquivo
              <input type="file" accept="image/*,.pdf" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>
            {form.comprovanteBase64 && (
              <button type="button" onClick={() => window.open(form.comprovanteBase64, '_blank')} className="btn-primary hover-lift active-press" style={{ flex: '1 1 100%', padding: '8px', fontSize: 12, justifyContent: 'center', textAlign: 'center' }}>
                <Eye size={14} style={{ marginRight: 6, display: 'inline' }} />
                Ver Anexo
              </button>
            )}
          </div>
          {form.comprovanteBase64 && <span style={{ fontSize: 11, color: '#10b981', display: 'block', marginTop: 8, textAlign: 'center', fontWeight: 600 }}>✅ Comprovante Anexado!</span>}
        </div>
      </div>

      {erroForm && (
        <p style={{ fontSize: 13, color: '#f87171', background: 'rgba(239,68,68,0.1)', padding: '10px 14px', borderRadius: 10, marginBottom: 16, border: '1px solid rgba(239,68,68,0.2)' }}>{erroForm}</p>
      )}
      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(16,185,129,0.06)', borderRadius: 10, border: '1px solid rgba(16,185,129,0.2)' }}>
        <input type="checkbox" id="ensinar-manual" checked={ensinarIA} onChange={e => setEnsinarIA(e.target.checked)} style={{ accentColor: '#10b981', cursor: 'pointer', width: 16, height: 16 }} />
        <label htmlFor="ensinar-manual" style={{ fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer', flex: 1 }}>
          <strong>Ensinar a IA</strong> a usar estes mesmos dados quando eu disser algo parecido
        </label>
      </div>
      <button onClick={handleSubmit} className="btn-primary hover-lift active-press" style={{ width: '100%', justifyContent: 'center' }}>

        <CheckCircle2 size={16} />
        Pré-visualizar Lançamento
      </button>
    </div>
      )}
    </div>
  );
}





