const fs = require('fs');
let c = fs.readFileSync('src/components/ModalLancamento.tsx', 'utf8');

// 1. Change the buttons wrapper
c = c.replace(
  /<div className="grid-responsive-3">\s*\{\['despesa', 'receita', 'transferencia'\]/g,
  `<div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {['despesa', 'receita', 'transferencia']`
);

// 2. Change the default comportamento to 'variavel'
c = c.replace(/comportamento: initialData\?\.comportamento \|\| 'fixa',/g, "comportamento: initialData?.comportamento || 'variavel',");

fs.writeFileSync('src/components/ModalLancamento.tsx', c);
console.log('Fixed buttons and default comportamento');
