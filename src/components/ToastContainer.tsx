'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { playSound } from '@/lib/audio';

export interface ToastMessage {
  id: string;
  tipo: 'sucesso' | 'erro' | 'aviso' | 'info';
  titulo: string;
  mensagem: string;
  duracao?: number; // ms
}

let addToastGlobal: ((toast: Omit<ToastMessage, 'id'>) => void) | null = null;

export function showToast(toast: Omit<ToastMessage, 'id'>) {
  if (addToastGlobal) {
    addToastGlobal(toast);
  }
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    addToastGlobal = (newToast) => {
      const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
      const item: ToastMessage = { ...newToast, id, duracao: newToast.duracao || 4500 };
      
      // Toca som apropriado
      if (item.tipo === 'sucesso') playSound('sucesso');
      else if (item.tipo === 'erro') playSound('erro');
      else if (item.tipo === 'aviso') playSound('aviso');
      else playSound('notificacao');

      setToasts(prev => [item, ...prev].slice(0, 5));
    };
    return () => {
      addToastGlobal = null;
    };
  }, []);

  const handleClose = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div style={{
      position: 'fixed',
      top: 20,
      right: 20,
      zIndex: 99999,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      maxWidth: 380,
      width: 'calc(100vw - 40px)',
      pointerEvents: 'none'
    }}>
      {toasts.map(t => (
        <SingleToast key={t.id} toast={t} onClose={() => handleClose(t.id)} />
      ))}
    </div>
  );
}

function SingleToast({ toast, onClose }: { toast: ToastMessage; onClose: () => void }) {
  const [progress, setProgress] = useState(100);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const dur = toast.duracao || 4500;
    const interval = 50;
    const step = (interval / dur) * 100;

    const timer = setInterval(() => {
      setProgress(p => {
        if (p <= step) {
          clearInterval(timer);
          onClose();
          return 0;
        }
        return p - step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [paused, toast.duracao, onClose]);

  const cores = {
    sucesso: { border: '#10b981', bg: 'rgba(16,185,129,0.12)', text: '#10b981', icon: CheckCircle2 },
    erro: { border: '#ef4444', bg: 'rgba(239,68,68,0.12)', text: '#ef4444', icon: XCircle },
    aviso: { border: '#f59e0b', bg: 'rgba(245,158,11,0.12)', text: '#f59e0b', icon: AlertTriangle },
    info: { border: '#3b82f6', bg: 'rgba(59,130,246,0.12)', text: '#60a5fa', icon: Info },
  };

  const config = cores[toast.tipo];
  const Icon = config.icon;

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="slide-up"
      style={{
        pointerEvents: 'auto',
        background: 'var(--bg-glass-strong)',
        backdropFilter: 'blur(20px)',
        border: `1px solid ${config.border}40`,
        borderRadius: 14,
        padding: '14px 16px',
        boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12
      }}
    >
      <div style={{
        background: config.bg,
        borderRadius: 10,
        padding: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: config.text,
        flexShrink: 0
      }}>
        <Icon size={20} />
      </div>

      <div style={{ flex: 1, minWidth: 0, paddingRight: 6 }}>
        <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{toast.titulo}</h4>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{toast.mensagem}</p>
      </div>

      <button
        onClick={onClose}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          padding: 2,
          display: 'flex',
          alignItems: 'center'
        }}
      >
        <X size={16} />
      </button>

      {/* Progress bar */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        height: 3,
        background: config.border,
        width: `${progress}%`,
        transition: 'width 0.05s linear'
      }} />
    </div>
  );
}
