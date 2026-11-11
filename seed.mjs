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
    versao: 'v3.6.98',
    titulo: 'Lançamento Exclusivo: Radar Forense de Desperdícios & Gastos Fantasma (Estilo Ramp / Brex)',
    descricao: 'Motor de inteligência analítica autônoma que varre continuamente os lançamentos em busca de cobranças duplicadas, reajustes silenciosos de fornecedores e anomalias de custos, calculando a economia mensal e anual imediata do negócio.',
    dataLancamento: new Date().toISOString(),
    status: 'publicado',
    destaque: true,
    notificarTenants: false,
    alvos: 'todos',
    changes: [
      { tipo: 'novidade', texto: 'Radar Forense de Desperdícios: Nova tela completa com cálculo de Economia Imediata Mensal/Anual e Score de Proteção de Caixa.' },
      { tipo: 'novidade', texto: 'Detector de Reajustes Silenciosos: Identifica aumentos acima da média histórica recente em contas recorrentes e contratos de fornecedores.' },
      { tipo: 'novidade', texto: 'Detector de Cobranças Duplicadas: Cruza valores idênticos e datas próximas para evitar pagamentos duplos acidentais.' },
      { tipo: 'novidade', texto: 'Atalho Executivo no Dashboard & Menu: Acesso instantâneo de 1 clique ao Radar através do Dashboard e da barra lateral de Inteligência.' }
    ]
  });
  console.log('Release notes v3.6.98 added!');
  process.exit(0);
}

run();
