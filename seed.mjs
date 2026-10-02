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
    version: '1.5.0',
    date: new Date().toISOString(),
    title: 'Fechamento Mensal Executivo com PDF no WhatsApp (Piloto Automático todo dia 1º)',
    description: 'Novo módulo automatizado que consolida o mês recém-encerrado, gera um Relatório Executivo em PDF profissional A4 e envia no WhatsApp com métricas detalhadas.',
    features: [
      'Geração de PDF Executivo A4 personalizado com a marca White Label e paleta de cores do Tenant.',
      'KPI Scorecards: Receitas do mês, Despesas pagas, Resultado Líquido (Superávit/Déficit) e Margem Líquida %.',
      'Evolução comparativa sintética contra o mês anterior (+/- % e valores absolutos).',
      'Desempenho de metas mensais e ranking das Top 5 maiores categorias de custos.',
      'Parecer gerencial e diagnóstico automatizado sobre a saúde financeira do período.',
      'Posição consolidada de caixa e saldos bancários no fechamento.',
      'Disparo automático no 1º dia útil do mês via cron dispatcher ou teste manual imediato nas Configurações e no Painel Master.'
    ],
    type: 'major'
  });
  console.log('Release notes 1.5.0 added!');
  process.exit(0);
}

run();
