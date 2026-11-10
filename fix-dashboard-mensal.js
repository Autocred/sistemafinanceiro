const fs = require('fs');
let c = fs.readFileSync('src/components/DashboardMensal.tsx', 'utf8');

c = c.replace(
  "const despesas = txMes.filter(t => t.tipo === 'despesa' && t.categoriaNome !== 'Pagamento de Fatura' && t.formaPagamento !== 'cartao_credito');",
  "const despesas = txMes.filter(t => t.tipo === 'despesa' && t.status === 'pago' && t.categoriaNome !== 'Pagamento de Fatura' && t.formaPagamento !== 'cartao_credito');"
);

c = c.replace(
  "const receitas = txMes.filter(t => t.tipo === 'receita');",
  "const receitas = txMes.filter(t => t.tipo === 'receita' && t.status === 'pago');"
);

c = c.replace(
  '<div className="ind-item"><span>Total Receitas</span>',
  '<div className="ind-item"><span>Receitas Pagas</span>'
);

c = c.replace(
  '<div className="ind-item"><span>Total Despesas</span>',
  '<div className="ind-item"><span>Despesas Pagas</span>'
);

fs.writeFileSync('src/components/DashboardMensal.tsx', c);
