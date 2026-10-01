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

const now = new Date().toISOString();
const faturaVencimento = '2026-11-04';
const faturaFechamento = '2026-10-28';
const mesReferencia = '2026-10';
const faturaId = 'fatura_mp_2026_10_restored';

// Dados COMPLETOS do backup (incluindo categorias, fornecedores, centros de custo)
const transacoesCompletas = [
  {
    "id": "mtsoo709s3ei1f",
    "valor": 531.76, "formaPagamento": "cartao_credito",
    "contaNome": "Carteira", "criadoEm": "2026-09-08T13:06:30.393Z",
    "centroCustoNome": "Mercado", "cartaoNome": "Mercado Pago",
    "parcelado": false, "dataVencimento": faturaVencimento,
    "dataPagamento": "", "dataLancamento": "2026-09-05",
    "recorrente": false, "descricao": "Mercado Royal",
    "fornecedorId": "mrv0oef7l3xfdf", "cartaoId": "ms3i8rqea6lflv",
    "tipo": "despesa", "totalParcelas": 1, "clienteId": "",
    "categoriaId": "mercado", "categoriaNome": "Mercado",
    "data": "2026-09-05", "categoriaIcone": "ShoppingCart",
    "contaId": "carteira", "centroCustoId": "ms1pr8y0gqfcjk",
    "atualizadoEm": now, "categoriaCor": "#10b981",
    "dataCompetencia": "2026-10", "fornecedorNome": "Mercado Royal",
    "faturaId": faturaId, "status": "pendente", "observacoes": ""
  },
  {
    "id": "mtsreyqf295gf7",
    "contaNome": "", "faturaId": faturaId,
    "fornecedorNome": "Mercado Lider", "dataCompetencia": "2026-10",
    "tipo": "despesa", "parcelado": false, "valor": 71.01,
    "dataPagamento": "", "fornecedorId": "mrv0oz6dq9tpqy",
    "descricao": "Mercado Lider", "data": "2026-09-05",
    "categoriaIcone": "ShoppingCart", "contaId": "",
    "totalParcelas": 1, "dataVencimento": faturaVencimento,
    "cartaoId": "ms3i8rqea6lflv", "clienteId": "",
    "atualizadoEm": now, "status": "pendente", "observacoes": "",
    "categoriaNome": "Mercado", "recorrente": false,
    "dataLancamento": "2026-09-05", "centroCustoId": "ms1pr8y0gqfcjk",
    "criadoEm": "2026-09-08T14:23:18.615Z", "categoriaCor": "#10b981",
    "formaPagamento": "cartao_credito", "categoriaId": "mercado",
    "cartaoNome": "Mercado Pago", "centroCustoNome": "Mercado"
  },
  {
    "id": "mtu33ru18uu2wv",
    "dataLancamento": "2026-09-09", "categoriaCor": "#10b981",
    "tipo": "despesa", "contaId": "carteira",
    "dataVencimento": faturaVencimento, "faturaId": faturaId,
    "data": "2026-09-08", "categoriaId": "mercado",
    "totalParcelas": 1, "centroCustoNome": "Mercado",
    "formaPagamento": "cartao_credito", "atualizadoEm": now,
    "centroCustoId": "ms1pr8y0gqfcjk", "categoriaNome": "Mercado",
    "fornecedorNome": "Mercado Lider", "dataCompetencia": "2026-10",
    "contaNome": "Carteira", "status": "pendente",
    "fornecedorId": "mrv0oz6dq9tpqy", "cartaoId": "ms3i8rqea6lflv",
    "recorrente": false, "valor": 105.61,
    "dataPagamento": "", "categoriaIcone": "ShoppingCart",
    "parcelado": false, "criadoEm": "2026-09-09T12:38:18.025Z",
    "cartaoNome": "Mercado Pago", "descricao": "Mercado Lider"
  },
  {
    "id": "mtu36htgmg682g",
    "contaNome": "", "categoriaIcone": "Package",
    "fornecedorId": "ms3i161ro0z6jv",
    "centroCustoNome": "Material Reforma e Construção",
    "faturaId": faturaId, "categoriaId": "ms3ii3jc8sce42",
    "cartaoNome": "Mercado Pago", "parcelado": false,
    "observacoes": "", "data": "2026-09-09",
    "fornecedorNome": "Mercado Livre", "recorrente": false,
    "valor": 266.82, "tipo": "despesa", "dataPagamento": "",
    "descricao": "Piso laminado", "formaPagamento": "cartao_credito",
    "categoriaCor": "#881337", "clienteId": "",
    "totalParcelas": 1, "status": "pendente",
    "centroCustoId": "ms3i0v9zyvdeld", "cartaoId": "ms3i8rqea6lflv",
    "categoriaNome": "Material de reforma e construção",
    "dataVencimento": faturaVencimento, "atualizadoEm": now,
    "dataLancamento": "2026-09-09", "criadoEm": "2026-09-09T12:40:25.012Z",
    "dataCompetencia": "2026-10", "contaId": ""
  },
  {
    "id": "mtud5z214fnuex",
    "categoriaId": "ms3ii3jc8sce42", "formaPagamento": "cartao_credito",
    "atualizadoEm": now, "recorrente": false,
    "faturaId": faturaId, "dataPagamento": "",
    "categoriaCor": "#881337", "dataVencimento": faturaVencimento,
    "status": "pendente", "dataCompetencia": "2026-10",
    "observacoes": "", "clienteId": "",
    "cartaoNome": "Mercado Pago", "dataLancamento": "2026-09-09",
    "data": "2026-09-09", "centroCustoNome": "Material Reforma e Construção",
    "categoriaNome": "Material de reforma e construção",
    "descricao": "Rodapé", "valor": 70.26,
    "centroCustoId": "ms3i0v9zyvdeld", "totalParcelas": 1,
    "tipo": "despesa", "parcelado": false,
    "cartaoId": "ms3i8rqea6lflv", "categoriaIcone": "Package",
    "fornecedorId": "ms3i161ro0z6jv", "contaId": "",
    "criadoEm": "2026-09-09T17:19:56.857Z", "contaNome": "",
    "fornecedorNome": "Mercado Livre"
  },
  {
    "id": "mtud8cfu2qwd7l",
    "centroCustoNome": "Assinaturas", "totalParcelas": 1,
    "centroCustoId": "mtud7oat8edm2n", "clienteId": "",
    "fornecedorNome": "Mercado Pago", "categoriaNome": "Assinaturas",
    "observacoes": "", "categoriaCor": "#a78bfa",
    "recorrente": false, "categoriaId": "assinaturas",
    "atualizadoEm": now, "categoriaIcone": "Smartphone",
    "faturaId": faturaId, "valor": 9.90,
    "cartaoNome": "Mercado Pago", "dataVencimento": faturaVencimento,
    "tipo": "despesa", "fornecedorId": "mrumjmoeppjjrf",
    "contaId": "", "status": "pendente",
    "dataLancamento": "2026-09-09", "data": "2026-09-09",
    "criadoEm": "2026-09-09T17:21:47.634Z", "contaNome": "",
    "formaPagamento": "cartao_credito", "dataCompetencia": "2026-10",
    "descricao": "Melimais Mercado Pago", "parcelado": false,
    "cartaoId": "ms3i8rqea6lflv", "dataPagamento": ""
  },
  // Loovi Seguros - lançado em 30/09
  {
    "id": "loovi_30_09_2026",
    "descricao": "Loovi Seguros", "valor": 194.00,
    "tipo": "despesa", "status": "pendente",
    "data": "2026-09-30", "dataLancamento": "2026-09-30",
    "dataVencimento": faturaVencimento, "dataPagamento": "",
    "formaPagamento": "cartao_credito",
    "cartaoId": "ms3i8rqea6lflv", "cartaoNome": "Mercado Pago",
    "faturaId": faturaId,
    "categoriaId": "seguros", "categoriaNome": "Seguros",
    "categoriaIcone": "Shield", "categoriaCor": "#6366f1",
    "dataCompetencia": "2026-10",
    "parcelado": false, "totalParcelas": 1, "recorrente": false,
    "criadoEm": now, "atualizadoEm": now,
    "contaId": "", "contaNome": "", "observacoes": ""
  }
];

async function main() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  const valorTotal = transacoesCompletas.reduce((s, t) => s + t.valor, 0);

  // 1. Criar/sobrescrever a fatura com dados completos
  const fatura = {
    id: faturaId,
    cartaoId: 'ms3i8rqea6lflv',
    cartaoNome: 'Mercado Pago',
    cartaoCor: '#00bcff',
    mesReferencia,
    dataFechamento: faturaFechamento,
    dataVencimento: faturaVencimento,
    valorTotal: parseFloat(valorTotal.toFixed(2)),
    status: 'aberta',
    transacaoIds: transacoesCompletas.map(t => t.id),
    pagamentos: [],
    criadoEm: now,
    atualizadoEm: now,
  };

  await setDoc(doc(db, 'faturas', faturaId), fatura);
  console.log(`✅ Fatura: ${mesReferencia} | Fechamento: ${faturaFechamento} | Vencimento: ${faturaVencimento} | Total: R$ ${valorTotal.toFixed(2)}`);

  // 2. Restaurar cada transação com dados completos
  for (const t of transacoesCompletas) {
    await setDoc(doc(db, 'transacoes', t.id), t, { merge: false });
    console.log(`  ✅ ${t.descricao} — R$ ${t.valor.toFixed(2)} — ${t.data} — Cat: ${t.categoriaNome}`);
  }

  console.log(`\n🎉 RESTAURAÇÃO COMPLETA COM DADOS ORIGINAIS!`);
  console.log(`   ${transacoesCompletas.length} lançamentos restaurados`);
  console.log(`   Total: R$ ${valorTotal.toFixed(2)}`);
}

main().catch(console.error);
