import React, { useMemo } from 'react';
import { Transacao } from '@/lib/types';
import { formatarMoeda } from '@/lib/storage';
import { normalizeDate } from '@/lib/financialEngine';

export function AgingList({ transacoes }: { transacoes: Transacao[] }) {
  const agingData = useMemo(() => {
    const hojeStr = new Date().toISOString().split('T')[0];
    const hojeMs = new Date(hojeStr).getTime();

    const data = {
      receber: { aVencer: 0, v30: 0, v60: 0, v90: 0, vMais90: 0, total: 0 },
      pagar: { aVencer: 0, v30: 0, v60: 0, v90: 0, vMais90: 0, total: 0 }
    };

    transacoes.forEach(t => {
      if (t.status === 'pago') return;
      const dV = normalizeDate(t.dataVencimento || t.data);
      if (!dV) return;

      const diffMs = hojeMs - new Date(dV).getTime();
      const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      const tipo = t.tipo === 'receita' ? 'receber' : 'pagar';
      
      data[tipo].total += t.valor;

      if (diffDias <= 0) {
        data[tipo].aVencer += t.valor;
      } else if (diffDias <= 30) {
        data[tipo].v30 += t.valor;
      } else if (diffDias <= 60) {
        data[tipo].v60 += t.valor;
      } else if (diffDias <= 90) {
        data[tipo].v90 += t.valor;
      } else {
        data[tipo].vMais90 += t.valor;
      }
    });

    return data;
  }, [transacoes]);

  const Coluna = ({ label, valor }: any) => (
    <div style={{ padding: 12, borderRight: '1px solid var(--border)', flex: 1, textAlign: 'center' }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>{formatarMoeda(valor)}</div>
    </div>
  );

  return (
    <div className="glass" style={{ padding: 24, borderRadius: 16 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>Aging List (Inadimplência)</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Mapeamento de risco: Contas a Receber e a Pagar por faixa de atraso.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#10b981', marginBottom: 10 }}>Contas a Receber</h3>
          <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <Coluna label="A Vencer" valor={agingData.receber.aVencer} />
            <Coluna label="1 a 30 dias" valor={agingData.receber.v30} />
            <Coluna label="31 a 60 dias" valor={agingData.receber.v60} />
            <Coluna label="61 a 90 dias" valor={agingData.receber.v90} />
            <div style={{ padding: 12, flex: 1, textAlign: 'center', background: 'rgba(239,68,68,0.05)' }}>
              <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 600, textTransform: 'uppercase' }}>+90 dias (Risco Alto)</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#ef4444', marginTop: 4 }}>{formatarMoeda(agingData.receber.vMais90)}</div>
            </div>
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#ef4444', marginBottom: 10 }}>Contas a Pagar</h3>
          <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <Coluna label="A Vencer" valor={agingData.pagar.aVencer} />
            <Coluna label="1 a 30 dias" valor={agingData.pagar.v30} />
            <Coluna label="31 a 60 dias" valor={agingData.pagar.v60} />
            <Coluna label="61 a 90 dias" valor={agingData.pagar.v90} />
            <div style={{ padding: 12, flex: 1, textAlign: 'center', background: 'rgba(245,158,11,0.05)' }}>
              <div style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600, textTransform: 'uppercase' }}>+90 dias</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#f59e0b', marginTop: 4 }}>{formatarMoeda(agingData.pagar.vMais90)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
