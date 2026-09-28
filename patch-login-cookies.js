const fs = require('fs');
let c = fs.readFileSync('src/components/Login.tsx', 'utf8');

// The place where we save localStorage
const saveAnchor = `localStorage.setItem('saved_email_apk', usedEmail);
         localStorage.setItem('saved_password_apk', btoa(senha));`;

const saveCookies = `
         // Salva em cookies também (caso o WebView apague o localStorage)
         document.cookie = 'saved_email_apk=' + encodeURIComponent(usedEmail) + '; expires=Fri, 31 Dec 9999 23:59:59 GMT; path=/';
         document.cookie = 'saved_password_apk=' + encodeURIComponent(btoa(senha)) + '; expires=Fri, 31 Dec 9999 23:59:59 GMT; path=/';
`;

if (c.includes(saveAnchor) && !c.includes('document.cookie = \'saved_email_apk')) {
  c = c.replace(saveAnchor, saveAnchor + "\n" + saveCookies);
}

// The place where we read localStorage
const readAnchor = `const savedEmail = localStorage.getItem('saved_email_apk');`;

const readCookies = `
      // Fallback para ler do cookie se o localStorage estiver vazio
      const getCookie = (name: string) => {
        const value = \`; \${document.cookie}\`;
        const parts = value.split(\`; \${name}=\`);
        if (parts.length === 2) return decodeURIComponent(parts.pop()?.split(';').shift() || '');
        return null;
      };
      
      let finalPin = pinSalvo || getCookie('app_pin_code');
      let finalPass = savedPass || getCookie('saved_password_apk');
      let finalEmail = savedEmail || getCookie('saved_email_apk');
`;

if (c.includes(readAnchor) && !c.includes('const getCookie =')) {
  c = c.replace(readAnchor, readAnchor + "\n" + readCookies);
  // Now replace the IF statement to use the final variables
  c = c.replace(/if\s*\(\s*pinSalvo\s*&&\s*savedPass\s*&&\s*savedEmail\s*\)/, "if (finalPin && finalPass && finalEmail)");
}

fs.writeFileSync('src/components/Login.tsx', c, 'utf8');
console.log('Login logic patched for cookies');
