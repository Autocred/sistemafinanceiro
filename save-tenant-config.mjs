// Salva o tenantId da AUTOCRED no config global para o cron funcionar
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCPhj4DYKlu8Q00FmjaA1ofjYUKhRJaK7U',
  authDomain: 'sistemafinan.firebaseapp.com',
  projectId: 'sistemafinan',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
  await setDoc(doc(db, 'configuracoes', 'geral'), {
    whatsappTenantId: 'autocred-promotora-de-credito',
  }, { merge: true });

  console.log('✅ whatsappTenantId salvo: autocred-promotora-de-credito');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
