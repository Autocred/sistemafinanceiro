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
    version: '1.6.2',
    date: new Date().toISOString(),
    title: 'Botão Ler com IA no Modal de Lançamento Inteligente',
    description: 'Adicionado botão de destaque "✨ Ler com IA (Boleto/NF/Recibo)" diretamente no modal de Lançamento Inteligente que abre ao clicar em Novo Lançamento.',
    features: [
      'Novo card e botão "✨ Ler com IA (Boleto/NF/Recibo)" dentro do modal Lançamento Inteligente.',
      'Suporte direto a upload ou drag-and-drop de PDF e imagens de boletos e notas fiscais com OCR completo.',
      'Abertura direta do leitor com IA em 1 clique.'
    ],
    type: 'patch'
  });
  console.log('Release notes 1.6.2 added!');
  process.exit(0);
}

run();
