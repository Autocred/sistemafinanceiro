const fs = require('fs');
let content = fs.readFileSync('src/components/DashboardMensal.tsx', 'utf-8');

// 1. Fix categoriaNome and add gastosPorCentroCusto
const oldAgrupamento = `const gastosPorCategoria = useMemo(() => {
    const mapa = new Map<string, { total: number; qtd: number }>();
    despesas.forEach(d => {
      const cat = d.categoriaId || 'Outros';`;

const newAgrupamento = `// Agrupamento por Centro de Custo
  const gastosPorCentroCusto = useMemo(() => {
    const mapa = new Map<string, { total: number; qtd: number }>();
    despesas.forEach(d => {
      const cc = d.centroCustoNome || d.centroCustoId || 'Não Informado';
      const atual = mapa.get(cc) || { total: 0, qtd: 0 };
      mapa.set(cc, { total: atual.total + (Number(d.valor) || 0), qtd: atual.qtd + 1 });
    });
    return Array.from(mapa.entries()).map(([nome, dados]) => ({
      nome, valor: dados.total, qtd: dados.qtd, percentual: totalDespesas > 0 ? (dados.total / totalDespesas) * 100 : 0
    })).sort((a, b) => b.valor - a.valor);
  }, [despesas, totalDespesas]);

  const gastosPorCategoria = useMemo(() => {
    const mapa = new Map<string, { total: number; qtd: number }>();
    despesas.forEach(d => {
      const cat = d.categoriaNome || d.categoriaId || 'Outros';`;
      
content = content.replace(oldAgrupamento, newAgrupamento);


// 2. Fix the Gastos por Categoria BarChart
const oldCatChart = `          <div className="bi-chart-container glass-panel fade-in-up" style={{ animationDelay: '0.1s' }}>
            <h3 className="chart-title">Gastos por Categoria</h3>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={gastosPorCategoria.slice(0, 10)} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <defs>
                    {gastosPorCategoria.slice(0, 10).map((entry, index) => (
                      <linearGradient key={\`colorUv-\${index}\`} id={\`colorUv-\${index}\`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.9}/>
                        <stop offset="95%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.3}/>
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.4} />
                  <XAxis dataKey="nome" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => \`R$ \${value/1000}k\`} />
                  <RechartsTooltip content={customTooltip3D} cursor={{fill: 'var(--bg-hover)'}} />
                  <Bar dataKey="valor" radius={[6, 6, 0, 0]} animationDuration={1500}>
                    {gastosPorCategoria.slice(0, 10).map((entry, index) => (
                      <Cell key={\`cell-\${index}\`} fill={\`url(#colorUv-\${index})\`} style={{ filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.1))' }} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>`;

const newCatChart = `          <div className="bi-chart-container glass-panel fade-in-up" style={{ animationDelay: '0.1s' }}>
            <h3 className="chart-title">Gastos por Categoria</h3>
            <div style={{ width: '100%', height: 350, overflowY: 'auto', overflowX: 'hidden' }}>
              <div style={{ height: Math.max(350, gastosPorCategoria.length * 40) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={gastosPorCategoria} margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                    <defs>
                      {gastosPorCategoria.map((entry, index) => (
                        <linearGradient key={\`colorUv-\${index}\`} id={\`colorUv-\${index}\`} x1="0" y1="0" x2="1" y2="0">
                          <stop offset="5%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.9}/>
                          <stop offset="95%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.4}/>
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" opacity={0.4} />
                    <XAxis type="number" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => \`R$ \${value/1000}k\`} />
                    <YAxis dataKey="nome" type="category" stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} width={95} />
                    <RechartsTooltip content={customTooltip3D} cursor={{fill: 'var(--bg-hover)'}} />
                    <Bar dataKey="valor" radius={[0, 6, 6, 0]} animationDuration={1500} barSize={20}>
                      {gastosPorCategoria.map((entry, index) => (
                        <Cell key={\`cell-\${index}\`} fill={\`url(#colorUv-\${index})\`} style={{ filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.1))' }} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="bi-chart-container glass-panel fade-in-up" style={{ animationDelay: '0.15s' }}>
            <h3 className="chart-title">Centros de Custos</h3>
            <div style={{ width: '100%', height: 350, overflowY: 'auto', overflowX: 'hidden' }}>
              <div style={{ height: Math.max(350, gastosPorCentroCusto.length * 40) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={gastosPorCentroCusto} margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                    <defs>
                      {gastosPorCentroCusto.map((entry, index) => (
                        <linearGradient key={\`colorCc-\${index}\`} id={\`colorCc-\${index}\`} x1="0" y1="0" x2="1" y2="0">
                          <stop offset="5%" stopColor={COLORS[(index+3) % COLORS.length]} stopOpacity={0.9}/>
                          <stop offset="95%" stopColor={COLORS[(index+3) % COLORS.length]} stopOpacity={0.4}/>
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" opacity={0.4} />
                    <XAxis type="number" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => \`R$ \${value/1000}k\`} />
                    <YAxis dataKey="nome" type="category" stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} width={95} />
                    <RechartsTooltip content={customTooltip3D} cursor={{fill: 'var(--bg-hover)'}} />
                    <Bar dataKey="valor" radius={[0, 6, 6, 0]} animationDuration={1500} barSize={20}>
                      {gastosPorCentroCusto.map((entry, index) => (
                        <Cell key={\`cell-cc-\${index}\`} fill={\`url(#colorCc-\${index})\`} style={{ filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.1))' }} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>`;

content = content.replace(oldCatChart, newCatChart);

fs.writeFileSync('src/components/DashboardMensal.tsx', content);
console.log('Script executed');
