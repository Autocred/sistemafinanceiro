const fs = require('fs');

let c = fs.readFileSync('src/components/ModalLancamento.tsx', 'utf8');
const rx = /<\/div>\s*<div className="grid-responsive-3">\s*\{form\.formaPagamento === 'cartao_credito'/g;
c = c.replace(rx, "{form.formaPagamento === 'cartao_credito'");
fs.writeFileSync('src/components/ModalLancamento.tsx', c);
console.log('Merged data grids!');
