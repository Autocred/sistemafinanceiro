'use client';

import React, { useState, useEffect } from 'react';
import { AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Wallet, TrendingUp, ShieldCheck, Target, ArrowUpRight, PlusCircle, AlertCircle, PieChart as PieChartIcon } from 'lucide-react';
import { formatarMoeda, subscribeContas, getContas } from '@/lib/storage';
import { Conta } from '@/lib/types';

export function HubInvestimentos({ onNovaConta }: { onNovaConta?: () => void }) {
  const [contas, setContas] = useState<Conta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const carregar = async () => {
      const c = await getContas();
      setContas(c);
      setLoading(false);
    };
    carregar();

    const unsub = subscribeContas(data => {
      setContas(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Carregando Hub de Patrimônio...</div>;
  }

  const contasInvestimento = contas.filter(c => c.tipo === 'investimento');
  const contasCorrente = contas.filter(c => c.tipo !== 'investimento' && c.ativo);

  const patrimonioInvestido = contasInvestimento.reduce((acc, c) => acc + (c.saldo || 0), 0);
  const patrimonioLivre = contasCorrente.reduce((acc, c) => acc + (c.saldo || 0), 0);
  const patrimonioTotal = patrimonioInvestido + patrimonioLivre;

  // Mock histórico de crescimento (em um app real seria armazenado mês a mês)
  const chartData = [
    { mes: 'Jan', valor: patrimonioTotal * 0.8 },
    { mes: 'Fev', valor: patrimonioTotal * 0.85 },
    { mes: 'Mar', valor: patrimonioTotal * 0.9 },
    { mes: 'Abr', valor: patrimonioTotal * 0.92 },
    { mes: 'Mai', valor: patrimonioTotal * 0.96 },
    { mes: 'Jun', valor: patrimonioTotal },
  ];

  const pieData = [
    { name: 'Patrimônio Investido', value: Math.max(0.1, patrimonioInvestido), color: '#10b981' }, // emerald
    { name: 'Capital de Giro Livre', value: Math.max(0.1, patrimonioLivre), color: '#3b82f6' }    // blue
  ];

  const metaPatrimonio = 100000; // Meta fixa exemplo (poderia vir das configurações)
  const progressoMeta = Math.min(100, Math.round((patrimonioTotal / metaPatrimonio) * 100));

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 160 }}>
      {/* HEADER HUB */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        border: '1px solid var(--border)',
        borderRadius: 24,
        padding: '32px',
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 20,
        boxShadow: '0 12px 32px rgba(0,0,0,0.15)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 20,
            background: 'linear-gradient(135deg, #10b981, #059669)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)'
          }}>
            <TrendingUp size={32} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: '#ffffff', margin: 0, letterSpacing: '-0.5px' }}>
              Hub de Patrimônio
            </h1>
            <p style={{ fontSize: 14, color: '#94a3b8', marginTop: 4 }}>
              Visão consolidada da sua construção de riqueza.
            </p>
          </div>
        </div>
        
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>
            Patrimônio Líquido Total
          </div>
          <div style={{ fontSize: 36, fontWeight: 900, color: '#10b981', letterSpacing: '-1px' }}>
            {formatarMoeda(patrimonioTotal)}
          </div>
        </div>
      </div>

      {contasInvestimento.length === 0 ? (
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 20, padding: 40, textAlign: 'center', border: '1px solid var(--border)' }}>
          <div style={{ width: 80, height: 80, background: 'rgba(16,185,129,0.1)', borderRadius: '50%', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Wallet size={40} color="#10b981" />
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 10 }}>Você ainda não possui contas de investimento</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 30, maxWidth: 400, margin: '0 auto 30px' }}>
            Crie sua primeira carteira de investimentos (CDB, Ações, FIIs, etc) na aba de Contas e acompanhe seu patrimônio crescer aqui.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          {/* GRÁFICO EVOLUÇÃO */}
          <div className="modern-card" style={{ gridColumn: '1 / -1' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <TrendingUp size={20} color="#3b82f6" />
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Evolução do Patrimônio (6 meses)</h3>
              </div>
            </div>
            <div style={{ height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPatr" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="mes" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `R$ ${(val/1000).toFixed(0)}k`} />
                  <Tooltip 
                    formatter={(value: any) => [formatarMoeda(value || 0), 'Patrimônio']}
                    contentStyle={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8 }}
                  />
                  <Area type="monotone" dataKey="valor" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorPatr)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* DISTRIBUIÇÃO */}
          <div className="modern-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <PieChartIcon size={20} color="#8b5cf6" />
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Alocação de Capital</h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ width: 150, height: 150 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={5} dataKey="value">
                      {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip labelStyle={{ color: '#fff', fontWeight: 'bold' }}  formatter={(value: any) => formatarMoeda(value || 0)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ flex: 1, paddingLeft: 20 }}>
                {pieData.map(d => (
                  <div key={d.name} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: d.color }}></div>
                      {d.name}
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
                      {formatarMoeda(d.value === 0.1 ? 0 : d.value)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* META DE PATRIMÔNIO */}
          <div className="modern-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <Target size={20} color="#f59e0b" />
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Rumo aos R$ 100K</h3>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Progresso</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b' }}>{progressoMeta}%</span>
            </div>
            <div style={{ height: 12, background: 'var(--bg-secondary)', borderRadius: 10, overflow: 'hidden', marginBottom: 20 }}>
              <div style={{ height: '100%', background: 'linear-gradient(90deg, #f59e0b, #fbbf24)', width: `${progressoMeta}%`, borderRadius: 10, transition: 'width 1s ease-in-out' }}></div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: 'rgba(245,158,11,0.1)', padding: 16, borderRadius: 12 }}>
              <ShieldCheck size={24} color="#f59e0b" style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Segurança Financeira</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>Continue investindo regularmente. O efeito dos juros compostos acelera drasticamente sua curva de crescimento após os R$ 100k.</div>
              </div>
            </div>
          </div>

          {/* LISTA DE CONTAS DE INVESTIMENTO */}
          <div className="modern-card" style={{ gridColumn: '1 / -1' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 20 }}>Suas Carteiras</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {contasInvestimento.map(conta => (
                <div key={conta.id} style={{ border: '1px solid var(--border)', borderRadius: 16, padding: 16, background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
                      <Wallet size={20} color="#10b981" />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{conta.nome}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Carteira de Ativos</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#10b981' }}>{formatarMoeda(conta.saldo)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
