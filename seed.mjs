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
    versao: 'v3.6.95',
    titulo: 'Campos de Filtros Ampliados sem Cortes e Dropdown com Abertura Livre (v3.6.95)',
    descricao: 'Ajuste de larguras e alturas dos filtros para exibição integral dos textos sem truncamento, correção de overflow para abertura livre para baixo do menu flutuante de Fornecedores/Clientes e bloqueio de movimentação ou salto de página ao focar.',
    dataLancamento: new Date().toISOString(),
    status: 'publicado',
    destaque: true,
    notificarTenants: false,
    alvos: 'todos',
    changes: [
      { tipo: 'melhoria', texto: 'Campos Ampliados sem Corte: Largura e altura ajustadas (32px) para leitura total dos títulos (Fixo/Variável, Categorias, C. Custo e Fornecedores/Clientes).' },
      { tipo: 'correcao', texto: 'Abertura Livre do Dropdown: Remoção de restrição de overflow, permitindo que a lista de busca abra suavemente para baixo sem ser cortada pelas bordas.' },
      { tipo: 'correcao', texto: 'Página Estável sem Pulos: Adicionado preventScroll no foco da barra de pesquisa de contatos para manter a viewport e a tela 100% estáticas.' }
    ]
  });
  console.log('Release notes v3.6.95 added!');
  process.exit(0);
}

run();
