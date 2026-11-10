const fs = require('fs');
let content = fs.readFileSync('src/components/DashboardMensal.tsx', 'utf-8');

const oldFormatter = `formatter={(value, entry) => \`\${value} (R$ \${(entry.payload).valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})\`}`;
const newFormatter = `formatter={(value, entry: any) => \`\${value} (R$ \${(entry?.payload?.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})\`}`;

content = content.replace(oldFormatter, newFormatter);
fs.writeFileSync('src/components/DashboardMensal.tsx', content);
