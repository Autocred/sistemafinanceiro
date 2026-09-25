const fs = require('fs');
let c = fs.readFileSync('src/components/Login.tsx', 'utf8');

const anchor = 'console.log("[FIRESTORE] Consultando Firestore");';
const insert = `
      // Salva a senha ofuscada para que o PIN funcione mesmo se a sessão cair no WebView do APK
      if (typeof window !== 'undefined') {
         localStorage.setItem('saved_email_apk', usedEmail);
         localStorage.setItem('saved_password_apk', btoa(senha));
      }
`;

if (c.includes(anchor) && !c.includes('saved_password_apk\', btoa(senha)')) {
  c = c.replace(anchor, insert + '\n      ' + anchor);
  fs.writeFileSync('src/components/Login.tsx', c, 'utf8');
  console.log('Patch success!');
} else {
  console.log('Anchor not found or already patched!');
}
