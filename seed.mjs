import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, where } from 'firebase/firestore';

const app = initializeApp({
  apiKey: 'AIzaSyCPhj4DYKlu8Q00FmjaA1ofjYUKhRJaK7U',
  authDomain: 'sistemafinan.firebaseapp.com',
  projectId: 'sistemafinan'
});

const db = getFirestore(app);

async function run() {
  const q = query(collection(db, 'saas_releases'), where('versao', '==', 'v3.7.4'));
  const snap = await getDocs(q);
  if (snap.empty) {
    await addDoc(collection(db, 'saas_releases'), {
      versao: 'v3.7.4',
      titulo: 'Raio-X de Custos Fixos, Dias para Equilíbrio & Simulador de Queda de Faturamento',
      descricao: 'Evolução completa do Termômetro de Ponto de Equilíbrio no Dashboard: agora realiza a separação rigorosa entre Custos Mensais Fixos e Custos Variáveis, calcula exatamente quantos dias de faturamento são necessários para pagar as contas fixas e a partir de qual dia começa o Lucro Líquido, além de trazer um Simulador de Cenários interativo (-10%, -15%, -20%, -30%, etc.) com matriz comparativa em tempo real.',
      dataLancamento: new Date().toISOString(),
      status: 'publicado',
      destaque: true,
      notificarTenants: false,
      alvos: 'todos',
      changes: [
        { tipo: 'novidade', texto: 'Separação Rigorosa de Custos Fixos vs. Variáveis: Classificação inteligente e auditável de todas as obrigações do mês com opção de reclassificação em 1 clique pelo gestor.' },
        { tipo: 'novidade', texto: 'Linha do Tempo em 3 Etapas (Fixo -> Variável -> Lucro): Mostra quantos dias do mês você trabalha para pagar as Contas Fixas, quantos para os Variáveis e quantos dias geram Lucro Puro.' },
        { tipo: 'novidade', texto: 'Simulador Interativo de Faturamento ("E se cair 15%, 20%, 30%?"): Botões rápidos e controle deslizante que recalculam instantaneamente os dias de equilíbrio e o lucro líquido projetado.' },
        { tipo: 'melhoria', texto: 'Matriz Comparativa de Estresse: Tabela executiva comparando lado a lado o Cenário Atual (0%) contra quedas de -10%, -15%, -20% e -30%.' }
      ]
    });
    console.log('Release notes v3.7.4 added!');
  } else {
    console.log('Release notes v3.7.4 already registered!');
  }
  process.exit(0);
}

run();
