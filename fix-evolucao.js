const fs = require('fs');
let content = fs.readFileSync('src/components/DashboardMensal.tsx', 'utf-8');

const oldEvolucao = `const txMesAtual = txAno.filter(t => t.tipo === 'despesa' && getMonth(parseISO(t.data)) === idx);`;
const newEvolucao = `const txMesAtual = txAno.filter(t => {
      const mesStr = \`\${ano}-\${String(idx + 1).padStart(2, '0')}\`;
      return t.tipo === 'despesa' && String(t.data || '').startsWith(mesStr) && t.categoriaNome !== 'Pagamento de Fatura';
    });`;

content = content.replace(oldEvolucao, newEvolucao);
fs.writeFileSync('src/components/DashboardMensal.tsx', content);
