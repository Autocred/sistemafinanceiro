const fs = require('fs');
let c = fs.readFileSync('src/components/Configuracoes.tsx', 'utf8');

const setPinAnchor = `localStorage.setItem('app_pin_code', novoPin);`;
const setPinCookie = `document.cookie = 'app_pin_code=' + encodeURIComponent(novoPin) + '; expires=Fri, 31 Dec 9999 23:59:59 GMT; path=/';`;

if (c.includes(setPinAnchor) && !c.includes(setPinCookie)) {
  c = c.replace(setPinAnchor, setPinAnchor + "\n" + setPinCookie);
}

const rmPinAnchor = `localStorage.removeItem('app_pin_code');`;
const rmPinCookie = `document.cookie = 'app_pin_code=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';`;

if (c.includes(rmPinAnchor) && !c.includes(rmPinCookie)) {
  c = c.replace(rmPinAnchor, rmPinAnchor + "\n" + rmPinCookie);
}

fs.writeFileSync('src/components/Configuracoes.tsx', c, 'utf8');
console.log('Configuracoes patched for cookies');
