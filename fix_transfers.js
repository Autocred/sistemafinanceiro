
const { initializeApp } = require('firebase/app');
const { getFirestore, collectionGroup, getDocs, updateDoc, doc } = require('firebase/firestore');

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

  console.log('=== CORRIGINDO TRANSFERENCIAS ===');

  const transSnap = await getDocs(collectionGroup(db, 'transacoes'));
  let fixedCount = 0;
  
  for (const d of transSnap.docs) {
    const t = d.data();
    const jsonStr = JSON.stringify(t).toLowerCase();
    
    if (t.tipo === 'transferencia' && jsonStr.includes('santander')) {
      let countSantander = 0;
      for (const key in t) {
         if (typeof t[key] === 'string' && t[key].toLowerCase().includes('santander')) {
            countSantander++;
         }
      }
      
      if (countSantander >= 2) {
          console.log('Encontrada transferencia! DocID: ' + d.id);
          
          const docRef = doc(db, d.ref.path);
          
          const tenantPath = d.ref.path.split('/transacoes/')[0];
          const contasSnap = await getDocs(collectionGroup(db, 'contas'));
          let carteiraId = null;
          let carteiraNome = 'Carteira dinheiro';
          
          for(const c of contasSnap.docs) {
             if (c.ref.path.startsWith(tenantPath) && c.data().nome.toLowerCase().includes('carteira')) {
                 carteiraId = c.id;
                 carteiraNome = c.data().nome;
                 break;
             }
          }
          
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
          
          await updateDoc(docRef, updateData);
          console.log('Corrigido para: ' + carteiraNome);
          fixedCount++;
      }
    }
  }

  console.log('Total corrigidas: ' + fixedCount);
  process.exit(0);
}

fix();

