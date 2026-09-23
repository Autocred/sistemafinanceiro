const fs = require('fs');
let content = fs.readFileSync('src/components/DashboardMensal.tsx', 'utf-8');
content = content.replace(/t\.data \|\| ''/g, "t.dataPagamento || t.dataLancamento || t.data || ''");
fs.writeFileSync('src/components/DashboardMensal.tsx', content);
