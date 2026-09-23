const fs = require('fs');
let content = fs.readFileSync('src/components/DashboardMensal.tsx', 'utf-8');

const oldCharts = content.substring(content.indexOf('{/* CHARTS GRID */}'), content.indexOf('</div>\n    </div>\n  );\n}'));

const newCharts = `{/* CHARTS GRID */}
      <div className="bi-charts-grid" style={{ gridTemplateColumns: '1fr' }}>
        
        {/* GRÁFICO 1: Gastos por Categoria */}
        <div className="bi-chart-container glass-panel hover-lift fade-in-up" style={{ animationDelay: '0.7s' }}>
          <h3 className="chart-title">Gastos por Categoria</h3>
          <div style={{ height: 400, width: '100%' }}>
            <ResponsiveContainer>
              <BarChart layout="vertical" data={gastosPorCategoria} margin={{ top: 20, right: 120, left: 30, bottom: 5 }}>
                <defs>
                  {gastosPorCategoria.map((entry, index) => (
                    <linearGradient key={\`grad-\${index}\`} id={\`colorUv-\${index}\`} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="5%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.9}/>
                      <stop offset="95%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.5}/>
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--border)" opacity={0.4} />
                <XAxis type="number" hide />
                <YAxis dataKey="nome" type="category" stroke="var(--text-secondary)" fontSize={13} tickLine={false} axisLine={false} width={130} />
                <RechartsTooltip content={customTooltip3D} cursor={{fill: 'var(--bg-hover)'}} />
                <Bar dataKey="valor" radius={[0, 6, 6, 0]} animationDuration={1500} barSize={25}>
                  {gastosPorCategoria.map((entry, index) => (
                    <Cell key={\`cell-\${index}\`} fill={\`url(#colorUv-\${index})\`} style={{ filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.1))' }} />
                  ))}
                  <LabelList dataKey="valor" position="right" formatter={(v: number) => formatarMoeda(v)} style={{ fill: 'var(--text-primary)', fontSize: 13, fontWeight: 'bold' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRÁFICO 2: Gastos por Centro de Custo */}
        <div className="bi-chart-container glass-panel hover-lift fade-in-up" style={{ animationDelay: '0.8s' }}>
          <h3 className="chart-title">Gastos por Centro de Custo</h3>
          <div style={{ height: 400, width: '100%' }}>
            <ResponsiveContainer>
              <BarChart layout="vertical" data={gastosPorCentroCusto} margin={{ top: 20, right: 120, left: 30, bottom: 5 }}>
                <defs>
                  {gastosPorCentroCusto.map((entry, index) => (
                    <linearGradient key={\`grad-cc-\${index}\`} id={\`colorCc-\${index}\`} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="5%" stopColor={COLORS[(index + 3) % COLORS.length]} stopOpacity={0.9}/>
                      <stop offset="95%" stopColor={COLORS[(index + 3) % COLORS.length]} stopOpacity={0.5}/>
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--border)" opacity={0.4} />
                <XAxis type="number" hide />
                <YAxis dataKey="nome" type="category" stroke="var(--text-secondary)" fontSize={13} tickLine={false} axisLine={false} width={130} />
                <RechartsTooltip content={customTooltip3D} cursor={{fill: 'var(--bg-hover)'}} />
                <Bar dataKey="valor" radius={[0, 6, 6, 0]} animationDuration={1500} barSize={25}>
                  {gastosPorCentroCusto.map((entry, index) => (
                    <Cell key={\`cell-cc-\${index}\`} fill={\`url(#colorCc-\${index})\`} style={{ filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.1))' }} />
                  ))}
                  <LabelList dataKey="valor" position="right" formatter={(v: number) => formatarMoeda(v)} style={{ fill: 'var(--text-primary)', fontSize: 13, fontWeight: 'bold' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRÁFICO 3: Evolução dos Gastos do Ano */}
        <div className="bi-chart-container glass-panel hover-lift fade-in-up" style={{ animationDelay: '0.9s' }}>
          <h3 className="chart-title">Evolução dos Gastos (Últimos Meses)</h3>
          <div style={{ height: 350, width: '100%' }}>
            <ResponsiveContainer>
              <BarChart data={evolucaoAno.slice(Math.max(0, mes - 5), mes + 1)} margin={{ top: 30, right: 30, left: 20, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorEvolucao" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.9}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.4} />
                <XAxis dataKey="mes" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis hide />
                <RechartsTooltip cursor={{fill: 'var(--bg-hover)'}} content={({ active, payload, label }: any) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bi-tooltip">
                        <p className="title">{label}</p>
                        <div className="row"><span className="dot" style={{background: payload[0].color || payload[0].fill}}/> Total: <b>{formatarMoeda(payload[0].value || 0)}</b></div>
                      </div>
                    );
                  }
                  return null;
                }} />
                <Bar dataKey="valor" radius={[6, 6, 0, 0]} animationDuration={1500} barSize={40}>
                  {evolucaoAno.slice(Math.max(0, mes - 5), mes + 1).map((entry, index) => (
                    <Cell key={\`cell-ev-\${index}\`} fill={entry.isSelected ? '#3b82f6' : 'url(#colorEvolucao)'} style={{ filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.1))' }} />
                  ))}
                  <LabelList dataKey="valor" position="top" formatter={(v: number) => formatarMoeda(v)} style={{ fill: 'var(--text-primary)', fontSize: 12, fontWeight: 'bold' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>`;

content = content.replace(oldCharts, newCharts);
fs.writeFileSync('src/components/DashboardMensal.tsx', content);
console.log('Script 2 done');
