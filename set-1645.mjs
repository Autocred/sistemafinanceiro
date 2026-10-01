import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCPhj4DYKlu8Q00FmjaA1ofjYUKhRJaK7U',
  authDomain: 'sistemafinan.firebaseapp.com',
  projectId: 'sistemafinan',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
  await updateDoc(doc(db, 'configuracoes', 'geral'), {
    whatsappHorarioFechamento: '16:45',
    whatsappHorario: '16:45'
  });

  console.log('✅ Horário de Fechamento definido para 16:45');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
