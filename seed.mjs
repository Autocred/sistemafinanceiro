import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, where } from 'firebase/firestore';

const app = initializeApp({
  apiKey: 'AIzaSyCPhj4DYKlu8Q00FmjaA1ofjYUKhRJaK7U',
  authDomain: 'sistemafinan.firebaseapp.com',
  projectId: 'sistemafinan'
});

const db = getFirestore(app);

async function run() {
  const q = query(collection(db, 'saas_releases'), where('versao', '==', 'v3.8.0'));
  const snap = await getDocs(q);
  if (snap.empty) {
    await addDoc(collection(db, 'saas_releases'), {
      versao: 'v3.8.0',
      titulo: 'Tela de Login com Indicadores Econômicos Brasileiros Suaves e Painel Explicativo',
      descricao: 'Melhoria na barra superior da tela de login (movimento suave sem trepidação, velocidade reduzida, maior visibilidade e foco nos principais indicadores brasileiros) e substituição do gráfico abstrato pelo Termômetro Econômico Brasil (Selic, CDI, IPCA, Dólar e Ibovespa).',
      dataLancamento: new Date().toISOString(),
      status: 'publicado',
      destaque: true,
      notificarTenants: false,
      alvos: 'todos',
      changes: [
        { tipo: 'melhoria', texto: 'Barra de Indicadores Brasileiros Suave e Legível: Movimento mais lento e contínuo com aceleração gráfica (sem tremer), letras maiores e foco em Taxa Selic, CDI, IPCA, IGP-M, Ibovespa, Dólar PTAX, Euro, Poupança e INCC-M.' },
        { tipo: 'novidade', texto: 'Painel Termômetro Econômico Brasil na Tela de Login: Substituição do gráfico abstrato de velas por um painel claro com os 4 indicadores principais do Brasil e o comparativo anual de Rendimento de Caixa (CDI/Poupança) contra a Inflação (IPCA).' }
      ]
    });
    console.log('Release notes v3.8.0 added!');
  } else {
    console.log('Release notes v3.8.0 already registered!');
  }
  process.exit(0);
}

run();
