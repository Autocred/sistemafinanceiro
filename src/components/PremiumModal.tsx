'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, AlertTriangle, Info, X, Lock, ShieldAlert } from 'lucide-react';
import { playSound } from '@/lib/audio';

export interface PremiumModalProps {
  tipo: 'sucesso' | 'erro' | 'aviso' | 'info' | 'confirmacao' | 'bloqueio';
  titulo: string;
  mensagem: string;
  submensagem?: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  exigirSenha?: boolean;
  onConfirmar: (senhaInput?: string) => void;
  onCancelar?: () => void;
  aberto: boolean;
}

export function PremiumModal({
  tipo,
  titulo,
  mensagem,
  submensagem,
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
  exigirSenha = false,
  onConfirmar,
  onCancelar,
  aberto
}: PremiumModalProps) {
  const [senhaInput, setSenhaInput] = useState('');
  const [erroSenha, setErroSenha] = useState('');

  useEffect(() => {
    if (aberto) {
      if (tipo === 'erro' || tipo === 'bloqueio') playSound('erro');
      else if (tipo === 'sucesso') playSound('sucesso');
      else playSound('aviso');
      setSenhaInput('');
      setErroSenha('');
    }
  }, [aberto, tipo]);

  if (!aberto) return null;

  const handleConfirm = () => {
    if (exigirSenha && !senhaInput.trim()) {
      setErroSenha('Digite a sua senha para confirmar esta ação.');
      return;
    }
    onConfirmar(senhaInput);
  };

  const icons = {
    sucesso: { icon: CheckCircle2, color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
    erro: { icon: AlertCircle, color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
    aviso: { icon: AlertTriangle, color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
    info: { icon: Info, color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
    confirmacao: { icon: ShieldAlert, color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
    bloqueio: { icon: Lock, color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  };

  const cfg = icons[tipo];
  const IconComponent = cfg.icon;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999999,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
    >
      <div
        className="modal-box scale-up"
        style={{
          maxWidth: 420,
          width: '100%',
          background: 'var(--bg-glass-strong)',
          border: `1px solid ${cfg.color}40`,
          borderRadius: 20,
          padding: '24px 28px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
          textAlign: 'center',
          position: 'relative'
        }}
      >
        {onCancelar && (
          <button
            onClick={onCancelar}
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              background: 'var(--border)',
              border: 'none',
              borderRadius: '50%',
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              cursor: 'pointer'
            }}
          >
            <X size={14} />
          </button>
        )}

        <div style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: cfg.bg,
          color: cfg.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px auto',
          boxShadow: `0 0 20px ${cfg.color}30`
        }}>
          <IconComponent size={28} />
        </div>

        <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8, letterSpacing: '-0.3px' }}>
          {titulo}
        </h3>

        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: submensagem || exigirSenha ? 12 : 20 }}>
          {mensagem}
        </p>

        {submensagem && (
          <p style={{ fontSize: 12, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.03)', padding: 10, borderRadius: 10, marginBottom: 20 }}>
            {submensagem}
          </p>
        )}

        {exigirSenha && (
          <div style={{ marginBottom: 20, textAlign: 'left' }}>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>
              Digite sua senha de confirmação
            </label>
            <input
              type="password"
              className="input-field"
              value={senhaInput}
              onChange={e => { setSenhaInput(e.target.value); setErroSenha(''); }}
              placeholder="Sua senha..."
              autoFocus
            />
            {erroSenha && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{erroSenha}</p>}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          {onCancelar && (
            <button
              onClick={onCancelar}
              className="btn-secondary"
              style={{ flex: 1, justifyContent: 'center' }}
            >
              {textoCancelar}
            </button>
          )}
          <button
            onClick={handleConfirm}
            className="btn-primary"
            style={{
              flex: 1,
              justifyContent: 'center',
              background: tipo === 'erro' || tipo === 'bloqueio' ? '#ef4444' : undefined,
              borderColor: tipo === 'erro' || tipo === 'bloqueio' ? '#ef4444' : undefined
            }}
          >
            {textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
