const fs = require('fs');

let c = fs.readFileSync('src/app/page.tsx', 'utf8');

c = c.replace(
  /\{\/\* AutoBackup movido para CRON server-side \*\/\}/g, 
  '{/* AutoBackup ativado novamente (roda silenciosamente no browser) */}\n      <AutoBackup />'
);

fs.writeFileSync('src/app/page.tsx', c);
console.log('Re-enabled AutoBackup in page.tsx');
