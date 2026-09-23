'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { Transacao } from '@/lib/types';
import { getTransacoes, formatarMoeda, atualizarTransacao } from '@/lib/storage';

export function CentralAprovacoes() {
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = async () => {
    const data = await getTransacoes();
    setTransacoes(data);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, []);

  // Transações de valor elevado (> R$ 5.000) pendentes de aprovação
  const pendentesAprovacao = transacoes.filter(t => t.tipo === 'despesa' && t.valor >= 5000 && t.status !== 'pago');

  const fmt = formatarMoeda;

  const handleAprovar = async (id: string) => {
    await atualizarTransacao(id, { observacoes: 'Aprovado via Alçada Executiva CFO' });
    await carregar();
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 160 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
            🛡️ Central de Aprovações de Alçadas
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            Controle de Alçadas Executivas para Despesas de Grande Valor (&ge; R$ 5.000,00)
          </p>
        </div>
      </div>

      {pendentesAprovacao.length === 0 ? (
        <div className="glass" style={{ padding: '60px 20px', textAlign: 'center', borderRadius: 20 }}>
          <CheckCircle2 size={48} color="#10b981" style={{ margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
            Tudo aprovado e em ordem!
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Nenhuma despesa pendente de alçada executiva não momento.
          </p>
        </div>
      ) : (
        <div className="glass" style={{ padding: 20, borderRadius: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 16 }}>
            Fila de Despesas Aguardando Aprovação ({pendentesAprovacao.length})
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {pendentesAprovacao.map(t => (
              <div key={t.id} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                background: 'var(--bg-card)',
                border: '1px solid rgba(245,158,11,0.3)',
                borderRadius: 14,
                flexWrap: 'wrap',
                gap: 12
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>{t.descricao}</span>
                    <span className="badge badge-yellow">ALÇADA R$ 5k+</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                    Vencimento: {t.dataVencimento?.split('-').reverse().join('/') || t.data} • {t.fornecedorNome || t.categoriaNome || 'Geral'}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <span style={{ fontSize: 18, fontWeight: 900, color: '#ef4444' }}>
                    {fmt(t.valor)}
                  </span>
                  <button onClick={() => handleAprovar(t.id)} className="btn-primary" style={{ padding: '8px 16px', fontSize: 12 }}>
                    <CheckCircle2 size={15} /> Aprovar Lançamento
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
