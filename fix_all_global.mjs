import fs from 'fs';
import path from 'path';

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const fullPath = path.join(dir, f);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let c = fs.readFileSync(fullPath, 'utf8');
      if (c.includes('Ã')) {
        c = c.replace(/ÃƒÂª/g, 'ê')
             .replace(/ÃƒÂ§ÃƒÂµes/g, 'ções')
             .replace(/ÃƒÂ§ÃƒÂ£o/g, 'ção')
             .replace(/ÃƒÂ¢/g, 'â')
             .replace(/ÃƒÂ¡/g, 'á')
             .replace(/ÃƒÂ³/g, 'ó')
             .replace(/ÃƒÂ­/g, 'í')
             .replace(/ÃƒÂ©/g, 'é')
             .replace(/ÃƒÂ£/g, 'ã')
             .replace(/ÃƒÂµ/g, 'õ')
             .replace(/ÃƒÂ§/g, 'ç')
             .replace(/Ã¯Â¿Â½/g, '')
             .replace(/âœ¨/g, '✨')
             .replace(/ÃƒÂ/g, 'í')
             .replace(/MÃªs/g, 'Mês')
             .replace(/TransferÃªncia/g, 'Transferência')
             .replace(/CartÃ£o/g, 'Cartão')
             .replace(/cartÃ£o/g, 'cartão')
             .replace(/Ã§Ã£o/g, 'ção')
             .replace(/Ã§Ãµes/g, 'ções')
             .replace(/Ãªncia/g, 'ência')
             .replace(/Ãº/g, 'ú')
             .replace(/Ã­/g, 'í')
             .replace(/Ã¡/g, 'á')
             .replace(/Ã¢/g, 'â')
             .replace(/Ã³/g, 'ó')
             .replace(/Ã£/g, 'ã')
             .replace(/Ã©/g, 'é')
             .replace(/Ã§/g, 'ç')
             .replace(/Ãª/g, 'ê')
             .replace(/Ãµ/g, 'õ');
        fs.writeFileSync(fullPath, c);
        console.log('Fixed', fullPath);
      }
    }
  }
}

walk('./src');
console.log('Done global replace!');
