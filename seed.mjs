import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, where } from 'firebase/firestore';

const app = initializeApp({
  apiKey: 'AIzaSyCPhj4DYKlu8Q00FmjaA1ofjYUKhRJaK7U',
  authDomain: 'sistemafinan.firebaseapp.com',
  projectId: 'sistemafinan'
});

const db = getFirestore(app);

async function run() {
  const q = query(collection(db, 'saas_releases'), where('versao', '==', 'v3.8.1'));
  const snap = await getDocs(q);
  if (snap.empty) {
    await addDoc(collection(db, 'saas_releases'), {
      versao: 'v3.8.1',
      titulo: 'Tela de Login Compactada em Tela Única (Sem Barra de Rolagem)',
      descricao: 'Ajuste de altura, espaçamento e proporções da tela de login para caber integralmente em uma única tela (100vh) sem barra de rolagem vertical.',
      dataLancamento: new Date().toISOString(),
      status: 'publicado',
      destaque: true,
      notificarTenants: false,
      alvos: 'todos',
      changes: [
        { tipo: 'melhoria', texto: 'Login em Tela Única (100vh sem rolagem): Redução proporcional da altura dos cards, textos e campos na tela de login para exibição completa sem barra de rolagem.' }
      ]
    });
    console.log('Release notes v3.8.1 added!');
  } else {
    console.log('Release notes v3.8.1 already registered!');
  }
  process.exit(0);
}

run();
