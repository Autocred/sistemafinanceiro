const fs = require('fs');
let c = fs.readFileSync('src/components/LockScreen.tsx', 'utf8');

c = c.replace(/color: 'white'/g, "color: 'var(--text-primary)'");
c = c.replace(/background: 'rgba\(255,255,255,0\.05\)'/g, "background: 'var(--bg-secondary)'");
c = c.replace(/border: '1px solid rgba\(255,255,255,0\.1\)'/g, "border: '1px solid var(--border)'");

fs.writeFileSync('src/components/LockScreen.tsx', c, 'utf8');
console.log('Fixed LockScreen styles');
