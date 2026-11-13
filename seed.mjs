import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, where } from 'firebase/firestore';

const app = initializeApp({
  apiKey: 'AIzaSyCPhj4DYKlu8Q00FmjaA1ofjYUKhRJaK7U',
  authDomain: 'sistemafinan.firebaseapp.com',
  projectId: 'sistemafinan'
});

const db = getFirestore(app);

async function run() {
  const q = query(collection(db, 'saas_releases'), where('versao', '==', 'v3.8.3'));
  const snap = await getDocs(q);
  if (snap.empty) {
    await addDoc(collection(db, 'saas_releases'), {
      versao: 'v3.8.3',
      titulo: 'Exibição Garantida de Valores em Todas as Fatias da Barra Waterfall (R$ 100)',
      descricao: 'Ajuste na barra visual de fatiamento de cada R$ 100,00 para exibir sempre o valor em R$ em todos os segmentos ativos (incluindo Empréstimos & Parcelamentos Ativos).',
      dataLancamento: new Date().toISOString(),
      status: 'publicado',
      destaque: false,
      notificarTenants: false,
      alvos: 'todos',
      changes: [
        { tipo: 'correcao', texto: 'Barra Cash Flow Waterfall: todos os segmentos ativos agora exibem o valor exato em R$ dentro da barra, sem ocultar valores em fatias menores como Empréstimos & Parcelamentos.' }
      ]
    });
    console.log('Release notes v3.8.3 added!');
  } else {
    console.log('Release notes v3.8.3 already registered!');
  }
  process.exit(0);
}

run();
