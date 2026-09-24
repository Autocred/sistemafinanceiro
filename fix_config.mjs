import fs from 'fs';
let c = fs.readFileSync('src/components/Configuracoes.tsx', 'utf8');
c = c.replace(/Ã¯Â¿Â½ÃœÂ¬Ã¯Â¸Â  Claro/g, '☀️ Claro')
     .replace(/Ã¯Â¿Â½xR" Escuro/g, '🌙 Escuro')
     .replace(/xR" Escuro/g, '🌙 Escuro')
     .replace(/Ã¯Â¿Â½x  Automático/g, '⚙️ Automático')
     .replace(/x  Automático/g, '⚙️ Automático')
     .replace(/APAR`NCIA & DESIGN SYSTEM/g, 'APARÊNCIA & DESIGN SYSTEM');
fs.writeFileSync('src/components/Configuracoes.tsx', c);
console.log('Done config!');
