const fs = require('fs');

let page = fs.readFileSync('src/app/page.tsx', 'utf8');
// Remove the two blocks
page = page.replace(/\/\/\s*Master backup check[\s\S]*?\}\)\.catch\(console\.error\);\s*\}\);\s*\}/g, '/* Master backup agora via CRON */');
page = page.replace(/\/\/\s*Auto backup check[\s\S]*?\}\)\.catch\(console\.error\);\s*\}\);\s*\}/g, '/* Auto backup agora via CRON */');

fs.writeFileSync('src/app/page.tsx', page);
console.log('Cleaned page.tsx');
