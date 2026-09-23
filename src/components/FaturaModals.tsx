import { getFormasPagamentoCustom } from '@/lib/firebase';
import { useState, useEffect } from 'react';
import { Fatura, Transacao, Conta, FormaPagamento, Categoria, CentroCusto } from '@/lib/types';
import { formatarMoeda, salvarFatura, atualizarTransacao, getCategorias, getCentrosCusto } from '@/lib/storage';
import { FORMAS_PAGAMENTO_LABELS, STATUS_LABELS } from '@/lib/defaults';
import { Check, X, ArrowRightLeft, Calendar, FileText, DollarSign, CheckCircle2, Trash2 } from 'lucide-react';
import { DynamicIcon } from '@/components/DynamicIcon';
import { pagarFatura } from '@/lib/storage';
import { ordenarVencimentosAsc } from '@/lib/sorting';

const formatarMoedaInput = (valor: string | number) => {
  const v = String(valor).replace(/\D/g, '');
  if (!v) return '';
  const num = (parseInt(v, 10) / 100).toFixed(2);
  return 'R$ ' + num.replace('.', ',').replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
};

const parseMoedaInput = (valorStr: string) => {
  const v = valorStr.replace(/\D/g, '');
  if (!v) return 0;
  return parseInt(v, 10) / 100;
};

export function ModalPagarFatura({ fatura, contas, onClose, onPago }: {
  fatura: Fatura; contas: Conta[]; onClose: () => void; onPago: () => void;
}) {
  const fmt = formatarMoeda;
  const pago = fatura.pagamentos?.reduce((acc, p) => acc + p.valor, 0) || 0;
  const restante = fatura.valorTotal - pago;
  
  const [contaId, setContaId] = useState(contas[0]?.id || '');
  const [valorCentavos, setValorCentavos] = useState(Math.round(restante * 100));
  const [jurosCentavos, setJurosCentavos] = useState(0);
  const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().split('T')[0]);
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('pix');
  const [pagando, setPagando] = useState(false);
  const [formasPgto, setFormasPgto] = useState<any[]>([]);
  const [erroMsg, setErroMsg] = useState('');
  useEffect(() => {
    getFormasPagamentoCustom().then(setFormasPgto);
  }, []);

  // Categoria e Centro de Custo
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [centrosCusto, setCentrosCusto] = useState<CentroCusto[]>([]);
  const [categoriaId, setCategoriaId] = useState('financeiro');
  const [categoriaNome, setCategoriaNome] = useState('Pagamento de Fatura');
  const [centroCustoId, setCentroCustoId] = useState('');
  const [centroCustoNome, setCentroCustoNome] = useState('');

  useEffect(() => {
    getCategorias().then(setCategorias);
    getCentrosCusto().then(setCentrosCusto);
  }, []);

  const contaSelecionada = contas.find(c => c.id === contaId);
  const saldoConta = contaSelecionada?.saldo || 0;

  const formatInput = (centavos: number) => {
    if (!centavos) return '';
    const num = (centavos / 100).toFixed(2);
    return 'R$ ' + num.replace('.', ',').replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
  };

  const parseInput = (raw: string): number => {
    const digits = raw.replace(/\D/g, '');
    if (!digits) return 0;
    return parseInt(digits, 10);
  };

  const totalCentavos = valorCentavos + jurosCentavos;

  const handlePagar = async () => {
    const valFloat = valorCentavos / 100;
    const valJuros = jurosCentavos / 100;
    if (!contaId || valFloat <= 0) return;
    setErroMsg('');
    setPagando(true);
    try {
      const conta = contas.find(c => c.id === contaId);
      await pagarFatura(
        fatura.id, valFloat, contaId, conta?.nome || '',
        formaPagamento, dataPagamento, valJuros,
        categoriaId, categoriaNome,
        centroCustoId || undefined, centroCustoNome || undefined
      );
      onPago();
    } catch (e: any) {
      console.error('[ModalPagarFatura] Erro ao pagar fatura:', e);
      setErroMsg(e?.message || 'Erro ao processar pagamento. Tente novamente.');
    } finally {
      setPagando(false);
    }
  };

  const totalFloat = (valorCentavos + jurosCentavos) / 100;
  const saldoInsuficiente = saldoConta < totalFloat;

  return (
    <div className="modal-overlay">
      <div className="modal-box slide-up" style={{ maxWidth: 500 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>💰 Pagar Fatura</h2>
          <button onClick={onClose} style={{ background: 'var(--border)', border: '1px solid var(--border-hover)', borderRadius: 8, padding: '5px 7px', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={16} /></button>
        </div>

        <div style={{ background: fatura.cartaoCor + '15', border: `1px solid ${fatura.cartaoCor}30`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>💳 {fatura.cartaoNome}</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fatura.mesReferencia}</span>
          </div>
          <p style={{ fontSize: 28, fontWeight: 800, color: '#ef4444', textAlign: 'center', margin: '12px 0' }}>{fmt(restante)}</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
            Restante a pagar (Total era {fmt(fatura.valorTotal)})
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginTop: 4 }}>
            📅 Vencimento: {(fatura.dataVencimento || '').split('-').reverse().join('/')}
          </p>
        </div>

        <div style={{ maxHeight: 420, overflowY: 'auto', paddingRight: 4 }}>
          <div className="grid-responsive-3" style={{ marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>Valor Fatura (R$)</label>
              <input className="input-field" type="text" value={formatInput(valorCentavos)} onChange={e => setValorCentavos(parseInput(e.target.value))} placeholder="R$ 0,00" />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>Juros/Multa (R$)</label>
              <input className="input-field" type="text" value={formatInput(jurosCentavos)} onChange={e => setJurosCentavos(parseInput(e.target.value))} placeholder="R$ 0,00" />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>Data Pagamento</label>
              <input className="input-field" type="date" value={dataPagamento} onChange={e => setDataPagamento(e.target.value)} />
            </div>
          </div>

          <div className="grid-responsive-2" style={{ marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>Forma de Pagamento</label>
              <select className="input-field" value={formaPagamento} onChange={e => setFormaPagamento(e.target.value as FormaPagamento)}>
                {Object.entries(FORMAS_PAGAMENTO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>Conta de Origem</label>
              <select className="input-field" value={contaId} onChange={e => { setContaId(e.target.value); setErroMsg(''); }}>
                {contas.filter(c => c.ativo && c.tipo !== 'investimento').map(c => (
                  <option key={c.id} value={c.id}>{c.nome} — Saldo: {fmt(c.saldo || 0)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid-responsive-2" style={{ marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>Categoria</label>
              <select className="input-field" value={categoriaId} onChange={e => {
                const cat = categorias.find(c => c.id === e.target.value);
                setCategoriaId(e.target.value);
                setCategoriaNome(cat?.nome || 'Pagamento de Fatura');
              }}>
                <option value="financeiro">Pagamento de Fatura</option>
                {categorias.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>Centro de Custo</label>
              <select className="input-field" value={centroCustoId} onChange={e => {
                const cc = centrosCusto.find(c => c.id === e.target.value);
                setCentroCustoId(e.target.value);
                setCentroCustoNome(cc?.nome || '');
              }}>
                <option value="">— Nenhum —</option>
                {centrosCusto.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {jurosCentavos > 0 && (
          <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 10, padding: '10px 14px', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#f59e0b', fontWeight: 700 }}>💰 Total a Pagar (com juros/multa)</span>
            <span style={{ fontSize: 18, fontWeight: 900, color: '#ef4444' }}>{fmt(totalCentavos / 100)}</span>
          </div>
        )}

        {/* Saldo da conta selecionada */}
        <div style={{
          background: saldoInsuficiente ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.06)',
          border: `1px solid ${saldoInsuficiente ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.15)'}`,
          borderRadius: 10, padding: '10px 14px', marginBottom: 12,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <span style={{ fontSize: 13, color: saldoInsuficiente ? '#ef4444' : '#10b981', fontWeight: 700 }}>
            {saldoInsuficiente ? '❌ Saldo insuficiente!' : '✅ Saldo disponível'}
          </span>
          <span style={{ fontSize: 16, fontWeight: 900, color: saldoInsuficiente ? '#ef4444' : '#10b981' }}>
            {fmt(saldoConta)}
          </span>
        </div>

        {/* Erro inline */}
        {erroMsg && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
            <p style={{ fontSize: 13, color: '#ef4444', fontWeight: 700 }}>⚠️ {erroMsg}</p>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} className="btn-secondary" style={{ flex: 1 }}>Cancelar</button>
          <button
            onClick={handlePagar}
            disabled={pagando || !valorCentavos || saldoInsuficiente}
            className="btn-primary"
            style={{ flex: 2, justifyContent: 'center', opacity: saldoInsuficiente ? 0.5 : 1, cursor: saldoInsuficiente ? 'not-allowed' : 'pointer' }}
            title={saldoInsuficiente ? `Saldo insuficiente. Disponível: ${fmt(saldoConta)}` : ''}
          >
            {pagando ? '⏳ Processando...' : <><CheckCircle2 size={16} /> Confirmar Pagamento</>}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ModalDetalhesFatura({ fatura, transacoes, onClose, onPagar }: {
  fatura: Fatura; transacoes: Transacao[]; onClose: () => void; onPagar: () => void;
}) {
  const fmt = formatarMoeda;
  const pago = fatura.pagamentos?.reduce((acc, p) => acc + p.valor, 0) || 0;
  const restante = fatura.valorTotal - pago;
  
  const [abaExibicao, setAbaExibicao] = useState<'lancamentos' | 'pagamentos'>('lancamentos');
  const [removendo, setRemovendo] = useState<string | null>(null);

  // 🚀 REMOVER LANÇAMENTO DA FATURA E EXCLUIR DEFINITIVAMENTE 🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀
  const handleRemoverDaFatura = async (transacao: Transacao) => {
    const p = window.prompt('Digite a senha (1020) para excluir o lançamento:');
    if (p !== '1020') {
      if (p !== null) alert('Senha incorreta.');
      return;
    }
    if (!confirm(`Deseja EXCLUIR DEFINITIVAMENTE o lançamento "${transacao.descricao}" (${fmt(transacao.valor)})?\n\nEle será removido desta fatura, excluído da aba de lançamentos e o limite do cartão será restaurado.`)) return;
    
    setRemovendo(transacao.id);
    try {
      const { deletarTransacao } = await import('@/lib/storage');
      await deletarTransacao(transacao.id);

      // Localmente, também precisamos remover da lista `transacoes` para sumir da tela imediatamente
      const tIndex = transacoes.findIndex(t => t.id === transacao.id);
      if (tIndex >= 0) transacoes.splice(tIndex, 1);
      
      const newIds = (fatura.transacaoIds || []).filter(id => id !== transacao.id);
      const newTotal = fatura.valorTotal - Math.abs(transacao.valor);
      fatura.transacaoIds = newIds;
      fatura.valorTotal = Math.max(0, newTotal);

      alert('Lançamento excluído com sucesso e limite do cartão restaurado!');
      // Apenas recarregamos a página para garantir que tudo atualize
      window.location.reload();
    } catch (e: any) {
      alert('Erro ao excluir: ' + (e.message || 'Tente novamente'));
    } finally {
      setRemovendo(null);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box slide-up" style={{ maxWidth: 560 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 24 }}>📄</span> Detalhes da Fatura
          </h2>
          <button onClick={onClose} style={{ background: 'var(--border)', border: '1px solid var(--border-hover)', borderRadius: 8, padding: '5px 7px', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={16} /></button>
        </div>

        <div style={{ background: fatura.cartaoCor + '15', border: `1px solid ${fatura.cartaoCor}30`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>💳 {fatura.cartaoNome}</p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>Mês ref: {fatura.mesReferencia}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 22, fontWeight: 800, color: fatura.status === 'paga' ? '#10b981' : '#ef4444' }}>{fmt(fatura.valorTotal)}</p>
              <span className={`badge ${fatura.status === 'paga' ? 'badge-green' : fatura.status === 'parcial' ? 'badge-yellow' : 'badge-gray'}`} style={{ fontSize: 11, marginTop: 4, display: 'inline-block' }}>
                {fatura.status === 'paga' ? '✅ Totalmente Paga' : fatura.status === 'parcial' ? '⏳ Parcialmente Paga' : (fatura.dataFechamento && fatura.dataFechamento <= new Date().toISOString().split('T')[0]) ? '🔒 Fechada' : '⏳ Aberta'}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-hover)' }}>
            <div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Fechamento</p>
              <p style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 700 }}>{(fatura.dataFechamento || '').split('-').reverse().join('/')}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Vencimento</p>
              <p style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 700 }}>{(fatura.dataVencimento || '').split('-').reverse().join('/')}</p>
            </div>
          </div>
        </div>

        {/* Abas */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid var(--border-hover)', paddingBottom: 8 }}>
          <button onClick={() => setAbaExibicao('lancamentos')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: abaExibicao === 'lancamentos' ? '#10b981' : 'var(--text-muted)', padding: '6px 12px', borderBottom: abaExibicao === 'lancamentos' ? '2px solid #10b981' : '2px solid transparent' }}>
            Lançamentos ({transacoes.length})
          </button>
          <button onClick={() => setAbaExibicao('pagamentos')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: abaExibicao === 'pagamentos' ? '#10b981' : 'var(--text-muted)', padding: '6px 12px', borderBottom: abaExibicao === 'pagamentos' ? '2px solid #10b981' : '2px solid transparent' }}>
            Pagamentos ({fatura.pagamentos?.length || 0})
          </button>
        </div>

        <div style={{ maxHeight: 300, overflowY: 'auto', paddingRight: 8, marginBottom: 20 }}>
          {abaExibicao === 'lancamentos' && (
            transacoes.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>Nenhum lançamento encontrado para esta fatura.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {ordenarVencimentosAsc(transacoes).map(t => {
                  const isPago = t.status === 'pago';
                  const tAny = t as any;
                  return (
                  <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: isPago ? 'rgba(16,185,129,0.04)' : 'var(--bg-glass)', borderRadius: 10, border: isPago ? '1px solid rgba(16,185,129,0.2)' : '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: (t.categoriaCor || 'var(--text-muted)') + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.categoriaCor || 'var(--text-muted)', fontSize: 16, flexShrink: 0 }}>
                        <DynamicIcon name={t.categoriaIcone || 'Package'} size={16} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {t.descricao} {t.parcelado && t.totalParcelas && <span style={{ fontSize: 11, color: '#8b5cf6', marginLeft: 4 }}>({t.parcelaAtual}/{t.totalParcelas})</span>}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t.data.split('-').reverse().join('/')}</span>
                          {t.categoriaNome && (
                            <>
                              <span style={{ color: 'var(--border)', fontSize: 10 }}>•</span>
                              <span style={{ fontSize: 11, color: t.categoriaCor || 'var(--text-muted)' }}>{t.categoriaNome}</span>
                            </>
                          )}
                          {t.fornecedorNome && (
                            <>
                              <span style={{ color: 'var(--border)', fontSize: 10 }}>•</span>
                              <span style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 100 }}>{t.fornecedorNome}</span>
                            </>
                          )}
                        </div>
                        {/* Status de pagamento */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                          {isPago ? (
                            <>
                              <span style={{ fontSize: 10, fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,0.12)', padding: '2px 6px', borderRadius: 4 }}>✅ PAGO</span>
                              {t.dataPagamento && (
                                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>em {t.dataPagamento.split('-').reverse().join('/')}</span>
                              )}
                              {tAny.contaPagamentoNome && (
                                <span style={{ fontSize: 10, color: '#6366f1', background: 'rgba(99,102,241,0.1)', padding: '2px 6px', borderRadius: 4 }}>🏦 {tAny.contaPagamentoNome}</span>
                              )}
                            </>
                          ) : (
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#f59e0b', background: 'rgba(245,158,11,0.12)', padding: '2px 6px', borderRadius: 4 }}>⏳ A PAGAR</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: t.tipo === 'receita' ? '#10b981' : '#ef4444' }}>
                        {t.tipo === 'despesa' ? '−' : '+'}{fmt(t.valor)}
                      </p>
                      {!isPago && (
                        <button 
                          onClick={() => handleRemoverDaFatura(t)}
                          disabled={removendo === t.id}
                          style={{ background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: 6, padding: 5, color: '#f87171', cursor: 'pointer', opacity: removendo === t.id ? 0.5 : 1 }}
                          title="Remover da fatura"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            )
          )}

          {abaExibicao === 'pagamentos' && (
            (!fatura.pagamentos || fatura.pagamentos.length === 0) ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>Nenhum pagamento registrado.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {fatura.pagamentos.map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'rgba(16,185,129,0.05)', borderRadius: 10, border: '1px solid rgba(16,185,129,0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}><CheckCircle2 size={16} color="#10b981" /></div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#10b981' }}>Pagamento Efetuado</p>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {p.data.split('-').reverse().join('/')} • Conta: {p.contaNome}
                        </p>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 700, color: '#10b981' }}>{fmt(p.valor)}</p>
                        <p style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{FORMAS_PAGAMENTO_LABELS[p.formaPagamento] || p.formaPagamento}</p>
                      </div>
                      <button 
                        onClick={async () => {
                          if (confirm('Deseja excluir este pagamento? O limite do cartão e o saldo da conta serão revertidos.')) {
                            const { deletarPagamentoFatura } = await import('@/lib/storage');
                            await deletarPagamentoFatura(fatura.id, p.id);
                            onClose(); // Fechar para atualizar tudo
                          }
                        }}
                        style={{ background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: 6, padding: 6, color: '#f87171', cursor: 'pointer' }}
                        title="Excluir Pagamento"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed var(--border-hover)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>Total Pago:</span>
                  <span style={{ fontSize: 15, color: '#10b981', fontWeight: 800 }}>{fmt(pago)}</span>
                </div>
                {restante > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>Restante a Pagar:</span>
                    <span style={{ fontSize: 15, color: '#ef4444', fontWeight: 800 }}>{fmt(restante)}</span>
                  </div>
                )}
              </div>
            )
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, paddingTop: 16, borderTop: '1px solid var(--border-hover)' }}>
          <button onClick={onClose} className="btn-secondary" style={{ flex: 1 }}>Fechar</button>
          {fatura.status !== 'paga' && (
            <button onClick={onPagar} className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}><DollarSign size={16} /> Pagar Fatura</button>
          )}
        </div>
      </div>
    </div>
  );
}
