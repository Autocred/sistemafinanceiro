const fs = require('fs');

let c = fs.readFileSync('src/app/api/cron/backups/route.ts', 'utf8');
c = c.replace(
  /if \(shouldRunAutoBackup\(cfg\.frequenciaBackup, cfg\.horarioBackup, ultimoBackup\)\)/,
  `const last = ultimoBackup ? new Date(ultimoBackup).getTime() : 0;\n        const hours = (Date.now() - last) / (1000 * 60 * 60);\n        const shouldRun = !ultimoBackup || (cfg.frequenciaBackup === 'diario' && hours >= 20) || (cfg.frequenciaBackup === 'semanal' && hours >= 160) || (cfg.frequenciaBackup === 'mensal' && hours >= 700);\n        if (shouldRun)`
);

fs.writeFileSync('src/app/api/cron/backups/route.ts', c);
