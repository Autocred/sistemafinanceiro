const fs = require('fs');
let c = fs.readFileSync('src/components/Contas.tsx', 'utf8');

c = c.replace(/filter\(\(f\) => f\.cartaoNome/g, "filter((f: any) => f.cartaoNome");
c = c.replace(/filter\(\(t\) => t\.cartaoNome/g, "filter((t: any) => t.cartaoNome");

fs.writeFileSync('src/components/Contas.tsx', c);
console.log('Fixed types in Contas.tsx');
