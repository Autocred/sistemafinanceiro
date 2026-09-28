const fs = require('fs');
let c = fs.readFileSync('src/components/Login.tsx', 'utf8');

c = c.replace(/configuracoes\?\.corPrimaria/g, "(configuracoes?.corPrimaria === '#ffffff' || configuracoes?.corPrimaria === '#fff' || !configuracoes?.corPrimaria ? '#2563eb' : configuracoes.corPrimaria)");

fs.writeFileSync('src/components/Login.tsx', c, 'utf8');
console.log('Patched safe primary color');
