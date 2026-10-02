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
    version: '1.5.1',
    date: new Date().toISOString(),
    title: 'Aba dedicada WhatsApp & Disparos e Resolução Automática de JID de Celulares',
    description: 'Criada aba dedicada no menu Configurações para facilitar o acesso aos disparos e implementado resolvedor inteligente de JID no WhatsApp para números brasileiros.',
    features: [
      'Nova aba "📱 WhatsApp & Disparos" no topo das Configurações, imediatamente visível e acessível.',
      'Contêiner de configurações e botões de teste sempre visíveis mesmo antes da ativação do robô.',
      'Resolvedor automático de JID da Evolution API para garantir a entrega em números brasileiros com ou sem 9º dígito (DDD 49 e outros).',
      'Validação de status real de entrega da API do WhatsApp.'
    ],
    type: 'patch'
  });
  console.log('Release notes 1.5.1 added!');
  process.exit(0);
}

run();
