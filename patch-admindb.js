const fs = require('fs');
let src = fs.readFileSync('src/app/api/cron/fechamento-diario/route.ts', 'utf8');

src = src.replace(/adminDb\.collection/g, 'adminDb!.collection');

fs.writeFileSync('src/app/api/cron/fechamento-diario/route.ts', src);
console.log('Fixed adminDb');
