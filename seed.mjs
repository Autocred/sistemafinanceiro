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
  const release8 = {
    versao: 'v3.6.8',
    titulo: 'Isolamento de Aplicativos PWA por Licenca',
    descricao: 'Os aplicativos instalados no computador ou celular agora sao completamente isolados pelo sistema. Cada icone abrira estritamente a licenca e tela de login correspondentes.',
    changes: [
      { tipo: 'melhoria', texto: 'Inclusao de IDs unicos (PWA Manifest ID) baseados no tenant, forçando o sistema operacional a tratar a Autocred e o Master como softwares instalados separados.' },
      { tipo: 'correcao', texto: 'A URL de inicio (start_url) agora é amarrada estritamente à licença no momento da instalacao, impedindo que o ultimo acesso sobrescreva o atalho do aplicativo.' }
    ],
    dataLancamento: new Date().toISOString(),
    status: 'publicado',
    notificarTenants: false,
    destaque: true,
    alvos: 'todos',
    createdAt: Date.now()
  };

  await setDoc(doc(db, 'saas_releases', 'v3.6.8-pwa-isolation'), release8);
  console.log('Seed das atualizacoes com sucesso!');
}

seed().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
