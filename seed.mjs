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
    versao: 'v3.6.12',
    titulo: 'Otimização Anti-Duplicidade de Cartão',
    descricao: 'Efetuamos uma varredura rigorosa no código e consertamos um problema silencioso onde certas compras de cartão de crédito não estavam sendo filtradas corretamente pelos painéis de indicadores.',
    changes: [
      { tipo: 'correcao', texto: 'Ajuste ortográfico nas engrenagens do Dashboard. As variáveis responsáveis por ignorar "compras individuais no cartão" (para não duplicar com as Faturas Pagas) agora estão interceptando 100% dos lançamentos sem chance de vazamento.' },
      { tipo: 'melhoria', texto: 'A Auditoria completa de compilação (Build Test) foi concluída sem apontar nenhum erro interno. Todo o SaaS e os Tenants estão rodando na mesma lógica.' }
    ],
    dataLancamento: new Date().toISOString(),
    status: 'publicado',
    notificarTenants: false,
    destaque: true,
    alvos: 'todos',
    createdAt: Date.now()
  };

  await setDoc(doc(db, 'saas_releases', 'v3.6.12-anti-duplicidade'), release);
  console.log('Seed das atualizacoes com sucesso!');
}

seed().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
