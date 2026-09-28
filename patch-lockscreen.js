const fs = require('fs');
let c = fs.readFileSync('src/app/page.tsx', 'utf8');

c = c.replace(/setBloqueadoBiometria\(true\);\s*\}\s*\}\s*\}, \[\]\);/g, "setBloqueadoBiometria(true); } } }, []); useEffect(() => { if (autenticado && sessionStorage.getItem('is_unlocked') === 'true') { setBloqueadoBiometria(false); } }, [autenticado]);");

fs.writeFileSync('src/app/page.tsx', c, 'utf8');
console.log('Patched lockscreen state bug');
