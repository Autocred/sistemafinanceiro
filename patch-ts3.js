const fs = require('fs');
let c = fs.readFileSync('src/app/api/cron/lembretes/route.ts', 'utf8');

c = c.replace(/const transQ = query\(collection\(db, 'users', userId, 'transacoes'\)\);\s*const transSnap = await getDocs\(transQ\);/g, "const transSnap = await db.collection('users').doc(userId).collection('transacoes').get();");

fs.writeFileSync('src/app/api/cron/lembretes/route.ts', c);
console.log('Fixed TS Error again');
