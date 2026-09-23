const fs = require('fs');
const file = 'src/components/ModalLancamento.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/form\.tipo === 'transferencia'/g, "(form.tipo as string) === 'transferencia'");
content = content.replace(/form\.tipo !== 'transferencia'/g, "(form.tipo as string) !== 'transferencia'");
content = content.replace(/form\.tipo === 'despesa'/g, "(form.tipo as string) === 'despesa'");
content = content.replace(/form\.tipo === 'receita'/g, "(form.tipo as string) === 'receita'");

fs.writeFileSync(file, content, 'utf8');
console.log('Done');
