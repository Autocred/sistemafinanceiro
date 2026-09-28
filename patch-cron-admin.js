const fs = require('fs');
let c = fs.readFileSync('src/app/api/cron/lembretes/route.ts', 'utf8');

c = c.replace(/import \{ getFirebaseApp, getDb \} from '@\/lib\/firebase';/g, "import { getAdminDb } from '@/lib/firebase-admin';");
c = c.replace(/import \{ collection, query, getDocs, doc, addDoc \} from 'firebase\/firestore';/g, "");
c = c.replace(/const db = getDb\(\);/g, "const db = getAdminDb();");
c = c.replace(/const usersSnap = await getDocs\(collection\(db, 'users'\)\);/g, "const usersSnap = await db.collection('users').get();");
c = c.replace(/const confSnap = await getDocs\(collection\(db, 'users', userId, 'configuracoes'\)\);/g, "const confSnap = await db.collection('users').doc(userId).collection('configuracoes').get();");
c = c.replace(/cfg = confSnap\.docs\[0\]\.data\(\) as ConfiguracaoApp;/g, "cfg = confSnap.docs[0].data();");
c = c.replace(/const transacoesSnap = await getDocs\(collection\(db, 'users', userId, 'transacoes'\)\);/g, "const transacoesSnap = await db.collection('users').doc(userId).collection('transacoes').get();");
c = c.replace(/await addDoc\(collection\(db, 'users', userId, 'notificacoes'\), \{/g, "await db.collection('users').doc(userId).collection('notificacoes').add({");

fs.writeFileSync('src/app/api/cron/lembretes/route.ts', c);
console.log('patched Cron for Admin SDK');
