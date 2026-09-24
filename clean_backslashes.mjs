import fs from 'fs';
let c = fs.readFileSync('src/components/MetasGamificadasV2.tsx', 'utf8');

// Replace any occurrence of \` with `
c = c.replace(/\\`/g, "`");
// Replace any occurrence of \$ with $
c = c.replace(/\\\$/g, "$");

fs.writeFileSync('src/components/MetasGamificadasV2.tsx', c);
console.log('Cleaned backslashes!');
