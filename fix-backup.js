const fs = require('fs');

let c = fs.readFileSync('src/lib/backup.ts', 'utf8');

c = c.replace(/if \(!isPastTime\) \{\s*\/\/ If it's not yet time today, we don't run it right now\.\s*return false;\s*\}/, '');

c = c.replace(/const hoursPassed = \(nowTime - lastTime\) \/ \(1000 \* 60 \* 60\);[\s\S]*?return false;/g, `const hoursPassed = (nowTime - lastTime) / (1000 * 60 * 60);
  
  if (frequencia === 'diario' && hoursPassed > 24) return true;
  if (frequencia === 'semanal' && hoursPassed > 168) return true;
  if (frequencia === 'mensal' && hoursPassed > 720) return true;

  if (!isPastTime) {
    return false;
  }

  if (frequencia === 'diario' && hoursPassed >= 20) return true;
  if (frequencia === 'semanal' && hoursPassed >= 160) return true;
  if (frequencia === 'mensal' && hoursPassed >= 700) return true;
  
  return false;`);

fs.writeFileSync('src/lib/backup.ts', c);
