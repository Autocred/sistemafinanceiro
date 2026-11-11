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
    versao: 'v3.6.93',
    titulo: 'Restauração do Filtro Fixa/Variável e Novo Seletor com Busca em Tempo Real (v3.6.93)',
    descricao: 'Restauração completa do filtro e badges de Despesas/Receitas Fixas e Variáveis (Custos Fixos vs Variáveis), novo componente de busca instantânea ao digitar para Fornecedores e Clientes (SearchableSelect) e compactação visual moderna de todos os campos de filtros.',
    dataLancamento: new Date().toISOString(),
    status: 'publicado',
    destaque: true,
    notificarTenants: false,
    alvos: 'todos',
    changes: [
      { tipo: 'correcao', texto: 'Restauração Filtro Fixa/Variável: Reativado o filtro de Custos Fixos (🔒 Fixa) e Variáveis (⚡ Variável) junto com as badges visuais nas descrições da tabela e cards.' },
      { tipo: 'melhoria', texto: 'Busca Inteligente ao Digitar: Novo seletor flutuante para Fornecedores/Clientes com campo de pesquisa em tempo real, contador de resultados e limpeza em um clique.' },
      { tipo: 'melhoria', texto: 'Filtros Mais Compactos e Elegantes: Redução proporcional do tamanho dos campos de filtro na barra superior para um layout mais limpo e profissional.' }
    ]
  });
  console.log('Release notes v3.6.93 added!');
  process.exit(0);
}

run();
