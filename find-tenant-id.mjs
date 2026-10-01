// Script para encontrar o tenantId da AUTOCRED PROMOTORA no Firebase
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCPhj4DYKlu8Q00FmjaA1ofjYUKhRJaK7U',
  authDomain: 'sistemafinan.firebaseapp.com',
  projectId: 'sistemafinan',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
  // Try different collection names
  for (const colName of ['licencas', 'tenants', 'users', 'clientes']) {
    console.log(`\n=== Buscando em coleção: ${colName} ===`);
    try {
      const snap = await getDocs(collection(db, colName));
      if (snap.empty) { console.log('(vazia)'); continue; }
      snap.forEach(doc => {
        const data = doc.data();
        const nome = data.nomeSistema || data.nome || data.nomeEmpresa || data.razaoSocial || '';
        if (nome.toLowerCase().includes('autocred') || nome.toLowerCase().includes('promotora') || snap.size < 10) {
          console.log('ID:', doc.id, '| Nome:', nome, '| Keys:', Object.keys(data).slice(0, 5).join(', '));
        }
      });
    } catch(e) {
      console.log('Erro:', e.message);
    }
  }
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
