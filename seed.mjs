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
    versao: 'v3.6.22',
    titulo: 'Correção no Envio Multi-Tenant do WhatsApp (Dispatcher)',
    descricao: 'Ajuste na infraestrutura de agendamento de mensagens (CRON) para garantir envio a todas as licenças ativas.',
    dataLancamento: new Date().toISOString(),
    status: 'publicado',
    destaque: true,
    notificarTenants: false,
    alvos: 'todos',
    changes: [
      { tipo: 'correcao', texto: 'A partir de agora, o sistema aciona um "Dispatcher" global que percorre TODAS as suas licenças de forma independente e envia as mensagens de lembretes e fechamento para cada uma delas corretamente.' },
      { tipo: 'melhoria', texto: 'O Vercel agora checa os horários programados de cada licença a cada hora (ex: 08:00, 09:00), respeitando a customização feita dentro do painel de cada cliente.' }
    ]
  });
  console.log('Release notes v3.6.22 added!');
  process.exit(0);
}

run();
