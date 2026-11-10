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
    versao: 'v3.6.88',
    titulo: 'Restauração e Aprimoramento da Busca Rápida com Autopreenchimento Inteligente de Fornecedor e Cliente',
    descricao: 'Aprimoramento completo do campo de Fornecedor/Cliente no modal de lançamentos: abertura automática de dropdown ao focar no campo, bloqueio de sobreposição de autofill nativo do Chrome, e preenchimento instantâneo de todos os dados (categoria, centro de custo, conta, comportamento fixo/variável e descrição) baseado na inteligência contínua da IA.',
    dataLancamento: new Date().toISOString(),
    status: 'publicado',
    destaque: true,
    notificarTenants: false,
    alvos: 'todos',
    changes: [
      { tipo: 'melhoria', texto: 'Busca Rápida Aberta ao Foco: Ao clicar no campo de fornecedor ou cliente, a lista de sugestões se abre imediatamente mesmo sem digitar nada.' },
      { tipo: 'correcao', texto: 'Bloqueio de Popup Nativo do Navegador: Eliminação do menu "Gerenciar endereços..." do Chrome que sobrepunha o dropdown do sistema.' },
      { tipo: 'recurso', texto: 'Autopreenchimento Inteligente: Selecionar o fornecedor ou cliente preenche instantaneamente todos os campos aprendidos pela IA.' },
      { tipo: 'melhoria', texto: 'Gráficos do Resumo Mensal Preservados: Mantidas todas as melhorias visuais de barras proporcionais, evolução de despesas e evolução de receitas.' }
    ]
  });
  console.log('Release notes v3.6.88 added!');
  process.exit(0);
}

run();
