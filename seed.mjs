import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, where } from 'firebase/firestore';

const app = initializeApp({
  apiKey: 'AIzaSyCPhj4DYKlu8Q00FmjaA1ofjYUKhRJaK7U',
  authDomain: 'sistemafinan.firebaseapp.com',
  projectId: 'sistemafinan'
});

const db = getFirestore(app);

async function run() {
  const q = query(collection(db, 'saas_releases'), where('versao', '==', 'v3.7.5'));
  const snap = await getDocs(q);
  if (snap.empty) {
    await addDoc(collection(db, 'saas_releases'), {
      versao: 'v3.7.5',
      titulo: 'Terminal de Login FinTech, Bolsa de Valores & Inteligência Artificial',
      descricao: 'Redesign completo da experiência de autenticação (Login, PIN, Biometria e Cadastro) com estética institucional de Terminal Financeiro, Bolsa de Valores (B3 / Wall Street) e Motor de Inteligência Artificial Preditivo, preservando 100% da identidade White Label de cada licença (Logo, Nome do Sistema e Paleta Primária).',
      dataLancamento: new Date().toISOString(),
      status: 'publicado',
      destaque: true,
      notificarTenants: false,
      alvos: 'todos',
      changes: [
        { tipo: 'novidade', texto: 'Ticker Tape Financeiro ao Vivo (B3 & Global Markets): Barra superior contínua com indicadores financeiros (IBOVESPA, S&P 500, NASDAQ AI, USD/BRL, SELIC, CDI, BTC e SLA do Motor Neural IA).' },
        { tipo: 'novidade', texto: 'HUD Executivo de Telemetria & Gráfico Candlestick IA: Painel visual de alta tecnologia no desktop com gráfico quantitativo em tempo real e indicadores de segurança institucional.' },
        { tipo: 'melhoria', texto: 'Card de Autenticação Glassmorphic 3D White-Label: Destaque luminoso para a logomarca e nome do Tenant, campos modernos com ícones dedicados, botão mostrar/ocultar senha e botão físico 3D.' }
      ]
    });
    console.log('Release notes v3.7.5 added!');
  } else {
    console.log('Release notes v3.7.5 already registered!');
  }
  process.exit(0);
}

run();
