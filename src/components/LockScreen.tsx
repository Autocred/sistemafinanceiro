'use client';

import { useState, useEffect } from 'react';
import { Fingerprint, Lock, Unlock, ShieldAlert, LogOut } from 'lucide-react';
import { playSound } from '@/lib/audio';
import { verificarBiometriaLocal, isBiometriaHabilitada } from '@/lib/biometria';

export function LockScreen({
  usuarioNome,
  onDesbloquear,
  onLogout,
  isBiometria = false
}: {
  usuarioNome: string;
  onDesbloquear: (senha: string) => boolean | Promise<boolean>;
  onLogout: () => void;
  isBiometria?: boolean;
}) {
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!senha.trim()) {
      setErro('Digite a sua senha.');
      return;
    }
    const ok = await onDesbloquear(senha);
    if (ok) {
      playSound('sucesso');
    } else {
      playSound('erro');
      setErro('Senha incorreta.');
    }
  };

  const attemptBiometria = async () => {
     setErro('');
     const ok = await verificarBiometriaLocal();
     if (ok) {
        playSound('sucesso');
        onDesbloquear(''); // Desbloqueio bypass com biometria
     } else {
        setErro('Biometria falhou ou foi cancelada.');
     }
  };

  // Se a tela abriu especificamente pelo bloqueio biométrico (cold start), auto-iniciar:
  // Se a tela abriu especificamente pelo bloqueio biométrico (cold start), auto-iniciar:
  useEffect(() => {
     if (isBiometria && typeof window !== 'undefined' && isBiometriaHabilitada()) {
        const t = setTimeout(() => {
           attemptBiometria();
        }, 500);
        return () => clearTimeout(t);
     }
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999999,
        background: 'rgba(5, 5, 10, 0.94)',
        backdropFilter: 'blur(24px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16
      }}
    >
      <div
        className="scale-up"
        style={{
          maxWidth: 380,
          width: '100%',
          background: 'var(--bg-glass-strong)',
          border: '1px solid var(--border-hover)',
          borderRadius: 24,
          padding: '36px 28px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.8)',
          textAlign: 'center'
        }}
      >
        <div
          style={{
            width: 68,
            height: 68,
            borderRadius: '50%',
            background: 'var(--primary-light)',
            border: '2px solid var(--primary-light)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto',
            boxShadow: '0 0 30px rgba(239,68,68,0.2)'
          }}
        >
          <Lock size={32} />
        </div>

        <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
          Sessão Bloqueada
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
          Olá, <strong style={{ color: 'var(--text-primary)' }}>{usuarioNome}</strong>. Confirme sua senha para continuar.
        </p>

        <form onSubmit={handleUnlock} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <input
              type="password"
              className="input-field"
              value={senha}
              onChange={e => { setSenha(e.target.value); setErro(''); }}
              placeholder="Sua senha..."
              style={{ textAlign: 'center', fontSize: 14, height: 44, borderRadius: 12 }}
              autoFocus
            />
            {erro && <p style={{ fontSize: 12, color: 'var(--primary)', marginTop: 6 }}>{erro}</p>}
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', height: 44, fontSize: 14, borderRadius: 12 }}
          >
            <Unlock size={16} /> Desbloquear
          </button>
        </form>

        {typeof window !== 'undefined' && isBiometriaHabilitada() && (
           <div style={{ marginTop: 16 }}>
             <button
                type="button"
                onClick={attemptBiometria}
                style={{
                   width: '100%',
                   display: 'flex',
                   alignItems: 'center',
                   justifyContent: 'center',
                   gap: 8,
                   height: 44,
                   borderRadius: 12,
                   background: 'rgba(59, 130, 246, 0.15)',
                   color: '#3b82f6',
                   border: '1px solid rgba(59, 130, 246, 0.3)',
                   fontWeight: 600,
                   fontSize: 14,
                   cursor: 'pointer'
                }}
             >
                <Fingerprint size={18} />
                Usar Impressão Digital / FaceID
             </button>
           </div>
        )}

        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <button
            onClick={onLogout}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <LogOut size={14} /> Sair da Conta (Logoff)
          </button>
        </div>
      </div>
    </div>
  );
}
