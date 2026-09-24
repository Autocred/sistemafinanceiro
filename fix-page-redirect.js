const fs = require('fs');
let c = fs.readFileSync('src/app/page.tsx', 'utf8');

c = c.replace(
  /setUserProfile\(profile\);/g,
  "setUserProfile(profile);\n          setPaginaAtual('dashboard');"
);

fs.writeFileSync('src/app/page.tsx', c);
