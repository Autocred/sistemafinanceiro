const fs = require('fs');

let src = fs.readFileSync('src/components/Configuracoes.tsx', 'utf8');

// Replace the injected section with the correctly wrapped one
const oldSection = `        {/* Notificações por WhatsApp da Licença */}
        <SecaoConfig titulo="Notificações por WhatsApp" icone={<MessageCircle size={18} color="#10b981" />}`;

const newSection = `        {/* Notificações por WhatsApp da Licença */}
        {abaAtiva === 'sons' && (
        <SecaoConfig titulo="Notificações por WhatsApp" icone={<MessageCircle size={18} color="#10b981" />}`;

if (src.includes(oldSection)) {
  src = src.replace(oldSection, newSection);
  fs.writeFileSync('src/components/Configuracoes.tsx', src);
  console.log('✅ Corrigido o wrapper {abaAtiva === "sons" && (');
} else {
  console.error('oldSection não encontrada');
}
