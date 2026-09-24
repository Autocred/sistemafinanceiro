import fs from 'fs';
let c = fs.readFileSync('src/components/Configuracoes.tsx', 'utf8');

const lines = c.split('\n');
lines[557] = lines[557].replace('APAR`NCIA', 'APARÊNCIA');
lines[574] = '                  ☀️ Claro';
lines[586] = '                  🌙 Escuro';
lines[598] = '                  ⚙️ Automático';

fs.writeFileSync('src/components/Configuracoes.tsx', lines.join('\n'));
console.log('Done hard lines!');
