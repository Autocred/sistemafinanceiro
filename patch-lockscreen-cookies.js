const fs = require('fs');
let c = fs.readFileSync('src/components/LockScreen.tsx', 'utf8');

const getCookieFunc = `
      const getCookie = (name: string) => {
        if (typeof document === 'undefined') return null;
        const value = \`; \${document.cookie}\`;
        const parts = value.split(\`; \${name}=\`);
        if (parts.length === 2) return decodeURIComponent(parts.pop()?.split(';').shift() || '');
        return null;
      };
`;

if (!c.includes('const getCookie =')) {
  // Inject getCookie at the top of the component
  c = c.replace(/export function LockScreen\(\{[^}]*\}\)\s*\{/, "$&\n" + getCookieFunc);
}

// Replace localStorage.getItem with (localStorage.getItem(...) || getCookie(...))
c = c.replace(/localStorage\.getItem\('app_pin_code'\)/g, "(localStorage.getItem('app_pin_code') || getCookie('app_pin_code'))");

fs.writeFileSync('src/components/LockScreen.tsx', c, 'utf8');
console.log('LockScreen patched for cookies');
