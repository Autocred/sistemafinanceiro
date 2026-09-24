const fs = require('fs');
let c = fs.readFileSync('src/app/page.tsx', 'utf8');

// Insert setPaginaAtual before setAuthLoading in master bypass
c = c.replace(
  "          setAuthLoading(false);\r\n             return; // Pula o resto da valida",
  "          setPaginaAtual('dashboard');\r\n          setAuthLoading(false);\r\n             return; // Pula o resto da valida"
);

// Also insert for normal user auth paths that call setAutenticado
// Find all setAutenticado(true) calls and add setPaginaAtual after (that aren't already wrapped)
// Already done for onLogin handler in page.tsx line 911

fs.writeFileSync('src/app/page.tsx', c);
console.log('Done');
