const fs = require('fs');
let c = fs.readFileSync('src/components/ModalLancamento.tsx', 'utf8');

const matches = c.match(/<\/div>\s*<div className="grid-responsive-3">/g);
console.log('Matches found:', matches ? matches.length : 0);
