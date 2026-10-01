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
    whatsappNumeroMaster: '5549984271498',
    whatsappTenantId: 'autocred-promotora-de-credito'
  }, { merge: true });

  console.log('✅ Telefone atualizado para 5549984271498');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
