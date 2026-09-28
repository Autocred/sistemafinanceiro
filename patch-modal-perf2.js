const fs = require('fs');
let c = fs.readFileSync('src/components/ModalLancamento.tsx', 'utf8');

c = c.replace(
  /const match = historico\.sort\(\(a,b\)=>b\.count-a\.count\)\.find\(h => h\.texto && descLower\.includes\(h\.texto\.toLowerCase\(\)\)\);/g,
  "const historicoSorted = [...historico].sort((a,b)=>b.count-a.count); const match = historicoSorted.find(h => h.texto && descLower.includes(h.texto.toLowerCase()));"
);

fs.writeFileSync('src/components/ModalLancamento.tsx', c, 'utf8');
console.log('Patched historico sort');
