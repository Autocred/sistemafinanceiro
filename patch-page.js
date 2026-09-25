const fs = require('fs');

function patchPage() {
  let content = fs.readFileSync('src/app/page.tsx', 'utf8');

  // Find the exact line: const habilitada = localStorage.getItem('biometria_habilitada') === 'true';
  const target1 = "const habilitada = localStorage.getItem('biometria_habilitada') === 'true';";
  
  if (content.includes(target1) && !content.includes('const pinHabilitado = localStorage.getItem(\'app_pin_code\') !== null;')) {
    content = content.replace(
      target1,
      `const habilitada = localStorage.getItem('biometria_habilitada') === 'true';
      const pinHabilitado = localStorage.getItem('app_pin_code') !== null;`
    );
    content = content.replace(
      "if (habilitada && sessionStorage.getItem('is_unlocked') !== 'true') {",
      "if ((habilitada || pinHabilitado) && sessionStorage.getItem('is_unlocked') !== 'true') {"
    );
  }

  // Also in line 1056 or similar there is another place?
  // Let's use regex to catch any instance of that check if there are multiple.
  const regex = /if\s*\(\s*habilitada\s*&&\s*sessionStorage.getItem\('is_unlocked'\)\s*!==\s*'true'\s*\)/g;
  content = content.replace(regex, "if ((habilitada || (typeof localStorage !== 'undefined' && localStorage.getItem('app_pin_code') !== null)) && sessionStorage.getItem('is_unlocked') !== 'true')");

  fs.writeFileSync('src/app/page.tsx', content, 'utf8');
}

patchPage();
console.log('Page patched');
