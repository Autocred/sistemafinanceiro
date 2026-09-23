const fs = require('fs');
const path = require('path');
const dir = './src/components';

const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

for (const f of files) {
  const p = path.join(dir, f);
  let c = fs.readFileSync(p, 'utf8');
  let orig = c;
  
  c = c.replace(/style=\{\{\s*display:\s*'grid',\s*gridTemplateColumns:\s*'repeat\(4,\s*1fr\)',\s*gap:\s*16,\s*marginBottom:\s*24\s*\}\}/g, 'className="grid-responsive-4" style={{ marginBottom: 24 }}');
  c = c.replace(/style=\{\{\s*display:\s*'grid',\s*gridTemplateColumns:\s*'repeat\(3,\s*1fr\)',\s*gap:\s*10,\s*marginBottom:\s*16\s*\}\}/g, 'className="grid-responsive-3" style={{ marginBottom: 16 }}');
  c = c.replace(/style=\{\{\s*display:\s*'grid',\s*gridTemplateColumns:\s*'1fr\s*1fr\s*1fr',\s*gap:\s*12,\s*marginBottom:\s*20\s*\}\}/g, 'className="grid-responsive-3" style={{ marginBottom: 20 }}');
  c = c.replace(/style=\{\{\s*display:\s*'grid',\s*gridTemplateColumns:\s*'1fr\s*1fr\s*1fr',\s*gap:\s*8,\s*marginBottom:\s*16\s*\}\}/g, 'className="grid-responsive-3" style={{ marginBottom: 16 }}');
  c = c.replace(/style=\{\{\s*display:\s*'grid',\s*gridTemplateColumns:\s*'1fr\s*1fr\s*1fr',\s*gap:\s*10\s*\}\}/g, 'className="grid-responsive-3"');
  c = c.replace(/style=\{\{\s*display:\s*'grid',\s*gridTemplateColumns:\s*'repeat\(3,\s*1fr\)',\s*gap:\s*8\s*\}\}/g, 'className="grid-responsive-3"');
  
  c = c.replace(/style=\{\{\s*display:\s*'grid',\s*gridTemplateColumns:\s*'1fr\s*1fr',\s*gap:\s*8\s*\}\}/g, 'className="grid-responsive-2"');
  c = c.replace(/style=\{\{\s*display:\s*'grid',\s*gridTemplateColumns:\s*'1fr\s*1fr',\s*gap:\s*10\s*\}\}/g, 'className="grid-responsive-2"');
  c = c.replace(/style=\{\{\s*display:\s*'grid',\s*gridTemplateColumns:\s*'1fr\s*1fr',\s*gap:\s*12\s*\}\}/g, 'className="grid-responsive-2"');
  c = c.replace(/style=\{\{\s*display:\s*'grid',\s*gridTemplateColumns:\s*'1fr\s*1fr',\s*gap:\s*12,\s*marginBottom:\s*16\s*\}\}/g, 'className="grid-responsive-2" style={{ marginBottom: 16 }}');
  c = c.replace(/style=\{\{\s*display:\s*'grid',\s*gridTemplateColumns:\s*'1fr\s*1fr',\s*gap:\s*'10px\s*16px'\s*\}\}/g, 'className="grid-responsive-2"');
  c = c.replace(/style=\{\{\s*display:\s*'grid',\s*gridTemplateColumns:\s*'1fr\s*1fr',\s*gap:\s*20\s*\}\}/g, 'className="grid-responsive-2" style={{ gap: 20 }}');
  c = c.replace(/style=\{\{\s*display:\s*'grid',\s*gridTemplateColumns:\s*'1fr\s*1fr',\s*gap:\s*24\s*\}\}/g, 'className="grid-responsive-2" style={{ gap: 24 }}');

  // The 2fr 1fr is tricky, let's just make it grid-responsive-2
  c = c.replace(/style=\{\{\s*display:\s*'grid',\s*gridTemplateColumns:\s*'2fr\s*1fr',\s*gap:\s*10\s*\}\}/g, 'className="grid-responsive-2"');
  
  if (orig !== c) {
    fs.writeFileSync(p, c);
    console.log('Fixed ' + f);
  }
}
