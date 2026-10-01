const fs = require('fs');
let src = fs.readFileSync('src/app/api/cron/fechamento-diario/route.ts', 'utf8');

const timeCheckLogic = `
    const savedHorario = configSnap.exists ? (configSnap.data()?.whatsappHorario || '23:00') : '23:00';
    const targetHour = parseInt(savedHorario.split(':')[0]);
    
    // Pegar a hora atual no fuso do Brasil
    const nowSp = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
    const currentHour = nowSp.getHours();

    if (currentHour !== targetHour) {
      return NextResponse.json({ message: \`Agendado para \${targetHour}h. Agora são \${currentHour}h. Pulando...\` });
    }
`;

src = src.replace("let telefoneMaster = configSnap.exists", timeCheckLogic + "\n    let telefoneMaster = configSnap.exists");

fs.writeFileSync('src/app/api/cron/fechamento-diario/route.ts', src);
