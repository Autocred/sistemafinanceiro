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
    versao: 'v3.6.33',
    titulo: 'Classificação Inteligente de Comportamento (Fixa/Variável) e Subcategorias no Extrato',
    descricao: 'Detecção aprimorada de receitas e despesas fixas (incluindo Comissões Diferidas do Banco Digio e receitas recorrentes), novo filtro de Subcategoria e edição de comportamento liberada.',
    dataLancamento: new Date().toISOString(),
    status: 'publicado',
    destaque: true,
    notificarTenants: false,
    alvos: 'todos',
    changes: [
      { tipo: 'correcao', texto: 'Detecção de Receitas Fixas: Transações de comissões diferidas (como Banco Digio) e recorrentes agora são pontualmente identificadas como Fixa no filtro do Extrato.' },
      { tipo: 'novo', texto: 'Filtro e Badge de Subcategoria: Exibição visual de subcategorias na listagem e filtro dedicado em Mais Filtros para relatórios avançados.' },
      { tipo: 'melhoria', texto: 'Edição de Comportamento: Campo de comportamento (Fixa / Variável) liberado em todos os formulários e para todos os tenants.' }
    ]
  });
  console.log('Release notes v3.6.33 added!');
  process.exit(0);
}

run();
