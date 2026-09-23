const fs = require('fs');
const files = [
  'src/components/Relatorios.tsx',
  'src/components/Dashboard.tsx',
  'src/components/ChatIA.tsx',
];
files.forEach(f => {
  try {
    let content = fs.readFileSync(f, 'utf8');
    content = content.replace(/formatter=\{\(v: number\) => \[fmt\(v\)\]\}/g, 'formatter={(v: unknown) => [fmt(Number(v))]}');
    fs.writeFileSync(f, content, 'utf8');
    console.log('Fixed:', f);
  } catch(e) { console.log('Skip:', f, e.message); }
});
console.log('Done.');
