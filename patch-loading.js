const fs = require('fs');
let c = fs.readFileSync('src/components/Login.tsx', 'utf8');

c = c.replace(/setModo\("login"\);\s*alert\("A sessão expirou\. Por favor, faça login com e-mail e senha uma vez para reativar o PIN\."\);\s*return;/, 'setLoading(false); setModo("login"); alert("A sessão expirou. Por favor, faça login com e-mail e senha uma vez para reativar o PIN."); return;');

fs.writeFileSync('src/components/Login.tsx', c, 'utf8');
console.log('Fixed stuck loading');
