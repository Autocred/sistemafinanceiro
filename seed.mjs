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
    version: '1.6.0',
    date: new Date().toISOString(),
    title: 'Módulo OCR IA (Leitura de Boletos/NF) e Cobrança com QR Code PIX Oficial',
    description: 'Implementação de duas funcionalidades de ponta: Leitor inteligente com IA para importar boletos, notas fiscais e recibos, e sistema completo de cobrança via PIX com QR Code Banco Central, Copia e Cola, envio via WhatsApp e baixa bancária instantânea.',
    features: [
      'Novo Leitor com IA & OCR: arraste ou envie PDFs/fotos de boletos, notas fiscais e recibos para preencher fornecedor, valor, vencimento, código de barras e categoria automaticamente com anexo do documento.',
      'Cobrança PIX Oficial Banco Central (EMVCo/BR Code): geração instantânea de QR Code com valor exato e código Copia e Cola para qualquer receita.',
      'Disparo de Cobrança no WhatsApp: envio da cobrança com link de pagamento, código PIX e mensagem profissional com 1 clique.',
      'Baixa Instantânea no PIX: liquide a conta e credite o saldo na conta bancária padrão do sistema com apenas 1 clique.',
      'Configuração Personalizada de PIX: nova aba "⚡ Chave PIX & Cobrança" nas Configurações com suporte a CPF, CNPJ, Telefone, E-mail e Chave Aleatória, com prévia do QR Code em tempo real.'
    ],
    type: 'minor'
  });
  console.log('Release notes 1.6.0 added!');
  process.exit(0);
}

run();
