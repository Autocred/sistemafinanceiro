const fs = require('fs');
let c = fs.readFileSync('src/app/page.tsx', 'utf8');
c = c.replace(/handleLogout\(\);\\n          return true;/g, 'handleLogout();\n          return true;');
fs.writeFileSync('src/app/page.tsx', c);
