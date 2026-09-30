const fs = require('fs');
let c = fs.readFileSync('src/app/api/cron/lembretes/route.ts', 'utf8');

c = c.replace(/cfg = confSnap\.docs\[0\]\.data\(\);/g, "cfg = confSnap.docs[0].data() as ConfiguracaoApp;");

fs.writeFileSync('src/app/api/cron/lembretes/route.ts', c);
console.log('Fixed TS cast');
