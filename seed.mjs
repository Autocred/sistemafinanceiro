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
    version: '1.4.6',
    date: new Date().toISOString(),
    title: 'Disparo de Resumo de Metas no WhatsApp (12h e 18h)',
    description: 'Implementado acompanhamento automatizado de metas financeiras com disparo no WhatsApp duas vezes ao dia (12h e 18h), calculando ritmo diário, valor restante e barra de progresso visual.',
    features: [
      'Disparo automático de metas às 12h (meio-dia) e 18h (encerramento do expediente).',
      'Cálculo em tempo real de dias úteis restantes e meta diária necessária.',
      'Barra de progresso visual em blocos e ritmo das vendas com emojis intuitivos.',
      'Configuração individual de horários e botão de teste em Configurações e no Painel Master.'
    ],
    type: 'feature'
  });
  console.log('Release notes added!');
  process.exit(0);
}

run();
