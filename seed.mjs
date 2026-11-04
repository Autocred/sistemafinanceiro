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
    versao: 'v3.6.54',
    titulo: 'Lançamento Contínuo: Tela Aberta após Salvar',
    descricao: 'A tela de novo lançamento agora permanece aberta após salvar cada lançamento, exibindo confirmação visual e limpando o formulário para o próximo registro em sequência. O modal só é fechado quando o usuário clica em Fechar ou pressiona a tecla Esc.',
    dataLancamento: new Date().toISOString(),
    status: 'publicado',
    destaque: true,
    notificarTenants: false,
    alvos: 'todos',
    changes: [
      { tipo: 'melhoria', texto: 'Lançamento Contínuo: Tela permanece aberta após salvar para facilitar o cadastro de múltiplos lançamentos consecutivos sem precisar reabrir o modal a cada vez.' },
      { tipo: 'melhoria', texto: 'Confirmação e Limpeza do Formulário: Exibição de banner de confirmação com valor e descrição, limpando o formulário para a próxima digitação.' },
      { tipo: 'melhoria', texto: 'Fechamento Manual Facilitado: Botão de Fechar explícito no cabeçalho e rodapé do formulário, além de suporte ao atalho de teclado Esc.' },
      { tipo: 'ajuste', texto: 'Edição de Lançamentos: Edição de transações existentes continua fechando normalmente após salvar a alteração.' }
    ]
  });
  console.log('Release notes v3.6.54 added!');
  process.exit(0);
}

run();
