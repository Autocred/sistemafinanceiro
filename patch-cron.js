const fs = require('fs');
let c = fs.readFileSync('src/app/api/cron/backups/route.ts', 'utf8');
c = c.replace(/'historico_ia'/g, "'historicoIA'");
fs.writeFileSync('src/app/api/cron/backups/route.ts', c);
