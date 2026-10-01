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
    version: '1.4.5',
    date: new Date().toISOString(),
    title: 'Sincronização e Salvamento Imediato de Horários WhatsApp',
    description: 'Garantido que qualquer alteração de horário ou número feita na tela salva imediatamente e é respeitada com precisão minuto a minuto pelo robô.',
    features: [
      'Salvamento automático imediato ao sair do campo e botão dedicado na tela de configurações.',
      'Suporte a troca de licença dinâmica no painel Master carregando e salvando dados isolados por tenant.',
      'Sincronização bidirecional entre coleções Master para evitar qualquer discrepância de agendamento.',
      'Reagendamento automático sem bloqueio de disparo mesmo alterando o horário várias vezes no mesmo dia.'
    ],
    type: 'feature'
  });
  console.log('Release notes added!');
  process.exit(0);
}

run();
