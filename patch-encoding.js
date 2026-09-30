const fs = require('fs');
let c = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

c = c.replace(/CÃ LCULO PROJEï¿½!Ã’O/g, 'CÁLCULO PROJEÇÃO');
c = c.replace(/ï¿½x ï¿½ Fatura Fechada ï¿½/g, '💳 Fatura Fechada —');
c = c.replace(/: 'ï¿½ '}/g, ": '---'}");
c = c.replace(/ANTECIPAï¿½!Ã’O/g, 'ANTECIPAÇÃO');
c = c.replace(/ATï¿½0/g, 'ATÉ');
c = c.replace(/GRÃ FICO/g, 'GRÁFICO');
c = c.replace(/PROJEï¿½!Ã’O/g, 'PROJEÇÃO');
c = c.replace(/SEï¿½!Ã’O/g, 'SEÇÃO');
c = c.replace(/GRÃ FICOS/g, 'GRÁFICOS');

fs.writeFileSync('src/components/Dashboard.tsx', c);
console.log('Fixed encoding issues in Dashboard.tsx');
