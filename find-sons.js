const fs = require('fs');
const lines = fs.readFileSync('src/components/Configuracoes.tsx', 'utf8').split('\n');
lines.forEach((l, idx) => {
  if (l.includes("abaAtiva === 'sons'") || l.includes('whatsappAtivo')) {
    console.log(`Line ${idx + 1}: ${l.trim()}`);
  }
});
