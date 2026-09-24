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
  const release5 = {
    versao: 'v3.6.5',
    titulo: 'Identidade White Label na Tela de Login',
    descricao: 'Correção e reforço na arquitetura White Label: A tela de login agora respeita rigorosamente o nome cadastrado nas configurações individuais de cada licença (Tenant) logo no primeiro acesso.',
    changes: [
      { tipo: 'correcao', texto: 'A tela de login volta a ler instantaneamente o ID da empresa através da URL para exibir a logomarca e o Nome da Empresa customizados antes mesmo do login.' },
      { tipo: 'melhoria', texto: 'Regra Global de White Label: Estabelecido no sistema que a marca individual tem precedência absoluta sobre o nome padrão do sistema em todas as licenças.' }
    ],
    dataLancamento: new Date().toISOString(),
    status: 'publicado',
    notificarTenants: false,
    destaque: true,
    alvos: 'todos',
    createdAt: Date.now()
  };

  await setDoc(doc(db, 'saas_releases', 'v3.6.5-login-whitelabel'), release5);
  console.log('Seed das atualizacoes com sucesso!');
}

seed().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
