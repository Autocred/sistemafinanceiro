const fs = require('fs');

let c = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');
c = c.replace("width: 'auto', , textAlign: 'left'", "width: 'auto', textAlign: 'left'");
fs.writeFileSync('src/components/Dashboard.tsx', c);
