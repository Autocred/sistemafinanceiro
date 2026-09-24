const fs = require('fs');
let c = fs.readFileSync('src/components/Login.tsx', 'utf8');

c = c.replace(
  /sessionStorage\.setItem\('active_session_auth', 'true'\);/g, 
  "sessionStorage.setItem('active_session_auth', 'true');\n      sessionStorage.setItem('paginaAtual', 'dashboard');"
);

fs.writeFileSync('src/components/Login.tsx', c);
