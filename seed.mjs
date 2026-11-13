import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, where } from 'firebase/firestore';

const app = initializeApp({
  apiKey: 'AIzaSyCPhj4DYKlu8Q00FmjaA1ofjYUKhRJaK7U',
  authDomain: 'sistemafinan.firebaseapp.com',
  projectId: 'sistemafinan'
});

const db = getFirestore(app);

async function run() {
  const q = query(collection(db, 'saas_releases'), where('versao', '==', 'v3.7.7'));
  const snap = await getDocs(q);
  if (snap.empty) {
    await addDoc(collection(db, 'saas_releases'), {
      versao: 'v3.7.7',
      titulo: 'Dashboard com Receitas a Receber na Mesma Linha e Auto-Remoção de Parcelamentos Quitados',
      descricao: 'Inclusão do card Receitas a Receber alinhado na mesma linha horizontal dos indicadores principais do Dashboard e remoção automática de parcelamentos/financiamentos/empréstimos sempre que terminarem (quando não houver mais parcelas a vencer).',
      dataLancamento: new Date().toISOString(),
      status: 'publicado',
      destaque: true,
      notificarTenants: false,
      alvos: 'todos',
      changes: [
        { tipo: 'novidade', texto: 'Card Receitas a Receber no Dashboard: Exibido na mesma linha horizontal junto com Saldo em Caixa, Receitas Efetivadas, Despesas Pagas e Despesas a Pagar.' },
        { tipo: 'novidade', texto: 'Remoção Automática de Parcelamentos Encerrados: Sempre que um parcelamento, financiamento ou empréstimo não tiver mais parcelas a vencer, seus valores saem automaticamente do Dashboard.' },
        { tipo: 'melhoria', texto: 'Contador de Parcelas Restantes: Nos parcelamentos ainda ativos, o painel exibe quantas parcelas faltam a vencer e a data da última parcela.' }
      ]
    });
    console.log('Release notes v3.7.7 added!');
  } else {
    console.log('Release notes v3.7.7 already registered!');
  }
  process.exit(0);
}

run();
