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
    versao: 'v3.6.35',
    titulo: 'Totalização dos 6 Meses de Projeção de Comissões Diferidas',
    descricao: 'Adição de totalizador semestral consolidado para a projeção de carteira recorrente, exibição de valor acumulado mês a mês e banner de destaque.',
    dataLancamento: new Date().toISOString(),
    status: 'publicado',
    destaque: true,
    notificarTenants: false,
    alvos: 'todos',
    changes: [
      { tipo: 'melhoria', texto: 'Total Semestral: Banner e card consolidando o total projetado a receber nos próximos 6 meses de carteira recorrente.' },
      { tipo: 'melhoria', texto: 'Acumulado Mês a Mês: Visualização progressiva do montante acumulado mês a mês ao longo do semestre.' }
    ]
  });
  console.log('Release notes v3.6.35 added!');
  process.exit(0);
}

run();
