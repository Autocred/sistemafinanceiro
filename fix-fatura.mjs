import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';

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

  // 1. Remove cartaoId and faturaId from the receita transaction
  console.log("1. Fixing transaction mrz8muukd4rewb (removing cartaoId and faturaId)...");
  await updateDoc(doc(db, 'transacoes', 'mrz8muukd4rewb'), {
    cartaoId: '',
    faturaId: '',
    cartaoNome: ''
  });
  console.log("   Done.");

  // 2. Fix the fatura - remove the transaction from transacaoIds and recalculate
  console.log("2. Fixing fatura mrupcoaaadqi9i...");
  const faturaDoc = await getDoc(doc(db, 'faturas', 'mrupcoaaadqi9i'));
  const fData = faturaDoc.data();
  const newTransacaoIds = (fData.transacaoIds || []).filter(id => id !== 'mrz8muukd4rewb');
  // The correct total is only the despesa: 1688.77
  await updateDoc(doc(db, 'faturas', 'mrupcoaaadqi9i'), {
    transacaoIds: newTransacaoIds,
    valorTotal: 1688.77
  });
  console.log("   transacaoIds:", newTransacaoIds);
  console.log("   valorTotal: 1688.77");
  console.log("   Done.");

  // 3. Fix the card limit (Limite 1900, gasto real = 1688.77 → disponível = 211.23)
  console.log("3. Fixing card limit...");
  const cardDoc = await getDoc(doc(db, 'cartoes', 'mercadopago_cartao'));
  const cData = cardDoc.data();
  const novoDisponivel = cData.limite - 1688.77;
  await updateDoc(doc(db, 'cartoes', 'mercadopago_cartao'), {
    limiteDisponivel: novoDisponivel
  });
  console.log(`   Limite: ${cData.limite} | Novo disponível: ${novoDisponivel}`);
  console.log("   Done.");

  // 4. Verify
  console.log("\n=== VERIFICAÇÃO ===");
  const fV = await getDoc(doc(db, 'faturas', 'mrupcoaaadqi9i'));
  console.log("Fatura:", JSON.stringify(fV.data(), null, 2));
  const cV = await getDoc(doc(db, 'cartoes', 'mercadopago_cartao'));
  console.log("Cartão:", JSON.stringify(cV.data(), null, 2));
  const tV = await getDoc(doc(db, 'transacoes', 'mrz8muukd4rewb'));
  console.log("Transação (Autocred):", JSON.stringify({ cartaoId: tV.data().cartaoId, faturaId: tV.data().faturaId }));

  console.log("\n✅ Fatura corrigida! Valor: R$ 1.688,77");
  process.exit(0);
}

fix();
