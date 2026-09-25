const fs = require('fs');
let c = fs.readFileSync('src/components/Login.tsx', 'utf8');

c = c.replace(
  /backgroundColor: '#f8fafc',\s*color: configuracoes\.corPrimaria\s*\|\|\s*'#2563eb',\s*border:\s*'1px solid #e2e8f0'/g,
  "backgroundColor: configuracoes.corPrimaria || '#2563eb', color: '#ffffff', border: 'none', boxShadow: '0 4px 10px rgba(0,0,0,0.1)'"
);

fs.writeFileSync('src/components/Login.tsx', c, 'utf8');
console.log('PIN pad colors updated');
