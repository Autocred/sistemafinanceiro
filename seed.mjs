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
    versao: 'v3.6.85',
    titulo: 'Restauração Integral da Versão Estável da Manhã (08hs)',
    descricao: 'Restauração completa de todos os componentes, dashboards, rotinas de contas a vencer e banco para o estado original da manhã às 08hs (versão v3.6.56).',
    dataLancamento: new Date().toISOString(),
    status: 'publicado',
    destaque: true,
    notificarTenants: false,
    alvos: 'todos',
    changes: [
      { tipo: 'correcao', texto: 'Restauração Integral: Código e visual 100% restaurados para a versão estável da manhã às 08hs.' }
    ]
  });
  console.log('Release notes v3.6.85 added!');
  process.exit(0);
}

run();
