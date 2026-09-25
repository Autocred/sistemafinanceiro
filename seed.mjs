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
    versao: 'v3.6.17',
    titulo: 'Otimização de Performance Extrema',
    descricao: 'Melhorias técnicas invisíveis que deixam o sistema significativamente mais rápido, leve e fluido (sem alterar layout ou funções).',
    changes: [
      { tipo: 'performance', texto: 'A lista principal de lançamentos agora usa cache interno (memoização). Não "trava" mais ao digitar letras pesadas na busca ou transitar entre abas de filtros.' },
      { tipo: 'performance', texto: 'As dezenas de métricas matemáticas (KPIs) no Dashboard (Receitas, Despesas, Atrasos) agora também usam cache. Reduz drasticamente as requisições em tela.' },
      { tipo: 'performance', texto: 'Ao abrir telas secundárias, a tela não fica mais branca esperando carregar, agora exibe um loading dinâmico com roleta suave.' }
    ],
    dataLancamento: new Date().toISOString(),
    status: 'publicado',
    notificarTenants: false,
    destaque: true,
    alvos: 'todos',
    createdAt: Date.now()
  };

  await setDoc(doc(db, 'saas_releases', 'v3.6.17-perf-upgrade'), release);
  console.log('Seed das atualizacoes com sucesso!');
}

seed().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
