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
    versao: 'v3.6.97',
    titulo: 'Campos de Filtros Ampliados em Linha Única Estrita (v3.6.97)',
    descricao: 'Ampliação proporcional das larguras e alturas (34px) de todos os campos de filtros mantendo o layout rigorosamente em uma única linha reta horizontal sem quebra, com leitura limpa e abertura livre do popover.',
    dataLancamento: new Date().toISOString(),
    status: 'publicado',
    destaque: true,
    notificarTenants: false,
    alvos: 'todos',
    changes: [
      { tipo: 'melhoria', texto: 'Campos Ampliados Confortáveis: Fixo/Variável 190px, Categorias 185px, C. Custo 175px e Contatos 240px com altura 34px.' },
      { tipo: 'melhoria', texto: 'Linha Única Estrita: Preservação do alinhamento horizontal contínuo lado a lado sem quebra de linha.' },
      { tipo: 'melhoria', texto: 'Dropdown Mais Amplo: Popover de pesquisa de Fornecedores/Clientes expandido para 300px com busca suave ao digitar.' }
    ]
  });
  console.log('Release notes v3.6.97 added!');
  process.exit(0);
}

run();
