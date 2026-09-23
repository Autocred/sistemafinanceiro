'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '32px', textAlign: 'center', background: '#0f172a', color: '#fff', borderRadius: '16px', margin: '24px' }}>
          <div style={{ display: 'inline-flex', padding: '16px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '50%', marginBottom: '16px', color: '#ef4444' }}>
            <AlertTriangle size={40} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>
            {this.props.fallbackTitle || 'Ocorreu um erro ao exibir este módulo'}
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '14px', maxWidth: '500px', margin: '0 auto 16px', fontFamily: 'monospace' }}>
            {this.state.error?.message || 'Erro inesperado'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: '#cc0000', color: '#fff', border: 'none',
              padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer'
            }}
          >
            <RefreshCw size={16} />
            Tentar Novamente
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
