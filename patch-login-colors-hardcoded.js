const fs = require('fs');
let c = fs.readFileSync('src/components/Login.tsx', 'utf8');

c = c.replace(
  /style=\{\{\s*backgroundColor:\s*'transparent',\s*color:\s*'var\(--primary\)',\s*border:\s*'2px solid var\(--primary\)',\s*boxShadow:\s*'0 4px 10px rgba\(0,0,0,0\.05\)'\s*\}\}/g,
  "style={{ backgroundColor: '#f8fafc', color: configuracoes?.corPrimaria || '#2563eb', border: `2px solid ${configuracoes?.corPrimaria || '#2563eb'}`, boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}"
);

// Fix the little indicator circles too
c = c.replace(
  /borderColor:\s*'var\(--primary\)',/g,
  "borderColor: configuracoes?.corPrimaria || '#2563eb',"
);
c = c.replace(
  /backgroundColor:\s*pinDigitado\.length\s*>\s*i\s*\?\s*'var\(--primary\)'\s*:\s*'transparent'/g,
  "backgroundColor: pinDigitado.length > i ? (configuracoes?.corPrimaria || '#2563eb') : 'transparent'"
);

fs.writeFileSync('src/components/Login.tsx', c, 'utf8');
console.log('Fixed Login buttons to explicit colors');
