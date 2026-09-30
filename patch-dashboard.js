const fs = require('fs');
let lines = fs.readFileSync('src/components/Dashboard.tsx', 'utf8').split('\n');
lines[486] = "                💳 Fatura Fechada — {f.cartaoNome || 'Cartão'}";
lines[489] = "                Valor: <span className=\"valor-sensivel\">{formatarMoeda(f.valorTotal)}</span> • Vencimento: {f.dataVencimento ? format(new Date(f.dataVencimento + 'T12:00:00'), 'dd/MM/yyyy') : '---'}";
fs.writeFileSync('src/components/Dashboard.tsx', lines.join('\n'));
console.log('Fixed lines directly');
