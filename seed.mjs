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
    version: '1.6.5',
    date: new Date().toISOString(),
    title: 'Melhorias de IA, UI e Estabilidade de API',
    description: 'Atualização crítica para resolver incompatibilidades de Payload no WhatsApp (Evolution v1 e v2) e aprimorar a tela de Leitura de Documentos por IA.',
    features: [
      'Envio de PDFs no WhatsApp ajustado para suportar simultaneamente a arquitetura v1 e v2 da Evolution API, garantindo a entrega do boleto anexo em qualquer versão do robô.',
      'Alerta explícito no painel caso o robô falhe ao anexar o PDF.',
      'Tela "Lançamento com IA & OCR" agora exibe os campos de Centro de Custo, Cliente, Fornecedor e Data de Emissão.',
      'Aprendizado de Máquina (Auto-Complete) inserido na Tela de IA: A plataforma auto-preenche Conta, Centro de Custo, Fornecedor/Cliente e Categoria baseado no seu histórico local quando a IA extrai o CNPJ/Fornecedor do boleto.'
    ],
    type: 'patch'
  });
  console.log('Release notes 1.6.5 added!');
  process.exit(0);
}

run();
