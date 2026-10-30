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
    versao: 'v3.6.45',
    titulo: 'Sidebar Retrátil e Modo Tabela Compacta nos Lançamentos',
    descricao: 'Atualização oficial com a nova Sidebar Retrátil (modo ícones 64px com tooltips flutuantes) e o Alternador de Visualização nos Lançamentos (modo Cards ou Tabela Compacta de alta densidade).',
    dataLancamento: new Date().toISOString(),
    status: 'publicado',
    destaque: true,
    notificarTenants: false,
    alvos: 'todos',
    changes: [
      { tipo: 'nova_funcionalidade', texto: 'Sidebar Retrátil: Alternador para encolher a barra lateral para 64px, liberando área útil de visualização para relatórios e tabelas.' },
      { tipo: 'nova_funcionalidade', texto: 'Modo Tabela Compacta: Novo alternador [Cards / Tabela] para listar 25+ lançamentos por tela com ações de pagamento e emissão de recibo integradas.' },
      { tipo: 'melhoria', texto: 'Layout sem cortes: Ajustes de responsividade em todas as telas para garantir exibição completa de clientes, fornecedores e botões de ação.' }
    ]
  });
  console.log('Release notes v3.6.45 added!');
  process.exit(0);
}

run();
