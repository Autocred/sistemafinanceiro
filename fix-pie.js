const fs = require('fs');
let content = fs.readFileSync('src/components/DashboardMensal.tsx', 'utf-8');

// 1. Update PieChart
const oldPie = `<ResponsiveContainer>
              <PieChart>
                <Pie
                  data={gastosPorCategoria}
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="valor"
                  nameKey="nome"
                  animationDuration={1500}
                >
                  {gastosPorCategoria.map((entry, index) => (
                    <Cell key={\`cell-pie-\${index}\`} fill={COLORS[index % COLORS.length]} style={{ filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.15))' }} />
                  ))}
                </Pie>
                <RechartsTooltip content={customTooltip3D} />
                <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
              </PieChart>
            </ResponsiveContainer>`;

const newPie = `<ResponsiveContainer>
              <PieChart margin={{ top: 0, right: 120, left: 0, bottom: 0 }}>
                <Pie
                  data={gastosPorCategoria}
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="valor"
                  nameKey="nome"
                  animationDuration={1500}
                  cx="35%"
                >
                  {gastosPorCategoria.map((entry, index) => (
                    <Cell key={\`cell-pie-\${index}\`} fill={COLORS[index % COLORS.length]} style={{ filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.15))' }} />
                  ))}
                </Pie>
                <RechartsTooltip content={customTooltip3D} />
                <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary)' }} formatter={(value, entry) => \`\${value} (R$ \${(entry.payload).valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})\`} />
              </PieChart>
            </ResponsiveContainer>`;

content = content.replace(oldPie, newPie);


// 2. Remove isCartaoPendente filter
// Old: const despesas = txMes.filter(t => t.tipo === 'despesa' && !isCartaoPendente(t, faturas));
// If we already replaced it in a previous step, it might be just `t.tipo === 'despesa'`.
// Let's check and replace.
const oldFilter = `const despesas = txMes.filter(t => t.tipo === 'despesa' && !isCartaoPendente(t, faturas));`;
const newFilter = `const despesas = txMes.filter(t => t.tipo === 'despesa');`;
if (content.includes(oldFilter)) {
    content = content.replace(oldFilter, newFilter);
}

// 3. Just to make sure, let's also remove it from evolucaoAno if it's there
const oldEvolucao = `const txMesAtual = txAno.filter(t => t.tipo === 'despesa' && !isCartaoPendente(t, faturas) && getMonth(parseISO(t.data)) === idx);`;
const newEvolucao = `const txMesAtual = txAno.filter(t => t.tipo === 'despesa' && getMonth(parseISO(t.data)) === idx);`;
if (content.includes(oldEvolucao)) {
    content = content.replace(oldEvolucao, newEvolucao);
}

fs.writeFileSync('src/components/DashboardMensal.tsx', content);
console.log('PieChart script executed');
