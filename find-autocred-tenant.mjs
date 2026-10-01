import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCPhj4DYKlu8Q00FmjaA1ofjYUKhRJaK7U',
  authDomain: 'sistemafinan.firebaseapp.com',
  projectId: 'sistemafinan',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
  // Check the FTwOLrYckTPdD912rTv3gELQDQu2 user that has tenantId field
  const userDoc = await getDoc(doc(db, 'users', 'FTwOLrYckTPdD912rTv3gELQDQu2'));
  if (userDoc.exists()) {
    console.log('User data:', JSON.stringify(userDoc.data(), null, 2));
  }
  
  // Also check tenants subcollection path for AUTOCRED
  // Try querying transacoes under the tenantId
  const { collection, getDocs } = await import('firebase/firestore');
  const tenantId = userDoc.data()?.tenantId;
  if (tenantId) {
    console.log('\n✅ TenantId da AUTOCRED:', tenantId);
    const transSnap = await getDocs(collection(db, `tenants/${tenantId}/transacoes`));
    console.log('Transações nesse tenant:', transSnap.size);
  }
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
