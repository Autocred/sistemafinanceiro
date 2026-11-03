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
    versao: 'v3.6.53',
    titulo: 'Gráficos baseados exclusivamente na data de pagamento',
    descricao: 'Todos os gráficos do Dashboard (Fluxo de Caixa, Despesas por Categoria e Meios de Pagamento) agora utilizam estritamente a data de pagamento efetiva para filtrar e exibir dados, evitando que lançamentos pendentes ou com data de competência diferente apareçam nos períodos incorretos.',
    dataLancamento: new Date().toISOString(),
    status: 'publicado',
    destaque: true,
    notificarTenants: false,
    alvos: 'todos',
    changes: [
      { tipo: 'correcao', texto: 'Despesas por Categoria: Agora exibe somente despesas com status "pago" e cuja data de pagamento pertença ao mês selecionado.' },
      { tipo: 'correcao', texto: 'Fluxo de Caixa Diário: Filtragem rigorosa pela data de pagamento real, nunca pela data de competência ou vencimento.' },
      { tipo: 'correcao', texto: 'Meios de Pagamento: Igualmente corrigido para usar apenas transações efetivamente pagas no mês.' },
      { tipo: 'correcao', texto: 'Despesas por Categoria (componente auxiliar): Filtro ajustado para exibir apenas despesas pagas no mês atual.' }
    ]
  });
  console.log('Release notes v3.6.53 added!');
  process.exit(0);
}

run();
