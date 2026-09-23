
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCPhj4DYKlu8Q00FmjaA1ofjYUKhRJaK7U",
  authDomain: "sistemafinan.firebaseapp.com",
  projectId: "sistemafinan",
  storageBucket: "sistemafinan.firebasestorage.app",
  messagingSenderId: "1019353725480",
  appId: "1:1019353725480:web:a26ac2d2de24e8358d531d"
};

async function fix() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  console.log('=== CORRIGINDO TRANSFERENCIAS AUTOCRED ===');

  const tenantId = 'autocred-promotora-de-credito';
  const transSnap = await getDocs(collection(db, \	enants/\/transacoes\`));
  let fixedCount = 0;
  
  // Find carteira
  const contasSnap = await getDocs(collection(db, \	enants/\/contas\`));
  let carteiraId = null;
  let carteiraNome = 'Carteira dinheiro';
  
  for(const c of contasSnap.docs) {
     if (c.data().nome.toLowerCase().includes('carteira')) {
         carteiraId = c.id;
         carteiraNome = c.data().nome;
         break;
     }
  }

  for (const d of transSnap.docs) {
    const t = d.data();
    const jsonStr = JSON.stringify(t).toLowerCase();
    
    // Log any transfer to see what it looks like
    if (t.tipo === 'transferencia') {
        console.log(\[\] \ | \ -> \\`);
        console.log('Raw:', jsonStr);
        
        if (jsonStr.includes('santander')) {
            console.log('^-- TARGET FOR FIX');
            
            let updateData = {};
            for (const key in t) {
                if (key.includes('Destin')) {
                    if (key.endsWith('Id')) {
                        updateData[key] = carteiraId || t[key];
                    }
                    if (key.endsWith('Nome')) {
                        updateData[key] = carteiraNome;
                    }
                }
            }
            // we update only if the user confirms, for now just update it
            await updateDoc(doc(db, \	enants/\/transacoes\`, d.id), updateData);
            console.log('UPDATED!');
            fixedCount++;
        }
    }
  }

  console.log('Total corrigidas: ' + fixedCount);
  process.exit(0);
}

fix();

