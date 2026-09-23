'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getContas, getCartoes, getFaturas, getTransacoes,
  salvarConta, salvarCartao, deletarConta, deletarCartao, pagarFatura,
  deletarFatura, formatarMoeda, gerarIdPublico,
  sincronizarFaturasPendentes
} from '@/lib/storage';
import { Conta, Cartao, Fatura, Transacao, FormaPagamento } from '@/lib/types';
import { getCorBanco, FORMAS_PAGAMENTO_LABELS } from '@/lib/defaults';
import {
  PlusCircle, Trash2, Edit3, X, Check,
  AlertTriangle, DollarSign, Eye, CheckCircle2
} from 'lucide-react';
import { DynamicIcon } from '@/components/DynamicIcon';
import { RealCreditCardImage } from '@/components/RealCreditCardImage';
import { ModalDetalhesFatura, ModalPagarFatura } from './FaturaModals';

type Aba = 'contas' | 'cartoes' | 'faturas_pendentes' | 'faturas_pagas';

export default function Contas({ faturaOpenId, onClearFaturaOpen }: { faturaOpenId?: string | null, onClearFaturaOpen?: () => void }) {
  const [contas, setContas] = useState<Conta[]>([]);
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [faturas, setFaturas] = useState<Fatura[]>([]);
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [aba, setAba] = useState<Aba>('contas');
  const [modalConta, setModalConta] = useState<Conta | 'nova' | null>(null);
  const [modalCartao, setModalCartao] = useState<Cartao | 'novo' | null>(null);
  const [modalPagarFatura, setModalPagarFatura] = useState<Fatura | null>(null);
  const [modalDetalhesFatura, setModalDetalhesFatura] = useState<Fatura | null>(null);
  const [modalExcluirFatura, setModalExcluirFatura] = useState<Fatura | null>(null);
  const [senhaExclusao, setSenhaExclusao] = useState('');
  const [erroSenha, setErroSenha] = useState('');
  const [confirmarExclusao, setConfirmarExclusao] = useState<{ tipo: 'conta' | 'cartao'; id: string; nome: string } | null>(null);
  const fmt = formatarMoeda;

  const carregar = useCallback(async () => {
    await sincronizarFaturasPendentes();
    const [c, cart, fat, trans] = await Promise.all([getContas(), getCartoes(), getFaturas(), getTransacoes()]);
    setContas(c);
    setCartoes(cart);
    setFaturas(fat);
    setTransacoes(trans);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  useEffect(() => {
    if (faturaOpenId && faturas.length > 0) {
      const target = faturas.find(f => f.id === faturaOpenId);
      if (target) {
        setModalPagarFatura(target); // user wants to pay it directly
      }
      if (onClearFaturaOpen) onClearFaturaOpen();
    }
  }, [faturaOpenId, faturas, onClearFaturaOpen]);


  const contasArray = Array.isArray(contas) ? contas : [];
  const cartoesArray = Array.isArray(cartoes) ? cartoes : [];
  const faturasArray = Array.isArray(faturas) ? faturas : [];

  const saldoTotal = contasArray.filter(c => c && c.ativo && c.tipo !== 'investimento').reduce((s, c) => s + (c.saldo || 0), 0);
  const totalInvestimentos = contasArray.filter(c => c && c.tipo === 'investimento').reduce((s, c) => s + (c.saldo || 0), 0);
  const limiteTotalCartoes = cartoesArray.filter(c => c && c.ativo).reduce((s, c) => s + (c.limite || 0), 0);
  const limiteUsadoCartoes = cartoesArray.filter(c => c && c.ativo).reduce((s, c) => s + ((c.limite || 0) - (c.limiteDisponivel || 0)), 0);
  
  // Total of open / partial invoices
  const faturasAbertas = faturasArray.filter(f => f && (f.status === 'aberta' || f.status === 'parcial'));
  const totalFaturasAbertas = faturasAbertas.reduce((s, f) => {
    const pago = f.pagamentos?.reduce((acc, p) => acc + (p.valor || 0), 0) || 0;
    return s + ((f.valorTotal || 0) - pago);
  }, 0);

  const handleExcluir = async () => {
    if (!confirmarExclusao) return;
    if (confirmarExclusao.tipo === 'conta') await deletarConta(confirmarExclusao.id);
    else await deletarCartao(confirmarExclusao.id);
    setConfirmarExclusao(null);
    carregar();
  };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', paddingBottom: 160 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>Contas & Cartões</h1>
        <button
          onClick={() => {
            if (aba === 'contas') setModalConta('nova');
            else if (aba === 'cartoes') setModalCartao('novo');
          }}
          className="btn-primary"
          style={{ display: aba.startsWith('faturas') ? 'none' : 'inline-flex' }}>
          <PlusCircle size={16} />
          {aba === 'contas' ? 'Nova Conta' : 'Novo Cartão'}
        </button>
      </div>

      {/* Cards resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
        <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 14, padding: '18px 20px' }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Saldo em Contas</p>
          <p style={{ fontSize: 22, fontWeight: 800, color: '#10b981' }}>{fmt(saldoTotal)}</p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{contas.filter(c => c.ativo).length} contas ativas</p>
        </div>
        <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 14, padding: '18px 20px' }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Investimentos</p>
          <p style={{ fontSize: 22, fontWeight: 800, color: '#818cf8' }}>{fmt(totalInvestimentos)}</p>
        </div>
        <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 14, padding: '18px 20px' }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Limite Cartões</p>
          <p style={{ fontSize: 22, fontWeight: 800, color: '#fbbf24' }}>{fmt(limiteTotalCartoes - limiteUsadoCartoes)}</p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>disponível de {fmt(limiteTotalCartoes)}</p>
        </div>
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 14, padding: '18px 20px' }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Faturas a Pagar</p>
          <p style={{ fontSize: 22, fontWeight: 800, color: '#ef4444' }}>{fmt(totalFaturasAbertas)}</p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{faturasAbertas.length} {faturasAbertas.length === 1 ? 'fatura pendente' : 'faturas pendentes'}</p>
        </div>
      </div>

      {/* Abas */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 12, padding: 4, width: 'fit-content', flexWrap: 'wrap' }}>
        {([['contas', '🏦 Contas'], ['cartoes', '💳 Cartões'], ['faturas_pendentes', '📄 Faturas Pendentes'], ['faturas_pagas', '✅ Faturas Pagas']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setAba(id as Aba)}
            style={{
              padding: '8px 20px', borderRadius: 9, cursor: 'pointer', fontSize: 13, fontWeight: 600, border: 'none',
              background: aba === id ? 'rgba(16,185,129,0.15)' : 'transparent',
              color: aba === id ? '#10b981' : 'var(--text-muted)', transition: 'all 0.15s',
            }}>
            {label}
            {id === 'faturas_pendentes' && faturasAbertas.length > 0 && (
              <span style={{ marginLeft: 6, background: '#ef4444', color: 'white', borderRadius: 99, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>{faturasAbertas.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ===== CONTAS ===== */}
      {aba === 'contas' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {contas.filter(c => c.ativo).map(conta => (
            <ContaCard key={conta.id} conta={conta}
              onEditar={() => setModalConta(conta)}
              onDeletar={() => setConfirmarExclusao({ tipo: 'conta', id: conta.id, nome: conta.nome })} />
          ))}
          {contas.filter(c => c.ativo).length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🏦</div>
              <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: 'var(--text-muted)' }}>Nenhuma conta cadastrada</p>
              <button onClick={() => setModalConta('nova')} className="btn-primary" style={{ display: 'inline-flex', margin: '0 auto' }}>
                <PlusCircle size={16} /> Adicionar Conta
              </button>
            </div>
          )}
        </div>
      )}

      {/* ===== CARTÕES ===== */}
      {aba === 'cartoes' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {cartoes.filter(c => c.ativo).map(cartao => (
            <CartaoCard key={cartao.id} cartao={cartao}
              faturasAbertas={faturas.filter(f => f.cartaoId === cartao.id && (f.status === 'aberta' || f.status === 'parcial'))}
              onEditar={() => setModalCartao(cartao)}
              onDeletar={() => setConfirmarExclusao({ tipo: 'cartao', id: cartao.id, nome: cartao.nome })}
              onVerFatura={(f) => setModalDetalhesFatura(f)}
              onPagarFatura={(f) => setModalPagarFatura(f)} />
          ))}
          {cartoes.filter(c => c.ativo).length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>💳</div>
              <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, color: 'var(--text-muted)' }}>Nenhum cartão cadastrado</p>
              <button onClick={() => setModalCartao('novo')} className="btn-primary" style={{ display: 'inline-flex', margin: '0 auto' }}>
                <PlusCircle size={16} /> Adicionar Cartão
              </button>
            </div>
          )}
        </div>
      )}

      {/* ===== FATURAS ===== */}
      {(aba === 'faturas_pendentes' || aba === 'faturas_pagas') && (
        <FaturasTab 
          tipo={aba === 'faturas_pendentes' ? 'pendentes' : 'pagas'}
          faturas={faturas} cartoes={cartoes} transacoes={transacoes}
          onPagarFatura={(f) => setModalPagarFatura(f)}
          onVerDetalhes={(f) => setModalDetalhesFatura(f)} 
          onExcluir={(f) => setModalExcluirFatura(f)}
        />
      )}

      {/* MODAL CONTA */}
      {modalConta && (
        <ModalConta
          contaExistente={modalConta === 'nova' ? undefined : modalConta}
          onClose={() => setModalConta(null)}
          onSalvo={() => { setModalConta(null); carregar(); }}
        />
      )}

      {/* MODAL CARTÃO */}
      {modalCartao && (
        <ModalCartao
          cartaoExistente={modalCartao === 'novo' ? undefined : modalCartao}
          onClose={() => setModalCartao(null)}
          onSalvo={() => { setModalCartao(null); carregar(); }}
        />
      )}

      {/* MODAL PAGAR FATURA */}
      {modalPagarFatura && (
        <ModalPagarFatura
          fatura={modalPagarFatura}
          contas={contas}
          onClose={() => setModalPagarFatura(null)}
          onPago={() => { setModalPagarFatura(null); carregar(); }}
        />
      )}

      {/* MODAL DETALHES FATURA */}
      {modalDetalhesFatura && (
        <ModalDetalhesFatura
          fatura={modalDetalhesFatura}
          transacoes={transacoes.filter(t => t.faturaId === modalDetalhesFatura.id)}
          onClose={() => setModalDetalhesFatura(null)}
          onPagar={() => { setModalDetalhesFatura(null); setModalPagarFatura(modalDetalhesFatura); }}
        />
      )}

      {/* MODAL EXCLUIR FATURA */}
      {modalExcluirFatura && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalExcluirFatura(null)}>
          <div className="modal-box slide-up" style={{ maxWidth: 400, textAlign: 'center', padding: 32 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <AlertTriangle size={28} color="#ef4444" />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
              Excluir Fatura?
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
              Você está excluindo a fatura <strong style={{ color: 'var(--text-primary)' }}>{modalExcluirFatura.mesReferencia}</strong>. Para confirmar esta exclusão manual, digite a senha de segurança:
            </p>
            <input 
              type="password" 
              className="input-field" 
              placeholder="Digite a senha..." 
              value={senhaExclusao} 
              onChange={e => { setSenhaExclusao(e.target.value); setErroSenha(''); }}
              style={{ textAlign: 'center', marginBottom: 6, letterSpacing: '2px', fontSize: 20 }}
            />
            {erroSenha && <p style={{ color: '#ef4444', fontSize: 12, marginBottom: 16 }}>{erroSenha}</p>}
            <div style={{ display: 'flex', gap: 10, marginTop: erroSenha ? 0 : 20 }}>
              <button onClick={() => { setModalExcluirFatura(null); setSenhaExclusao(''); setErroSenha(''); }} className="btn-secondary" style={{ flex: 1 }}>Cancelar</button>
              <button onClick={async () => {
                if (senhaExclusao !== '1020') {
                  setErroSenha('Senha incorreta.');
                  return;
                }
                await deletarFatura(modalExcluirFatura.id);
                setModalExcluirFatura(null);
                setSenhaExclusao('');
                setErroSenha('');
                carregar();
              }} className="btn-danger" style={{ flex: 1, justifyContent: 'center' }}>
                <Trash2 size={15} /> Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAR EXCLUSÃO */}
      {confirmarExclusao && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setConfirmarExclusao(null)}>
          <div className="modal-box slide-up" style={{ maxWidth: 400, textAlign: 'center', padding: 32 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <AlertTriangle size={28} color="#ef4444" />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
              Excluir {confirmarExclusao.tipo === 'conta' ? 'Conta' : 'Cartão'}?
            </h3>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24 }}>
              Tem certeza que deseja excluir <strong style={{ color: 'var(--text-primary)' }}>"{confirmarExclusao.nome}"</strong>? Esta ação não pode ser desfeita.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmarExclusao(null)} className="btn-secondary" style={{ flex: 1 }}>Cancelar</button>
              <button onClick={handleExcluir} className="btn-danger" style={{ flex: 1, justifyContent: 'center' }}>
                <Trash2 size={15} /> Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getCorSaldoLegivel(cor: string | undefined, saldo: number): string {
  if (saldo < 0) return '#ef4444'; // Red for negative balances
  const isDarkColor = !cor || cor === '#1a1a1a' || cor === '#000000' || cor === '#111111' || cor === '#1f2937' || cor.toLowerCase() === 'black';
  if (isDarkColor) {
    return '#10b981'; // Green for dark brand color fallback
  }
  return cor;
}

// ===== CONTA CARD =====
function ContaCard({ conta, onEditar, onDeletar }: { conta: Conta; onEditar: () => void; onDeletar: () => void }) {
  const fmt = formatarMoeda;
  const TIPO_LABELS: Record<string, string> = {
    corrente: 'Conta Corrente', poupanca: 'Poupança', carteira: 'Carteira',
    investimento: 'Investimento', caixa: 'Caixa', pix: 'PIX', outro: 'Outro'
  };
  const corBase = getCorSaldoLegivel(conta.cor, conta.saldo);

  return (
    <div className="relative overflow-hidden group hover:-translate-y-2 transition-all duration-300" style={{
      background: `linear-gradient(135deg, ${corBase}11, ${corBase}05)`,
      backgroundColor: 'var(--bg-card)',
      border: `1px solid ${corBase}33`, 
      borderBottom: `6px solid ${corBase}`, 
      borderRadius: 24, 
      padding: '24px', 
      boxShadow: `0 15px 35px ${corBase}15`
    }}>
      <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500 pointer-events-none">
        <DynamicIcon name={conta.icone || 'Landmark'} size={120} color={corBase} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: `${corBase}22`,
            border: `2px solid ${corBase}44`,
            boxShadow: `0 4px 10px ${corBase}22`,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <DynamicIcon name={conta.icone || 'Landmark'} size={28} color={corBase} />
          </div>
          <div className="z-10 relative">
            <p style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-title)', letterSpacing: '-0.5px' }}>{conta.nome}</p>
            <p style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>{TIPO_LABELS[conta.tipo] || conta.tipo}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, position: 'relative', zIndex: 10 }}>
          <button onClick={onEditar}
            style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, padding: '8px', cursor: 'pointer', color: '#6366f1', transition: 'all 0.2s' }} className="hover:bg-indigo-100 hover:-translate-y-0.5">
            <Edit3 size={16} />
          </button>
          <button onClick={onDeletar}
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '8px', cursor: 'pointer', color: '#ef4444', transition: 'all 0.2s' }} className="hover:bg-rose-100 hover:-translate-y-0.5">
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      
      <div className="z-10 relative mt-6 pt-4" style={{ borderTop: `1px dashed ${corBase}44` }}>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.1em', marginBottom: 2 }}>Saldo atual</p>
        <p style={{ fontSize: 28, fontWeight: 900, color: corBase }}>{fmt(conta.saldo)}</p>
      </div>
    </div>
  );
}

// ===== CARTÃO CARD =====
function CartaoCard({ cartao, faturasAbertas, onEditar, onDeletar, onVerFatura, onPagarFatura }: {
  cartao: Cartao;
  faturasAbertas: Fatura[];
  onEditar: () => void;
  onDeletar: () => void;
  onVerFatura: (f: Fatura) => void;
  onPagarFatura: (f: Fatura) => void;
}) {
  const fmt = formatarMoeda;
  const usado = cartao.limite - cartao.limiteDisponivel;
  const pct = cartao.limite > 0 ? (usado / cartao.limite) * 100 : 0;
  const corPct = pct > 80 ? '#ef4444' : pct > 60 ? '#f59e0b' : '#10b981';

  return (
    <div className="relative overflow-hidden group hover:-translate-y-2 transition-all duration-300" style={{
      background: `linear-gradient(135deg, ${cartao.cor}15, ${cartao.cor}05)`,
      backgroundColor: 'var(--bg-card)',
      border: `1px solid ${cartao.cor}30`, 
      borderBottom: `6px solid ${cartao.cor}`, 
      borderRadius: 24, 
      padding: '24px', 
      boxShadow: `0 15px 35px ${cartao.cor}15`
    }}>
      {/* Decoração */}
      <div style={{ pointerEvents: 'none', position: 'absolute', right: -20, top: -20, width: 120, height: 120, borderRadius: '50%', background: cartao.cor + '10' }} className="group-hover:scale-110 transition-transform duration-700" />
      <div style={{ pointerEvents: 'none', position: 'absolute', right: 40, top: 40, width: 60, height: 60, borderRadius: '50%', background: cartao.cor + '15' }} className="group-hover:-translate-x-4 transition-transform duration-700" />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, position: 'relative', zIndex: 10 }}>
        <div>
          <p style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-title)', letterSpacing: '-0.5px' }}>{cartao.nome}</p>
          <p style={{ fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>{cartao.bandeira}</p>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button onClick={onEditar}
            style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, padding: '8px', cursor: 'pointer', color: '#6366f1', transition: 'all 0.2s' }} className="hover:bg-indigo-100 hover:-translate-y-0.5">
            <Edit3 size={16} />
          </button>
          <button onClick={onDeletar}
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '8px', cursor: 'pointer', color: '#ef4444', transition: 'all 0.2s' }} className="hover:bg-rose-100 hover:-translate-y-0.5">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* REAL CREDIT CARD GRAPHIC */}
      <div className="relative z-10 drop-shadow-xl hover:-translate-y-1 transition-transform duration-300">
        <RealCreditCardImage nome={cartao.nome} bandeira={cartao.bandeira} cor={cartao.cor} height={180} />
      </div>

      <div className="relative z-10 bg-white/60 backdrop-blur-md p-4 rounded-2xl border border-slate-100 mt-6 shadow-sm">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Limite Utilizado</span>
          <span style={{ fontSize: 14, fontWeight: 900, color: corPct }}>{pct.toFixed(0)}%</span>
        </div>
        <div style={{ height: 10, background: 'var(--bg-glass-strong)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: corPct, borderRadius: 10, transition: 'width 1s ease-out' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>Gasto: <strong style={{ color: 'var(--text-title)' }}>{fmt(usado)}</strong></span>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>Livre: <strong style={{ color: '#10b981' }}>{fmt(cartao.limiteDisponivel)}</strong></span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-4 relative z-10">
        {[
          { label: 'Limite', valor: fmt(cartao.limite) },
          { label: 'Fechamento', valor: String(cartao.dataFechamento) },
          { label: 'Vencimento', valor: String(cartao.dataVencimento) },
        ].map((item, i) => (
          <div key={i} className="text-center p-3 bg-slate-50/80 backdrop-blur border border-slate-100 rounded-xl">
            <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.5px', marginBottom: 4 }}>{item.label}</p>
            <p style={{ fontSize: 14, fontWeight: 900, color: 'var(--text-title)' }}>{item.valor}</p>
          </div>
        ))}
      </div>

      {/* Faturas abertas ou parciais */}
      {faturasAbertas.length > 0 && (
        <div className="relative z-10 mt-6 pt-4" style={{ borderTop: `1px dashed ${cartao.cor}44` }}>
          <p style={{ fontSize: 12, fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }} className="flex items-center gap-2">
            <AlertTriangle size={14} /> Faturas Pendentes
          </p>
          {faturasAbertas.slice(0, 2).map(f => {
            const pago = f.pagamentos?.reduce((acc, p) => acc + p.valor, 0) || 0;
            const restante = f.valorTotal - pago;
            return (
              <div key={f.id} className="bg-amber-50/50 border border-amber-100/50 p-3 rounded-xl mb-2 hover:bg-amber-50 transition-colors">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: 14, color: 'var(--text-title)', fontWeight: 800 }}>{f.mesReferencia}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Vence: {(f.dataVencimento || '').split('-').reverse().join('/')}</p>
                      <button onClick={async () => {
                        const nova = window.prompt('Digite a nova data de vencimento (AAAA-MM-DD):', f.dataVencimento || '');
                        if (nova && nova !== f.dataVencimento) {
                          const { atualizarVencimentoFatura } = await import('@/lib/storage');
                          await atualizarVencimentoFatura(f.id, nova);
                          window.location.reload();
                        }
                      }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f59e0b', fontSize: 12 }} title="Editar Vencimento">
                        ✏️
                      </button>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 16, fontWeight: 900, color: '#ef4444' }}>{fmt(restante)}</p>
                    {f.status === 'parcial' && <p style={{ fontSize: 11, color: '#f59e0b', fontWeight: 700 }}>Total: {fmt(f.valorTotal)}</p>}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                  <button onClick={() => onVerFatura(f)} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-xs font-bold transition-colors">
                    <Eye size={14} /> Detalhes
                  </button>
                  <button onClick={() => onPagarFatura(f)} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-emerald-500/20 hover:-translate-y-0.5">
                    <DollarSign size={14} /> Pagar Fatura
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ===== FATURAS TAB =====
function FaturasTab({ tipo, faturas, cartoes, transacoes, onPagarFatura, onVerDetalhes, onExcluir }: {
  tipo: 'pendentes' | 'pagas';
  faturas: Fatura[]; cartoes: Cartao[]; transacoes: Transacao[];
  onPagarFatura: (f: Fatura) => void; onVerDetalhes: (f: Fatura) => void; onExcluir: (f: Fatura) => void;
}) {
  const fmt = formatarMoeda;
  const [filtroCartao, setFiltroCartao] = useState('');

  const faturasFiltradas = faturas
    .filter(f => tipo === 'pendentes' ? (f.status === 'aberta' || f.status === 'parcial' || f.status === 'fechada') : f.status === 'paga')
    .filter(f => !filtroCartao || f.cartaoId === filtroCartao)
    .sort((a, b) => b.mesReferencia.localeCompare(a.mesReferencia));

  return (
    <div>
      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <select className="input-field" style={{ minWidth: 200, maxWidth: 300 }} value={filtroCartao} onChange={e => setFiltroCartao(e.target.value)}>
          <option value="">Todos os Cartões</option>
          {cartoes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
      </div>

      {faturasFiltradas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📄</div>
          <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-muted)' }}>Nenhuma fatura encontrada</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {faturasFiltradas.map(f => {
            const isVencida = (f.status === 'aberta' || f.status === 'parcial') && (f.dataVencimento || '') < new Date().toISOString().split('T')[0];
            const pago = f.pagamentos?.reduce((acc, p) => acc + p.valor, 0) || 0;
            const restante = f.valorTotal - pago;
            
            return (
              <div key={f.id} className="glass" style={{
                padding: '16px 20px', borderLeft: `4px solid ${f.cartaoCor}`,
                background: isVencida ? 'rgba(239,68,68,0.04)' : undefined,
              }}>
                <div className="fatura-card-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: f.cartaoCor + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>💳</div>
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{f.cartaoNome} — {f.mesReferencia}</p>
                      <div style={{ display: 'flex', gap: 12, marginTop: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>📅 Venc: {(f.dataVencimento || '').split('-').reverse().join('/')}</span>
                        {f.status !== 'paga' && (
                          <button onClick={async () => {
                            const nova = window.prompt('Digite a nova data de vencimento (AAAA-MM-DD):', f.dataVencimento || '');
                            if (nova && nova !== f.dataVencimento) {
                              const { atualizarVencimentoFatura } = await import('@/lib/storage');
                              await atualizarVencimentoFatura(f.id, nova);
                              window.location.reload();
                            }
                          }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f59e0b', fontSize: 10 }} title="Editar Vencimento">
                            ✏️
                          </button>
                        )}
                        {f.status === 'paga' && f.pagamentos && f.pagamentos.length > 0 && (
                          <span style={{ fontSize: 11, color: '#10b981' }}>✅ Totalmente Paga</span>
                        )}
                        {f.status === 'parcial' && (
                          <span style={{ fontSize: 11, color: '#f59e0b' }}>⚠️ Faltam {fmt(restante)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="fatura-card-row-right">
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 20, fontWeight: 800, color: f.status === 'paga' ? '#10b981' : '#ef4444' }}>
                        {f.status === 'paga' ? fmt(f.valorTotal) : fmt(restante)}
                      </p>
                      <span className={`badge ${f.status === 'paga' ? 'badge-green' : isVencida ? 'badge-red' : f.status === 'parcial' ? 'badge-yellow' : (f.dataFechamento && f.dataFechamento <= new Date().toISOString().split('T')[0]) ? 'badge-red' : 'badge-gray'}`} style={{ fontSize: 10 }}>
                        {f.status === 'paga' ? '✅ Paga' : isVencida ? '🔴 Vencida' : f.status === 'parcial' ? '⏳ Parcial' : (f.dataFechamento && f.dataFechamento <= new Date().toISOString().split('T')[0]) ? '🔒 Fechada a Pagar' : '⏳ Aberta'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <button onClick={() => onVerDetalhes(f)} className="btn-secondary" style={{ padding: '6px 10px', fontSize: 11, justifyContent: 'center' }}>
                        <Eye size={13} /> Detalhes
                      </button>
                      {f.status !== 'paga' && (
                        <button onClick={() => onPagarFatura(f)} className="btn-primary" style={{ padding: '6px 10px', fontSize: 11, justifyContent: 'center' }}>
                          <DollarSign size={13} /> Pagar
                        </button>
                      )}
                      {f.status === 'paga' && (
                        <button onClick={async () => {
                          const senha = prompt('⚠️ ATENÇÃO: Reabrir uma fatura paga é uma ação crítica usada apenas em últimos casos.\nOs pagamentos registrados serão cancelados e os lançamentos voltarão para o status "A Pagar".\n\nDigite a senha Master para prosseguir:');
                          if (senha !== '3020') {
                            alert('Senha incorreta ou operação cancelada.');
                            return;
                          }
                          if (!confirm('🚨 VOCÊ TEM CERTEZA ABSOLUTA?\n\nEsta ação vai DELETAR os comprovantes de pagamento atrelados a esta fatura e devolvê-la para o status em aberto.\n\nDeseja mesmo reabrir a fatura?')) {
                            return;
                          }
                          const { reabrirFatura } = await import('@/lib/storage');
                          await reabrirFatura(f.id);
                          window.location.reload();
                        }} style={{ padding: '6px 10px', fontSize: 11, background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
                          🔓 Reabrir
                        </button>
                      )}
                      <button onClick={() => onExcluir(f)} className="btn-danger" style={{ padding: '6px 10px', fontSize: 11, background: 'rgba(239,68,68,0.05)', color: '#ef4444', border: 'none', justifyContent: 'center' }}>
                        <Trash2 size={13} /> Excluir
                      </button>
                    </div>
                  </div>
                </div>
                {/* Barra de progresso para fatura parcial */}
                {f.status === 'parcial' && f.valorTotal > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-secondary)', marginBottom: 4 }}>
                      <span>Pago: {fmt(pago)}</span>
                      <span>Total: {fmt(f.valorTotal)}</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${(pago / f.valorTotal) * 100}%`, background: '#f59e0b' }} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

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

// ===== MODAL CONTA =====
function ModalConta({ contaExistente, onClose, onSalvo }: { contaExistente?: Conta; onClose: () => void; onSalvo: () => void }) {
  const editando = !!contaExistente;
  const [form, setForm] = useState({
    nome: contaExistente?.nome || '',
    tipo: contaExistente?.tipo || 'corrente' as Conta['tipo'],
    saldo: contaExistente ? String(Math.round(contaExistente.saldo * 100)) : '',
    banco: contaExistente?.banco || '',
    cor: contaExistente?.cor || '#10b981',
    icone: contaExistente?.icone || 'Landmark',
  });
  const ICONES = ['Landmark', 'CreditCard', 'Wallet', 'PiggyBank', 'TrendingUp', 'Building2', 'Coins', 'CircleDollarSign'];
  const CORES = ['#10b981', '#6366f1', '#820ad1', '#ff6b00', '#ef4444', '#f59e0b', '#06b6d4', '#84cc16', '#005ca9', '#1a1a1a', '#cc092f', '#00bcff'];

  const handleNomeChange = (nome: string) => {
    setForm(f => ({ ...f, nome }));
    const corSugerida = getCorBanco(nome);
    if (corSugerida) setForm(f => ({ ...f, cor: corSugerida }));
  };

  const salvar = async () => {
    if (!form.nome.trim()) return;
    await salvarConta({
      id: contaExistente?.id || gerarIdPublico(),
      nome: form.nome,
      tipo: form.tipo as Conta['tipo'],
      saldo: parseInt(form.saldo || '0', 10) / 100,
      banco: form.banco,
      cor: form.cor,
      icone: form.icone,
      ativo: true,
    });
    onSalvo();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box slide-up">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{editando ? '✏️ Editar Conta' : '🏦 Nova Conta'}</h2>
          <button onClick={onClose} style={{ background: 'var(--border)', border: '1px solid var(--border-hover)', borderRadius: 8, padding: '5px 7px', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={16} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div><label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>Nome *</label>
            <input className="input-field" value={form.nome} onChange={e => handleNomeChange(e.target.value)} placeholder="Ex: Nubank, Itaú..." /></div>
          <div className="grid-responsive-2">
            <div><label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>Tipo</label>
              <select className="input-field" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as Conta['tipo'] }))}>
                {[['corrente', 'Conta Corrente'], ['poupanca', 'Poupança'], ['carteira', 'Carteira'], ['investimento', 'Investimento'], ['caixa', 'Caixa'], ['pix', 'PIX']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select></div>
            <div><label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>Saldo {editando ? 'Atual' : 'Inicial'}</label>
              <input className="input-field" type="text" value={formatarMoedaInput(form.saldo)} onChange={e => setForm(f => ({ ...f, saldo: e.target.value.replace(/\D/g, '') }))} placeholder="R$ 0,00" /></div>
          </div>
          <div><label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>Banco (opcional)</label>
            <input className="input-field" value={form.banco} onChange={e => { setForm(f => ({ ...f, banco: e.target.value })); const c = getCorBanco(e.target.value); if(c) setForm(f => ({ ...f, cor: c })); }} placeholder="Ex: Nubank, Itaú..." /></div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 8 }}>Ícone</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {ICONES.map(ic => (
                <button key={ic} onClick={() => setForm(f => ({ ...f, icone: ic }))}
                  style={{ width: 36, height: 36, borderRadius: 8, cursor: 'pointer', border: `2px solid ${form.icone === ic ? '#10b981' : 'transparent'}`, background: form.icone === ic ? 'rgba(16,185,129,0.1)' : 'var(--bg-glass)', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)' }}>
                  <DynamicIcon name={ic} size={18} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 8 }}>Cor</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {CORES.map(cor => (
                <button key={cor} onClick={() => setForm(f => ({ ...f, cor }))}
                  style={{ width: 28, height: 28, borderRadius: '50%', background: cor, cursor: 'pointer', border: `3px solid ${form.cor === cor ? 'white' : 'transparent'}`, transition: 'all 0.15s' }} />
              ))}
            </div>
          </div>
          <button onClick={salvar} className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
            <Check size={16} /> {editando ? 'Salvar Alterações' : 'Criar Conta'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== MODAL CARTÃO =====
function ModalCartao({ cartaoExistente, onClose, onSalvo }: { cartaoExistente?: Cartao; onClose: () => void; onSalvo: () => void }) {
  const editando = !!cartaoExistente;
  const [form, setForm] = useState({
    nome: cartaoExistente?.nome || '',
    bandeira: cartaoExistente?.bandeira || 'Mastercard',
    limite: cartaoExistente ? String(Math.round(cartaoExistente.limite * 100)) : '',
    limiteDisponivel: cartaoExistente ? String(Math.round(cartaoExistente.limiteDisponivel * 100)) : '',
    melhorDia: cartaoExistente?.melhorDia ? String(cartaoExistente.melhorDia) : '11',
    dataFechamento: cartaoExistente?.dataFechamento ? String(cartaoExistente.dataFechamento) : '18',
    dataVencimento: cartaoExistente?.dataVencimento ? String(cartaoExistente.dataVencimento) : '25',
    cor: cartaoExistente?.cor || '#820ad1',
  });
  const CORES = ['#820ad1', '#ff6b00', '#10b981', '#6366f1', '#ef4444', '#f59e0b', '#1a1a1a', '#005ca9', '#cc092f', '#00bcff', '#ec0000', '#21c25e'];

  const handleNomeChange = (nome: string) => {
    setForm(f => ({ ...f, nome }));
    const corSugerida = getCorBanco(nome);
    if (corSugerida) setForm(f => ({ ...f, cor: corSugerida }));
  };

  const salvar = async () => {
    if (!form.nome.trim() || !form.limite) return;
    const limite = parseInt(form.limite || '0', 10) / 100;
    const novoDisponivel = form.limiteDisponivel ? parseInt(form.limiteDisponivel || '0', 10) / 100 : limite;

    if (editando) {
      const limiteAntigo = cartaoExistente.limite;
      const disponivelAntigo = cartaoExistente.limiteDisponivel;
      
      if (limite !== limiteAntigo || novoDisponivel !== disponivelAntigo) {
        const senha = window.prompt("Atenção: A alteração manual dos limites exige a senha de segurança (1020). Digite a senha para confirmar:");
        if (senha !== "1020") {
          alert("Senha incorreta. Alteração de limite bloqueada.");
          return;
        }

        try {
          const { registrarAuditoria } = await import('@/lib/audit');
          await registrarAuditoria({
            acao: 'ALTERACAO_LIMITE_CARTAO',
            categoria: 'financeiro',
            detalhes: `Limite do cartão "${form.nome}" alterado manualmente. Limite: ${limiteAntigo} -> ${limite}. Disponível: ${disponivelAntigo} -> ${novoDisponivel}.`,
            resultado: 'SUCESSO'
          });
        } catch (e) { console.error("Erro ao registrar auditoria", e); }
      }
    }

    await salvarCartao({
      id: cartaoExistente?.id || gerarIdPublico(),
      nome: form.nome,
      bandeira: form.bandeira,
      limite,
      limiteDisponivel: novoDisponivel,
      melhorDia: parseInt(form.melhorDia || '11', 10) || 11,
      dataFechamento: parseInt(form.dataFechamento || '18', 10) || 18,
      dataVencimento: parseInt(form.dataVencimento || '25', 10) || 25,
      cor: form.cor,
      ativo: true,
    });
    onSalvo();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box slide-up">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{editando ? '✏️ Editar Cartão' : '💳 Novo Cartão'}</h2>
          <button onClick={onClose} style={{ background: 'var(--border)', border: '1px solid var(--border-hover)', borderRadius: 8, padding: '5px 7px', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={16} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="grid-responsive-2">
            <div><label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>Nome do Cartão *</label>
              <input className="input-field" value={form.nome} onChange={e => handleNomeChange(e.target.value)} placeholder="Ex: Nubank" /></div>
            <div><label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>Bandeira</label>
              <select className="input-field" value={form.bandeira} onChange={e => setForm(f => ({ ...f, bandeira: e.target.value }))}>
                {['Mastercard', 'Visa', 'Elo', 'American Express', 'Hipercard'].map(b => <option key={b} value={b}>{b}</option>)}
              </select></div>
          </div>
          <div className="grid-responsive-2">
            <div><label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>Limite Total *</label>
              <input className="input-field" type="text" value={formatarMoedaInput(form.limite)} onChange={e => setForm(f => ({ ...f, limite: e.target.value.replace(/\D/g, '') }))} placeholder="R$ 0,00" /></div>
            <div><label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>Limite Disponível</label>
              <input className="input-field" type="text" value={formatarMoedaInput(form.limiteDisponivel)} onChange={e => setForm(f => ({ ...f, limiteDisponivel: e.target.value.replace(/\D/g, '') }))} placeholder="R$ 0,00" /></div>
          </div>
          <div className="grid-responsive-3">
            {[['melhorDia', 'Melhor Dia'], ['dataFechamento', 'Dia Fechamento'], ['dataVencimento', 'Dia Vencimento']].map(([k, l]) => (
              <div key={k}><label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>{l}</label>
                <input className="input-field" type="number" min="1" max="31" value={form[k as keyof typeof form]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} /></div>
            ))}
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 8 }}>Cor do Cartão</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {CORES.map(cor => (
                <button key={cor} onClick={() => setForm(f => ({ ...f, cor }))}
                  style={{ width: 30, height: 30, borderRadius: '50%', background: cor, cursor: 'pointer', border: `3px solid ${form.cor === cor ? 'white' : 'transparent'}`, transition: 'all 0.15s' }} />
              ))}
            </div>
          </div>
          {/* Preview cartão */}
          <div style={{
            background: `linear-gradient(135deg, ${form.cor}50, ${form.cor}20)`,
            borderRadius: 14, padding: '16px 20px', position: 'relative', overflow: 'hidden', border: `1px solid ${form.cor}60`,
          }}>
            <div style={{ position: 'absolute', right: -10, top: -10, width: 60, height: 60, borderRadius: '50%', background: form.cor + '30' }} />
            <p style={{ fontSize: 16, fontWeight: 800, color: 'white' }}>{form.nome || 'Nome do Cartão'}</p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>{form.bandeira} • Limite: R$ {form.limite || '0'}</p>
            <div style={{ marginTop: 8, fontSize: 20 }}>💳</div>
          </div>
          <button onClick={salvar} className="btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
            <Check size={16} /> {editando ? 'Salvar Alterações' : 'Criar Cartão'}
          </button>
        </div>
      </div>
    </div>
  );
}
