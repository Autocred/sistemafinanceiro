import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc } from 'firebase/firestore';

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

const bluePalette = {
  paletaAtiva: 'azul_autocred',
  corPrimaria: '#2563eb',
  corSecundaria: '#1d4ed8',
  corAcento: '#3b82f6',
  corFundo: '#f8fafc'
};

async function revertGold() {
  console.log('Revertendo atualização de paleta para todas as licenças...');
  try {
    const tenantsSnap = await getDocs(collection(db, 'admin_master_licencas'));
    let count = 0;
    for (const tenantDoc of tenantsSnap.docs) {
      const tenantId = tenantDoc.id;
      // Atualizar config/geral de cada tenant
      const configRef = doc(db, `tenants/${tenantId}/config`, 'geral');
      await setDoc(configRef, bluePalette, { merge: true });
      count++;
    }
    
    await setDoc(doc(db, 'saas_settings', 'identidade'), {
      corPrimaria: bluePalette.corPrimaria,
      atualizadoEm: new Date().toISOString()
    }, { merge: true });
    
    console.log(`\nSucesso! ${count} licenças revertidas para o padrão.`);
  } catch (error) {
    console.error('Erro ao atualizar licenças:', error);
  }
}

revertGold().then(() => process.exit(0)).catch(() => process.exit(1));
