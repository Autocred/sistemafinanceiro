const fs = require('fs');

function fix(file) {
  let content = fs.readFileSync(file, 'utf8');
  let lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    // If line has multiple fontSize: XX, remove the first one
    let matches = lines[i].match(/fontSize: \d+/g);
    if (matches && matches.length > 1) {
      lines[i] = lines[i].replace(/fontSize: \d+, /, '');
    }
  }
  fs.writeFileSync(file, lines.join('\n'));
}

fix('src/components/Lancamentos.tsx');
fix('src/components/LancamentosV2.tsx');
