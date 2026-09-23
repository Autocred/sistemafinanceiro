import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCPhj4DYKlu8Q00FmjaA1ofjYUKhRJaK7U",
  authDomain: "sistema-financeiro-pessoal-72.firebaseapp.com",
  projectId: "sistema-financeiro-pessoal-72",
  storageBucket: "sistema-financeiro-pessoal-72.firebasestorage.app",
  messagingSenderId: "530043831649",
  appId: "1:530043831649:web:11413a1a31cd330f890251",
  measurementId: "G-FDRDF7T88K"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fix() {
  const faturasSnap = await getDocs(collection(db, 'empresas', 'default', 'faturas'));
  const transacoesSnap = await getDocs(collection(db, 'empresas', 'default', 'transacoes'));

  const transacoes = transacoesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  let fixed = 0;

  for (const fatDoc of faturasSnap.docs) {
    const fatura = fatDoc.data();
    const tIds = fatura.transacaoIds || [];
    
    let realTotal = 0;
    for (const tid of tIds) {
      const t = transacoes.find(x => x.id === tid);
      if (t && t.valor) {
        realTotal += Math.abs(t.valor);
      }
    }

    if (Math.abs((fatura.valorTotal || 0) - realTotal) > 0.01) {
      console.log(`Fixing fatura ${fatDoc.id} (${fatura.mesReferencia}): ${fatura.valorTotal} -> ${realTotal}`);
      await updateDoc(doc(db, 'empresas', 'default', 'faturas', fatDoc.id), { valorTotal: realTotal });
      fixed++;
    }
  }

  console.log(`Fixed ${fixed} faturas.`);
  process.exit(0);
}

fix();
