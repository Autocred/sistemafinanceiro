import React, { useState, useEffect } from 'react';
import { Bell, Check, Trash2, AlertCircle, Clock, CheckCircle2, ShieldAlert } from 'lucide-react';
import { NotificacaoApp } from '@/lib/types';
import { getDb } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';

export function NotificationCenter({ userId }: { userId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notificacoes, setNotificacoes] = useState<NotificacaoApp[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userId) return;
    const q = query(
      collection(getDb(), 'users', userId, 'notificacoes'),
      orderBy('criadoEm', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as NotificacaoApp));
      setNotificacoes(notifs);
      setUnreadCount(notifs.filter(n => !n.lida).length);
    });
    return () => unsubscribe();
  }, [userId]);

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

  const getIcon = (tipo: string, prioridade: string) => {
    if (tipo === 'vencimento') return <Clock size={16} color={prioridade === 'urgente' ? '#ef4444' : '#f59e0b'} />;
    if (tipo === 'atraso') return <AlertCircle size={16} color="#ef4444" />;
    if (tipo === 'sistema') return <ShieldAlert size={16} color="#3b82f6" />;
    return <CheckCircle2 size={16} color="#10b981" />;
  };

  return (
    <div style={{ position: 'relative' }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          background: 'transparent', border: 'none', color: 'white', 
          cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center'
        }}
      >
        <Bell size={20} className={unreadCount > 0 ? "bell-ringing" : ""} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: -5, right: -5, background: '#ef4444', 
            color: 'white', fontSize: 10, fontWeight: 'bold', 
            borderRadius: '50%', padding: '2px 5px', minWidth: 16, textAlign: 'center'
          }}>
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={() => setIsOpen(false)} />
          <div className="glass" style={{
            position: 'absolute', top: 35, right: -10, width: '85vw', maxWidth: 360, maxHeight: 450, 
            zIndex: 100, display: 'flex', flexDirection: 'column', 
            borderRadius: 12, overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
          }}>
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-glass)' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Notificações</h3>
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} style={{ background: 'none', border: 'none', color: 'var(--blue)', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                  Marcar todas como lidas
                </button>
              )}
            </div>
            
            <div style={{ overflowY: 'auto', flex: 1, maxHeight: 350 }}>
              {notificacoes.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <Bell size={32} style={{ opacity: 0.2, marginBottom: 12 }} />
                  <p style={{ margin: 0, fontSize: 14 }}>Nenhuma notificação</p>
                </div>
              ) : (
                notificacoes.map(n => (
                  <div key={n.id} style={{ 
                    padding: 16, borderBottom: '1px solid var(--border-color)',
                    background: n.lida ? 'transparent' : 'rgba(59, 130, 246, 0.05)',
                    display: 'flex', gap: 12, transition: 'all 0.2s'
                  }}>
                    <div style={{ marginTop: 2 }}>{getIcon(n.tipo, n.prioridade)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <strong style={{ fontSize: 13, color: 'var(--text-primary)' }}>{n.titulo}</strong>
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{n.hora}</span>
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 8px 0', lineHeight: 1.4 }}>{n.mensagem}</p>
                      
                      {n.valor && (
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
                          R$ {n.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                      )}
                      
                      <div style={{ display: 'flex', gap: 12 }}>
                        {!n.lida && (
                          <button onClick={() => markAsRead(n.id)} style={{ background: 'none', border: 'none', color: 'var(--blue)', fontSize: 12, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Check size={12} /> Ler
                          </button>
                        )}
                        <button onClick={() => deleteNotification(n.id)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Trash2 size={12} /> Excluir
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div style={{ padding: '8px 16px', background: 'var(--bg-glass)', borderTop: '1px solid var(--border-color)', textAlign: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Central de Alertas FinanceAI</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
