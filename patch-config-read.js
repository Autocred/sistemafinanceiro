const fs = require('fs');
let c = fs.readFileSync('src/components/Configuracoes.tsx', 'utf8');

const readPinAnchor = `setPinAtivo(!!localStorage.getItem('app_pin_code'));`;
const readPinCookies = `
      const getCookie = (name: string) => {
        const value = \`; \${document.cookie}\`;
        const parts = value.split(\`; \${name}=\`);
        if (parts.length === 2) return decodeURIComponent(parts.pop()?.split(';').shift() || '');
        return null;
      };
      setPinAtivo(!!(localStorage.getItem('app_pin_code') || getCookie('app_pin_code')));
`;

if (c.includes(readPinAnchor) && !c.includes('setPinAtivo(!!(localStorage.getItem')) {
  c = c.replace(readPinAnchor, readPinCookies);
  fs.writeFileSync('src/components/Configuracoes.tsx', c, 'utf8');
  console.log('Config read patched');
}
