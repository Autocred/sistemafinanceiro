const fs = require('fs');
let c = fs.readFileSync('src/components/ModalLancamento.tsx', 'utf8');

c = c.replace(/const clientesFornecedoresOptionsEdit = useMemo\([\s\S]*?\}, \[form\.tipo, clientes, fornecedores\]\);/g, '');
c = c.replace(/const contasOptions = useMemo\([^\n]+\n/g, '');
c = c.replace(/const cartoesOptions = useMemo\([^\n]+\n/g, '');

fs.writeFileSync('src/components/ModalLancamento.tsx', c, 'utf8');
