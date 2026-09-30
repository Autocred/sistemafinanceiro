const fs = require('fs');
let c = fs.readFileSync('src/components/ModalLancamento.tsx', 'utf8');

c = c.replace(/clientes\.map\(/g, 'clientes.slice(0,50).map(');
c = c.replace(/fornecedores\.map\(/g, 'fornecedores.slice(0,50).map(');
c = c.replace(/categorias\.map\(/g, 'categorias.slice(0,50).map(');

fs.writeFileSync('src/components/ModalLancamento.tsx', c);
console.log('optimized');
