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
    versao: 'v3.7.3',
    titulo: 'Auditor de Assinaturas Zumbis & Tarifas Recorrentes no Radar de Desperdícios',
    descricao: 'Novo módulo inteligente de auditoria que rastreia despesas fixas contínuas (SaaS, streamings, anuidades, tarifas bancárias e pacotes de serviços). Mapeia o impacto anual de cada micro-saída e inclui um checklist interativo com botão "Cortar (Zumbi)" para simular a economia imediata de fluxo de caixa e estancar renovações automáticas indesejadas.',
    dataLancamento: new Date().toISOString(),
    status: 'publicado',
    destaque: true,
    notificarTenants: false,
    alvos: 'todos',
    changes: [
      { tipo: 'novidade', texto: 'Auditor de Assinaturas & Recorrências: Nova aba no Radar de Desperdícios que mapeia todos os contratos e custos recorrentes com projeção anual.' },
      { tipo: 'novidade', texto: 'Checklist Interativo de Corte ("Marcar Zumbi"): Identifique serviços ociosos e simule em tempo real o caixa anual liberado com cancelamentos.' },
      { tipo: 'novidade', texto: 'Detector de Tarifas Bancárias Evitáveis: Alerta forense para tarifas de manutenção de conta e cestas com recomendação de gratuidade Bacen.' },
      { tipo: 'melhoria', texto: 'Card Hero de Assinaturas: Acesso em 1 clique direto pelo cabeçalho do Radar de Desperdícios.' }
    ]
  });
  console.log('Release notes v3.7.3 added!');
  process.exit(0);
}

run();
