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
  const release7 = {
    versao: 'v3.6.7',
    titulo: 'Melhorias em Logoff e Backups Automaticos',
    descricao: 'Correcao de bugs relacionados ao logoff por inatividade (que estava deslogando imediatamente ao entrar) e ajustes na engrenagem de backup automatico.',
    changes: [
      { tipo: 'correcao', texto: 'Logoff Automatico corrigido. Anteriormente, sessoes antigas podiam acionar o logoff instantaneamente no momento do login.' },
      { tipo: 'correcao', texto: 'A rotina de backup automatico agora garante a criacao da copia de seguranca caso o sistema nao seja aberto no horario exato estipulado, compensando o atraso na primeira oportunidade.' }
    ],
    dataLancamento: new Date().toISOString(),
    status: 'publicado',
    notificarTenants: false,
    destaque: true,
    alvos: 'todos',
    createdAt: Date.now()
  };

  await setDoc(doc(db, 'saas_releases', 'v3.6.7-logoff-backup'), release7);
  console.log('Seed das atualizacoes com sucesso!');
}

seed().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
