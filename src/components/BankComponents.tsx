'use client';

import React from 'react';
import { DynamicIcon } from '@/components/DynamicIcon';
import { ArrowUpCircle, ArrowDownCircle, CheckCircle2 } from 'lucide-react';
import { formatarMoeda } from '@/lib/storage';

const fmt = formatarMoeda;

/* ════════════════════════════════════════════════════════════════
   NEW ENTERPRISE BANKING JSX COMPONENTS (CSS GRID 3-COLUMN LAYOUT)
   Architecture: [ COL 1: Icon (auto) | COL 2: Info (1fr) | COL 3: Value (auto) ]
   ════════════════════════════════════════════════════════════════ */

/**
 * 1. TRANSACTION ITEM
 * Lado esquerdo: Ícone + Descrição + Data/Categoria
 * Lado direito: Valor com sinal (+ / −) e cor apropriada (Verde/Vermelho)
 */
export function TransactionItem({ t }: { t: any }) {
  const isCredito = t.tipo === 'receita';
  const corValor = isCredito ? '#15803d' : '#8b0000';

  return (
    <div className="bank-grid-row">
      {/* COL 1: ÍCONE */}
      <div className="bank-grid-col-icon" style={{ background: isCredito ? 'rgba(21,128,61,0.12)' : 'rgba(139,0,0,0.12)' }}>
        {isCredito ? <ArrowUpCircle size={18} color="#15803d" /> : <ArrowDownCircle size={18} color="#8b0000" />}
      </div>

      {/* COL 2: INFORMAÇÕES (1FR TRUNCADO) */}
      <div className="bank-grid-col-info">
        <p className="bank-grid-title">{t.descricao}</p>
        <p className="bank-grid-sub">{(t.data || '').split('-').reverse().join('/')} • {t.categoriaNome || 'Lançamento'}</p>
      </div>

      {/* COL 3: VALORES (AUTO - NUNCA ENCOLHE) */}
      <div className="bank-grid-col-value">
        <span className="bank-grid-amount" style={{ color: corValor }}>
          {isCredito ? '+' : '−'}{fmt(t.valor)}
        </span>
      </div>
    </div>
  );
}

/**
 * 2. PAYABLE ITEM (CONTAS A PAGAR)
 * Lado esquerdo: Ícone + Título/Fornecedor + Data de Vencimento
 * Lado direito: Valor total + Botão Pagar Fatura (se fatura)
 */
export function PayableItem({ item, onPagarFatura }: { item: any; onPagarFatura?: (f: any) => void }) {
  return (
    <div className="bank-grid-row">
      {/* COL 1: ÍCONE */}
      <div className="bank-grid-col-icon" style={{ background: 'rgba(204,0,0,0.1)' }}>
        <DynamicIcon name={item.icone || 'Package'} size={18} color="#cc0000" />
      </div>

      {/* COL 2: INFORMAÇÕES (1FR TRUNCADO) */}
      <div className="bank-grid-col-info">
        <p className="bank-grid-title">{item.titulo}</p>
        <p className="bank-grid-sub">Vence {(item.data || '').split('-').reverse().join('/')}</p>
      </div>

      {/* COL 3: VALORES (AUTO - NUNCA ENCOLHE) */}
      <div className="bank-grid-col-value">
        <span className="bank-grid-amount" style={{ color: '#8b0000' }}>
          {fmt(item.valor)}
        </span>
        {item.tipo === 'fatura' && item.faturaOriginal && onPagarFatura && (
          <button
            onClick={() => onPagarFatura(item.faturaOriginal)}
            style={{
              background: 'none', border: 'none', color: '#0284c7',
              fontSize: 10, fontWeight: 700, cursor: 'pointer', marginTop: 1, padding: 0
            }}>
            Pagar Fatura
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * 3. ACCOUNT ITEM (MINHAS CONTAS)
 * Exibe TODAS as contas sem ocultar nenhuma.
 * Lado esquerdo: Ícone + Nome da Conta + Tipo
 * Lado direito: Saldo completo
 */
export function AccountItem({ c }: { c: any }) {
  const corSaldo = c.saldo >= 0 ? '#15803d' : '#8b0000';
  return (
    <div className="bank-grid-row">
      {/* COL 1: ÍCONE */}
      <div
        className="bank-grid-col-icon"
        style={{
          background: c.cor ? `${c.cor}22` : 'rgba(2,132,199,0.12)',
          border: `1px solid ${c.cor || '#0284c7'}44`
        }}>
        <DynamicIcon name={c.icone || 'Wallet'} size={18} color={c.cor || '#0284c7'} />
      </div>

      {/* COL 2: INFORMAÇÕES (1FR TRUNCADO) */}
      <div className="bank-grid-col-info">
        <p className="bank-grid-title">{c.nome}</p>
        <p className="bank-grid-sub" style={{ textTransform: 'capitalize' }}>{c.tipo}</p>
      </div>

      {/* COL 3: VALORES (AUTO - NUNCA ENCOLHE) */}
      <div className="bank-grid-col-value">
        <span className="bank-grid-amount" style={{ color: corSaldo }}>
          {fmt(c.saldo)}
        </span>
      </div>
    </div>
  );
}

/**
 * 4. KPI BANK CARD
 * Card de resumo de topo responsivo
 */
export function KpiCard({ titulo, valor, subtitulo, icone, sparklinePath, corLine, corValor }: any) {
  return (
    <div className="glass glass-hover" style={{ padding: '16px 14px', boxSizing: 'border-box', width: '100%' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
        <div style={{ minWidth: 0 }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
            {titulo}
          </span>
          <p style={{ fontSize: 'clamp(16px, 4.2vw, 22px)', fontWeight: 800, color: corValor || corLine || 'var(--text-primary)', marginTop: 2, whiteSpace: 'nowrap' }}>
            {valor}
          </p>
        </div>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bg-primary)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {icone}
        </div>
      </div>
      <p style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {subtitulo}
      </p>

      {/* MINI GRAPH */}
      <svg viewBox="0 0 100 24" style={{ width: '100%', height: 22, marginTop: 8 }}>
        <path d={sparklinePath} fill="none" stroke={corLine} strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}
