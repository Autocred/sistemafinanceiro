import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, query, where, deleteDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCPhj4DYKlu8Q00FmjaA1ofjYUKhRJaK7U",
  authDomain: "sistemafinan.firebaseapp.com",
  projectId: "sistemafinan",
  storageBucket: "sistemafinan.firebasestorage.app",
  messagingSenderId: "1019353725480",
  appId: "1:1019353725480:web:a26ac2d2de24e8358d531d",
  measurementId: "G-RHLXQ3Z7W2"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fixDatabase() {
  console.log("Iniciando correção...");
  const contasSnapshot = await getDocs(collection(db, 'contas'));
  
  let carteiraId = null;
  for (const c of contasSnapshot.docs) {
    const data = c.data();
    if (data.nome && data.nome.toLowerCase().includes('carteira')) {
       console.log(`Encontrou conta: ${data.nome} (ID: ${c.id}), saldo atual: ${data.saldo}`);
       carteiraId = c.id;
       await updateDoc(doc(db, 'contas', c.id), { saldo: 161.06 });
       console.log(`Saldo de ${data.nome} atualizado para 161.06.`);
    }
  }

  if (carteiraId) {
    // Apagar movimentações de "estorno" falsas do IPTU de ontem
    const movSnapshot = await getDocs(collection(db, 'financial_movements'));
    for (const m of movSnapshot.docs) {
      const data = m.data();
      if (data.contaOrigemId === carteiraId && data.operation === 'estorno' && data.status === 'estornado') {
         console.log(`Encontrou movimentação indevida de estorno: ${m.id} valor: ${data.valor}`);
         await deleteDoc(doc(db, 'financial_movements', m.id));
         console.log("Deletada com sucesso.");
      }
    }
  }

  console.log("Concluído!");
  process.exit(0);
}

fixDatabase().catch(console.error);
