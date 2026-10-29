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
    versao: 'v3.6.34',
    titulo: 'Novo Módulo: Painel Analítico de Comissões & Bancos Parceiros',
    descricao: 'Visão executiva dedicada à gestão de comissões por instituição financeira, ranking de parceiros, separação de comissões à vista vs. diferidas e projeção de carteira.',
    dataLancamento: new Date().toISOString(),
    status: 'publicado',
    destaque: true,
    notificarTenants: false,
    alvos: 'todos',
    changes: [
      { tipo: 'novo', texto: 'Painel de Bancos & Comissões: Módulo analítico com ranking das instituições financeiras que geram mais receita para a promotora.' },
      { tipo: 'novo', texto: 'Comissões À Vista vs. Diferidas: Gráficos e indicadores comparativos entre comissão imediata (spot) e comissão diferida recorrente.' },
      { tipo: 'novo', texto: 'Projeção de Carteira Futura: Estimativa de fluxo de caixa garantido por comissões fixas/diferidas para os próximos 6 meses.' },
      { tipo: 'melhoria', texto: 'Navegação Integrada: Acesso direto pelo menu lateral em Gestão ("Bancos & Comissões") e pela aba dedicada em Relatórios.' }
    ]
  });
  console.log('Release notes v3.6.34 added!');
  process.exit(0);
}

run();
