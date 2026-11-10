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
    versao: 'v3.6.84',
    titulo: 'Atalho Direto para Conexão de WhatsApp e QR Code',
    descricao: 'Inclusão de atalho visual direto na aba WhatsApp em Configurações para acesso instantâneo à tela de conexão do aparelho e gestão de credenciais da Evolution API (/master/whatsapp).',
    dataLancamento: new Date().toISOString(),
    status: 'publicado',
    destaque: true,
    notificarTenants: false,
    alvos: 'todos',
    changes: [
      { tipo: 'funcionalidade', texto: 'Acesso Rápido à Conexão WhatsApp: Botão direto em Configurações > WhatsApp para abrir a tela de geração de QR Code e credenciais da API.' }
    ]
  });
  console.log('Release notes v3.6.84 added!');
  process.exit(0);
}

run();
