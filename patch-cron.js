const fs = require('fs');
let c = fs.readFileSync('src/app/api/cron/lembretes/route.ts', 'utf8');

c = c.replace(
  /const sub = JSON\.parse\(cfg\.webPushSubscription\);/g,
  `const parsed = JSON.parse(cfg.webPushSubscription);
   const subs = Array.isArray(parsed) ? parsed : [parsed];`
);

c = c.replace(
  /await webpush\.sendNotification\(sub, payload\);/g,
  `for (const sub of subs) {
      if (sub && sub.endpoint) {
          try {
             await webpush.sendNotification(sub, payload);
          } catch(e) {
             console.error('Falha push individual:', e);
          }
      }
   }`
);

fs.writeFileSync('src/app/api/cron/lembretes/route.ts', c);
console.log('patched Cron');
