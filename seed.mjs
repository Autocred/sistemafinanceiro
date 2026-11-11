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
    versao: 'v3.6.96',
    titulo: 'Barra de Filtros em Linha Única Estrita com Campos Ampliados (v3.6.96)',
    descricao: 'Alinhamento horizontal estrito de todos os filtros em uma linha única (nowrap) com larguras ampliadas suficientes para exibir todos os textos sem corte e abertura livre do seletor de contatos.',
    dataLancamento: new Date().toISOString(),
    status: 'publicado',
    destaque: true,
    notificarTenants: false,
    alvos: 'todos',
    changes: [
      { tipo: 'melhoria', texto: 'Linha Única Estrita (nowrap): Todos os campos de filtro fixados lado a lado em uma única linha reta horizontal.' },
      { tipo: 'melhoria', texto: 'Larguras Ampliadas: Espaço suficiente para leitura integral de todas as opções (Fixo/Variável 175px, Categorias 170px, C. Custo 160px, Fornecedores/Clientes 220px).' },
      { tipo: 'correcao', texto: 'Abertura para Baixo: Dropdown flutuante abre livremente para baixo com zIndex alto mantendo a tela estável.' }
    ]
  });
  console.log('Release notes v3.6.96 added!');
  process.exit(0);
}

run();
