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
    version: '1.6.3',
    date: new Date().toISOString(),
    title: 'Disparo de Cobrança PIX Interno via API do WhatsApp',
    description: 'A cobrança com código PIX Copia e Cola agora é disparada diretamente pelos servidores internos via API do WhatsApp (Evolution API), sem abrir o aplicativo ou nova aba no navegador.',
    features: [
      'Novo endpoint /api/whatsapp/cobranca para envio assíncrono e direto de cobranças PIX.',
      'Disparo direto no WhatsApp do cliente com 1 clique sem abrir WhatsApp Web ou app externo.',
      'Pré-preenchimento automático do telefone do cliente a partir do cadastro do cliente.',
      'Feedback em tempo real no modal (Enviando... / Enviado!).',
      'Link alternativo opcional para abrir manualmente no WhatsApp Web caso o operador deseje.'
    ],
    type: 'patch'
  });
  console.log('Release notes 1.6.3 added!');
  process.exit(0);
}

run();
