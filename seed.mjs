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
    versao: 'v3.6.13',
    titulo: 'Redirecionamento para o Dashboard no Login',
    descricao: 'Atendendo a pedidos, o sistema agora irá sempre te jogar direto para a tela inicial (Dashboard) após realizar o login, zerando a memória da última aba que você tinha acessado na sessão anterior.',
    changes: [
      { tipo: 'melhoria', texto: 'Injetado comando de redirecionamento global no motor de Login. Sempre que houver uma nova autenticação, a aba (paginaAtual) será automaticamente cravada como "dashboard", forçando o usuário a começar da visão global.' }
    ],
    dataLancamento: new Date().toISOString(),
    status: 'publicado',
    notificarTenants: false,
    destaque: true,
    alvos: 'todos',
    createdAt: Date.now()
  };

  await setDoc(doc(db, 'saas_releases', 'v3.6.13-login-redirect'), release);
  console.log('Seed das atualizacoes com sucesso!');
}

seed().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
