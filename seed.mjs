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
    version: '1.6.4',
    date: new Date().toISOString(),
    title: 'Geração de Fatura / Boleto em PDF com QR Code PIX e Envio no WhatsApp',
    description: 'Agora o sistema gera uma fatura / cobrança em PDF completa em padrão bancário/boleto contendo QR Code PIX escaneável, dados completos do lançamento, beneficiário e pagador, com download direto e envio do anexo PDF via WhatsApp.',
    features: [
      'Geração de Fatura/Boleto em PDF com layout A4 profissional respeitando cores e nome do Tenant (White Label).',
      'Renderização de QR Code PIX visual em alta resolução no próprio PDF para leitura direta na câmera do celular/banco.',
      'Blocos estruturados de Beneficiário (Cedente), Pagador (Sacado), Vencimento, Valor em destaque e código Copia e Cola.',
      'Disparo direto do PDF via API do WhatsApp (Evolution API) em anexo junto com a mensagem de apoio.',
      'Botão dedicado no modal para Visualizar e Baixar a Fatura PDF instantaneamente.'
    ],
    type: 'feature'
  });
  console.log('Release notes 1.6.4 added!');
  process.exit(0);
}

run();
