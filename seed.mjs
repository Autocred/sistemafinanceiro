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
    versao: 'v3.6.11',
    titulo: 'Alinhamento dos Indicadores de Semana do Dashboard Principal',
    descricao: 'Os cartões superiores do Dashboard (Recebidos e Pagos Esta Semana) agora também respeitam o modelo rígido de calendário (Segunda a Domingo), abandonando a contagem flexível dos últimos 7 dias.',
    changes: [
      { tipo: 'correcao', texto: 'Ajuste nos painéis "Recebidos Esta Semana" e "Pagos Esta Semana" na tela inicial para cruzarem perfeitamente com os relatórios analíticos, travando o período exatamente de Segunda-feira até Domingo da semana atual.' }
    ],
    dataLancamento: new Date().toISOString(),
    status: 'publicado',
    notificarTenants: false,
    destaque: true,
    alvos: 'todos',
    createdAt: Date.now()
  };

  await setDoc(doc(db, 'saas_releases', 'v3.6.11-semana-dashboard'), release);
  console.log('Seed das atualizacoes com sucesso!');
}

seed().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
