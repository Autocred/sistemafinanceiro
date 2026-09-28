const fs = require('fs');
let c = fs.readFileSync('src/app/api/cron/lembretes/route.ts', 'utf8');

c = c.replace(/const db = adminDb;/g, "const db = adminDb!;");

fs.writeFileSync('src/app/api/cron/lembretes/route.ts', c);
console.log('Fixed TS Error');
