const fs = require('fs');
const files = ['restaurar-completo.mjs', 'separar-faturas.mjs', 'restore-from-backup.mjs', 'patch-metas.js'];
files.forEach(f => {
  try {
    const s = fs.readFileSync(f, 'utf8');
    // Find tenantId references
    const matches = s.match(/tenantId['":\s]+['"]([^'"]+)['"]/g);
    if (matches) console.log(f, matches.slice(0, 5));
    // Also look for known patterns
    const ids = s.match(/[A-Za-z0-9]{20,28}/g);
    if (ids) console.log(f, 'IDs:', [...new Set(ids)].slice(0, 5));
  } catch(e) {}
});
