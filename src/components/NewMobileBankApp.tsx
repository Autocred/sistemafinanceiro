'use client';

import React, { useState } from 'react';
import { DynamicIcon } from '@/components/DynamicIcon';
import {
  ArrowUpCircle, ArrowDownCircle, CheckCircle2, Clock, Zap, Building2,
  Wallet, TrendingUp, TrendingDown, CreditCard as CreditCardIcon, Activity,
  PlusCircle, Bell, DollarSign, LogOut
, Eye, EyeOff} from 'lucide-react';
import { formatarMoeda } from '@/lib/storage';
import { NotificationCenter } from '@/components/NotificationCenter';

const fmt = formatarMoeda;

/* ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½
   NEW MOBILE-FIRST ENTERPRISE BANKING JSX COMPONENT SUITE
   Strict 3-Column CSS Grid Architecture: [ 56px | 1fr | auto ]
   ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ï¿½"ï¿½ */

/**
 * 1. DASHBOARD HEADER (CABEï¿½!ALHO NUBANK / INTER ENERGETIC RED)
 * Canto Esquerdo: Logo + Nome ("FinPessoal")
 * Canto Direito: Sinão + Nome ("Olá, Clovis") + Botão Sair / Logoff
 */
export function DashboardHeader({ cfg, userProfile, dataAcesso, onLogout }: { cfg: any; userProfile: any; dataAcesso: string; onLogout?: () => void }) {
  const [isPrivacy, setIsPrivacy] = React.useState(false);
  React.useEffect(() => {
    // sync state if re-rendered
    setIsPrivacy(document.body.classList.contains('modo-privacidade'));
  }, []);
  const togglePrivacy = () => { 
    setIsPrivacy(!isPrivacy); 
    document.body.classList.toggle('modo-privacidade'); 
  };
  return (
    <header className="bank-app-header">
      <div className="bank-header-left">
        <div className="bank-header-logo-box">
          {cfg?.fotoPerfil || userProfile?.avatar || userProfile?.fotoPerfil ? (
            <img src={cfg?.fotoPerfil || userProfile?.avatar || userProfile?.fotoPerfil} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
          ) : (
            <img src="/icon.png?v=10" alt="Logo ERP Pro" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '50%' }} />
          )}
        </div>
        <span className="bank-header-app-title">
          {cfg?.nomeSistema || (userProfile?.nome && userProfile.nome !== 'Usuário' ? userProfile.nome : 'FinPessoal')}
        </span>
      </div>

      <div className="bank-header-right" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {typeof window !== 'undefined' && localStorage.getItem('impersonate_user') === 'true' && (
          <button
            onClick={() => {
              localStorage.removeItem('impersonate_user');
              localStorage.removeItem('impersonate_tenantId');
              window.location.href = '/master/licencas';
            }}
            title="Voltar ao Painel Master"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: '#ef4444',
              border: '1px solid #dc2626',
              color: '#ffffff',
              padding: '6px 12px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease-in-out',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#dc2626'}
            onMouseLeave={e => e.currentTarget.style.background = '#ef4444'}
          >
            Voltar ao Master
          </button>
        )}
        <NotificationCenter userId={userProfile?.uid || ''} />
        <div className="bank-header-user-badge">
          <span className="bank-header-user-name">
            Olá, {(userProfile?.nome && userProfile.nome !== 'Usuário') ? userProfile.nome.split(' ')[0] : (cfg?.nomeUsuario && cfg.nomeUsuario !== 'Usuário' ? cfg.nomeUsuario.split(' ')[0] : 'Usuário')}
          </span>
          <span className="bank-header-user-date">
            Acesso: {new Date().toLocaleDateString('pt-BR')} - {new Date().getHours().toString().padStart(2, '0')}h{new Date().getMinutes().toString().padStart(2, '0')}
          </span>
        </div>
        
<button onClick={togglePrivacy} title="Modo Privacidade" style={{
  background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '6px 10px', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.2s'
}}>
  {isPrivacy ? <EyeOff size={18} /> : <Eye size={18} />}
</button>
{onLogout && (
          <button
            onClick={onLogout}
            title="Sair do Sistema (Fazer Logoff)"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.35)',
              color: '#ffffff',
              padding: '6px 12px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease-in-out',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.35)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
          >
            <LogOut size={15} color="#ffffff" />
            <span>Sair</span>
          </button>
        )}
      </div>
    </header>
  );
}

/**
 * 2. DASHBOARD INDICATORS (KPI CARDS EM GRID RESPONSIVO)
 */
export function DashboardIndicators({
  saldoDisponivel,
  totalReceitas,
  totalDespesas,
  totalCartao,
  transacoes = [],
  faturasPendentes = [],
  onNavigateToLancamentos,
  onNavigateToCartoes
}: any) {
  const hojeStr = new Date().toISOString().split('T')[0];
  const hojeDate = new Date(hojeStr);

  const pendentes = (transacoes || []).filter((t: any) => t.status !== 'pago');

  const vencendoHoje = pendentes.filter((t: any) => {
    const dt = t.dataVencimento || t.data;
    return dt === hojeStr;
  });

  const vencendoAte2Dias = pendentes.filter((t: any) => {
    const dt = t.dataVencimento || t.data;
    if (!dt || dt <= hojeStr) return false;
    const diffMs = new Date(dt).getTime() - hojeDate.getTime();
    const diffDias = diffMs / (1000 * 60 * 60 * 24);
    return diffDias <= 2;
  });

  const vencendo1Semana = pendentes.filter((t: any) => {
    const dt = t.dataVencimento || t.data;
    if (!dt || dt <= hojeStr) return false;
    const diffMs = new Date(dt).getTime() - hojeDate.getTime();
    const diffDias = diffMs / (1000 * 60 * 60 * 24);
    return diffDias <= 7;
  });

  const atrasadas = pendentes.filter((t: any) => {
    const dt = t.dataVencimento || t.data;
    return dt < hojeStr;
  });

  const valHoje = vencendoHoje.reduce((acc: number, c: any) => acc + c.valor, 0);
  const val2Dias = vencendoAte2Dias.reduce((acc: number, c: any) => acc + c.valor, 0);
  const val1Semana = vencendo1Semana.reduce((acc: number, c: any) => acc + c.valor, 0);
  const valAtrasadas = atrasadas.reduce((acc: number, c: any) => acc + c.valor, 0);

  return (
    <div className="bank-kpi-grid" style={{ marginBottom: 20 }}>
      {/* 1. Saldo Disponível */}
      <div className="bank-kpi-card">
        <div className="bank-kpi-header">
          <span className="bank-kpi-label">Saldo Disponível</span>
          <div className="bank-kpi-icon-box">
            <Wallet size={18} color={saldoDisponivel >= 0 ? "#10b981" : "#ef4444"} />
          </div>
        </div>
        <div className="bank-kpi-value" style={{ color: saldoDisponivel >= 0 ? "#10b981" : "#ef4444" }}>
          {fmt(saldoDisponivel)}
        </div>
        <span className="bank-kpi-sub">Em contas correntes/digitais</span>
      </div>

      {/* 2. Receitas do Mês */}
      <div className="bank-kpi-card">
        <div className="bank-kpi-header">
          <span className="bank-kpi-label">Receitas do Mês</span>
          <div className="bank-kpi-icon-box">
            <TrendingUp size={18} color="#10b981" />
          </div>
        </div>
        <div className="bank-kpi-value" style={{ color: '#10b981' }}>
          {fmt(totalReceitas)}
        </div>
        <span className="bank-kpi-sub">{transacoes.filter((t: any) => t.tipo === 'receita').length} créditos confirmados</span>
      </div>

      {/* 3. Despesas do Mês */}
      <div className="bank-kpi-card">
        <div className="bank-kpi-header">
          <span className="bank-kpi-label">Despesas do Mês</span>
          <div className="bank-kpi-icon-box">
            <TrendingDown size={18} color="#ef4444" />
          </div>
        </div>
        <div className="bank-kpi-value" style={{ color: '#ef4444' }}>
          {fmt(totalDespesas)}
        </div>
        <span className="bank-kpi-sub">Pagas em débito/PIX</span>
      </div>

      {/* 4. Faturas em Aberto */}
      <div 
        className="bank-kpi-card hover-lift"
        onClick={() => onNavigateToCartoes && onNavigateToCartoes()}
        style={{ cursor: onNavigateToCartoes ? 'pointer' : 'default' }}
      >
        <div className="bank-kpi-header">
          <span className="bank-kpi-label">Faturas em Aberto</span>
          <div className="bank-kpi-icon-box">
            <CreditCardIcon size={18} color="#f59e0b" />
          </div>
        </div>
        <div className="bank-kpi-value" style={{ color: '#f59e0b' }}>
          {fmt(totalCartao)}
        </div>
        <span className="bank-kpi-sub">{faturasPendentes.length} faturas a vencer - Clique para pagar</span>
      </div>

      {/* 5. VENCE HOJE (PISCANTE & CLICÃVEL) */}
      <div
        className={`bank-kpi-card ${vencendoHoje.length > 0 ? 'indicator-blinking' : ''}`}
        onClick={() => onNavigateToLancamentos && onNavigateToLancamentos('hoje')}
        style={{
          cursor: 'pointer',
          border: vencendoHoje.length > 0 ? '2px solid #f59e0b' : '1px solid var(--border)',
          background: vencendoHoje.length > 0 ? 'rgba(245,158,11,0.1)' : 'var(--bg-card)'
        }}
      >
        <div className="bank-kpi-header">
          <span className={`bank-kpi-label ${vencendoHoje.length > 0 ? 'text-blinking' : ''}`} style={{ color: '#f59e0b', fontWeight: 900 }}>ï¿½aï¿½ VENCE HOJE</span>
          <div className="bank-kpi-icon-box" style={{ background: 'rgba(245,158,11,0.2)', color: '#f59e0b' }}>
            <Zap size={18} />
          </div>
        </div>
        <div className={`bank-kpi-value ${vencendoHoje.length > 0 ? 'text-blinking' : ''}`} style={{ color: '#f59e0b' }}>
          {fmt(valHoje)}
        </div>
        <span className="bank-kpi-sub" style={{ fontWeight: 700, color: vencendoHoje.length > 0 ? '#f59e0b' : 'var(--text-muted)' }}>
          {vencendoHoje.length} conta(s) • Clique para ver
        </span>
      </div>

      {/* 6. VENCE A MENOS DE 2 DIAS (CLICÃVEL) */}
      <div
        className="bank-kpi-card"
        onClick={() => onNavigateToLancamentos && onNavigateToLancamentos('2dias')}
        style={{ cursor: 'pointer' }}
      >
        <div className="bank-kpi-header">
          <span className="bank-kpi-label">â³ Vence em até 2 Dias</span>
          <div className="bank-kpi-icon-box">
            <Clock size={18} color="#eab308" />
          </div>
        </div>
        <div className="bank-kpi-value" style={{ color: '#eab308' }}>
          {fmt(val2Dias)}
        </div>
        <span className="bank-kpi-sub">{vencendoAte2Dias.length} conta(s) a vencer curto prazo</span>
      </div>

      {/* 7. VENCE EM 1 SEMANA (CLICÃVEL) */}
      <div
        className="bank-kpi-card"
        onClick={() => onNavigateToLancamentos && onNavigateToLancamentos('semana')}
        style={{ cursor: 'pointer' }}
      >
        <div className="bank-kpi-header">
          <span className="bank-kpi-label">ï¿½x& Vence em 1 Semana</span>
          <div className="bank-kpi-icon-box">
            <Activity size={18} color="#3b82f6" />
          </div>
        </div>
        <div className="bank-kpi-value" style={{ color: '#3b82f6' }}>
          {fmt(val1Semana)}
        </div>
        <span className="bank-kpi-sub">{vencendo1Semana.length} conta(s) nãos próximos 7 dias</span>
      </div>

      {/* 8. EM ATRASO (CLICÃVEL) */}
      <div
        className="bank-kpi-card"
        onClick={() => onNavigateToLancamentos && onNavigateToLancamentos('atrasado')}
        style={{
          cursor: 'pointer',
          border: atrasadas.length > 0 ? '1px solid rgba(239,68,68,0.4)' : '1px solid var(--border)',
          background: atrasadas.length > 0 ? 'rgba(239,68,68,0.04)' : 'var(--bg-card)'
        }}
      >
        <div className="bank-kpi-header">
          <span className="bank-kpi-label" style={{ color: atrasadas.length > 0 ? '#ef4444' : 'var(--text-muted)' }}>
            ï¿½xaï¿½ Em Atraso
          </span>
          <div className="bank-kpi-icon-box" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
            <TrendingDown size={18} />
          </div>
        </div>
        <div className="bank-kpi-value" style={{ color: '#ef4444' }}>
          {fmt(valAtrasadas)}
        </div>
        <span className="bank-kpi-sub" style={{ color: atrasadas.length > 0 ? '#ef4444' : 'var(--text-muted)', fontWeight: 600 }}>
          {atrasadas.length} conta(s) com atraso
        </span>
      </div>
    </div>
  );
}

/**
 * 3. BILL CARD (CONTAS A PAGAR)
 * CSS Grid: 56px 1fr auto
 */
export function BillCard({ item, onPagarFatura }: { item: any; onPagarFatura?: (f: any) => void }) {
  return (
    <div className="bank-card-grid">
      {/* COLUNA 1: 56PX FIXOS */}
      <div className="bank-col-1-icon" style={{ background: 'rgba(204,0,0,0.1)' }}>
        <DynamicIcon name={item.icone || 'Package'} size={20} color="#cc0000" />
      </div>

      {/* COLUNA 2: 1FR INFORMACï¿½"ES (TRUNCA COM ELLIPSIS) */}
      <div className="bank-col-2-info">
        <h4 className="bank-info-title">{item.titulo}</h4>
        <span className="bank-info-sub">Vence {(item.data || '').split('-').reverse().join('/')}</span>
      </div>

      {/* COLUNA 3: AUTO VALORES (NUNCA ENCOLHE, NUNCA CORTA) */}
      <div className="bank-col-3-value">
        <span className="bank-value-amount" style={{ color: '#ef4444' }}>
          {fmt(item.valor)}
        </span>
        {item.tipo === 'fatura' && item.faturaOriginal && onPagarFatura && (
          <button onClick={() => onPagarFatura(item.faturaOriginal)} className="bank-action-link">
            Pagar Fatura
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * 4. TRANSACTION CARD (ï¿½aLTIMAS TRANSAï¿½!ï¿½"ES)
 * CSS Grid: 56px 1fr auto
 */
export function TransactionCard({ t }: { t: any }) {
  const isCredito = t.tipo === 'receita';
  const corValor = isCredito ? '#10b981' : '#ef4444';

  return (
    <div className="bank-card-grid">
      {/* COLUNA 1: 56PX FIXOS */}
      <div className="bank-col-1-icon" style={{ background: isCredito ? 'rgba(21,128,61,0.12)' : 'rgba(139,0,0,0.12)' }}>
        {isCredito ? <ArrowUpCircle size={20} color="#10b981" /> : <ArrowDownCircle size={20} color="#ef4444" />}
      </div>

      {/* COLUNA 2: 1FR INFORMAï¿½!ï¿½"ES (TRUNCA COM ELLIPSIS) */}
      <div className="bank-col-2-info">
        <h4 className="bank-info-title">{t.descricao}</h4>
        <span className="bank-info-sub">
          {(t.dataPagamento || t.data || '').split('-').reverse().join('/')} • {t.categoriaNome || 'Geral'}
        </span>
      </div>

      {/* COLUNA 3: AUTO VALORES (NUNCA ENCOLHE, NUNCA CORTA) */}
      <div className="bank-col-3-value">
        <span className="bank-value-amount" style={{ color: corValor }}>
          {isCredito ? '+' : 'ï¿½ï¿½'}{fmt(t.valor)}
        </span>
      </div>
    </div>
  );
}

/**
 * 5. ACCOUNT CARD (MINHAS CONTAS)
 * CSS Grid: 56px 1fr auto
 * EXIBE TODAS AS CONTAS SEM NENHUMA RESTRIï¿½!ÃO
 */
export function AccountCard({ c }: { c: any }) {
  const isDarkColor = !c.cor || c.cor === '#1a1a1a' || c.cor === '#000000' || c.cor === '#111111' || c.cor === '#1f2937';
  const corBase = isDarkColor ? '#10b981' : c.cor;
  const corSaldo = c.saldo >= 0 ? corBase : '#ef4444';
  return (
    <div className="bank-card-grid">
      {/* COLUNA 1: 56PX FIXOS */}
      <div
        className="bank-col-1-icon"
        style={{
          background: `${corBase}22`,
          border: `1px solid ${corBase}44`
        }}>
        <DynamicIcon name={c.icone || 'Wallet'} size={20} color={corBase} />
      </div>

      {/* COLUNA 2: 1FR INFORMAï¿½!ï¿½"ES (TRUNCA COM ELLIPSIS) */}
      <div className="bank-col-2-info">
        <h4 className="bank-info-title">{c.nome}</h4>
        <span className="bank-info-sub" style={{ textTransform: 'capitalize' }}>{c.tipo}</span>
      </div>

      {/* COLUNA 3: AUTO VALORES (NUNCA ENCOLHE, NUNCA CORTA) */}
      <div className="bank-col-3-value">
        <span className="bank-value-amount" style={{ color: corSaldo }}>
          {fmt(c.saldo)}
        </span>
      </div>
    </div>
  );
}

