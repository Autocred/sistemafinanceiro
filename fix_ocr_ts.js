const fs = require('fs');
const file = 'src/lib/ocr-pipeline.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/m => onProgress\?\.\(m\.status \+ ' \(' \+ Math\.round\(m\.progress \* 100\) \+ '%\)'\)/g, "(m: any) => onProgress?.(m.status + ' (' + Math.round(m.progress * 100) + '%)')");
content = content.replace(/l\.trim\(\)\.toLowerCase\(\)\.includes\('pago'\)/g, "((l: any) => l.trim().toLowerCase().includes('pago'))");
content = content.replace(/l\.trim\(\)\.toLowerCase\(\)\.includes\('recebido'\)/g, "((l: any) => l.trim().toLowerCase().includes('recebido'))");
content = content.replace(/const isReceita = linhas\.some\(l =>/g, "const isReceita = linhas.some((l: any) =>");

fs.writeFileSync(file, content, 'utf8');
console.log('Done');
