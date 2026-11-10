import React, { useState } from 'react';
import { Target, TrendingUp, DollarSign, Activity, Download, Calendar, BarChart3, LineChart, PieChart, ShieldCheck } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const dreData = [
  { name: 'Jan', receitas: 120000, despesas: 80000, lucro: 40000 },
  { name: 'Fev', receitas: 135000, despesas: 85000, lucro: 50000 },
  { name: 'Mar', receitas: 128000, despesas: 82000, lucro: 46000 },
  { name: 'Abr', receitas: 145000, despesas: 90000, lucro: 55000 },
  { name: 'Mai', receitas: 160000, despesas: 95000, lucro: 65000 },
  { name: 'Jun', receitas: 175000, despesas: 100000, lucro: 75000 },
];

const margemData = [
  { name: 'Produto A', value: 45 },
  { name: 'Serviços', value: 35 },
  { name: 'Consultoria', value: 20 },
];

const COLORS = ['#10b981', '#6366f1', '#f59e0b'];

export default function RelatorioAvancado() {
  const [periodo, setPeriodo] = useState('6meses');

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 max-w-[1400px] mx-auto pb-12">
      
      {/* HEADER EXECUTIVO */}
      <div className="relative glass-panel p-8 rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-[var(--bg-card)] to-indigo-500/5 overflow-hidden">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-amber-500/20 blur-[100px] rounded-full pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-500/20 blur-[100px] rounded-full pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl shadow-lg shadow-amber-500/30">
                <Target className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[var(--text-primary)] to-[var(--text-secondary)] tracking-tight">
                Cockpit Gerencial Avançado
              </h1>
            </div>
            <p className="text-[var(--text-secondary)] text-lg max-w-2xl leading-relaxed">
              DRE interativa, Fluxo de Caixa Projetado e Análise de Margem de Lucro em tempo real.
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <select 
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className="px-4 py-2.5 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] font-medium focus:ring-2 focus:ring-amber-500/50 outline-none transition-all shadow-inner"
            >
              <option value="30dias">Últimos 30 dias</option>
              <option value="6meses">Últimos 6 meses</option>
              <option value="1ano">Último ano</option>
            </select>
            <button className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:-translate-y-0.5">
              <Download className="w-5 h-5" /> Exportar PDF
            </button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-panel p-6 rounded-3xl border border-[var(--border)] relative overflow-hidden group hover:border-emerald-500/50 transition-all hover:shadow-lg hover:shadow-emerald-500/10">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <DollarSign className="w-24 h-24 text-emerald-500" />
          </div>
          <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            Receita Bruta (6m)
          </h3>
          <p className="text-3xl font-black text-[var(--text-primary)] mt-4">R$ 863.000</p>
          <div className="flex items-center gap-2 mt-3 text-sm font-bold text-emerald-500 bg-emerald-500/10 w-fit px-3 py-1 rounded-full">
            <TrendingUp className="w-4 h-4" /> +15.4%
          </div>
        </div>
        
        <div className="glass-panel p-6 rounded-3xl border border-[var(--border)] relative overflow-hidden group hover:border-indigo-500/50 transition-all hover:shadow-lg hover:shadow-indigo-500/10">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Activity className="w-24 h-24 text-indigo-500" />
          </div>
          <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
            Lucro Líquido
          </h3>
          <p className="text-3xl font-black text-[var(--text-primary)] mt-4">R$ 331.000</p>
          <div className="flex items-center gap-2 mt-3 text-sm font-bold text-indigo-500 bg-indigo-500/10 w-fit px-3 py-1 rounded-full">
            <TrendingUp className="w-4 h-4" /> +8.2%
          </div>
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-[var(--border)] relative overflow-hidden group hover:border-amber-500/50 transition-all hover:shadow-lg hover:shadow-amber-500/10">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <PieChart className="w-24 h-24 text-amber-500" />
          </div>
          <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500"></div>
            Margem EBITDA
          </h3>
          <p className="text-3xl font-black text-[var(--text-primary)] mt-4">38,3%</p>
          <div className="flex items-center gap-2 mt-3 text-sm font-bold text-amber-500 bg-amber-500/10 w-fit px-3 py-1 rounded-full">
            Excelente Saúde
          </div>
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-[var(--border)] relative overflow-hidden group hover:border-blue-500/50 transition-all hover:shadow-lg hover:shadow-blue-500/10">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <ShieldCheck className="w-24 h-24 text-blue-500" />
          </div>
          <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            Projeção 90 dias
          </h3>
          <p className="text-3xl font-black text-[var(--text-primary)] mt-4">R$ 450.000</p>
          <div className="flex items-center gap-2 mt-3 text-sm font-bold text-blue-500 bg-blue-500/10 w-fit px-3 py-1 rounded-full">
            Fluxo Positivo
          </div>
        </div>
      </div>

      {/* GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* DRE Area Chart */}
        <div className="lg:col-span-2 glass-panel p-6 md:p-8 rounded-3xl border border-[var(--border)] flex flex-col relative overflow-hidden">
          <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none"></div>
          
          <div className="flex justify-between items-center mb-8 relative z-10">
            <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
                <LineChart className="w-5 h-5" />
              </div>
              Demonstrativo de Resultados (DRE)
            </h2>
          </div>
          
          <div className="h-[350px] w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dreData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorReceitas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorDespesas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)' }}
                  itemStyle={{ color: 'var(--text-primary)', fontWeight: 'bold' }}
                  formatter={(value: any) => [`R$ ${Number(value).toLocaleString('pt-BR')}`, undefined]}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Area type="monotone" dataKey="receitas" name="Receitas" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorReceitas)" activeDot={{ r: 6, strokeWidth: 0, fill: '#10b981' }} />
                <Area type="monotone" dataKey="despesas" name="Despesas" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorDespesas)" activeDot={{ r: 6, strokeWidth: 0, fill: '#ef4444' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Composição de Margem */}
        <div className="glass-panel p-6 md:p-8 rounded-3xl border border-[var(--border)] flex flex-col relative overflow-hidden">
          <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-amber-500/5 blur-[100px] rounded-full pointer-events-none"></div>
          
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-8 flex items-center gap-3 relative z-10">
            <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg">
              <PieChart className="w-5 h-5" />
            </div>
            Composição de Margem
          </h2>
          
          <div className="h-[250px] w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={margemData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {margemData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)', borderRadius: '12px' }}
                  formatter={(value: any) => [`${value}%`, 'Margem']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div className="space-y-4 mt-6 relative z-10">
            {margemData.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }}></div>
                  <span className="text-sm font-medium text-[var(--text-secondary)]">{item.name}</span>
                </div>
                <span className="font-bold text-[var(--text-primary)]">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
