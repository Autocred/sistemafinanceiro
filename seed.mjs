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
    versao: 'v3.6.18',
    titulo: 'Novo Motor IA Inteligente & Correções Visuais',
    descricao: 'Atualização crítica no sistema de extração de notas (OCR + Inteligência Artificial) e melhorias na listagem de transações.',
    dataLancamento: new Date().toISOString(),
    status: 'publicado',
    destaque: true,
    notificarTenants: false,
    alvos: 'todos',
    changes: [
      { tipo: 'novo', texto: 'Suporte a chaves de API mais recentes do Google Gemini (Geração 2.0 e superiores).' },
      { tipo: 'novo', texto: 'Lançamentos via nota já pré-preenchem a data de competência e o status Pago/Recebido.' },
      { tipo: 'melhoria', texto: 'Aumento na velocidade de extração do OCR e redução de travamentos.' },
      { tipo: 'correcao', texto: 'Resolução de timeout (carregamento infinito) quando a chave da Inteligência Artificial expira ou é bloqueada.' },
      { tipo: 'correcao', texto: 'Ajuste visual na pílula do fornecedor na listagem de lançamentos (estava sendo cortada para nomes muito grandes).' }
    ]
  });
  console.log('Release notes v3.6.18 added!');
  process.exit(0);
}

run();
