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
    versao: 'v3.6.47',
    titulo: 'Ativação do Modo Tabela Compacta em Lançamentos',
    descricao: 'Correção e ativação da visualização em Tabela Compacta de alta densidade nos Lançamentos (V1 e V2), permitindo alternar instantaneamente entre Cards e Tabela.',
    dataLancamento: new Date().toISOString(),
    status: 'publicado',
    destaque: true,
    notificarTenants: false,
    alvos: 'todos',
    changes: [
      { tipo: 'correcao', texto: 'Alternador de Visualização Cards/Tabela: Agora alterna imediatamente na tela ao clicar em [Tabela], renderizando o grid compacto com 25+ lançamentos por tela.' },
      { tipo: 'nova_funcionalidade', texto: 'Ações rápidas na tabela: Botões diretos para baixar, cobrar via PIX, emitir recibo PDF, duplicar, editar e excluir em cada linha.' }
    ]
  });
  console.log('Release notes v3.6.47 added!');
  process.exit(0);
}

run();
