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
    versao: 'v3.6.56',
    titulo: 'Limpeza Total de Campos (100%) para Novos Lançamentos',
    descricao: 'Ao salvar cada lançamento, todos os campos (Fornecedor, Cliente, Comportamento, Conta Bancária, Categoria, Centro de Custo, Meio de Pagamento, Valor, Observações e Anexos) são 100% resetados para o estado limpo inicial, posicionando o cursor na Descrição.',
    dataLancamento: new Date().toISOString(),
    status: 'publicado',
    destaque: true,
    notificarTenants: false,
    alvos: 'todos',
    changes: [
      { tipo: 'correcao', texto: 'Limpeza 100% de Campos: Fornecedor, Comportamento, Conta, Categoria e demais campos agora são completamente desmarcados e limpos após salvar.' },
      { tipo: 'melhoria', texto: 'Sincronização Direta e Pré-visualização: Tanto no salvamento direto em 1 clique quanto via pré-visualização, todos os campos retornam zerados e prontos para o próximo registro.' },
      { tipo: 'melhoria', texto: 'Foco no Campo Descrição: Mantém o cursor pronto para a digitação imediata da nova despesa ou receita.' }
    ]
  });
  console.log('Release notes v3.6.56 added!');
  process.exit(0);
}

run();
