'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell, Check, Trash2, AlertCircle, Clock, CheckCircle2, ShieldAlert,
  ArrowDownLeft, ArrowUpRight, Zap, ExternalLink, Loader2
} from 'lucide-react';
import { NotificacaoApp, Transacao } from '@/lib/types';
import { getDb } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { getTenantId, formatarMoeda } from '@/lib/storage';
import { playSound } from '@/lib/audio';

export function NotificationCenter({
  userId,
  tenantId
}: {
  userId: string;
  tenantId?: string | null;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [notificacoes, setNotificacoes] = useState<NotificacaoApp[]>([]);
  const [contasPendentes, setContasPendentes] = useState<Transacao[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [baixandoId, setBaixandoId] = useState<string | null>(null);

  // Resolver tenantId
  const resolverTenant = useCallback((): string => {
    if (tenantId && tenantId !== 'master') return tenantId;
    if (typeof window !== 'undefined') {
      const savedTenant = localStorage.getItem('last_logged_tenantId') || localStorage.getItem('suporte_impersonate_tenant');
      if (savedTenant && savedTenant !== 'master') return savedTenant;
      try {
        const sess = sessionStorage.getItem('active_session_profile');
        if (sess) {
          const p = JSON.parse(sess);
          if (p?.tenantId && p.tenantId !== 'master') return p.tenantId;
        }
      } catch {}
    }
    const tid = getTenantId();
    if (tid && tid !== 'master') return tid;
    return 'autocred-promotora-de-credito';
  }, [tenantId]);

  // Data atual local
  const getHojeStr = useCallback(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dia}`;
  }, []);

  // 1. Escutar notificações de sistema
  useEffect(() => {
    if (!userId) return;
    const q = query(
      collection(getDb(), 'users', userId, 'notificacoes'),
      orderBy('criadoEm', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as NotificacaoApp));
      setNotificacoes(notifs);
    });
    return () => unsubscribe();
  }, [userId]);

  // 2. Escutar em tempo real contas a pagar e a receber do dia/atrasadas do tenant
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const tid = resolverTenant();
    const colPath = (!tid || tid === 'master' || tid === '9yxuafoC0AV9BrIKem05ponbmgn2')
      ? 'transacoes'
      : `tenants/${tid}/transacoes`;

    const q = query(collection(getDb(), colPath));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const hojeStr = getHojeStr();
      const todas = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Transacao));

      const pendentes = todas.filter(t => {
        if (t.status === 'pago') return false;
        const dtVenc = t.dataVencimento || t.data;
        if (!dtVenc) return false;
        return dtVenc <= hojeStr;
      });

      pendentes.sort((a, b) => {
        const dtA = a.dataVencimento || a.data || '';
        const dtB = b.dataVencimento || b.data || '';
        return dtA.localeCompare(dtB);
      });

      setContasPendentes(pendentes);
    }, (err) => {
      console.warn('[NOTIF CENTER TRANSACOES ERROR]', err);
    });

    return () => unsubscribe();
  }, [resolverTenant, getHojeStr]);

  // 3. Atualizar total não lido
  useEffect(() => {
    const notifsNaoLidas = notificacoes.filter(n => !n.lida).length;
    setUnreadCount(notifsNaoLidas + contasPendentes.length);
  }, [notificacoes, contasPendentes]);

  // Baixa Rápida a partir do Sininho
  const handleBaixarConta = async (transacao: Transacao) => {
    try {
      setBaixandoId(transacao.id);
      const hojeStr = getHojeStr();
      const tid = resolverTenant();
      const colPath = (!tid || tid === 'master' || tid === '9yxuafoC0AV9BrIKem05ponbmgn2')
        ? 'transacoes'
        : `tenants/${tid}/transacoes`;

      await updateDoc(doc(getDb(), colPath, transacao.id), {
        status: 'pago',
        dataPagamento: hojeStr
      });

      playSound(transacao.tipo === 'receita' ? 'recebimento' : 'pagamento');
    } catch (e) {
      console.error('[ERRO AO BAIXAR CONTA DO SINO]', e);
    } finally {
      setBaixandoId(null);
    }
  };

  const markAsRead = async (id: string) => {
    const ref = doc(getDb(), 'users', userId, 'notificacoes', id);
    await updateDoc(ref, { lida: true });
  };

  const markAllAsRead = async () => {
    const batch = writeBatch(getDb());
    notificacoes.filter(n => !n.lida).forEach(n => {
      batch.update(doc(getDb(), 'users', userId, 'notificacoes', n.id), { lida: true });
    });
    await batch.commit();
  };

  const deleteNotification = async (id: string) => {
    await deleteDoc(doc(getDb(), 'users', userId, 'notificacoes', id));
  };

  const handleAbrirPopupCompleto = () => {
    setIsOpen(false);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('abrir-popup-lembrete'));
    }
  };

  const getIcon = (tipo: string, prioridade: string) => {
    if (tipo === 'vencimento') return <Clock size={16} color={prioridade === 'urgente' ? '#ef4444' : '#f59e0b'} />;
    if (tipo === 'atraso') return <AlertCircle size={16} color="#ef4444" />;
    if (tipo === 'sistema') return <ShieldAlert size={16} color="#3b82f6" />;
    return <CheckCircle2 size={16} color="#10b981" />;
  };

  const hojeStr = getHojeStr();

  return (
    <div style={{ position: 'relative' }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          background: 'transparent', border: 'none', color: 'white', 
          cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center'
        }}
        title="Notificações e Avisos de Contas"
      >
        <Bell size={20} className={unreadCount > 0 ? "bell-ringing" : ""} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: -5, right: -5, background: '#ef4444', 
            color: 'white', fontSize: 10, fontWeight: 900, 
            borderRadius: '50%', padding: '2px 5px', minWidth: 18, textAlign: 'center',
            boxShadow: '0 0 8px rgba(239, 68, 68, 0.8)',
            animation: 'pulse 1.5s infinite'
          }}>
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={() => setIsOpen(false)} />
          <div className="glass" style={{
            position: 'absolute', top: 35, right: -10, width: '90vw', maxWidth: 400, maxHeight: 520, 
            zIndex: 100, display: 'flex', flexDirection: 'column', 
            borderRadius: 16, overflow: 'hidden', boxShadow: '0 15px 40px rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'var(--bg-card, #1e293b)'
          }}>
            <div style={{
              padding: '14px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(0,0,0,0.2)'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#ffffff' }}>Central de Notificações</h3>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>
                  {contasPendentes.length > 0 ? `${contasPendentes.length} conta(s) pendente(s) hoje` : 'Nenhuma conta pendente'}
                </span>
              </div>
              {contasPendentes.length > 0 && (
                <button
                  onClick={handleAbrirPopupCompleto}
                  style={{
                    background: 'rgba(2, 132, 199, 0.2)',
                    border: '1px solid #0284c7',
                    color: '#38bdf8',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '4px 8px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                  title="Abrir popup completo de baixa geral"
                >
                  <ExternalLink size={12} /> Ver Popup
                </button>
              )}
            </div>
            
            <div style={{ overflowY: 'auto', flex: 1, maxHeight: 420, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* SEÇÃO 1: CONTAS PENDENTES DE HOJE E ATRASADAS */}
              {contasPendentes.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <AlertCircle size={13} /> Contas do Dia Pendentes ({contasPendentes.length})
                  </div>
                  {contasPendentes.map(c => {
                    const dt = c.dataVencimento || c.data || '';
                    const isHoje = dt === hojeStr;
                    const isReceita = c.tipo === 'receita';
                    const emBaixa = baixandoId === c.id;

                    return (
                      <div key={c.id} style={{
                        background: isReceita ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        border: `1px solid ${isReceita ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
                        borderRadius: 10,
                        padding: '9px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8
                      }}>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                            <span style={{
                              fontSize: 9,
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              padding: '1px 5px',
                              borderRadius: 4,
                              background: isReceita ? '#10b981' : '#ef4444',
                              color: '#ffffff'
                            }}>
                              {isReceita ? 'Receber' : 'Pagar'}
                            </span>
                            <span style={{ fontSize: 10, color: '#94a3b8' }}>
                              {isHoje ? 'Hoje' : `Atrasado (${dt.split('-').reverse().join('/')})`}
                            </span>
                          </div>
                          <div style={{ fontSize: 12.5, fontWeight: 700, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {c.descricao}
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: isReceita ? '#34d399' : '#f87171', marginTop: 1 }}>
                            {isReceita ? `+${formatarMoeda(c.valor)}` : `-${formatarMoeda(c.valor)}`}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleBaixarConta(c)}
                          disabled={emBaixa}
                          style={{
                            background: isReceita ? '#10b981' : '#ef4444',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: 8,
                            padding: '6px 10px',
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                            flexShrink: 0
                          }}
                          title={isReceita ? 'Dar baixa como recebido' : 'Dar baixa como pago'}
                        >
                          {emBaixa ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                          Baixar
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* SEÇÃO 2: NOTIFICAÇÕES DO SISTEMA */}
              {notificacoes.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: contasPendentes.length > 0 ? 8 : 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#94a3b8' }}>
                    Avisos do Sistema
                  </div>
                  {notificacoes.map(n => (
                    <div key={n.id} style={{ 
                      padding: 10, borderRadius: 10,
                      background: n.lida ? 'rgba(255,255,255,0.03)' : 'rgba(59, 130, 246, 0.1)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      display: 'flex', gap: 10, transition: 'all 0.2s'
                    }}>
                      <div style={{ marginTop: 2 }}>{getIcon(n.tipo, n.prioridade)}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                          <strong style={{ fontSize: 12, color: '#ffffff' }}>{n.titulo}</strong>
                          <span style={{ fontSize: 10, color: '#94a3b8' }}>{n.hora}</span>
                        </div>
                        <p style={{ fontSize: 12, color: '#cbd5e1', margin: '0 0 6px 0', lineHeight: 1.3 }}>{n.mensagem}</p>
                        
                        {n.valor && (
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#ffffff', marginBottom: 6 }}>
                            {formatarMoeda(n.valor)}
                          </div>
                        )}
                        
                        <div style={{ display: 'flex', gap: 10 }}>
                          {!n.lida && (
                            <button onClick={() => markAsRead(n.id)} style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: 11, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <Check size={11} /> Marcar lida
                            </button>
                          )}
                          <button onClick={() => deleteNotification(n.id)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 11, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Trash2 size={11} /> Excluir
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* SEM NOTIFICAÇÕES NEM CONTAS PENDENTES */}
              {contasPendentes.length === 0 && notificacoes.length === 0 && (
                <div style={{ padding: 36, textAlign: 'center', color: '#94a3b8' }}>
                  <Bell size={32} style={{ opacity: 0.3, marginBottom: 10 }} />
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Tudo em dia!</p>
                  <span style={{ fontSize: 11, opacity: 0.8 }}>Nenhuma conta a pagar ou receber pendente no momento.</span>
                </div>
              )}
            </div>

            <div style={{ padding: '8px 16px', background: 'rgba(0,0,0,0.25)', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 10.5, color: '#94a3b8' }}>Alertas & Vencimentos em Tempo Real</span>
              {notificacoes.some(n => !n.lida) && (
                <button onClick={markAllAsRead} style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>
                  Limpar lidas
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
