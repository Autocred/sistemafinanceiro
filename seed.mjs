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
    versao: 'v3.6.83',
    titulo: 'Tratamento Amigável de Status e Diagnóstico do Servidor WhatsApp',
    descricao: 'Aprimoramento nas mensagens de diagnóstico e teste de WhatsApp: exibição de aviso claro e intuitivo orientando a verificação do container no Railway em caso de indisponibilidade da Evolution API.',
    dataLancamento: new Date().toISOString(),
    status: 'publicado',
    destaque: true,
    notificarTenants: false,
    alvos: 'todos',
    changes: [
      { tipo: 'melhoria', texto: 'Diagnóstico Amigável no Painel: Alertas de teste de WhatsApp agora traduzem erros do Railway (como 404 Application not found) em orientações claras para reativar o container.' }
    ]
  });
  console.log('Release notes v3.6.83 added!');
  process.exit(0);
}

run();
