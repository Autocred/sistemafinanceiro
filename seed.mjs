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
    versao: 'v3.6.92',
    titulo: 'Indicadores Visuais Inteligentes de Vencimento e Status Integrados (v3.6.92)',
    descricao: 'Exibição completa e sincronizada dos 4 indicadores inteligentes (Pago verde, Atrasado com contagem de dias vermelho, Vence Hoje laranja e Em X dias azul) tanto sob a coluna de Vencimento quanto na coluna de Status e na visualização de Cards, com purga de cache PWA.',
    dataLancamento: new Date().toISOString(),
    status: 'publicado',
    destaque: true,
    notificarTenants: false,
    alvos: 'todos',
    changes: [
      { tipo: 'melhoria', texto: 'Badges Visuais Inteligentes: Exibição visual padronizada de status e vencimento em todas as colunas de lançamentos (Pago 🟢, Atrasado 🔴 com dias, Vence Hoje 🟠 e Em X dias 🔵).' },
      { tipo: 'correcao', texto: 'Coluna Status Dinâmica: Alinhamento da coluna Status para refletir atrasos e prazos de vencimento em tempo real além do status bruto.' },
      { tipo: 'melhoria', texto: 'Purga e Atualização de Cache PWA: Bump para pwa-cache-v6 garantindo carregamento imediato da versão nova sem retenção em disco.' }
    ]
  });
  console.log('Release notes v3.6.92 added!');
  process.exit(0);
}

run();
