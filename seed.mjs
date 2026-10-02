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
    versao: 'v3.6.21',
    titulo: 'Vínculo de Cartões de Crédito e Ajuste Fino de Valores OCR',
    descricao: 'Melhorias de inteligência e usabilidade na leitura automática.',
    dataLancamento: new Date().toISOString(),
    status: 'publicado',
    destaque: true,
    notificarTenants: false,
    alvos: 'todos',
    changes: [
      { tipo: 'novo', texto: 'Quando a IA identifica o pagamento via Cartão de Crédito, o sistema automaticamente troca o campo de Conta Bancária pelo campo de Seleção de Cartão (mesmo comportamento do lançamento manual).' },
      { tipo: 'melhoria', texto: 'Regras da IA endurecidas: ela agora foca estritamente no "Valor Total Final", ignorando subtotais, descontos ou taxas perdidas pelo recibo.' },
      { tipo: 'correcao', texto: 'Inclusão de validação que impede salvar nota de cartão de crédito sem informar de qual cartão foi.' }
    ]
  });
  console.log('Release notes v3.6.21 added!');
  process.exit(0);
}

run();
