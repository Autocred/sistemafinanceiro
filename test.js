fetch('https://sistemafinanceiropessoal.vercel.app/api/cron/dispatcher').then(r => r.json()).then(console.log).catch(console.error);
