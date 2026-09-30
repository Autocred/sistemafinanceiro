const fs = require('fs');
const code = fs.readFileSync('src/lib/backup.ts', 'utf8');

function shouldRunAutoBackup(frequencia, horario, ultimoBackupDataHora) {
  if (!frequencia || frequencia === 'nunca') return false;
  
  const now = new Date();
  
  // Parse target time
  let targetHour = 0;
  let targetMinute = 0;
  if (horario && horario.includes(':')) {
    const parts = horario.split(':');
    targetHour = parseInt(parts[0], 10);
    targetMinute = parseInt(parts[1], 10);
  }
  
  // Have we reached or passed the target time today?
  const isPastTime = (now.getHours() > targetHour) || (now.getHours() === targetHour && now.getMinutes() >= targetMinute);
  
  
  
  if (!ultimoBackupDataHora) {
    return true; // Never backed up before, and we passed the time
  }
  
  const last = new Date(ultimoBackupDataHora);
  const nowTime = now.getTime();
  const lastTime = last.getTime();
  const hoursPassed = (nowTime - lastTime) / (1000 * 60 * 60);
  
  if (frequencia === 'diario' && hoursPassed > 24) return true;
  if (frequencia === 'semanal' && hoursPassed > 168) return true;
  if (frequencia === 'mensal' && hoursPassed > 720) return true;

  if (!isPastTime) {
    return false;
  }

  if (frequencia === 'diario' && hoursPassed >= 20) return true;
  if (frequencia === 'semanal' && hoursPassed >= 160) return true;
  if (frequencia === 'mensal' && hoursPassed >= 700) return true;
  
  return false;
}

console.log(shouldRunAutoBackup('diario', '09:46', '2026-09-24T15:07:39.000Z'));
