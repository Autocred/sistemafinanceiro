
const { initializeApp } = require('firebase/app');
const { getFirestore, collectionGroup, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyCPhj4DYKlu8Q00FmjaA1ofjYUKhRJaK7U",
  authDomain: "sistemafinan.firebaseapp.com",
  projectId: "sistemafinan",
  storageBucket: "sistemafinan.firebasestorage.app",
  messagingSenderId: "1019353725480",
  appId: "1:1019353725480:web:a26ac2d2de24e8358d531d"
};

async function dump() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  const transSnap = await getDocs(collectionGroup(db, 'transacoes'));
  
  for (const d of transSnap.docs) {
    const t = d.data();
    if (t.tipo === 'transferencia') {
        let name1 = t.contaNome || '';
        let name2 = '';
        for (const key in t) {
            if (key.includes('Destin') && key.endsWith('Nome')) {
                name2 = t[key];
            }
        }
        if (name1 && name2 && name1 === name2) {
            console.log('SAME ACCOUNT TRANSFER FOUND: ', d.id);
            console.log('Data:', JSON.stringify(t));
            console.log('----------------');
        }
    }
  }
  process.exit(0);
}
dump();

