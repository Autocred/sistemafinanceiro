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
    versao: 'v3.6.52',
    titulo: 'Abertura Direta do Formulário de Lançamento Manual',
    descricao: 'Ao clicar em Novo Lançamento, o sistema abre diretamente o formulário completo manual com todos os campos prontos para digitação ágil, mantendo a opção de Lançamento por IA com 1 clique.',
    dataLancamento: new Date().toISOString(),
    status: 'publicado',
    destaque: true,
    notificarTenants: false,
    alvos: 'todos',
    changes: [
      { tipo: 'melhoria', texto: 'Novo Lançamento Direto no Manual: O modal agora abre imediatamente com todos os campos estruturados (tipo, descrição, valor, datas, categoria, conta e comportamento) para maior agilidade operacional.' },
      { tipo: 'nova_funcionalidade', texto: 'Alternância Instantânea para IA: Botão "Usar Lançamento por IA" disponível no canto superior para quem desejar ditar por voz ou colar descrições complexas.' }
    ]
  });
  console.log('Release notes v3.6.52 added!');
  process.exit(0);
}

run();
