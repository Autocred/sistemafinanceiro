import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCPhj4DYKlu8Q00FmjaA1ofjYUKhRJaK7U",
  authDomain: "sistemafinan.firebaseapp.com",
  projectId: "sistemafinan",
  storageBucket: "sistemafinan.firebasestorage.app",
  messagingSenderId: "1019353725480",
  appId: "1:1019353725480:web:a26ac2d2de24e8358d531d"
};

async function diagnose() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  // Get the fatura doc with ALL fields
  console.log("=== FATURA DOC (raw) ===");
  const faturaDoc = await getDoc(doc(db, 'faturas', 'mrupcoaaadqi9i'));
  if (faturaDoc.exists()) {
    console.log(JSON.stringify(faturaDoc.data(), null, 2));
  }

  // List all transacoes that have cartaoId
  console.log("\n=== TRANSAÇÕES COM CARTÃO ===");
  const transSnap = await getDocs(collection(db, 'transacoes'));
  transSnap.forEach(d => {
    const data = d.data();
    if (data.cartaoId) {
      console.log(`ID: ${d.id}`);
      console.log(`  Desc: ${data.descricao}`);
      console.log(`  Valor: R$ ${data.valor}`);
      console.log(`  Tipo: ${data.tipo}`);
      console.log(`  CartaoId: ${data.cartaoId}`);
      console.log(`  ContaId: ${data.contaId}`);
      console.log(`  FaturaId: ${data.faturaId}`);
      console.log(`  Data: ${data.data}`);
      console.log('');
    }
  });

  // List ALL transacoes to find the 600 and 1688 ones
  console.log("\n=== TODAS TRANSAÇÕES (buscando 600 e 1688) ===");
  transSnap.forEach(d => {
    const data = d.data();
    const v = Number(data.valor);
    if (v === 600 || v === 1688.77 || v === 1688 || (data.descricao && (data.descricao.includes('Autocred') || data.descricao.includes('Mercado Pago')))) {
      console.log(`ID: ${d.id}`);
      console.log(`  Desc: ${data.descricao}`);
      console.log(`  Valor: R$ ${data.valor}`);
      console.log(`  Tipo: ${data.tipo}`);
      console.log(`  CartaoId: ${data.cartaoId || 'NONE'}`);
      console.log(`  ContaId: ${data.contaId}`);
      console.log(`  FaturaId: ${data.faturaId || 'NONE'}`);
      console.log(`  Data: ${data.data}`);
      console.log(`  Status: ${data.status}`);
      console.log('');
    }
  });

  // Check cartoes collection
  console.log("\n=== CARTÕES ===");
  const cartoesSnap = await getDocs(collection(db, 'cartoes'));
  cartoesSnap.forEach(d => {
    const data = d.data();
    console.log(`ID: ${d.id} | ${data.nome} | Limite: ${data.limite} | Disponível: ${data.limiteDisponivel}`);
  });

  process.exit(0);
}

diagnose();
