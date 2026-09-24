import fs from 'fs';
import path from 'path';

const map = {
  'MÃªs': 'Mês',
  'TransferÃªncia': 'Transferência',
  'CartÃ£o': 'Cartão',
  'cartÃ£o': 'cartão',
  'Ã§Ã£o': 'ção',
  'Ã§Ãµes': 'ções',
  'Ãªncia': 'ência',
  'Ãº': 'ú',
  'Ã­': 'í',
  'Ã¡': 'á',
  'Ã¢': 'â',
  'Ã³': 'ó',
  'Ã£': 'ã',
  'Ã©': 'é',
  'Ã§': 'ç',
  'Ãª': 'ê',
  'Ãµ': 'õ'
};

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const fullPath = path.join(dir, f);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      for (const [bad, good] of Object.entries(map)) {
        if (content.includes(bad)) {
          content = content.split(bad).join(good);
          changed = true;
        }
      }
      if (changed) {
        fs.writeFileSync(fullPath, content);
        console.log('Fixed', fullPath);
      }
    }
  }
}

walk('./src');
