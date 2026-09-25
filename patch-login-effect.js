const fs = require('fs');

let c = fs.readFileSync('src/components/Login.tsx', 'utf8');

const regex = /if\s*\(typeof window !== 'undefined'\s*&&\s*isBiometriaHabilitada\(\)\)\s*\{[\s\S]*?setTimeout\(\(\)\s*=>\s*\{[\s\S]*?handleBiometricLogin\(\);[\s\S]*?\},\s*500\);[\s\S]*?\}/;

const replacement = `if (typeof window !== 'undefined') {
      const pinSalvo = localStorage.getItem('app_pin_code');
      const savedPass = localStorage.getItem('saved_password_apk');
      const savedEmail = localStorage.getItem('saved_email_apk');
      if (pinSalvo && savedPass && savedEmail) {
        setModo('pin');
      } else if (isBiometriaHabilitada()) {
        setTemBiometria(true);
        setTimeout(() => {
          handleBiometricLogin();
        }, 500);
      }
    }`;

c = c.replace(regex, replacement);

fs.writeFileSync('src/components/Login.tsx', c);
console.log('Fixed Login.tsx useEffect');
