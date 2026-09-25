const fs = require('fs');

const files = ['src/components/Lancamentos.tsx', 'src/components/LancamentosV2.tsx'];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  // The bad string is: {t.contaNome || '-'} ➔ {t.contaNome || '-'} \u2794 {
  // We want to replace it with: {t.contaNome || '-'} ➔ {
  
  content = content.replace(
    /\{t\.contaNome\s*\|\|\s*'-'\}\s*➔\s*\{t\.contaNome\s*\|\|\s*'-'\}\s*\\u2794\s*\{/g,
    "{t.contaNome || '-'} ➔ {"
  );
  
  fs.writeFileSync(file, content, 'utf8');
  console.log('Fixed', file);
}
