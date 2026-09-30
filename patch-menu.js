const fs = require('fs');

let c = fs.readFileSync('src/app/page.tsx', 'utf8');

c = c.replace(
  "{ id: 'cadastros'    as Pagina, label: 'Cadastros',        icon: BookOpen,        grupo: 'Configurações' },",
  "{ id: 'cadastros'    as Pagina, label: 'Cadastros',        icon: BookOpen,        grupo: 'Gestão' },"
);

fs.writeFileSync('src/app/page.tsx', c);
console.log('Moved Cadastros to Gestão');
