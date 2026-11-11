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
    versao: 'v3.6.94',
    titulo: 'Barra de Filtros em Linha Única com Design 3D e Sombras de Contorno (v3.6.94)',
    descricao: 'Redesenho completo da barra de filtros específicos para linha única compacta, com acabamento moderno em 3D, relevo táctil, sombras de contorno suaves e elevação ao passar o mouse em todos os seletores.',
    dataLancamento: new Date().toISOString(),
    status: 'publicado',
    destaque: true,
    notificarTenants: false,
    alvos: 'todos',
    changes: [
      { tipo: 'melhoria', texto: 'Layout em Linha Única: Todos os campos de filtro (Fixo/Variável, Categorias, C. Custo e Fornecedor/Cliente) organizados harmoniosamente em uma única linha horizontal.' },
      { tipo: 'melhoria', texto: 'Design Moderno 3D: Efeito de relevo com sombras em camadas (box-shadow suave, contorno interno e gradiente de profundidade).' },
      { tipo: 'melhoria', texto: 'Dimensões Compactas: Redução calibrada de altura (26px) e paddings sem comprometer legibilidade ou usabilidade.' }
    ]
  });
  console.log('Release notes v3.6.94 added!');
  process.exit(0);
}

run();
