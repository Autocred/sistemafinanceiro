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
    versao: 'v3.6.48',
    titulo: 'Fix Ícones de Ações na Tabela Compacta',
    descricao: 'Correção de dimensionamento nos botões de ações da Tabela Compacta de Lançamentos, garantindo que todos os ícones apareçam nítidos, com largura fixa e sem compressão.',
    dataLancamento: new Date().toISOString(),
    status: 'publicado',
    destaque: true,
    notificarTenants: false,
    alvos: 'todos',
    changes: [
      { tipo: 'correcao', texto: 'Ícones de Ações: Largura mínima e altura fixa de 28x28px nos botões e 195px na coluna, impedindo que os ícones (Baixar, PIX, Recibo, Duplicar, Editar, Excluir) sejam esmagados.' },
      { tipo: 'melhoria', texto: 'Contraste e nitidez perfeitos para todas as linhas de receitas e despesas na tabela.' }
    ]
  });
  console.log('Release notes v3.6.48 added!');
  process.exit(0);
}

run();
