import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';

const app = initializeApp({
  apiKey: 'AIzaSyCPhj4DYKlu8Q00FmjaA1ofjYUKhRJaK7U',
  authDomain: 'sistemafinan.firebaseapp.com',
  projectId: 'sistemafinan'
});

const db = getFirestore(app);

async function run() {
  await addDoc(collection(db, 'saas_releases'), {
    versao: 'v3.7.1',
    titulo: 'Aprovação de Reajustes Contratuais Legítimos (Baseline Oficial de Preço)',
    descricao: 'Permite ao gestor financeiro aprovar aumentos reais e legítimos (como reajustes de aluguel anual, dissídios salariais ou planos renegociados). Ao aprovar com 1 clique, o novo valor passa a ser o novo padrão aceito, removendo penalidades do Score de Proteção de Caixa e arquivando o histórico na nova aba Reajustes Aprovados.',
    dataLancamento: new Date().toISOString(),
    status: 'publicado',
    destaque: true,
    notificarTenants: false,
    alvos: 'todos',
    changes: [
      { tipo: 'novidade', texto: 'Botão Aprovar Aumento nos Alertas: Permite homologar aumentos reais de fornecedores e contratos sem que o sistema os trate como vazamento ou desperdício.' },
      { tipo: 'novidade', texto: 'Nova Aba Reajustes Aprovados: Painel histórico de todos os aumentos aceitos pelo gestor, com opção de revogar e reabrir auditoria a qualquer momento.' },
      { tipo: 'melhoria', texto: 'Inteligência Forense de Baseline: O algoritmo passa a considerar o valor aprovado como novo teto de normalidade, alertando apenas se houver reajuste além deste novo patamar.' }
    ]
  });
  console.log('Release notes v3.7.1 added!');
  process.exit(0);
}

run();
