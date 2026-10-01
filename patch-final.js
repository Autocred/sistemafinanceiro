const fs = require('fs');

// 1. Add WhatsApp to master sidebar
let layout = fs.readFileSync('src/app/master/layout.tsx', 'utf8');
layout = layout.replace(
  "Home\n} from 'lucide-react';",
  "Home, MessageSquare\n} from 'lucide-react';"
);
layout = layout.replace(
  "{ nome: 'Configurações', url: '/master/configuracoes', icone: <Settings className=\"w-5 h-5\" /> },",
  "{ nome: 'Configurações', url: '/master/configuracoes', icone: <Settings className=\"w-5 h-5\" /> },\n    { nome: 'WhatsApp API', url: '/master/whatsapp', icone: <MessageSquare className=\"w-5 h-5\" /> },"
);
fs.writeFileSync('src/app/master/layout.tsx', layout);
console.log('✅ Menu WhatsApp adicionado ao sidebar');

// 2. Fix cron schedule to 17h BRT (= 20h UTC)
const vercel = {
  "crons": [
    { "path": "/api/cron/lembretes", "schedule": "0 10 * * *" },
    { "path": "/api/cron/backups", "schedule": "0 8 * * *" },
    { "path": "/api/cron/fechamento-diario", "schedule": "0 20 * * *" }
  ]
};
fs.writeFileSync('vercel.json', JSON.stringify(vercel, null, 2));
console.log('✅ Horário do cron: 17h BRT (20h UTC)');
