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
    versao: 'v3.6.51',
    titulo: 'Preservação do Comportamento (Fixa/Variável) na Edição e Pagamento',
    descricao: 'Ao editar um lançamento ou efetuar o pagamento, o sistema agora sempre preserva o comportamento original (fixa ou variável), nunca abrindo o campo em branco.',
    dataLancamento: new Date().toISOString(),
    status: 'publicado',
    destaque: true,
    notificarTenants: false,
    alvos: 'todos',
    changes: [
      { tipo: 'correcao', texto: 'Comportamento Preservado: Ao editar ou pagar um lançamento, o comportamento (Fixa ou Variável) registrado originalmente é mantido automaticamente e nunca mais abre em branco.' },
      { tipo: 'melhoria', texto: 'Blindagem no banco de dados e na interface: Atualizações de status para pago mantêm intacta a classificação contábil original do lançamento.' }
    ]
  });
  console.log('Release notes v3.6.51 added!');
  process.exit(0);
}

run();
