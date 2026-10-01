const fs = require('fs');
let src = fs.readFileSync('src/app/master/whatsapp/page.tsx', 'utf8');

src = src.replace("import { db } from '@/lib/firebase';", "import { getDb } from '@/lib/firebase';");
src = src.replace("doc(db, 'configuracoes'", "doc(getDb(), 'configuracoes'");
src = src.replace("doc(db, 'configuracoes'", "doc(getDb(), 'configuracoes'");

fs.writeFileSync('src/app/master/whatsapp/page.tsx', src);
