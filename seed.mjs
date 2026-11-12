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
    versao: 'v3.6.99',
    titulo: 'Auditoria de Alta Precisão no Radar Forense & Isolamento de Lançamento Auditado',
    descricao: 'Aprimoramento do Radar de Desperdícios: ao clicar em "Auditar Lançamento", o sistema agora redireciona com precisão cirúrgica isolando apenas a transação especificada, exibindo data, descrição, ID e banner de controle para conferência e edição imediata sem interferência de filtros de mês.',
    dataLancamento: new Date().toISOString(),
    status: 'publicado',
    destaque: true,
    notificarTenants: false,
    alvos: 'todos',
    changes: [
      { tipo: 'novidade', texto: 'Navegação Direta e Precisa: Ao clicar em "Auditar Lançamento" no Radar, a tela de Lançamentos abre filtrando exclusivamente o lançamento especificado.' },
      { tipo: 'melhoria', texto: 'Banner de Auditoria em Lançamentos: Exibe notificação de auditoria ativa com botão de 1 clique para retornar à visão geral de todos os lançamentos.' },
      { tipo: 'melhoria', texto: 'Metadados Detalhados nos Alertas: Cada alerta agora exibe a data de vencimento/competência, descrição exata do item e o ID do documento para conferência forense imediata.' },
      { tipo: 'correcao', texto: 'Normalização Temporal Rigorosa: Algoritmo de análise temporal atualizado para garantir consistência em datas de diferentes formatos.' }
    ]
  });
  console.log('Release notes v3.6.99 added!');
  process.exit(0);
}

run();
