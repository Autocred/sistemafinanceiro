const fs = require('fs');
let c = fs.readFileSync('src/components/Login.tsx', 'utf8');

c = c.replace(/if \(finalPin && finalPass && finalEmail\) \{/g, "if (finalPin) {");

c = c.replace(/if \(!savedEmail \|\| !savedPass\) throw new Error\("Credenciais não encontradas"\);/g, 'if (!savedEmail || !savedPass) { setModo("login"); alert("A sessão expirou. Por favor, faça login com e-mail e senha uma vez para reativar o PIN."); return; }');

fs.writeFileSync('src/components/Login.tsx', c, 'utf8');
console.log('Patched PIN condition');
