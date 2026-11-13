import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, where } from 'firebase/firestore';

const app = initializeApp({
  apiKey: 'AIzaSyCPhj4DYKlu8Q00FmjaA1ofjYUKhRJaK7U',
  authDomain: 'sistemafinan.firebaseapp.com',
  projectId: 'sistemafinan'
});

const db = getFirestore(app);

async function run() {
  const q = query(collection(db, 'saas_releases'), where('versao', '==', 'v3.8.6'));
  const snap = await getDocs(q);
  if (snap.empty) {
    await addDoc(collection(db, 'saas_releases'), {
      versao: 'v3.8.6',
      titulo: 'Descrições Completas e Nítidas no Calendário de Alívio de Caixa',
      descricao: 'Exibição completa e individualizada (com nome completo e valor liberado de cada item) em todos os cards do Calendário de Alívio de Caixa e do Acelerador de Quitação.',
      dataLancamento: new Date().toISOString(),
      status: 'publicado',
      destaque: false,
      notificarTenants: false,
      alvos: 'todos',
      changes: [
        { tipo: 'melhoria', texto: 'Calendário de Alívio de Caixa: Lista individual e nítida de todos os lançamentos que acabam em cada mês com seus respectivos valores mensais liberados, sem cortar nomes com reticências (...).' }
      ]
    });
    console.log('Release notes v3.8.6 added!');
  } else {
    console.log('Release notes v3.8.6 already registered!');
  }
  process.exit(0);
}

run();
