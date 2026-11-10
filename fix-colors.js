const fs = require('fs');
const path = require('path');
const dir = './src/app';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

const replacements = [
  { p: /'#f9fafb'/gi, r: "'var(--text-primary)'" },
  { p: /"#f9fafb"/gi, r: '"var(--text-primary)"' },
  { p: /'#9ca3af'/gi, r: "'var(--text-secondary)'" },
  { p: /"#9ca3af"/gi, r: '"var(--text-secondary)"' },
  { p: /'#6b7280'/gi, r: "'var(--text-muted)'" },
  { p: /"#6b7280"/gi, r: '"var(--text-muted)"' },
  { p: /'#4b5563'/gi, r: "'var(--text-muted)'" },
  { p: /"#4b5563"/gi, r: '"var(--text-muted)"' },
  { p: /rgba\(255,\s*255,\s*255,\s*0\.0[1-5]\)/g, r: "var(--bg-glass)" },
  { p: /rgba\(255,\s*255,\s*255,\s*0\.0[6-9]\)/g, r: "var(--border)" },
  { p: /rgba\(255,\s*255,\s*255,\s*0\.1[0-9]?\)/g, r: "var(--border-hover)" },
  { p: /rgba\(255,\s*255,\s*255,\s*0\.2[0-9]?\)/g, r: "var(--border-hover)" },
];

files.forEach(f => {
  let p = path.join(dir, f);
  let c = fs.readFileSync(p, 'utf8');
  let original = c;
  
  for (const {p: regex, r} of replacements) {
    c = c.replace(regex, r);
  }
  
  if (c !== original) {
    fs.writeFileSync(p, c);
    console.log('Fixed ' + f);
  }
});
