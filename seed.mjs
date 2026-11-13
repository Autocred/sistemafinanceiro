import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, where } from 'firebase/firestore';

const app = initializeApp({
  apiKey: 'AIzaSyCPhj4DYKlu8Q00FmjaA1ofjYUKhRJaK7U',
  authDomain: 'sistemafinan.firebaseapp.com',
  projectId: 'sistemafinan'
});

const db = getFirestore(app);

async function run() {
  const q = query(collection(db, 'saas_releases'), where('versao', '==', 'v3.8.4'));
  const snap = await getDocs(q);
  if (snap.empty) {
    await addDoc(collection(db, 'saas_releases'), {
      versao: 'v3.8.4',
      titulo: 'Debt Payoff Snowball vs. Avalanche Simulator & Calendário de Alívio de Caixa (Padrão SoFi / Tally USA)',
      descricao: 'Implementação do Acelerador Inteligente de Quitação de Parcelamentos & Empréstimos Ativos no Dashboard e Resumo Mensal, com estratégias Snowball, Avalanche e ROI de Alívio Rápido, além do Calendário de Alívio de Caixa e Simulador What-If de antecipação.',
      dataLancamento: new Date().toISOString(),
      status: 'publicado',
      destaque: true,
      notificarTenants: false,
      alvos: 'todos',
      changes: [
        { tipo: 'novidade', texto: 'Calendário de Alívio de Caixa: Mostra exatamente em qual mês cada parcelamento ativo termina e quanto de fôlego mensal (+R$/mês) será destravado automaticamente.' },
        { tipo: 'novidade', texto: '3 Estratégias Americanas de Quitação (ROI Tally, Bola de Neve / Snowball e Avalanche): Ordene seus parcelamentos ativos pela melhor eficiência de liberação de fluxo de caixa.' },
        { tipo: 'novidade', texto: 'Simulador What-If de Quitação Antecipada: Simule qualquer valor e % de desconto para ver quantos contratos seriam eliminados hoje, quanto caixa mensal destravaria e o payback em meses.' }
      ]
    });
    console.log('Release notes v3.8.4 added!');
  } else {
    console.log('Release notes v3.8.4 already registered!');
  }
  process.exit(0);
}

run();
