import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, where } from 'firebase/firestore';

const app = initializeApp({
  apiKey: 'AIzaSyCPhj4DYKlu8Q00FmjaA1ofjYUKhRJaK7U',
  authDomain: 'sistemafinan.firebaseapp.com',
  projectId: 'sistemafinan'
});

const db = getFirestore(app);

async function run() {
  const q = query(collection(db, 'saas_releases'), where('versao', '==', 'v3.7.8'));
  const snap = await getDocs(q);
  if (snap.empty) {
    await addDoc(collection(db, 'saas_releases'), {
      versao: 'v3.7.8',
      titulo: 'Menu Lateral (Sidebar) com Novo Visual Leve e Moderno',
      descricao: 'Redesign completo da navegação lateral com estética limpa, leve e moderna, botões de ação refinados, grupos minimalistas e melhor aproveitamento de espaço mantendo a paleta White Label de cada licença.',
      dataLancamento: new Date().toISOString(),
      status: 'publicado',
      destaque: true,
      notificarTenants: false,
      alvos: 'todos',
      changes: [
        { tipo: 'melhoria', texto: 'Menu Lateral Leve e Moderno: Visual clean com gradiente suave na cor do Tenant, bordas translúcidas sutis e scrollbar ultrafina.' },
        { tipo: 'melhoria', texto: 'Ações Rápidas Refinadas: Botões de Novo Lançamento e Leitura de Boleto/NF com IA mais leves, elegantes e integrados.' },
        { tipo: 'melhoria', texto: 'Itens e Grupos de Navegação Minimalistas: Ícones modernos, indicador luminoso de página ativa e contador discreto nos grupos recolhidos.' }
      ]
    });
    console.log('Release notes v3.7.8 added!');
  } else {
    console.log('Release notes v3.7.8 already registered!');
  }
  process.exit(0);
}

run();
