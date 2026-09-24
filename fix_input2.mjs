import fs from 'fs';
let c = fs.readFileSync('src/components/MetasGamificadasV2.tsx', 'utf8');

c = c.replace(/valorAlvo: e\.target\.value\.replace\(\/\[\^0\-9\,\.\]\/g, ''\)\.replace\(',', '\.'\)/g, "valorAlvo: Number(e.target.value.replace(/[^0-9,.]/g, '').replace(',', '.'))");

fs.writeFileSync('src/components/MetasGamificadasV2.tsx', c);
console.log('Fixed TS string to number');
