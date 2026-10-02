'use client';

import React, { useState, useEffect } from 'react';
import { extrairDadosDocumento, DadosFiscaisExtraidos } from '@/lib/ocr-pipeline';
import { salvarTransacao, getCategorias, getContas, getCentrosCusto, getClientes, getFornecedores } from '@/lib/storage';
import { playSound } from '@/lib/audio';
import { X, Upload, Sparkles, Loader2, CheckCircle2, FileText, ArrowRight, DollarSign, Calendar, Tag, Building } from 'lucide-react';
import { format } from 'date-fns';

interface ModalImportarDocIAProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function ModalImportarDocIA({ onClose, onSuccess }: ModalImportarDocIAProps) {
  const [loading, setLoading] = useState(false);
  const [progressoMsg, setProgressoMsg] = useState('');
  const [arquivoBase64, setArquivoBase64] = useState<string | null>(null);
  const [nomeArquivo, setNomeArquivo] = useState('');
  
  // Listas do sistema
  const [categorias, setCategorias] = useState<any[]>([]);
  const [contas, setContas] = useState<any[]>([]);
  const [centrosCusto, setCentrosCusto] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [fornecedores, setFornecedores] = useState<any[]>([]);

  // Dados extraídos pela IA
  const [dadosExtraidos, setDadosExtraidos] = useState<DadosFiscaisExtraidos | null>(null);
  
  // Formulário editável antes de salvar
  const [tipo, setTipo] = useState<'despesa' | 'receita'>('despesa');
  const [descricao, setDescricao] = useState('');
  const [fornecedorNome, setFornecedorNome] = useState('');
  const [valor, setValor] = useState<number>(0);
  const [dataCompetencia, setDataCompetencia] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dataVencimento, setDataVencimento] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [categoriaId, setCategoriaId] = useState('');
  const [categoriaNome, setCategoriaNome] = useState('');
  const [contaId, setContaId] = useState('');
  const [contaNome, setContaNome] = useState('');
  const [centroCustoId, setCentroCustoId] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [fornecedorId, setFornecedorId] = useState('');
  const [status, setStatus] = useState<'pendente' | 'pago'>('pendente');
  const [observacoes, setObservacoes] = useState('');

  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    (async () => {
      const [cats, conts, ccs, clis, forns] = await Promise.all([getCategorias(), getContas(), getCentrosCusto(), getClientes(), getFornecedores()]);
      setCategorias(cats);
      setContas(conts);
      setCentrosCusto(ccs);
      setClientes(clis);
      setFornecedores(forns);

      if (conts.length > 0) {
        setContaId(conts[0].id);
        setContaNome(conts[0].nome);
      }
    })();
  }, []);

  const handleProcessarArquivo = async (file: File) => {
    if (!file) return;
    setNomeArquivo(file.name);
    setLoading(true);
    setProgressoMsg('Lendo arquivo...');

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        setArquivoBase64(base64);

        try {
          const resultado = await extrairDadosDocumento(base64, (msg) => {
            setProgressoMsg(msg);
          });

          setDadosExtraidos(resultado);
          setDescricao(resultado.fornecedor || resultado.tipoDocumento || file.name.replace(/\.[^/.]+$/, ''));
          setFornecedorNome(resultado.fornecedor || '');
          setValor(resultado.valorTotal || 0);
          setDataVencimento(resultado.data || format(new Date(), 'yyyy-MM-dd'));

          // Identificar se parece receita ou despesa
          if (resultado.tipoDocumento?.toLowerCase().includes('recibo') && resultado.categoria?.toLowerCase().includes('receita')) {
            setTipo('receita');
          } else {
            setTipo('despesa');
          }

          // Vincular categoria compatível se existir
          let catId = '';
          if (categorias.length > 0) {
            const catEncontrada = categorias.find(c => 
              c.nome.toLowerCase().includes((resultado.categoria || '').toLowerCase()) ||
              (resultado.categoria || '').toLowerCase().includes(c.nome.toLowerCase())
            );
            if (catEncontrada) {
              catId = catEncontrada.id;
              setCategoriaId(catEncontrada.id);
              setCategoriaNome(catEncontrada.nome);
            } else {
              catId = categorias[0].id;
              setCategoriaId(categorias[0].id);
              setCategoriaNome(categorias[0].nome);
            }
          }

          // Consultar Aprendizagem da IA (ai_learning_dictionary)
          const descVal = resultado.fornecedor || resultado.tipoDocumento || file.name.replace(/\.[^/.]+$/, '');
          if (descVal.trim().length > 2) {
            try {
              const dict = JSON.parse(localStorage.getItem('ai_learning_dictionary') || '{}');
              const lowerVal = descVal.toLowerCase().trim();
              let learned = dict[lowerVal];
              if (!learned) {
                const matchKey = Object.keys(dict).find(k => lowerVal.includes(k));
                if (matchKey) learned = dict[matchKey];
              }
              if (learned) {
                if (learned.categoriaId) {
                  setCategoriaId(learned.categoriaId);
                  const c = categorias.find(x => x.id === learned.categoriaId);
                  if (c) setCategoriaNome(c.nome);
                }
                if (learned.centroCustoId) setCentroCustoId(learned.centroCustoId);
                if (learned.contaId) setContaId(learned.contaId);
                if (learned.fornecedorId) setFornecedorId(learned.fornecedorId);
                if (learned.clienteId) setClienteId(learned.clienteId);
              }
            } catch (e) { }
          }

          // Observações com itens
          let obs = resultado.observacoes || '';
          if (resultado.produtos && resultado.produtos.length > 0) {
            obs += '\nItens:\n' + resultado.produtos.map(p => `• ${p.nome}: R$ ${p.valorTotal}`).join('\n');
          }
          setObservacoes(obs.trim());

          playSound('sucesso');
        } catch (err: any) {
          alert('Erro ao interpretar documento com IA: ' + err.message);
        } finally {
          setLoading(false);
          setProgressoMsg('');
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      alert('Erro ao carregar arquivo: ' + err.message);
      setLoading(false);
    }
  };

  const handleSalvar = async () => {
    if (!descricao.trim()) {
      alert('Preencha a descrição do lançamento.');
      return;
    }
    if (valor <= 0) {
      alert('Informe um valor válido maior que zero.');
      return;
    }

    setSalvando(true);
    try {
      await salvarTransacao({
        tipo,
        descricao,
        valor,
        data: dataCompetencia,
        dataVencimento,
        dataCompetencia,
        status,
        categoriaId,
        categoriaNome,
        categoriaIcone: 'FileText',
        categoriaCor: '#3b82f6',
        contaId,
        contaNome,
        formaPagamento: 'Boleto',
        fornecedorId: tipo === 'despesa' ? fornecedorId : undefined,
        clienteId: tipo === 'receita' ? clienteId : undefined,
        fornecedorNome: tipo === 'despesa' && fornecedorId ? fornecedores.find(x => x.id === fornecedorId)?.nome : fornecedorNome,
        clienteNome: tipo === 'receita' && clienteId ? clientes.find(x => x.id === clienteId)?.nome : fornecedorNome,
        centroCustoId: centroCustoId || undefined,
        observacoes,
        comprovanteBase64: arquivoBase64 || undefined
      });

      playSound('sucesso');
      onSuccess();
      onClose();
    } catch (e: any) {
      alert('Erro ao salvar lançamento: ' + e.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 }}>
      <div style={{ background: 'var(--bg-primary, #0f172a)', border: '1px solid var(--border)', borderRadius: 16, width: '100%', maxWidth: 540, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
        
        {/* Header */}
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(16,185,129,0.1))' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: 'linear-gradient(135deg, #3b82f6, #10b981)', color: '#fff', padding: 8, borderRadius: 10 }}>
              <Sparkles size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-title, #fff)' }}>Lançamento com IA & OCR</h3>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>Leitura de Boletos, Notas Fiscais e Recibos</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: 22 }}>
          {/* Área de Upload (se ainda não carregou ou quiser trocar) */}
          {!dadosExtraidos && !loading && (
            <div
              style={{
                border: '2px dashed var(--border-hover, #3b82f6)',
                borderRadius: 14,
                padding: '40px 20px',
                textAlign: 'center',
                background: 'rgba(59,130,246,0.03)',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onClick={() => document.getElementById('input-doc-ocr')?.click()}
            >
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Upload size={28} />
              </div>
              <h4 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: 'var(--text-title)' }}>
                Arraste ou selecione o documento
              </h4>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                PDF de boleto, foto de cupom fiscal, fatura ou comprovante PIX
              </p>
              <input
                id="input-doc-ocr"
                type="file"
                accept="image/*,.pdf"
                style={{ display: 'none' }}
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) handleProcessarArquivo(f);
                }}
              />
            </div>
          )}

          {/* Loading com Progresso */}
          {loading && (
            <div style={{ textAlign: 'center', padding: '50px 20px' }}>
              <Loader2 size={42} className="spin" color="#3b82f6" style={{ margin: '0 auto 16px' }} />
              <h4 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 800, color: '#3b82f6' }}>🤖 IA Analisando Documento...</h4>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>{progressoMsg || 'Extraindo CNPJ, valores e datas...'}</p>
            </div>
          )}

          {/* Formulário com Dados Extraídos pela IA */}
          {dadosExtraidos && !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Card de Sucesso IA */}
              <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle2 size={16} color="#10b981" />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981' }}>
                    Dados extraídos com sucesso ({dadosExtraidos.tipoDocumento || 'Documento'})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => { setDadosExtraidos(null); setArquivoBase64(null); }}
                  style={{ background: 'transparent', border: 'none', color: '#3b82f6', fontSize: 11, cursor: 'pointer' }}
                >
                  Trocar arquivo
                </button>
              </div>

              {/* Tipo: Despesa ou Receita */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setTipo('despesa')}
                  style={{ padding: '8px', borderRadius: 8, border: tipo === 'despesa' ? '2px solid #ef4444' : '1px solid var(--border)', background: tipo === 'despesa' ? 'rgba(239,68,68,0.1)' : 'var(--bg-secondary)', color: tipo === 'despesa' ? '#ef4444' : 'var(--text-muted)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
                >
                  🔴 Despesa (Conta a Pagar)
                </button>
                <button
                  type="button"
                  onClick={() => setTipo('receita')}
                  style={{ padding: '8px', borderRadius: 8, border: tipo === 'receita' ? '2px solid #10b981' : '1px solid var(--border)', background: tipo === 'receita' ? 'rgba(16,185,129,0.1)' : 'var(--bg-secondary)', color: tipo === 'receita' ? '#10b981' : 'var(--text-muted)', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
                >
                  🟢 Receita (Conta a Receber)
                </button>
              </div>

              {/* Descrição e Fornecedor */}
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  Descrição / Fornecedor
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={descricao}
                  onChange={e => setDescricao(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 8 }}
                />
              </div>

              {/* Valor e Vencimento */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                    Valor (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="input-field"
                    value={valor || ''}
                    onChange={e => setValor(parseFloat(e.target.value) || 0)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8, fontWeight: 700, fontSize: 14 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                    Data de Vencimento
                  </label>
                  <input
                    type="date"
                    className="input-field"
                    value={dataVencimento}
                    onChange={e => setDataVencimento(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8 }}
                  />
                </div>
              </div>

              {/* Categoria e Centro de Custo */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                    Categoria
                  </label>
                  <select
                    className="input-field"
                    value={categoriaId}
                    onChange={e => {
                      const id = e.target.value;
                      setCategoriaId(id);
                      const c = categorias.find(x => x.id === id);
                      if (c) setCategoriaNome(c.nome);
                    }}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8 }}
                  >
                    <option value="">Selecione...</option>
                    {categorias.map(c => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                    Centro de Custo
                  </label>
                  <select
                    className="input-field"
                    value={centroCustoId}
                    onChange={e => setCentroCustoId(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8 }}
                  >
                    <option value="">(Opcional) Selecione...</option>
                    {centrosCusto.map(c => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Conta Bancária e Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                    Conta Bancária
                  </label>
                  <select
                    className="input-field"
                    value={contaId}
                    onChange={e => {
                      const id = e.target.value;
                      setContaId(id);
                      const c = contas.find(x => x.id === id);
                      if (c) setContaNome(c.nome);
                    }}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8 }}
                  >
                    <option value="">Selecione...</option>
                    {contas.map(c => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                    Status
                  </label>
                  <select
                    className="input-field"
                    value={status}
                    onChange={e => setStatus(e.target.value as 'pago' | 'pendente')}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8 }}
                  >
                    <option value="pendente">Pendente (Não Pago)</option>
                    <option value="pago">Pago / Recebido</option>
                  </select>
                </div>
              </div>

              {/* Data Emissão e Cliente/Fornecedor */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                    Data de Emissão
                  </label>
                  <input
                    type="date"
                    className="input-field"
                    value={dataCompetencia}
                    onChange={e => setDataCompetencia(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                    {tipo === 'despesa' ? 'Fornecedor' : 'Cliente'}
                  </label>
                  <select
                    className="input-field"
                    value={tipo === 'despesa' ? fornecedorId : clienteId}
                    onChange={e => tipo === 'despesa' ? setFornecedorId(e.target.value) : setClienteId(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 8 }}
                  >
                    <option value="">(Opcional) Selecione...</option>
                    {(tipo === 'despesa' ? fornecedores : clientes).map(c => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                </div>
              </div>


              {/* Observações / Itens */}
              {observacoes && (
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                    Itens e Detalhes da Nota
                  </label>
                  <textarea
                    rows={2}
                    className="input-field"
                    value={observacoes}
                    onChange={e => setObservacoes(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 11 }}
                  />
                </div>
              )}

              {/* Botão de Salvar */}
              <button
                type="button"
                onClick={handleSalvar}
                disabled={salvando}
                className="btn-primary"
                style={{ width: '100%', background: 'linear-gradient(135deg, #3b82f6, #10b981)', color: '#fff', border: 'none', borderRadius: 10, padding: 12, fontWeight: 800, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 6 }}
              >
                {salvando ? 'Salvando Lançamento...' : '✅ Confirmar e Gravar Lançamento'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
