const fs = require('fs');
let c = fs.readFileSync('src/components/ModalLancamento.tsx', 'utf8');

const indexForm = c.indexOf('function FormManual');
const head = c.slice(0, indexForm);
let tail = c.slice(indexForm);

tail = tail.replace(/p\.categoriaNome/g, '(form as any).categoriaNome');
tail = tail.replace(/p\.centroCustoNome/g, '(form as any).centroCustoNome');
tail = tail.replace(/p\.tipo/g, '(form.tipo)');
tail = tail.replace(/p\.clienteNome/g, '(form as any).clienteNome');
tail = tail.replace(/p\.fornecedorNome/g, '(form as any).fornecedorNome');

fs.writeFileSync('src/components/ModalLancamento.tsx', head + tail);
console.log('Fixed FormManual references');
