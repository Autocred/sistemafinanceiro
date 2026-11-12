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
    versao: 'v3.7.0',
    titulo: 'Design 3D Premium: Botão Executivo do Radar de Desperdícios',
    descricao: 'Atualização visual de alto padrão no Dashboard: o botão de acesso ao Radar de Desperdícios agora conta com o mesmo estilo moderno 3D tátil do botão Novo Lançamento, com profundidade de borda chanfrada, gradiente energético, microinteração de clique e sombras volumétricas.',
    dataLancamento: new Date().toISOString(),
    status: 'publicado',
    destaque: true,
    notificarTenants: false,
    alvos: 'todos',
    changes: [
      { tipo: 'melhoria', texto: 'Botão 3D Radar de Desperdícios: Redesenhado no Dashboard com o estilo moderno 3D, gradiente crimson executive, borda chanfrada de 5px e animação de clique idêntica ao botão Novo Lançamento.' }
    ]
  });
  console.log('Release notes v3.7.0 added!');
  process.exit(0);
}

run();
