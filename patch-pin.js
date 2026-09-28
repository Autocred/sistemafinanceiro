const fs = require('fs');
let c = fs.readFileSync('src/components/Login.tsx', 'utf8');

c = c.replace(/const pinSalvo = localStorage\.getItem\('app_pin_code'\);\s*if \(novoPin === pinSalvo\) \{\s*try \{\s*const savedEmail = localStorage\.getItem\('saved_email_apk'\);\s*const savedPass = localStorage\.getItem\('saved_password_apk'\);/, `
      const getCookieLocal = (name: string) => {
        const value = \`; \${document.cookie}\`;
        const parts = value.split(\`; \${name}=\`);
        if (parts.length === 2) return decodeURIComponent(parts.pop()?.split(';').shift() || '');
        return null;
      };
      const pinSalvo = localStorage.getItem('app_pin_code') || getCookieLocal('app_pin_code');
      if (novoPin === pinSalvo) {
         try {
            const savedEmail = localStorage.getItem('saved_email_apk') || getCookieLocal('saved_email_apk');
            const savedPass = localStorage.getItem('saved_password_apk') || getCookieLocal('saved_password_apk');`);

fs.writeFileSync('src/components/Login.tsx', c, 'utf8');
console.log('Patched PIN local storage logic');
