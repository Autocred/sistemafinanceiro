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
    version: '1.6.6',
    date: new Date().toISOString(),
    title: 'Aprimoramento do Aprendizado de IA na Importação',
    description: 'Melhorias profundas no sistema de OCR e aprendizado de notas e recibos para automatizar 100% o seu fluxo de entrada de dados.',
    features: [
      'Inclusão do botão "🧠 Aprender" na tela de IA: agora você pode forçar a inteligência a gravar a nota atual como padrão para o fornecedor.',
      'Inclusão do campo Comportamento (Despesa Fixa / Variável) na tela de IA, gravando e aprendendo automaticamente a sua escolha.',
      'Algoritmo de reconhecimento textual aprimorado: agora a IA ignora acentos e maiúsculas/minúsculas para encontrar o Fornecedor com muito mais precisão no banco de dados local.',
      'Lançamentos importados por documentos que já vêm como Recibos/Notas pagas agora entram no sistema com o status "Pago / Recebido" por padrão, já vinculando a data de pagamento à data de competência.'
    ],
    type: 'feature'
  });
  console.log('Release notes 1.6.6 added!');
  process.exit(0);
}

run();
