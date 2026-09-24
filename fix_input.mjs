import fs from 'fs';
let c = fs.readFileSync('src/components/MetasGamificadasV2.tsx', 'utf8');

c = c.replace(/type="number" step="0\.01" value=\{editingMeta\.valorAlvo\} onChange=\{e => setEditingMeta\(\{\.\.\.editingMeta, valorAlvo: Number\(e\.target\.value\)\}\)\}/g, 
"type=\"text\" value={editingMeta.valorAlvo} onChange={e => setEditingMeta({...editingMeta, valorAlvo: e.target.value.replace(/[^0-9,.]/g, '').replace(',', '.')})} ");

fs.writeFileSync('src/components/MetasGamificadasV2.tsx', c);
console.log('Fixed input type!');
