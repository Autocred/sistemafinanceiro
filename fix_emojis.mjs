import fs from 'fs';

let c = fs.readFileSync('src/components/Configuracoes.tsx', 'utf8');

c = c.replace('APAR`NCIA & DESIGN SYSTEM', 'APARÊNCIA & DESIGN SYSTEM')
     .replace('ÃœÂ¬Ã¯Â¸Â  Claro', '☀️ Claro')
     .replace('xR" Escuro', '🌙 Escuro')
     .replace('x  Automático', '⚙️ Automático');

fs.writeFileSync('src/components/Configuracoes.tsx', c);
console.log('Fixed Configuration Emojis!');
