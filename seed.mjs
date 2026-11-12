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
    versao: 'v3.7.2',
    titulo: 'Termômetro de Ponto de Equilíbrio ao Vivo (Break-Even Day) no Dashboard',
    descricao: 'Novo painel inteligente posicionado estrategicamente no topo do Dashboard que monitora em tempo real a quitação de 100% dos custos e despesas do mês corrente. Identifica com precisão cirúrgica o dia exato do empate de custos ("Break-Even Day") e destaca a margem de lucro líquido real gerada a partir daquele instante, além de projetar o ritmo diário até o equilíbrio caso o mês ainda esteja em andamento.',
    dataLancamento: new Date().toISOString(),
    status: 'publicado',
    destaque: true,
    notificarTenants: false,
    alvos: 'todos',
    changes: [
      { tipo: 'novidade', texto: 'Termômetro de Break-Even Day: Visualização ao vivo do percentual de cobertura das despesas totais (pagas + pendentes) com barra de progresso dinâmica e badge de status.' },
      { tipo: 'novidade', texto: 'Identificação Exata do Dia de Lucro: O motor audita as receitas recebidas para apontar em qual dia do mês você cobriu todos os compromissos e passou a operar em lucro livre.' },
      { tipo: 'melhoria', texto: 'Projeção de Ritmo Financeiro (Run-Rate): Calcula a média diária de recebimentos e prevê em qual dia o equilíbrio será conquistado quando o mês ainda estiver em curso.' },
      { tipo: 'melhoria', texto: 'Design 3D e White Label: Interface moderna integrada à paleta do tenant com suporte integral a mascaramento de valores sensíveis.' }
    ]
  });
  console.log('Release notes v3.7.2 added!');
  process.exit(0);
}

run();
