const fs = require('fs');

let c = fs.readFileSync('src/components/DashboardMensal.tsx', 'utf8');

c = c.replace(/className="bi-card card-cyan/g, 'className="bi-card card-red');
c = c.replace(/className="bi-card card-orange/g, 'className="bi-card card-red');
c = c.replace(/className="bi-card card-purple/g, 'className="bi-card card-red');

fs.writeFileSync('src/components/DashboardMensal.tsx', c);
console.log('Patched card colors to red');
