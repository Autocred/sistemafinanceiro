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

c = c.replace("const [pinDigits, setPinDigits] = useState('');", "const [pinDigits, setPinDigits] = useState('');\n" + getCookieFunc);

fs.writeFileSync('src/components/LockScreen.tsx', c, 'utf8');
console.log('Fixed LockScreen getCookie injection');
