'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Next.js Page Error caught:', error);
  }, [error]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0a0a0c',
      color: '#ffffff',
      fontFamily: 'system-ui, sans-serif',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '480px',
        width: '100%',
        background: '#16161a',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '20px',
        padding: '32px',
        textAlign: 'center',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
      }}>
        <div style={{
          display: 'inline-flex',
          padding: '16px',
          background: 'rgba(239, 68, 68, 0.15)',
          borderRadius: '50%',
          color: '#ef4444',
          marginBottom: '20px'
        }}>
          <AlertTriangle size={40} />
        </div>
        
        <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '8px' }}>
          Ops! Algo deu errado ao carregar
        </h1>
        
        <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '20px', lineHeight: '1.5' }}>
          {error?.message || 'Houve uma falha ao renderizar a página. Tente recarregar ou limpar o cache.'}
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={() => reset()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              background: '#cc0000',
              color: '#ffffff',
              borderRadius: '10px',
              border: 'none',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={16} />
            Tentar Novamente
          </button>
          
          <button
            onClick={() => {
              sessionStorage.clear();
              window.location.href = '/';
            }}
            style={{
              padding: '10px 20px',
              background: 'rgba(255,255,255,0.08)',
              color: '#ffffff',
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.15)',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    </div>
  );
}
