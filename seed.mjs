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
    versao: 'v3.6.82',
    titulo: 'Ajuste de Retorno nos Disparos e Bypass de Testes Forçados',
    descricao: 'Atualização das rotinas de disparo: status HTTP 502 e relatório detalhado quando o gateway de WhatsApp estiver inacessível, e liberação de testes manuais forçados (?force=true / botões de teste) mesmo quando o envio diário já constar como executado.',
    dataLancamento: new Date().toISOString(),
    status: 'publicado',
    destaque: true,
    notificarTenants: false,
    alvos: 'todos',
    changes: [
      { tipo: 'correcao', texto: 'Feedback Real de Envio: As rotinas de Lembrete e Fechamento agora reportam falha caso o gateway de WhatsApp não confirme o envio, evitando falso-positivo no status.' },
      { tipo: 'melhoria', texto: 'Bypass para Testes Manuais: Testes forçados via painel ou parâmetro ignoram a trava de envio único do dia para permitir validação em tempo real.' }
    ]
  });
  console.log('Release notes v3.6.82 added!');
  process.exit(0);
}

run();
