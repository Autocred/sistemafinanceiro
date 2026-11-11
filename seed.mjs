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
    versao: 'v3.6.90',
    titulo: 'Controle de Vencimentos Futuros e Recorrentes na Tabela de Lançamentos + Áudio com IA no WhatsApp',
    descricao: 'Adição de coluna e controle exclusivo de Data de Vencimento na tela de lançamentos para total controle de recorrências e parcelas futuras, suporte a áudio por voz no bot do WhatsApp e modularização com ganho de performance na aplicação.',
    dataLancamento: new Date().toISOString(),
    status: 'publicado',
    destaque: true,
    notificarTenants: false,
    alvos: 'todos',
    changes: [
      { tipo: 'melhoria', texto: 'Controle de Vencimentos na Tabela: Exibição lado a lado da Data de Lançamento e Data de Vencimento, facilitando o acompanhamento de despesas/receitas recorrentes e futuras com indicadores de atraso e vencimento.' },
      { tipo: 'melhoria', texto: 'Edição Inline de Vencimento: Possibilidade de alterar a data de vencimento com duplo clique direto na linha da tabela.' },
      { tipo: 'nova_funcionalidade', texto: 'Lançamento por Áudio no WhatsApp: O bot do WhatsApp agora aceita mensagens de voz, transcreve e extrai lançamentos automaticamente via IA Multimodal.' },
      { tipo: 'melhoria', texto: 'Otimização e Modularização: Extração do CommandPalette e limpeza estrutural de código residual, proporcionando carregamento mais ágil.' }
    ]
  });
  console.log('Release notes v3.6.90 added!');
  process.exit(0);
}

run();
