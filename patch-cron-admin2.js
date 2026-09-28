const fs = require('fs');
let c = fs.readFileSync('src/app/api/cron/lembretes/route.ts', 'utf8');

c = c.replace(/import \{ getAdminDb \} from '@\/lib\/firebase-admin';/g, "import { adminDb } from '@/lib/firebase-admin';");
c = c.replace(/const db = getAdminDb\(\);/g, "const db = adminDb;");

fs.writeFileSync('src/app/api/cron/lembretes/route.ts', c);
console.log('Fixed export');
