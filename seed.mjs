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
    versao: 'v3.6.89',
    titulo: 'Unificação da Lógica Financeira em Todos os Gráficos: Data Real de Pagamento e Valores Efetivados',
    descricao: 'Alinhamento integral da lógica de cálculo financeiro entre o Dashboard Inicial e a tela de Resumo Mensal. Todos os gráficos e relatórios agora operam sob a mesma regra atômica: consideração estrita da data de pagamento e recebimento (regime de caixa) e cálculo exato pelo valor final efetivado (incluindo juros/multas e descontos).',
    dataLancamento: new Date().toISOString(),
    status: 'publicado',
    destaque: true,
    notificarTenants: false,
    alvos: 'todos',
    changes: [
      { tipo: 'correcao', texto: 'Unificação de Datas nos Gráficos: Eliminada divergência de competência que movia despesas pagas em novembro para outros meses no Resumo Mensal. Agora todos os gráficos utilizam a data de pagamento/recebimento real.' },
      { tipo: 'melhoria', texto: 'Convergência Total de Valores: Adoção do getValorFinal em todas as agregações mensais (considerando juros e multas reais), equalizando os totais de despesas (R$ 11.981,14) e receitas (R$ 6.345,88) em todas as telas.' },
      { tipo: 'melhoria', texto: 'Consistência Multi-Gráficos: Dashboard inicial, evolução de gastos, evolução de receitas e tabela resumida agora exibem rigorosamente os mesmos números.' }
    ]
  });
  console.log('Release notes v3.6.89 added!');
  process.exit(0);
}

run();
