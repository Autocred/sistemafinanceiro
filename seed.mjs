import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';

const app = initializeApp({
  apiKey: 'AIzaSyCPhj4DYKlu8Q00FmjaA1ofjYUKhRJaK7U',
  authDomain: 'sistemafinan.firebaseapp.com',
  projectId: 'sistemafinan'
});

const db = getFirestore(app);

async function run() {
  await addDoc(collection(db, 'saas_releases'), {
    version: '1.4.2',
    date: new Date().toISOString(),
    title: 'Correção de Visualização de Transferências',
    description: 'Ajuste definitivo para exibir a Conta Destino corretamente nas tags de transferência, eliminando caracteres estranhos e restaurando o nome da conta de destino.',
    features: [
      'Correção do ícone da seta de origem/destino',
      'Correção do nome da conta destino (ex: Conta Santander -> Carteira dinheiro)'
    ],
    type: 'bugfix'
  });
  console.log('Release notes added!');
  process.exit(0);
}

run();
