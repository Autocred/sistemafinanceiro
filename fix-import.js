const fs = require('fs');
let src = fs.readFileSync('src/app/master/layout.tsx', 'utf8');
src = src.replace("} fromde-react';", "} from 'lucide-react';");
fs.writeFileSync('src/app/master/layout.tsx', src);
console.log('fixed:', src.includes("from 'lucide-react'"));
