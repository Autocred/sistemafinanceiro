import React, { useMemo } from 'react';
import { Transacao } from '@/lib/types';
import { formatarMoeda } from '@/lib/storage';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { PieChartIcon } from 'lucide-react';

const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e'];

interface Props {
  transacoes: Transacao[];
}

export function DespesasPorCategoriaMesAtual({ transacoes }: Props) {
  const data = useMemo(() => {
    const hoje = new Date();
    const mesAtualStr = hoje.toISOString().split('T')[0].substring(0, 7); // yyyy-MM
    
    const despesasMes = transacoes.filter(t => t.tipo === 'despesa' && t.data.startsWith(mesAtualStr));
    
    const agrupado: Record<string, number> = {};
    for (const t of despesasMes) {
      const cat = t.categoriaNome || 'Sem Categoria';
      agrupado[cat] = (agrupado[cat] || 0) + t.valor;
    }
    
    return Object.entries(agrupado)
      .map(([nome, valor]) => ({ nome, valor }))
      .sort((a, b) => b.valor - a.valor);
  }, [transacoes]);

  if (data.length === 0) {
    return (
      <div className="glass" style={{ padding: 24, borderRadius: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <PieChartIcon size={20} color="#f43f5e" /> Despesas do Mês Atual por Categoria
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Nenhuma despesa registrada neste mês ainda.</p>
      </div>
    );
  }

  const totalMes = data.reduce((s, item) => s + item.valor, 0);

  return (
    <div className="glass" style={{ padding: 24, borderRadius: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <PieChartIcon size={20} color="#f43f5e" /> Despesas do Mês Atual por Categoria
          </h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            Atualizado em tempo real. Total do mês: <strong style={{ color: '#f43f5e' }}>{formatarMoeda(totalMes)}</strong>
          </p>
        </div>
      </div>

      <div style={{ height: Math.max(260, data.length * 40), width: '100%' }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 10, right: 80, left: -20, bottom: 0 }} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" horizontal={true} vertical={false} />
            <XAxis type="number" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={val => `R$${val/1000}k`} />
            <YAxis type="category" dataKey="nome" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} width={120} interval={0} />
            <Tooltip 
              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              contentStyle={{ background: 'var(--bg-glass-strong)', border: '1px solid var(--border)', borderRadius: 8 }}
              formatter={(value: any) => formatarMoeda(value)}
            />
            <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
              <LabelList dataKey="valor" position="right" formatter={(val: any) => formatarMoeda(val)} fill="var(--text-primary)" fontSize={11} fontWeight={600} />
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
