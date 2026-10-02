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
    version: '1.4.7',
    date: new Date().toISOString(),
    title: 'Detalhamento de Meta Diária e Performance Acima/Abaixo no WhatsApp',
    description: 'Adicionada visualização de quanto é a meta diária, quanto foi alcançado hoje e indicador explícito de quanto está acima ou abaixo da meta diária e no acumulado do mês.',
    features: [
      'Exibição do valor exato da meta diária base (R$/dia útil).',
      'Comparativo do dia: valor alcançado hoje e diferença exata (ACIMA ou ABAIXO).',
      'Comparativo do mês: ritmo acumulado vs meta ideal esperada até a data.',
      'Cálculo de meta diária ajustada para os dias úteis restantes.'
    ],
    type: 'feature'
  });
  console.log('Release notes added!');
  process.exit(0);
}

run();
