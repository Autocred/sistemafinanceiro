const fs = require('fs');
let c = fs.readFileSync('src/components/Contas.tsx', 'utf8');

c = c.replace(/const \{ getDb, getCollectionPath \} = await import\('@\/lib\/storage'\);/g, 
  "const { getCollectionPath } = await import('@/lib/storage');\n        const { getDb } = await import('@/lib/firebase');"
);

fs.writeFileSync('src/components/Contas.tsx', c);
console.log('Fixed Contas.tsx imports');
