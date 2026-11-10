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
    versao: 'v3.6.81',
    titulo: 'Correção e Otimização dos Disparos Automáticos de Relatórios no WhatsApp',
    descricao: 'Correção completa dos disparos automáticos via WhatsApp de acordo com os dias da semana e horários configurados: inclusão de seletor visual de dias da semana no WhatsApp, eliminação do bloqueio por minuto exato no cron dispatcher (garantindo execução mesmo com atraso do servidor), busca de transações por dataPagamento e data em São Paulo e envio garantido do fechamento diário mesmo em dias sem movimentação financeira.',
    dataLancamento: new Date().toISOString(),
    status: 'publicado',
    destaque: true,
    notificarTenants: false,
    alvos: 'todos',
    changes: [
      { tipo: 'correcao', texto: 'Janela de Disparo Robusta no Dispatcher: Substituída a comparação de minuto exato por verificação segura a partir do horário programado, impedindo que pequenos atrasos de servidor cancelem o envio do dia.' },
      { tipo: 'funcionalidade', texto: 'Seletor de Dias da Semana no WhatsApp: Configuração de quais dias da semana receber relatórios e fechamentos (ex: Seg a Sex ou Todos os dias).' },
      { tipo: 'correcao', texto: 'Fechamento Diário Confiável: Busca de transações corrigida para cobrir dataPagamento e envio garantido de extrato informativo mesmo em dias sem novas baixas.' },
      { tipo: 'correcao', texto: 'Fuso Horário de São Paulo: Todas as rotinas de data ajustadas para o fuso de Brasília, eliminando envio com data do dia seguinte.' }
    ]
  });
  console.log('Release notes v3.6.81 added!');
  process.exit(0);
}

run();
