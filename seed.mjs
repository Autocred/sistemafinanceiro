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
    version: '1.6.1',
    date: new Date().toISOString(),
    title: 'Integração de OCR IA e Cobrança PIX na Versão 2.0 e Menu Lateral',
    description: 'Habilitado o botão "Ler Boleto/NF com IA" e o modal de Cobrança PIX oficial também na interface V2 dos Lançamentos e no menu lateral global.',
    features: [
      'Disponibilizado o botão "✨ Ler com IA (Boleto/NF/Recibo)" diretamente no cabeçalho de Lançamentos V2.',
      'Disponibilizado o botão "✨ Ler Boleto/NF com IA" no menu lateral global do sistema, logo abaixo de Novo Lançamento.',
      'Substituído o antigo alerta placeholder pelo gerador oficial de QR Code PIX com Copia e Cola e baixa instantânea na versão V2.'
    ],
    type: 'patch'
  });
  console.log('Release notes 1.6.1 added!');
  process.exit(0);
}

run();
