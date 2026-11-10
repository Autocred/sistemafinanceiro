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
    versao: 'v3.6.87',
    titulo: 'Novo Gráfico de Evolução das Receitas Mensais no Resumo Mensal',
    descricao: 'Inclusão do novo gráfico de Evolução das Receitas Mensais com barras 3D em degradê verde esmeralda, alternador entre Ano Completo (12M) e Últimos 6 Meses, detalhamento com tooltip completo de faturamento vs gastos e saldo líquido.',
    dataLancamento: new Date().toISOString(),
    status: 'publicado',
    destaque: true,
    notificarTenants: false,
    alvos: 'todos',
    changes: [
      { tipo: 'recurso', texto: 'Evolução das Receitas: Gráfico dedicado logo abaixo da Evolução de Gastos, exibindo o histórico de faturamento mês a mês com rótulos de valores no topo de cada barra.' },
      { tipo: 'melhoria', texto: 'Controles Dinâmicos: Alternador Ano Completo (12M) vs Últimos 6 Meses com totalizadores de faturamento anual e média mensal.' }
    ]
  });
  console.log('Release notes v3.6.87 added!');
  process.exit(0);
}

run();
