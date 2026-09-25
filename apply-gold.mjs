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

const goldPalette = {
  paletaAtiva: 'ouro_moderno',
  corPrimaria: '#d4af37',
  corSecundaria: '#997a00',
  corAcento: '#fcd34d',
  corFundo: '#f8fafc'
};

async function applyGold() {
  console.log('Iniciando atualização de paleta para todas as licenças...');
  try {
    const tenantsSnap = await getDocs(collection(db, 'admin_master_licencas'));
    let count = 0;
    for (const tenantDoc of tenantsSnap.docs) {
      const tenantId = tenantDoc.id;
      // Atualizar config/geral de cada tenant
      const configRef = doc(db, `tenants/${tenantId}/config`, 'geral');
      await setDoc(configRef, goldPalette, { merge: true });
      count++;
      console.log(`- Tenant ${tenantId} atualizado para Ouro Moderno.`);
    }
    
    // Atualizar as configurações globais (saas_settings/identidade) para que novas licenças já peguem
    await setDoc(doc(db, 'saas_settings', 'identidade'), {
      corPrimaria: goldPalette.corPrimaria,
      atualizadoEm: new Date().toISOString()
    }, { merge: true });
    
    console.log(`\nSucesso! ${count} licenças atualizadas.`);
  } catch (error) {
    console.error('Erro ao atualizar licenças:', error);
  }
}

applyGold().then(() => process.exit(0)).catch(() => process.exit(1));
