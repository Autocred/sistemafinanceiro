const fs = require('fs');
let src = fs.readFileSync('src/lib/types.ts', 'utf8');
const target = '  whatsappHorario?: string;';
const replacement = '  whatsappHorario?: string;\n  whatsappHorarioLembretes?: string;\n  whatsappHorarioFechamento?: string;';
if (src.includes(target)) {
  src = src.replace(target, replacement);
  fs.writeFileSync('src/lib/types.ts', src);
  console.log('✅ types.ts atualizado');
} else {
  console.error('Target não encontrado');
}
