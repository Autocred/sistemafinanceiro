const fs = require('fs');
let c = fs.readFileSync('src/components/ModalLancamento.tsx', 'utf8');

// I need to carefully rewrite the manual form. It's safer to just fetch it entirely, manipulate it, and save it.
console.log('Will do via python or just regex if simple.');
