import fs from 'fs';
let c = fs.readFileSync('src/lib/storage.ts', 'utf8');

const funcs = `
// ================= METAS FINANCEIRAS =================
export async function getMetasFinanceiras(): Promise<any[]> {
  try {
    const metasRef = collection(getDb(), _getBasePath(), 'metas_financeiras');
    const snap = await getDocs(metasRef);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error('Erro ao buscar metas financeiras', err);
    return [];
  }
}

export function subscribeMetasFinanceiras(callback: (metas: any[]) => void) {
  try {
    const metasRef = collection(getDb(), _getBasePath(), 'metas_financeiras');
    return onSnapshot(metasRef, (snap) => {
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  } catch (err) {
    console.error('Erro no onSnapshot de metas financeiras', err);
    return () => {};
  }
}

export async function salvarMetaFinanceira(meta: any): Promise<void> {
  try {
    const id = meta.id || gerarId();
    const docRef = doc(getDb(), _getBasePath(), 'metas_financeiras', id);
    const data = { ...meta, id };
    if (!meta.id) data.createdAt = Date.now();
    await setDoc(docRef, data, { merge: true });
  } catch (err) {
    console.error('Erro ao salvar meta financeira', err);
    throw err;
  }
}

export async function excluirMetaFinanceira(id: string): Promise<void> {
  try {
    const docRef = doc(getDb(), _getBasePath(), 'metas_financeiras', id);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Erro ao excluir meta financeira', err);
    throw err;
  }
}
`;

if (!c.includes('salvarMetaFinanceira')) {
  c += funcs;
  fs.writeFileSync('src/lib/storage.ts', c);
  console.log('Added Metas storage functions');
}
