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
    versao: 'v3.6.20',
    titulo: 'Forma de Pagamento Automática e Ajustes Responsivos',
    descricao: 'Melhorias de inteligência e layout na tela de Leitura de Notas.',
    dataLancamento: new Date().toISOString(),
    status: 'publicado',
    destaque: true,
    notificarTenants: false,
    alvos: 'todos',
    changes: [
      { tipo: 'novo', texto: 'Inclusão do campo Forma de Pagamento no formulário de leitura de documento.' },
      { tipo: 'melhoria', texto: 'A IA agora detecta automaticamente pagamentos feitos em Cartão de Crédito, Débito, Boleto, Dinheiro ou PIX e já marca a opção correta.' },
      { tipo: 'correcao', texto: 'Otimização nas instruções da Inteligência Artificial para não confundir datas de vencimento antigas com a data do pagamento real.' },
      { tipo: 'correcao', texto: 'Reestruturação visual no formulário para telas de celulares: os campos agora se adaptam e empilham corretamente para evitar cortes.' }
    ]
  });
  console.log('Release notes v3.6.20 added!');
  process.exit(0);
}

run();
