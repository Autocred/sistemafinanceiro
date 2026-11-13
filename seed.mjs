import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, where } from 'firebase/firestore';

const app = initializeApp({
  apiKey: 'AIzaSyCPhj4DYKlu8Q00FmjaA1ofjYUKhRJaK7U',
  authDomain: 'sistemafinan.firebaseapp.com',
  projectId: 'sistemafinan'
});

const db = getFirestore(app);

async function run() {
  const q = query(collection(db, 'saas_releases'), where('versao', '==', 'v3.7.6'));
  const snap = await getDocs(q);
  if (snap.empty) {
    await addDoc(collection(db, 'saas_releases'), {
      versao: 'v3.7.6',
      titulo: 'Classificação Estrutural Automática de Despesas Fixas vs. Variáveis',
      descricao: 'Separação rigorosa e sincronizada em todo o sistema entre Despesas Fixas Estruturais (Aluguel, Salários, Pró-Labore Fixo, FGTS, INSS, Simples Nacional, Parcelamentos Tributários, Contabilidade, Medicina do Trabalho, Energia, Internet, Sistemas, Financiamento e Capital de Giro) e Despesas Variáveis (Comissões, Impulsionamento/Marketing, Alimentação, Combustível, Manutenção, Materiais e Retiradas Avulsas).',
      dataLancamento: new Date().toISOString(),
      status: 'publicado',
      destaque: true,
      notificarTenants: false,
      alvos: 'todos',
      changes: [
        { tipo: 'novidade', texto: 'Classificação Rigorosa no Banco de Dados: Todos os lançamentos, categorias e fornecedores foram auditados e classificados entre Despesa Fixa (🔒) e Variável (⚡).' },
        { tipo: 'melhoria', texto: 'Sincronização Total (Dashboard, Lançamentos, Dashboard Mensal e Extrato): Alterar uma conta entre Fixa e Variável no Dashboard ou clicar na etiqueta em Lançamentos atualiza automaticamente o registro no banco.' },
        { tipo: 'melhoria', texto: 'Inteligência de Pré-Preenchimento: Ao selecionar fornecedores/categorias ou digitar descrições, o sistema distingue automaticamente obrigações fixas (como Pró-Labore e Salário) de retiradas ou bônus variáveis.' }
      ]
    });
    console.log('Release notes v3.7.6 added!');
  } else {
    console.log('Release notes v3.7.6 already registered!');
  }
  process.exit(0);
}

run();
