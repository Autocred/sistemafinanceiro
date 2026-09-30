const fs = require('fs');
let c = fs.readFileSync('src/components/Configuracoes.tsx', 'utf8');
c = c.replace(/alert\('Erro ao realizar backup'\);/g, "alert('Erro ao realizar backup: ' + (e.message || String(e)));");
fs.writeFileSync('src/components/Configuracoes.tsx', c);
