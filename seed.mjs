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
    versao: 'v3.6.16',
    titulo: 'Fix Definitivo: Login Sempre Abre o Dashboard',
    descricao: 'Corrigida a raiz do problema onde sessões automáticas (PWA/App reaberto) ignoravam o redirecionamento para o Dashboard.',
    changes: [
      { tipo: 'correcao', texto: 'O estado inicial da tela não lê mais o sessionStorage (que guardava a última aba). Agora começa SEMPRE em "dashboard", sem exceções.' },
      { tipo: 'correcao', texto: 'O caminho de autenticação automática (Master Bypass via sessão ativa) também recebeu o setPaginaAtual("dashboard"), cobrindo 100% dos fluxos de login.' }
    ],
    dataLancamento: new Date().toISOString(),
    status: 'publicado',
    notificarTenants: false,
    destaque: true,
    alvos: 'todos',
    createdAt: Date.now()
  };

  await setDoc(doc(db, 'saas_releases', 'v3.6.16-login-dashboard-definitive'), release);
  console.log('Seed das atualizacoes com sucesso!');
}

seed().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
