const fs = require('fs');
let src = fs.readFileSync('src/app/api/cron/fechamento-diario/route.ts', 'utf8');

src = src.replace(/const savedHorario = configSnap\.exists \? \(configSnap\.data\(\)\?\.whatsappHorario \|\| '23:00'\) : '23:00';[\s\S]*?Pulando\.\.\.\` \}\);\n    \}/, '');

fs.writeFileSync('src/app/api/cron/fechamento-diario/route.ts', src);
