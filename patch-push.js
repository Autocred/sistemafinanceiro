const fs = require('fs');
let c = fs.readFileSync('src/components/Configuracoes.tsx', 'utf8');

c = c.replace(
  /setCfg\(c => \(\{ \.\.\.c, webPushSubscription: JSON\.stringify\(sub\) \}\)\);/g,
  `setCfg(c => {
    let arr = [];
    try {
      if(c.webPushSubscription) {
        const parsed = JSON.parse(c.webPushSubscription);
        arr = Array.isArray(parsed) ? parsed : [parsed];
      }
    } catch(e){}
    // Check if sub endpoint already exists
    if (!arr.find(s => s.endpoint === sub.endpoint)) {
      arr.push(sub);
    }
    return { ...c, webPushSubscription: JSON.stringify(arr) };
  });`
);

fs.writeFileSync('src/components/Configuracoes.tsx', c);
console.log('patched Config');
