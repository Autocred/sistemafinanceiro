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
    versao: 'v3.6.86',
    titulo: 'Ampliação Proporcional das Barras e Otimização do Gráfico de Evolução',
    descricao: 'Aumento da largura mínima e proporcionalidade das barras 3D no Resumo Mensal, garantindo legibilidade integral sem cortes dos valores (Fixas vs Variáveis), e eliminação do glitch visual no gráfico de Evolução dos Gastos com leitura completa dos 12 meses.',
    dataLancamento: new Date().toISOString(),
    status: 'publicado',
    destaque: true,
    notificarTenants: false,
    alvos: 'todos',
    changes: [
      { tipo: 'melhoria', texto: 'Barras do Resumo Mensal: Largura mínima ampliada (minWidth 210px e escala proporcional de 36% a 100%) garantindo que todos os valores de despesas fixas e variáveis sejam exibidos com nitidez total, sem truncamentos.' },
      { tipo: 'correcao', texto: 'Evolução dos Gastos: Gradiente 3D em vermelho carmim (#ef4444 a #dc2626) eliminando bloco preto e exibindo as barras completas de todos os meses do ano.' },
      { tipo: 'melhoria', texto: 'Gráficos e Eixos: Tipografia em branco neve com sombras de alto contraste e tooltips nítidos em todos os gráficos.' }
    ]
  });
  console.log('Release notes v3.6.86 added!');
  process.exit(0);
}

run();
