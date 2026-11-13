import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, where } from 'firebase/firestore';

const app = initializeApp({
  apiKey: 'AIzaSyCPhj4DYKlu8Q00FmjaA1ofjYUKhRJaK7U',
  authDomain: 'sistemafinan.firebaseapp.com',
  projectId: 'sistemafinan'
});

const db = getFirestore(app);

async function run() {
  const q = query(collection(db, 'saas_releases'), where('versao', '==', 'v3.8.5'));
  const snap = await getDocs(q);
  if (snap.empty) {
    await addDoc(collection(db, 'saas_releases'), {
      versao: 'v3.8.5',
      titulo: 'Menu Raio-X & Quitação no Menu Lateral e Alinhamento Exato de Despesas Pagas no Gráfico',
      descricao: 'Adição do atalho dedicado "Raio-X & Quitação" na seção Visão Geral do menu lateral e alinhamento integral do gráfico mensal com o card de Despesas Pagas do Mês (R$ 12.981,14).',
      dataLancamento: new Date().toISOString(),
      status: 'publicado',
      destaque: false,
      notificarTenants: false,
      alvos: 'todos',
      changes: [
        { tipo: 'novidade', texto: 'Menu Lateral — Raio-X & Quitação: Novo item em Visão Geral para acessar em 1 clique o Raio-X de Cada R$ 100 e o Simulador de Quitação de Parcelamentos.' },
        { tipo: 'correcao', texto: 'Gráfico Mensal e Indicadores de Despesas Pagas: Alinhamento exato de 100% das despesas efetivamente pagas no mês nos gráficos e cards.' }
      ]
    });
    console.log('Release notes v3.8.5 added!');
  } else {
    console.log('Release notes v3.8.5 already registered!');
  }
  process.exit(0);
}

run();
