import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, where } from 'firebase/firestore';

const app = initializeApp({
  apiKey: 'AIzaSyCPhj4DYKlu8Q00FmjaA1ofjYUKhRJaK7U',
  authDomain: 'sistemafinan.firebaseapp.com',
  projectId: 'sistemafinan'
});

const db = getFirestore(app);

async function run() {
  const q = query(collection(db, 'saas_releases'), where('versao', '==', 'v3.8.2'));
  const snap = await getDocs(q);
  if (snap.empty) {
    await addDoc(collection(db, 'saas_releases'), {
      versao: 'v3.8.2',
      titulo: 'Cash Flow Waterfall & Dollar Attribution: Raio-X de Destino de Cada R$ 100 (Padrão Stripe Sigma / Wall Street)',
      descricao: 'Implementação da ferramenta americana Cash Flow Waterfall & Attribution no Dashboard e no Resumo Mensal, mostrando exatamente para onde vai cada R$ 100,00 de receita em cascata (Impostos, Folha, Estrutura Fixa, Empréstimos/Parcelamentos, Variáveis e Margem Líquida Livre).',
      dataLancamento: new Date().toISOString(),
      status: 'publicado',
      destaque: true,
      notificarTenants: false,
      alvos: 'todos',
      changes: [
        { tipo: 'novidade', texto: 'Fatiamento Visual da Nota de R$ 100,00: Barra multi-segmentada mostrando quantos reais de cada R$ 100 recebidos são consumidos por cada área da empresa.' },
        { tipo: 'novidade', texto: 'Cascata Passo a Passo (Waterfall Step-Down): Dedução sequencial a partir de R$ 100,00 passando por Impostos, Folha, Estrutura Fixa, Empréstimos Ativos e Variáveis até a Margem Líquida Livre.' },
        { tipo: 'melhoria', texto: 'Detalhamento Interativo (Drill-Down): Clique em qualquer fatia da cascata para ver exatamente quanto cada conta individual representa a cada R$ 100 de receita.' }
      ]
    });
    console.log('Release notes v3.8.2 added!');
  } else {
    console.log('Release notes v3.8.2 already registered!');
  }
  process.exit(0);
}

run();
