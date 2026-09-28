const fs = require('fs');
let c = fs.readFileSync('src/components/Login.tsx', 'utf8');

const debugString = `
<div style={{ position: 'absolute', bottom: 5, right: 5, fontSize: 10, color: '#ccc' }}>
  v1.2 P:{typeof window !== 'undefined' && localStorage.getItem('app_pin_code') ? '1' : '0'} 
  E:{typeof window !== 'undefined' && localStorage.getItem('saved_email_apk') ? '1' : '0'} 
  M:{modo}
</div>
`;

// Insert the debug string into the bottom of the main login container
if (!c.includes('v1.2 P:')) {
  c = c.replace(/<\/div>\s*<\/div>\s*\);\s*}/g, debugString + "\n</div>\n</div>\n);\n}");
  fs.writeFileSync('src/components/Login.tsx', c, 'utf8');
  console.log("Debug string injected");
} else {
  console.log("Already injected");
}
