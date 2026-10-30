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
    versao: 'v3.6.50',
    titulo: 'Remoção de Duplicidade do Valor Final a ser Pago',
    descricao: 'Removida a linha duplicada de exibição do Valor Final a ser Pago no formulário de edição de lançamentos com juros/multa.',
    dataLancamento: new Date().toISOString(),
    status: 'publicado',
    destaque: true,
    notificarTenants: false,
    alvos: 'todos',
    changes: [
      { tipo: 'correcao', texto: 'Formulário de Lançamento: Eliminada a faixa duplicada do "Valor Final a ser pago", mantendo apenas uma linha explicativa clara logo abaixo dos campos de multa, juros e desconto.' }
    ]
  });
  console.log('Release notes v3.6.50 added!');
  process.exit(0);
}

run();
