import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {  
  apiKey: 'AIzaSyCPhj4DYKlu8Q00FmjaA1ofjYUKhRJaK7U',  
  authDomain: 'sistemafinan.firebaseapp.com',  
  projectId: 'sistemafinan',  
  storageBucket: 'sistemafinan.firebasestorage.app',  
  messagingSenderId: '1019353725480',  
  appId: '1:1019353725480:web:a26ac2d2de24e8358d531d',  
  measurementId: 'G-RHLXQ3Z7W2'  
};  

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seed() {
  const release = {
    versao: 'v3.6.9',
    titulo: 'Filtros de Data Precisos',
    descricao: 'Ajuste na lógica dos botões de filtro de período da tela de Lançamentos para respeitarem fielmente o calendário ao invés de intervalos relativos de tempo.',
    changes: [
      { tipo: 'correcao', texto: 'O botão "Semana" agora filtra rigidamente os dias de Segunda-feira até Domingo da semana em curso, ao invés de puxar os últimos 7 dias.' },
      { tipo: 'correcao', texto: 'O botão "Mês" filtra do dia 1 ao último dia do mês atual do calendário.' },
      { tipo: 'correcao', texto: 'O botão "Até 2 dias" calcula precisamente da data de hoje até depois de amanhã.' }
    ],
    dataLancamento: new Date().toISOString(),
    status: 'publicado',
    notificarTenants: false,
    destaque: true,
    alvos: 'todos',
    createdAt: Date.now()
  };

  await setDoc(doc(db, 'saas_releases', 'v3.6.9-filtros-data'), release);
  console.log('Seed das atualizacoes com sucesso!');
}

seed().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
