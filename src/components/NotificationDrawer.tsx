'use client';

import { useState, useEffect } from 'react';
import {
  Bell, X, CheckCheck, Trash2, Filter, Search, ShieldAlert,
  DollarSign, CreditCard, AlertTriangle, ArrowUpRight, ArrowDownLeft, FileText, Check
} from 'lucide-react';
import { NotificacaoBancaria } from '@/lib/types';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { getDb } from '@/lib/firebase';

export function NotificationDrawer({ aberto, onClose }: { aberto: boolean; onClose: () => void }) {
  const [notificacoes, setNotificacoes] = useState<NotificacaoBancaria[]>([]);
  const [busca, setBusca] = useState('');
  const [filtroPrioridade, setFiltroPrioridade] = useState<string>('todas');
  const [filtroStatus, setFiltroStatus] = useState<string>('todas');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const q = query(collection(getDb(), 'notificacoes_bancarias'), orderBy('criadoEm', 'desc'));
    const unsub = onSnapshot(q, snap => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as NotificacaoBancaria));
      setNotificacoes(data);
    });
    return () => unsub();
  }, []);

  if (!aberto) return null;

  const handleMarcarLida = async (id: string) => {
    try {
      await updateDoc(doc(getDb(), 'notificacoes_bancarias', id), { status: 'lida' });
    } catch (e) {}
  };

  const handleExcluir = async (id: string) => {
    try {
      await deleteDoc(doc(getDb(), 'notificacoes_bancarias', id));
    } catch (e) {}
  };

  const handleMarcarTodasLidas = async () => {
    try {
      const naoLidas = notificacoes.filter(n => n.status === 'nao_lida');
      for (const n of naoLidas) {
        await updateDoc(doc(getDb(), 'notificacoes_bancarias', n.id), { status: 'lida' });
      }
    } catch (e) {}
  };

  const handleLimparLidas = async () => {
    try {
      const lidas = notificacoes.filter(n => n.status === 'lida');
      for (const n of lidas) {
        await deleteDoc(doc(getDb(), 'notificacoes_bancarias', n.id));
      }
    } catch (e) {}
  };

  const filtradas = notificacoes.filter(n => {
    const matchBusca = n.titulo.toLowerCase().includes(busca.toLowerCase()) || n.descricao.toLowerCase().includes(busca.toLowerCase());
    const matchPrio = filtroPrioridade === 'todas' || n.prioridade === filtroPrioridade;
    const matchStatus = filtroStatus === 'todas' || (filtroStatus === 'nao_lida' ? n.status === 'nao_lida' : n.status === 'lida');
    return matchBusca && matchPrio && matchStatus;
  });

  // Grouping
  const hoje = new Date().toISOString().split('T')[0];
  const ontem = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  const grupoHoje = filtradas.filter(n => n.data === hoje);
  const grupoOntem = filtradas.filter(n => n.data === ontem);
  const grupoOutras = filtradas.filter(n => n.data !== hoje && n.data !== ontem);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        justifyContent: 'flex-end'
      }}
    >
      <div className="drawer-overlay fade-in" />
      <div
        className="slide-up"
        style={{
          width: '100%',
          maxWidth: 440,
          height: '100%',
          background: 'var(--bg-glass-strong)',
          borderLeft: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-10px 0 40px rgba(0,0,0,0.5)'
        }}
      >
        {/* Header Drawer */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: 'rgba(59,130,246,0.15)', padding: 8, borderRadius: 10, color: '#3b82f6' }}>
              <Bell size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>Central de Notificações</h2>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{notificacoes.filter(n => n.status === 'nao_lida').length} não lidas</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'var(--border)', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Buscas & Ações Rápidas */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }} />
            <input
              className="input-field"
              style={{ paddingLeft: 34, fontSize: 12, height: 38 }}
              placeholder="Pesquisar notificações..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <button onClick={handleMarcarTodasLidas} style={{ background: 'transparent', border: 'none', color: '#10b981', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <CheckCheck size={14} /> Marcar todas lidas
            </button>
            <button onClick={handleLimparLidas} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Trash2 size={14} /> Limpar lidas
            </button>
          </div>
        </div>

        {/* Lista Notificações com Scroll */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {grupoHoje.length > 0 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.5px' }}>Hoje</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {grupoHoje.map(n => <CardNotificacao key={n.id} n={n} onLida={() => handleMarcarLida(n.id)} onExcluir={() => handleExcluir(n.id)} />)}
              </div>
            </div>
          )}

          {grupoOntem.length > 0 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.5px' }}>Ontem</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {grupoOntem.map(n => <CardNotificacao key={n.id} n={n} onLida={() => handleMarcarLida(n.id)} onExcluir={() => handleExcluir(n.id)} />)}
              </div>
            </div>
          )}

          {grupoOutras.length > 0 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.5px' }}>Anteriores</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {grupoOutras.map(n => <CardNotificacao key={n.id} n={n} onLida={() => handleMarcarLida(n.id)} onExcluir={() => handleExcluir(n.id)} />)}
              </div>
            </div>
          )}

          {filtradas.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <Bell size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
              <p style={{ fontSize: 14, fontWeight: 600 }}>Nenhuma notificação encontrada</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CardNotificacao({ n, onLida, onExcluir }: { n: NotificacaoBancaria; onLida: () => void; onExcluir: () => void }) {
  const isNaoLida = n.status === 'nao_lida';

  return (
    <div
      style={{
        background: isNaoLida ? 'rgba(59,130,246,0.06)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${isNaoLida ? 'rgba(59,130,246,0.25)' : 'var(--border)'}`,
        borderRadius: 12,
        padding: 12,
        position: 'relative'
      }}
    >
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: n.categoria === 'seguranca' ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
          color: n.categoria === 'seguranca' ? '#ef4444' : '#10b981',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          {n.categoria === 'seguranca' ? <ShieldAlert size={16} /> : <DollarSign size={16} />}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
            <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{n.titulo}</h4>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{n.hora}</span>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: 8 }}>{n.descricao}</p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              {n.usuarioResponsavel ? `por ${n.usuarioResponsavel}` : n.data}
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              {isNaoLida && (
                <button onClick={onLida} style={{ background: 'rgba(16,185,129,0.15)', border: 'none', borderRadius: 6, padding: '3px 8px', color: '#10b981', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
                  Lida
                </button>
              )}
              <button onClick={onExcluir} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2 }}>
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
