const fs = require('fs');
let c = fs.readFileSync('src/components/Login.tsx', 'utf8');

c = c.replace(
  /borderColor:\s*configuracoes\.corPrimaria\s*\|\|\s*'#2563eb',/g,
  "borderColor: 'var(--primary)',"
);
c = c.replace(
  /backgroundColor:\s*pinDigitado\.length\s*>\s*i\s*\?\s*\(configuracoes\.corPrimaria\s*\|\|\s*'#2563eb'\)\s*:\s*'transparent'/g,
  "backgroundColor: pinDigitado.length > i ? 'var(--primary)' : 'transparent'"
);

fs.writeFileSync('src/components/Login.tsx', c, 'utf8');
console.log('Fixed indicators to var(--primary)');
