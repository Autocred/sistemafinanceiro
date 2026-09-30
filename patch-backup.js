const fs = require('fs');
let c = fs.readFileSync('src/lib/backup.ts', 'utf8');
c = c.replace(/'historico_ia'/g, "'historicoIA'");
fs.writeFileSync('src/lib/backup.ts', c);
