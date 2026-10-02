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
    versao: 'v3.6.19',
    titulo: 'Otimização Extrema de Velocidade e Precisão OCR (IA)',
    descricao: 'Atualização no motor de inteligência artificial da OpenAI e implementação de compressão de imagens.',
    dataLancamento: new Date().toISOString(),
    status: 'publicado',
    destaque: true,
    notificarTenants: false,
    alvos: 'todos',
    changes: [
      { tipo: 'novo', texto: 'Upgrade do modelo de leitura de notas da OpenAI para o ChatGPT-4o (versão mais avançada).' },
      { tipo: 'melhoria', texto: 'Implementação de compressão automática local de imagens antes do envio para a nuvem. Reduz o tempo de leitura de 20s para cerca de 3s.' },
      { tipo: 'correcao', texto: 'Correção de imprecisões na extração de datas e nomes de fornecedores em cupons fiscais complexos.' }
    ]
  });
  console.log('Release notes v3.6.19 added!');
  process.exit(0);
}

run();
