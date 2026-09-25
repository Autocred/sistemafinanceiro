import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';

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

async function migrateBackups() {
  console.log('Migrando backups globais para o tenant autocred...');
  try {
    const globalBackupsSnap = await getDocs(collection(db, 'backups_sistema'));
    let count = 0;
    
    for (const d of globalBackupsSnap.docs) {
      const data = d.data();
      const tenantRef = doc(db, `tenants/autocred-promotora-de-credito/backups_sistema`, d.id);
      await setDoc(tenantRef, data);
      count++;
    }
    console.log(`\nSucesso! ${count} backups migrados para a licença autocred.`);

    const globalLogsSnap = await getDocs(collection(db, 'logs_backup'));
    let countLogs = 0;
    for (const d of globalLogsSnap.docs) {
      const data = d.data();
      const tenantRef = doc(db, `tenants/autocred-promotora-de-credito/logs_backup`, d.id);
      await setDoc(tenantRef, data);
      countLogs++;
    }
    console.log(`\nSucesso! ${countLogs} logs migrados para a licença autocred.`);
    
  } catch (error) {
    console.error('Erro:', error);
  }
}

migrateBackups().then(() => process.exit(0)).catch(() => process.exit(1));
