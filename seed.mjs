import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, where } from 'firebase/firestore';

const app = initializeApp({
  apiKey: 'AIzaSyCPhj4DYKlu8Q00FmjaA1ofjYUKhRJaK7U',
  authDomain: 'sistemafinan.firebaseapp.com',
  projectId: 'sistemafinan'
});

const db = getFirestore(app);

async function run() {
  const q = query(collection(db, 'saas_releases'), where('versao', '==', 'v3.8.7'));
  const snap = await getDocs(q);
  if (snap.empty) {
    await addDoc(collection(db, 'saas_releases'), {
      versao: 'v3.8.7',
      titulo: 'Auditoria de Parcelamentos: Calendário de Alívio e Raio-X com Classificação Correta',
      descricao: 'Varredura completa na identificação de parcelamentos e empréstimos: contas recorrentes mensais (FGTS, energia, internet, uniformes, folha, comissões) deixam de ser tratadas como parcelamentos que acabam.',
      dataLancamento: new Date().toISOString(),
      status: 'publicado',
      destaque: false,
      notificarTenants: false,
      alvos: 'todos',
      changes: [
        { tipo: 'correcao', texto: 'Calendário de Alívio de Caixa: exibe somente empréstimos e parcelamentos reais (ex.: Capital de giro com última parcela em Nov/2026), sem incluir contas recorrentes como FGTS e Uniformes.' },
        { tipo: 'correcao', texto: 'Séries de parcelamento não são mais divididas em duas quando apenas parte das parcelas tem o código de grupo, garantindo a data correta da última parcela.' },
        { tipo: 'correcao', texto: 'Raio-X de Cada R$ 100: parcelamentos de INSS/Simples passam a contar em Empréstimos & Parcelamentos, e Comissões não são mais confundidas com o imposto ISS.' }
      ]
    });
    console.log('Release notes v3.8.7 added!');
  } else {
    console.log('Release notes v3.8.7 already registered!');
  }
  process.exit(0);
}

run();
