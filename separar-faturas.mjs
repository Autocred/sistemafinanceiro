import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCPhj4DYKlu8Q00FmjaA1ofjYUKhRJaK7U',
  authDomain: 'sistemafinan.firebaseapp.com',
  projectId: 'sistemafinan',
  storageBucket: 'sistemafinan.firebasestorage.app',
  messagingSenderId: '1019353725480',
  appId: '1:1019353725480:web:a26ac2d2de24e8358d531d',
};

const transacoesSetembro = [
  "mtsoo709s3ei1f", // Mercado Royal
  "mtsreyqf295gf7", // Mercado Lider
  "mtu33ru18uu2wv", // Mercado Lider
  "mtu36htgmg682g", // Piso laminado
  "mtud5z214fnuex", // Rodapé
  "mtud8cfu2qwd7l"  // Melimais Mercado Pago
];
const looviId = "loovi_30_09_2026";

async function main() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const now = new Date().toISOString();

  console.log("Separando lançamentos em faturas corretas...");

  // 1. Fatura de Setembro (Vence 04/10)
  const faturaSetembroId = 'fatura_mp_2026_09_restored';
  const faturaSetembro = {
    id: faturaSetembroId,
    cartaoId: 'ms3i8rqea6lflv',
    cartaoNome: 'Mercado Pago',
    cartaoCor: '#00bcff',
    mesReferencia: '2026-09',
    dataFechamento: '2026-09-28',
    dataVencimento: '2026-10-04',
    valorTotal: 1055.36,
    status: 'aberta',
    transacaoIds: transacoesSetembro,
    pagamentos: [],
    criadoEm: now,
    atualizadoEm: now,
  };
  await setDoc(doc(db, 'faturas', faturaSetembroId), faturaSetembro);
  console.log("✅ Fatura de Setembro (04/10) criada com R$ 1055.36");

  // 2. Fatura de Outubro (Vence 04/11)
  const faturaOutubroId = 'fatura_mp_2026_10_restored';
  const faturaOutubro = {
    id: faturaOutubroId,
    cartaoId: 'ms3i8rqea6lflv',
    cartaoNome: 'Mercado Pago',
    cartaoCor: '#00bcff',
    mesReferencia: '2026-10',
    dataFechamento: '2026-10-28',
    dataVencimento: '2026-11-04',
    valorTotal: 194.00,
    status: 'aberta',
    transacaoIds: [looviId],
    pagamentos: [],
    criadoEm: now,
    atualizadoEm: now,
  };
  await setDoc(doc(db, 'faturas', faturaOutubroId), faturaOutubro);
  console.log("✅ Fatura de Outubro (04/11) criada com R$ 194.00 (Loovi)");

  // 3. Atualizar as transações para apontarem para as faturas corretas
  for (const tid of transacoesSetembro) {
    await setDoc(doc(db, 'transacoes', tid), {
      faturaId: faturaSetembroId,
      dataVencimento: '2026-10-04',
      dataCompetencia: '2026-09'
    }, { merge: true });
  }
  console.log("✅ Lançamentos antigos vinculados à fatura de Setembro");

  await setDoc(doc(db, 'transacoes', looviId), {
    faturaId: faturaOutubroId,
    dataVencimento: '2026-11-04',
    dataCompetencia: '2026-10'
  }, { merge: true });
  console.log("✅ Lançamento Loovi vinculado à fatura de Outubro");

  console.log("\n🎉 SEPARAÇÃO CONCLUÍDA!");
}

main().catch(console.error);
