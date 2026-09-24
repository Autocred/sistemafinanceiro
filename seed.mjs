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
    versao: 'v3.6.10',
    titulo: 'Alinhamento dos Indicadores de Receitas/Despesas Pagas',
    descricao: 'Os painéis de Inteligência e Gráficos (Dashboard Mensal) foram reajustados para refletir perfeitamente o saldo de contas "Realmente Pagas" e "Recebidas", priorizando sempre a data efetiva de pagamento, cruzando os dados exatamente com o Dashboard principal.',
    changes: [
      { tipo: 'correcao', texto: 'A regra do Painel "Análise Mensal" foi mudada. Antes algumas contas fugiam do mês devido ao campo "Data de Competência". Agora, se uma conta de agosto for paga em setembro, o sistema registrará a despesa estritamente dentro da estatística de Setembro.' },
      { tipo: 'melhoria', texto: 'Os totais de Indicadores Automáticos do relatório mensal passaram a somar EXCLUSIVAMENTE os valores que já estão "Pagos" (Efetivados), não misturando mais com contas futuras/pendentes.' }
    ],
    dataLancamento: new Date().toISOString(),
    status: 'publicado',
    notificarTenants: false,
    destaque: true,
    alvos: 'todos',
    createdAt: Date.now()
  };

  await setDoc(doc(db, 'saas_releases', 'v3.6.10-indicadores-pagamento'), release);
  console.log('Seed das atualizacoes com sucesso!');
}

seed().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
