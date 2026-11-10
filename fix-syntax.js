const fs = require('fs');
const files = ['src/components/LancamentosV2.tsx', 'src/components/Lancamentos.tsx'];

files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');
  
  // Find the exact line in LancamentosV2 / Lancamentos that has the transfer span
  const regex = /\{t\.contaNome \|\| \'\-\'\} ➔ \{.*?\}/g;
  
  c = c.replace(regex, "{t.contaNome || '-'} ➔ {((t as any)['contaDestinãoNome']) || ((t as any)['contaDestinoNome']) || (contas.find(c => c.id === ((t as any)['contaDestinãoId'] || (t as any)['contaDestinoId']))?.nome) || '-'}");
  
  fs.writeFileSync(f, c, 'utf8');
});
console.log('Fixed syntax');
