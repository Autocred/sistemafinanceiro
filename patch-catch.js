const fs = require('fs');
let c = fs.readFileSync('src/components/Configuracoes.tsx', 'utf8');
c = c.replace(/catch \(e\) {\n      console\.error\(e\);\n      alert\('Erro ao realizar backup: ' \+ \(e\.message \|\| String\(e\)\)\);\n    }/g, 
  "catch (e: any) {\n      console.error(e);\n      alert('Erro ao realizar backup: ' + (e.message || String(e)));\n    }");
fs.writeFileSync('src/components/Configuracoes.tsx', c);
