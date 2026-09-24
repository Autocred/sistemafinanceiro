import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const fullPath = path.join(dir, f);
    if (fs.statSync(fullPath).isDirectory()) {
      results = results.concat(walk(fullPath));
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (/[ÃÂœ¬¯¸]/.test(lines[i])) {
          results.push(`${fullPath}:${i+1}: ${lines[i].trim()}`);
        }
      }
    }
  }
  return results;
}

const r = walk('./src');
fs.writeFileSync('weird_chars.txt', r.join('\n'));
console.log(`Found ${r.length} matches.`);
