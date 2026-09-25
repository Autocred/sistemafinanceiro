const fs = require('fs');
let c = fs.readFileSync('src/components/Login.tsx', 'utf8');

c = c.replace(
  "sessionStorage.setItem('paginaAtual', 'dashboard');",
  "sessionStorage.setItem('paginaAtual', 'dashboard');\n      sessionStorage.setItem('is_unlocked', 'true');"
);

fs.writeFileSync('src/components/Login.tsx', c, 'utf8');
console.log('Fixed double prompt');
