import React, { useMemo } from 'react';
import { Transacao, Conta } from '@/lib/types';
import { formatarMoeda } from '@/lib/storage';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProjecaoFluxoCaixaProps {
  transacoes: Transacao[];
  contas: Conta[];
  diasProjecao?: number;
}

export function ProjecaoFluxoCaixa({ transacoes, contas, diasProjecao = 30 }: ProjecaoFluxoCaixaProps) {
  const dados = useMemo(() => {
    // 1. Pegar saldo inicial
    let saldoAtual = contas.reduce((acc, c) => acc + c.saldo, 0);

    // 2. Transações pendentes futuras
    const hojeStr = new Date().toISOString().split('T')[0];
    const transacoesPendentes = transacoes.filter(t => t.status === 'pendente' || t.status === 'atrasado');

    // 3. Montar a linha do tempo (array de dias)
    const fluxo: { data: string; dataFormatada: string; saldo: number; entrada: number; saida: number }[] = [];

    const hoje = new Date();
    for (let i = 0; i <= diasProjecao; i++) {
      const dataAtual = addDays(hoje, i);
      const dataIso = dataAtual.toISOString().split('T')[0];
      
      let entrada = 0;
      let saida = 0;

      transacoesPendentes.forEach(t => {
        const d = t.dataVencimento || t.data;
        if (d === dataIso) {
          if (t.tipo === 'receita') entrada += t.valor;
          else if (t.tipo === 'despesa') saida += t.valor;
        }
      });

      saldoAtual += entrada;
      saldoAtual -= saida;

      fluxo.push({
        data: dataIso,
        dataFormatada: format(dataAtual, 'dd/MM', { locale: ptBR }),
        saldo: saldoAtual,
        entrada,
        saida
      });
    }

    return fluxo;
  }, [transacoes, contas, diasProjecao]);

  return (
    <div className="glass" style={{ padding: 24, borderRadius: 16 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>Projeção de Fluxo de Caixa Diário (IA)</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Projeção de saldo bancário com base não saldo atual e contas a pagar/receber pendentes.</p>
      </div>

      <div style={{ height: 320, width: '100%', marginTop: 20 }}>
        <ResponsiveContainer>
          <AreaChart data={dados} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
            <XAxis dataKey="dataFormatada" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `R$ ${val / 1000}k`} />
            <Tooltip 
              contentStyle={{ background: 'var(--bg-glass-strong)', border: '1px solid var(--border)', borderRadius: 8 }}
              formatter={(value: any) => formatarMoeda(value)}
              labelStyle={{ color: 'var(--text-secondary)' }}
            />
            <Area type="monotone" dataKey="saldo" name="Saldo Projetado" stroke="#10b981" fillOpacity={1} fill="url(#colorSaldo)" strokeWidth={3} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
