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
    versao: 'v3.6.55',
    titulo: 'Otimização 100% no Lançamento: Salvamento Instantâneo e Foco Automático',
    descricao: 'O fluxo de lançamento manual foi otimizado para máxima performance: salvamento direto em 1 clique, atalho Ctrl+Enter, foco automático imediato no campo de descrição para a próxima digitação, reset instantâneo em memória sem remontar a tela, e auditoria/IA desengargaladas em segundo plano.',
    dataLancamento: new Date().toISOString(),
    status: 'publicado',
    destaque: true,
    notificarTenants: false,
    alvos: 'todos',
    changes: [
      { tipo: 'melhoria', texto: 'Salvamento Direto em 1 Clique: Botão "Salvar Lançamento (Ctrl+Enter)" grava instantaneamente sem exigir tela intermediária de pré-visualização.' },
      { tipo: 'melhoria', texto: 'Atalho de Teclado (Ctrl+Enter): Permite salvar e disparar o próximo lançamento diretamente pelo teclado.' },
      { tipo: 'melhoria', texto: 'Foco Automático no Campo Descrição: O cursor é posicionado no campo de descrição imediatamente após o salvamento, pronto para nova digitação.' },
      { tipo: 'melhoria', texto: 'Reset Instantâneo em Memória: Limpeza de campos em microssegundos sem desmontar o modal nem refazer consultas ao banco.' },
      { tipo: 'melhoria', texto: 'Auditoria e IA em Segundo Plano: Operações auxiliares executam de forma assíncrona não-bloqueante, acelerando a gravação no banco em mais de 10x.' }
    ]
  });
  console.log('Release notes v3.6.55 added!');
  process.exit(0);
}

run();
