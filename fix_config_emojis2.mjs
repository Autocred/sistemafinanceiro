import fs from 'fs';
let c = fs.readFileSync('src/components/Configuracoes.tsx', 'utf8');

c = c.replace(/x   Offline/g, '🔌 Offline')
     .replace(/x  OpenAI/g, '🧠 OpenAI')
     .replace(/S Gemini/g, '✨ Gemini')
     .replace(/S& Modo Offline Ativo/g, '✅ Modo Offline Ativo')
     .replace(/APAR`NCIA & DESIGN SYSTEM/g, 'APARÊNCIA & DESIGN SYSTEM')
     .replace(/xR" Escuro/g, '🌙 Escuro')
     .replace(/x  Automático/g, '⚙️ Automático')
     .replace(/x Automático/g, '⚙️ Automático')
     .replace(/ÃœÂ¬Ã¯Â¸Â  Claro/g, '☀️ Claro');

fs.writeFileSync('src/components/Configuracoes.tsx', c);
console.log('Fixed more emojis in Config!');
