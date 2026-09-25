const fs = require('fs');
let c = fs.readFileSync('src/components/Login.tsx', 'utf8');

c = c.replace(
  /backgroundColor:\s*configuracoes\.corPrimaria\s*\|\|\s*'#2563eb',\s*color:\s*'#ffffff',\s*border:\s*'none',\s*boxShadow:\s*'0 4px 10px rgba\(0,0,0,0\.1\)'/g,
  "backgroundColor: 'transparent', color: 'var(--primary)', border: '2px solid var(--primary)', boxShadow: '0 4px 10px rgba(0,0,0,0.05)'"
);

fs.writeFileSync('src/components/Login.tsx', c, 'utf8');
console.log('Reverted to ghost buttons with CSS var');
