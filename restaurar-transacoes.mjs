import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCPhj4DYKlu8Q00FmjaA1ofjYUKhRJaK7U',
  authDomain: 'sistemafinan.firebaseapp.com',
  projectId: 'sistemafinan',
  storageBucket: 'sistemafinan.firebasestorage.app',
  messagingSenderId: '1019353725480',
  appId: '1:1019353725480:web:a26ac2d2de24e8358d531d',
};

const now = new Date().toISOString();
const cartaoId = 'mercadopago_cartao';
const cartaoNome = 'Mercado Pago';

// Os 6 lançamentos pendentes recuperados do backup de 30/09
// + o lançamento Loovi Seguros de 30/09 (R$ 194,00)
// Todos devem ir para fatura 2026-10, fechamento 28/10, vencimento 04/11
const transacoes = [
  { id: 'mtsoo709s3ei1f', descricao: 'Mercado Royal', valor: 531.76, data: '2026-09-05', dataLancamento: '2026-09-05' },
  { id: 'mtsreyqf295gf7', descricao: 'Mercado Lider', valor: 71.01, data: '2026-09-05', dataLancamento: '2026-09-05' },
  { id: 'mtu33ru18uu2wv', descricao: 'Mercado Lider', valor: 105.61, data: '2026-09-08', dataLancamento: '2026-09-08' },
  { id: 'mtu36htgmg682g', descricao: 'Piso laminado', valor: 266.82, data: '2026-09-09', dataLancamento: '2026-09-09' },
  { id: 'mtud5z214fnuex', descricao: 'Rodapé', valor: 70.26, data: '2026-09-09', dataLancamento: '2026-09-09' },
  { id: 'mtud8cfu2qwd7l', descricao: 'Melimais Mercado Pago', valor: 9.90, data: '2026-09-09', dataLancamento: '2026-09-09' },
  // Loovi Seguros - lançado em 30/09, deve estar na fatura 2026-10
  { id: 'loovi_30_09_2026', descricao: 'Loovi Seguros', valor: 194.00, data: '2026-09-30', dataLancamento: '2026-09-30' },
];

const faturaVencimento = '2026-11-04';
const faturaFechamento = '2026-10-28';
const mesReferencia = '2026-10';

async function main() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  // 1. Criar a fatura primeiro
  const faturaId = 'fatura_mp_2026_10_restored';
  const valorTotal = transacoes.reduce((s, t) => s + t.valor, 0);
  
  const fatura = {
    id: faturaId,
    cartaoId,
    cartaoNome,
    cartaoCor: '#00bcff',
    mesReferencia,
    dataFechamento: faturaFechamento,
    dataVencimento: faturaVencimento,
    valorTotal: parseFloat(valorTotal.toFixed(2)),
    status: 'aberta',
    transacaoIds: transacoes.map(t => t.id),
    pagamentos: [],
    criadoEm: now,
    atualizadoEm: now,
  };

  await setDoc(doc(db, 'faturas', faturaId), fatura);
  console.log(`✅ Fatura criada: ${mesReferencia} | Vencimento: ${faturaVencimento} | Total: R$ ${valorTotal.toFixed(2)}`);

  // 2. Recriar/restaurar cada transação no Firestore
  for (const t of transacoes) {
    const transacao = {
      id: t.id,
      descricao: t.descricao,
      valor: t.valor,
      tipo: 'despesa',
      status: 'pendente',
      data: t.data,
      dataLancamento: t.dataLancamento,
      dataVencimento: faturaVencimento,
      formaPagamento: 'cartao_credito',
      cartaoId,
      cartaoNome,
      faturaId,
      categoriaNome: 'Outros',
      categoriaIcone: 'Package',
      categoriaCor: 'var(--text-muted)',
      criadoEm: t.id === 'loovi_30_09_2026' ? now : '2026-09-30T00:00:00.000Z',
      atualizadoEm: now,
    };
    
    await setDoc(doc(db, 'transacoes', t.id), transacao, { merge: true });
    console.log(`  ✅ Lançamento: ${t.descricao} — R$ ${t.valor.toFixed(2)} — ${t.data}`);
  }

  console.log(`\n🎉 RESTAURAÇÃO COMPLETA!`);
  console.log(`   Fatura: ${mesReferencia}`);
  console.log(`   Fechamento: ${faturaFechamento}`);
  console.log(`   Vencimento: ${faturaVencimento}`);
  console.log(`   Total: R$ ${valorTotal.toFixed(2)}`);
  console.log(`   Lançamentos: ${transacoes.length}`);
}

main().catch(console.error);
