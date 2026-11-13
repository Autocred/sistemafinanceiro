import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, where } from 'firebase/firestore';

const app = initializeApp({
  apiKey: 'AIzaSyCPhj4DYKlu8Q00FmjaA1ofjYUKhRJaK7U',
  authDomain: 'sistemafinan.firebaseapp.com',
  projectId: 'sistemafinan'
});

const db = getFirestore(app);

async function run() {
  const q = query(collection(db, 'saas_releases'), where('versao', '==', 'v3.7.9'));
  const snap = await getDocs(q);
  if (snap.empty) {
    await addDoc(collection(db, 'saas_releases'), {
      versao: 'v3.7.9',
      titulo: 'Exibição Automática da Versão Atual no Menu Lateral',
      descricao: 'O rodapé do menu lateral (abaixo do botão Sair do Sistema) agora exibe automaticamente em tempo real a versão atual publicada do sistema.',
      dataLancamento: new Date().toISOString(),
      status: 'publicado',
      destaque: true,
      notificarTenants: false,
      alvos: 'todos',
      changes: [
        { tipo: 'melhoria', texto: 'Versão Atual Dinâmica no Rodapé do Menu: Exibe sempre a versão mais recente publicada do sistema abaixo do botão Sair do Sistema, sincronizada automaticamente a cada deploy.' }
      ]
    });
    console.log('Release notes v3.7.9 added!');
  } else {
    console.log('Release notes v3.7.9 already registered!');
  }
  process.exit(0);
}

run();
