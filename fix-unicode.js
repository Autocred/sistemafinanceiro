const fs = require('fs');
const files = ['src/components/LancamentosV2.tsx', 'src/components/Lancamentos.tsx'];
files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  c = c.replace(/\[.contaDestin.*?Nome.\]/g, "['contaDestinãoNome']");
  c = c.replace(/\[.contaDestin.*?Id.\]/g, "['contaDestinãoId']");
  fs.writeFileSync(f, c, 'utf8');
});
console.log('Fixed');
