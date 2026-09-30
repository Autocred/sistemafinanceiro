const fs = require('fs');
let c = fs.readFileSync('src/components/ModalLancamento.tsx', 'utf8');

const matches = [...c.matchAll(/<\/div>\s*<div className="grid-responsive-3">/g)];
matches.forEach((m, i) => {
    const idx = m.index;
    console.log(`Match ${i}:`);
    console.log(c.substring(idx - 50, idx + 80));
    console.log('---');
});
