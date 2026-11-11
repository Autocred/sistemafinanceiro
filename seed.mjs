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
    versao: 'v3.6.91',
    titulo: 'Indicadores Visuais Inteligentes de Vencimento na Tabela e Cards de Lançamentos',
    descricao: 'Adição dos badges coloridos em cada lançamento: Pago (verde), Atrasado com dias (vermelho), Vence Hoje (laranja) e Em X dias (azul) sob a coluna de Vencimento com cálculo atômico sem interferência de fuso horário.',
    dataLancamento: new Date().toISOString(),
    status: 'publicado',
    destaque: true,
    notificarTenants: false,
    alvos: 'todos',
    changes: [
      { tipo: 'melhoria', texto: 'Badges Coloridos de Vencimento: Exibição visual de status sob o vencimento em todas as linhas da tabela (Pago, Atrasado, Vence Hoje, Em X dias).' },
      { tipo: 'correcao', texto: 'Cálculo de Diferença de Dias: Normalização estrita de datas para cálculo exato de atrasos e dias restantes sem distorção de timezone.' }
    ]
  });
  console.log('Release notes v3.6.91 added!');
  process.exit(0);
}

run();
