const fs = require('fs');
let src = fs.readFileSync('src/app/api/cron/fechamento-diario/route.ts', 'utf8');

src = src.replace(/let telefoneMaster = configSnap\.exists \? configSnap\.data\(\)\?\.telefoneWhatsApp : process\.env\.WHATSAPP_NUMERO_MASTER;/g, `
    let telefoneMaster = configSnap.exists ? (configSnap.data()?.telefoneWhatsApp || configSnap.data()?.whatsappNumeroMaster) : process.env.WHATSAPP_NUMERO_MASTER;
    const apiUrl = configSnap.exists ? configSnap.data()?.whatsappApiUrl : undefined;
    const apiToken = configSnap.exists ? configSnap.data()?.whatsappApiToken : undefined;
`);

src = src.replace('await enviarMensagemWhatsApp(telefoneMaster, mensagem);', 'await enviarMensagemWhatsApp(telefoneMaster, mensagem, apiUrl, apiToken);');

fs.writeFileSync('src/app/api/cron/fechamento-diario/route.ts', src);
