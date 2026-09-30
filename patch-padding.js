const fs = require('fs');
let c = fs.readFileSync('src/components/ModalLancamento.tsx', 'utf8');

c = c.replace(/padding: '10px', borderRadius: 10,/g, "padding: '8px 4px', borderRadius: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',");
c = c.replace(/fontSize: 13,/g, "fontSize: 12,");

fs.writeFileSync('src/components/ModalLancamento.tsx', c);
console.log('Fixed buttons padding');
