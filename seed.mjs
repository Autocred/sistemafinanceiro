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
    versao: 'v3.6.49',
    titulo: 'Edição Rápida Inline na Tabela (Clique Duplo)',
    descricao: 'Nova funcionalidade de Edição Inline estilo Excel/Notion: dê um clique duplo na Data, Descrição, Categoria, Contato ou Valor para alterar instantaneamente sem abrir modais.',
    dataLancamento: new Date().toISOString(),
    status: 'publicado',
    destaque: true,
    notificarTenants: false,
    alvos: 'todos',
    changes: [
      { tipo: 'nova_funcionalidade', texto: 'Edição Inline com Duplo Clique: Altere Data, Descrição, Categoria, Contato e Valor direto na célula da tabela compacta. Pressione Enter para salvar ou Esc para cancelar.' },
      { tipo: 'melhoria', texto: 'Alta produtividade: Economize tempo ao ajustar múltiplos lançamentos rapidamente sem precisar abrir a janela completa de edição.' }
    ]
  });
  console.log('Release notes v3.6.49 added!');
  process.exit(0);
}

run();
