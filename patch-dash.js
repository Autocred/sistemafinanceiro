const fs = require('fs');

let c = fs.readFileSync('src/components/DashboardMensal.tsx', 'utf8');

const newEvolucao = `
  // Evolução Ano (Receitas e Despesas)
  const evolucaoAno = useMemo(() => {
    return MESES.map((nome, idx) => {
      const mesStr = \`\${ano}-\${String(idx + 1).padStart(2, '0')}\`;
      
      const txMesAtual = txAno.filter(t => {
        if (!normalizeDate(t.dataPagamento || t.dataVencimento || t.data || '').startsWith(mesStr)) return false;
        if (statusFiltro !== 'Todos') {
          if (statusFiltro === 'pago' && t.status !== 'pago') return false;
          if (statusFiltro === 'pendente' && t.status !== 'pendente') return false;
        }
        const cat = t.categoriaNome || t.categoriaId || 'Outros';
        if (categoriaFiltro !== 'Todas' && cat !== categoriaFiltro) return false;
        const cc = t.centroCustoNome || t.centroCustoId || 'Não Informado';
        if (centroCustoFiltro !== 'Todos' && cc !== centroCustoFiltro) return false;
        return true;
      });

      const tDespesas = txMesAtual.filter(t => t.tipo === 'despesa' && t.formaPagamento !== 'cartao_credito' && t.categoriaNome !== 'Pagamento de Fatura')
        .reduce((acc, t) => acc + (Number(t.valor) || 0), 0);
        
      const tReceitas = txMesAtual.filter(t => t.tipo === 'receita')
        .reduce((acc, t) => acc + (Number(t.valor) || 0), 0);

      return { mes: nome, despesas: tDespesas, receitas: tReceitas, isSelected: idx === mes };
    });
  }, [txAno, mes, ano, statusFiltro, categoriaFiltro, centroCustoFiltro]);
`;

// Replace old evolucaoAno
c = c.replace(/  \/\/ Evolução Ano \(Despesas\)[\s\S]*?\}, \[txAno, mes\]\);/m, newEvolucao.trim());

// Replace CARDS SUPERIORES
const newCards = `      {/* CARDS SUPERIORES */}
      <style>{\`
        .card-red .card-icon { background: linear-gradient(135deg, #ef4444, #dc2626); }
        .card-emerald .card-icon { background: linear-gradient(135deg, #10b981, #059669); }
        .card-cyan .card-icon { background: linear-gradient(135deg, #06b6d4, #0891b2); }
      \`}</style>
      <div className="bi-cards-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        <div className="bi-card card-emerald glass-panel hover-lift fade-in-up" style={{ animationDelay: '0.1s' }}>
          <div className="card-icon"><TrendingUp size={24} /></div>
          <div className="card-info">
            <h3>Total de Receitas</h3>
            <h2>{formatarMoeda(totalReceitas)}</h2>
          </div>
        </div>
        <div className="bi-card card-red glass-panel hover-lift fade-in-up" style={{ animationDelay: '0.2s' }}>
          <div className="card-icon"><TrendingDown size={24} /></div>
          <div className="card-info">
            <h3>Total de Despesas</h3>
            <h2>{formatarMoeda(totalDespesas)}</h2>
          </div>
        </div>
        <div className="bi-card card-blue glass-panel hover-lift fade-in-up" style={{ animationDelay: '0.3s' }}>
          <div className="card-icon"><DollarSign size={24} /></div>
          <div className="card-info">
            <h3>Saldo do Mês</h3>
            <h2>{formatarMoeda(saldoMes)}</h2>
          </div>
        </div>
        <div className="bi-card card-cyan glass-panel hover-lift fade-in-up" style={{ animationDelay: '0.4s' }}>
          <div className="card-icon"><FileText size={24} /></div>
          <div className="card-info">
            <h3>Qtd. Despesas</h3>
            <h2>{qtdDespesas} lançamentos</h2>
          </div>
        </div>
        <div className="bi-card card-orange glass-panel hover-lift fade-in-up" style={{ animationDelay: '0.5s' }}>
          <div className="card-icon"><BarChart3 size={24} /></div>
          <div className="card-info">
            <h3>Categoria (Maior Gasto)</h3>
            <h2>{catMaiorGasto ? catMaiorGasto.nome : '-'}</h2>
            <p>{catMaiorGasto ? formatarMoeda(catMaiorGasto.valor) : ''}</p>
          </div>
        </div>
        <div className="bi-card card-purple glass-panel hover-lift fade-in-up" style={{ animationDelay: '0.6s' }}>
          <div className="card-icon"><TrendingUp size={24} /></div>
          <div className="card-info">
            <h3>Média Diária (Gastos)</h3>
            <h2>{formatarMoeda(mediaDiaria)}</h2>
          </div>
        </div>
      </div>`;

c = c.replace(/      \{\/\* CARDS SUPERIORES \*\/\}[\s\S]*?      \{\/\* RESUMO INTELIGENTE \*\/}/, newCards + '\n\n      {/* RESUMO INTELIGENTE */}');


// Replace Evolucao Chart
const newChart3 = `        {/* GRÁFICO 3: Evolução dos Gastos do Ano */}
        <div className="bi-chart-container glass-panel hover-lift fade-in-up" style={{ animationDelay: '0.9s' }}>
          <h3 className="chart-title">Evolução de Receitas e Despesas (Últimos Meses)</h3>
          <div style={{ height: Math.max(250, gastosPorCentroCusto.length * 60 + 40), width: '100%' }}>
            <ResponsiveContainer>
              <BarChart data={evolucaoAno.slice(Math.max(0, mes - 5), mes + 1)} margin={{ top: 30, right: 30, left: 20, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorRec" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.9}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.4}/>
                  </linearGradient>
                  <linearGradient id="colorDesp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.9}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.4}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.4} />
                <XAxis dataKey="mes" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis hide />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 13, paddingTop: 10 }} />
                <RechartsTooltip cursor={{fill: 'var(--bg-hover)'}} content={({ active, payload, label }: any) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bi-tooltip">
                        <p className="title">{label}</p>
                        {payload.map((p: any) => (
                          <div className="row" key={p.dataKey}><span className="dot" style={{background: p.color || p.fill}}/> {p.name}: <b>{formatarMoeda(p.value || 0)}</b></div>
                        ))}
                      </div>
                    );
                  }
                  return null;
                }} />
                <Bar name="Receitas" dataKey="receitas" fill="url(#colorRec)" radius={[6, 6, 0, 0]} animationDuration={1500} barSize={20} />
                <Bar name="Despesas" dataKey="despesas" fill="url(#colorDesp)" radius={[6, 6, 0, 0]} animationDuration={1500} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>`;

c = c.replace(/        \{\/\* GRÁFICO 3: Evolução dos Gastos do Ano \*\/\}[\s\S]*?        <\/div>\n\n      <\/div>/, newChart3 + '\n\n      </div>');

fs.writeFileSync('src/components/DashboardMensal.tsx', c);
console.log('Patched dashboard monthly');
