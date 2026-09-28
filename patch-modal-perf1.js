const fs = require('fs');
let c = fs.readFileSync('src/components/ModalLancamento.tsx', 'utf8');

c = c.replace(
  /const dict = JSON\.parse\(localStorage\.getItem\('ai_learning_dictionary'\) \|\| '\{\}'\);/g,
  "const dict = (window as any).__ai_dictCache || ((window as any).__ai_dictCache = JSON.parse(localStorage.getItem('ai_learning_dictionary') || '{}'));"
);

// We also need to invalidate the cache when it learns!
c = c.replace(
  /localStorage\.setItem\('ai_learning_dictionary',\s*JSON\.stringify\(dict\)\);/g,
  "localStorage.setItem('ai_learning_dictionary', JSON.stringify(dict)); (window as any).__ai_dictCache = dict;"
);

fs.writeFileSync('src/components/ModalLancamento.tsx', c, 'utf8');
console.log('Patched AI dictionary');
