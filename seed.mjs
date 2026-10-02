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
    version: '1.6.7',
    date: new Date().toISOString(),
    title: 'Suporte a Novos Modelos do Gemini (2.0 / 2.5)',
    description: 'Adicionado suporte automático aos modelos mais recentes de inteligência artificial do Google para garantir compatibilidade com as novas chaves de API.',
    features: [
      'Fallback inteligente para os modelos gemini-2.0-flash e gemini-2.5-flash.',
      'Resolução do erro 404 para chaves recentes geradas no Google AI Studio.'
    ],
    type: 'patch'
  });
  console.log('Release notes 1.6.7 added!');
  process.exit(0);
}

run();
