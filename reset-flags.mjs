import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc, deleteField } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCPhj4DYKlu8Q00FmjaA1ofjYUKhRJaK7U',
  authDomain: 'sistemafinan.firebaseapp.com',
  projectId: 'sistemafinan',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
  await updateDoc(doc(db, 'configuracoes', 'geral'), {
    ultimoEnvioFechamento: deleteField(),
    ultimoEnvioLembretes: deleteField()
  });

  console.log('✅ Flags de envio limpas para o teste agendado');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
