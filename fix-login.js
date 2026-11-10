const fs = require('fs');
let c = fs.readFileSync('src/components/Login.tsx', 'utf8');
c = c.replace(/onLoginSuccess\(\);/g, "localStorage.setItem('last_activity_timestamp', Date.now().toString()); onLoginSuccess();");
fs.writeFileSync('src/components/Login.tsx', c);
