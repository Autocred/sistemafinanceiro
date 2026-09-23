import React, { useState } from 'react';
import { formatarMoeda } from '@/lib/storage';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { BrainCircuit, Plus, Trash2, ArrowRight } from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function SimuladorCenarios() {
  const [saldoAtual] = useState(150000); // Simulando um saldo inicial para o CFO Dashboard
  const [receitaMedia] = useState(50000);
  const [despesaMedia] = useState(35000);
  const [mesesProjecao] = useState(6);

  const [simulacoes, setSimulacoes] = useState([
    { id: '1', tipo: 'despesa', descricao: 'Contratar novo funcionário', valor: 5000, impactoMensal: true }
  ]);

  const addSimulacao = () => {
    setSimulacoes([...simulacoes, { id: Date.now().toString(), tipo: 'despesa', descricao: 'Nova simulação', valor: 0, impactoMensal: true }]);
  };

  const removeSimulacao = (id: string) => {
    setSimulacoes(simulacoes.filter(s => s.id !== id));
  };

  const updateSimulacao = (id: string, field: string, val: any) => {
    const n = [...simulacoes];
    const item = n.find(s => s.id === id)!;
    (item as any)[field] = val;
    setSimulacoes(n);
  };

  // Gerar dados do gráfico
  const dadosGrafico = [];
  let caixaBase = saldoAtual;
  let caixaSimulado = saldoAtual;

  const hoje = new Date();
  for (let i = 0; i <= mesesProjecao; i++) {
    const mes = addMonths(hoje, i);
    const label = format(mes, 'MMM/yyyy', { locale: ptBR });

    if (i > 0) {
      caixaBase += (receitaMedia - despesaMedia);

      let deltaSimulado = 0;
      simulacoes.forEach(s => {
        if (s.tipo === 'receita') deltaSimulado += s.valor;
        if (s.tipo === 'despesa') deltaSimulado -= s.valor;
      });

      caixaSimulado += (receitaMedia - despesaMedia) + deltaSimulado;
    }

    dadosGrafico.push({
      mes: label,
      Atual: caixaBase,
      Simulado: caixaSimulado
    });
  }

  return (
    <div className="glass" style={{ padding: 24, borderRadius: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <BrainCircuit size={20} color="#8b5cf6" /> Simulador de Cenários (What-If)
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Projete o impacto não caixa futuro simulando contratações, cortes ou aumento de vendas.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        {/* Painel de Variáveis */}
        <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)' }}>Variáveis de Simulação</h3>
          
          {simulacoes.map(s => (
            <div key={s.id} style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, background: 'var(--bg-secondary)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <select className="input-field" style={{ flex: 1 }} value={s.tipo} onChange={e => updateSimulacao(s.id, 'tipo', e.target.value)}>
                  <option value="receita">+ Aumento de Receita</option>
                  <option value="despesa">- Nova Despesa (Custo)</option>
                </select>
                <button onClick={() => removeSimulacao(s.id)} className="btn-icon" style={{ color: '#ef4444' }}><Trash2 size={16}/></button>
              </div>
              <input type="text" className="input-field" placeholder="Ex: Contratar Diretor" value={s.descricao} onChange={e => updateSimulacao(s.id, 'descricao', e.target.value)} />
              <input type="number" className="input-field" placeholder="Valor (R$)" value={s.valor} onChange={e => updateSimulacao(s.id, 'valor', Number(e.target.value))} />
            </div>
          ))}

          <button onClick={addSimulacao} className="btn-secondary" style={{ padding: '8px', justifyContent: 'center' }}>
            <Plus size={16} /> Adicionar Variável
          </button>
        </div>

        {/* Gráfico Comparativo */}
        <div style={{ flex: '2 1 400px' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12 }}>Projeção de Caixa ({mesesProjecao} Meses)</h3>
          <div style={{ height: 280, width: '100%', padding: 16, background: 'var(--bg-glass-strong)', borderRadius: 12, border: '1px solid var(--border)' }}>
            <ResponsiveContainer>
              <LineChart data={dadosGrafico} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis dataKey="mes" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `R$ ${val / 1000}k`} />
                <Tooltip 
                  contentStyle={{ background: 'var(--bg-glass-strong)', border: '1px solid var(--border)', borderRadius: 8 }}
                  formatter={(value: any) => formatarMoeda(value)}
                  labelStyle={{ color: 'var(--text-secondary)' }}
                />
                <Legend />
                <Line type="monotone" dataKey="Atual" name="Cenário Atual" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Simulado" name="Cenário Simulado" stroke="#8b5cf6" strokeWidth={3} strokeDasharray="5 5" dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', padding: 16, background: 'rgba(139,92,246,0.1)', borderRadius: 12, border: '1px solid rgba(139,92,246,0.2)' }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Saldo Final Atual</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#3b82f6' }}>{formatarMoeda(dadosGrafico[dadosGrafico.length - 1].Atual)}</div>
            </div>
            <ArrowRight size={24} color="var(--text-muted)" style={{ alignSelf: 'center' }} />
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Saldo Final Simulado</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#8b5cf6' }}>{formatarMoeda(dadosGrafico[dadosGrafico.length - 1].Simulado)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
