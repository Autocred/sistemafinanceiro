import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  const projectId = process.env.FIREBASE_PROJECT_ID || 'sistemafinan';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (clientEmail && privateKey) {
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  } else {
    initializeApp({ projectId });
  }
}

const db = getFirestore();

async function addRelease() {
  const releaseId = 'v3.6.2-pwa';
  
  const release = {
    versao: 'v3.6.2',
    titulo: 'PWA Nativo 100% White Label',
    descricao: 'O sistema agora é oficialmente um Aplicativo Progressivo (PWA) nativo com suporte dinâmico a White Label. Clientes agora podem instalar o aplicativo em seus dispositivos e o ícone adotará a marca da empresa.',
    changes: [
      { tipo: 'novo', texto: 'Botão e Popup nativo de "Instalar Aplicativo" no Android e iOS, flutuante sobre a barra de navegação.' },
      { tipo: 'novo', texto: 'Geração Dinâmica de Manifesto (App White Label): O ícone e o nome do app instalado mudam conforme o cliente (Tenant).' },
      { tipo: 'melhoria', texto: 'Service Worker atualizado para suporte offline e interceptação nativa exigida pelo Chrome.' },
      { tipo: 'correcao', texto: 'Tratamento de bugs de cache do Chrome ao atualizar o manifest.' },
      { tipo: 'novo', texto: 'Botão manual "Baixar App" adicionado ao menu lateral principal.' }
    ],
    dataLancamento: new Date().toISOString(),
    status: 'publicado',
    notificarTenants: false,
    destaque: true,
    alvos: 'todos',
    createdAt: Date.now()
  };

  await db.collection('saas_releases').doc(releaseId).set(release);
  console.log('Release adicionada com sucesso!');
}

addRelease().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
