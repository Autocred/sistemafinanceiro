const fs = require('fs');
let c = fs.readFileSync('src/components/Login.tsx', 'utf8');

const regex = /className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-semibold shadow-sm mx-auto active:scale-95 transition-transform"\s+style=\{\{[\s\S]*?\}\}/g;

c = c.replace(regex, 'className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-semibold shadow-md mx-auto active:scale-95 transition-transform bg-slate-100 text-blue-600 border-2 border-blue-600"');

fs.writeFileSync('src/components/Login.tsx', c, 'utf8');
console.log('Fixed PIN pad styling');
