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
    version: '1.4.3',
    date: new Date().toISOString(),
    title: 'Novo Desbloqueio por PIN de 4 Dígitos',
    description: 'Criado sistema de PIN rápido (estilo app de banco) para contornar bloqueios de biometria nativa em aplicativos gerados via WebViews (ex: Appilix).',
    features: [
      'Novo teclado numérico virtual elegante e responsivo na tela de bloqueio.',
      'Possibilidade de cadastrar um PIN fixo nas configurações.',
      'Funciona 100% offline no WebView, acelerando o login sem precisar digitar a senha completa.'
    ],
    type: 'feature'
  });
  console.log('Release notes added!');
  process.exit(0);
}

run();
