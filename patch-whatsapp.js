const fs = require('fs');
let src = fs.readFileSync('src/lib/whatsapp.ts', 'utf8');
const replacement = `
    const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL;
    const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN;

    if (WHATSAPP_API_URL && WHATSAPP_API_TOKEN) {
      // Exemplo padrão (Evolution API ou Z-API)
      await fetch(\`\${WHATSAPP_API_URL}/message/sendText\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': WHATSAPP_API_TOKEN,
          'Authorization': \`Bearer \${WHATSAPP_API_TOKEN}\`
        },
        body: JSON.stringify({
          number: numStr,
          options: { delay: 1200, presence: 'composing' },
          textMessage: { text: mensagem }
        })
      }).catch(e => console.error('Erro ao enviar WhatsApp:', e));
    } else {
      console.log('[WHATSAPP AVISO] Variáveis de ambiente ausentes. Mensagem não enviada de verdade.');
    }
`;

src = src.replace('// IMPLEMENTAÇÃO REAL DA API VAI AQUI (SUBSTITUA PELO SEU GATEWAY)', replacement + '\n// IMPLEMENTAÇÃO REAL DA API VAI AQUI (SUBSTITUA PELO SEU GATEWAY)');
fs.writeFileSync('src/lib/whatsapp.ts', src);
console.log('Fixed whatsapp.ts');
