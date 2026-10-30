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
    versao: 'v3.6.46',
    titulo: 'Sidebar Retrátil Destacada + Alternador Cards/Tabela em Lançamentos',
    descricao: 'Botão de recolher/expandir sidebar destacado no Cabeçalho Superior e na Barra Lateral (topo e rodapé), e alternador de visualização Cards/Tabela nos lançamentos.',
    dataLancamento: new Date().toISOString(),
    status: 'publicado',
    destaque: true,
    notificarTenants: false,
    alvos: 'todos',
    changes: [
      { tipo: 'nova_funcionalidade', texto: 'Botão Recolher Menu no Topo: Disponível no cabeçalho superior e no topo e rodapé da barra lateral, permitindo encolher para 64px com 1 clique.' },
      { tipo: 'nova_funcionalidade', texto: 'Alternador de Visualização Cards / Tabela: Visível no topo da tela de Lançamentos para alternar entre os cards normais e tabela compacta.' },
      { tipo: 'melhoria', texto: 'Acesso instantâneo e visibilidade garantida em todas as resoluções.' }
    ]
  });
  console.log('Release notes v3.6.46 added!');
  process.exit(0);
}

run();
