const fs = require('fs');
let c = fs.readFileSync('src/app/api/manifest/route.ts', 'utf8');
c = c.replace(/start_url: \`\/\?tenant=\$\{tenant\}\`,/g, "start_url: `/?tenant=${tenant}`,\n      id: `/?tenant=${tenant}`,");
fs.writeFileSync('src/app/api/manifest/route.ts', c);
