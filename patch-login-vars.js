const fs = require('fs');
let c = fs.readFileSync('src/components/Login.tsx', 'utf8');

c = c.replace(/cfg\.corFundo/g, 'configuracoes.corFundo');
c = c.replace(/cfg\.corPrimaria/g, 'configuracoes.corPrimaria');
c = c.replace(/cfg\.corSecundaria/g, 'configuracoes.corSecundaria');

fs.writeFileSync('src/components/Login.tsx', c, 'utf8');
console.log('Fixed variable names!');
