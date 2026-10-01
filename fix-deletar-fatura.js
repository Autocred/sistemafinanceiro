const fs = require('fs');
let c = fs.readFileSync('src/lib/storage.ts', 'utf8');

const oldFn = `export async function deletarFatura(id: string) {
  if (!isBrowser()) return;
  const db = getDb();
  
  try {
    const faturaSnap = await getDoc(doc(db, getCollectionPath('faturas'), id));
    if (faturaSnap.exists()) {
       const fatData = faturaSnap.data() as Fatura;
       const tIds = fatData.transacaoIds || [];
       for (const tid of tIds) {
          // Isso deletar a transao, remover da fatura (que j vamos deletar de qlq forma) e RESTAURAR O LIMITE!
          await deletarTransacao(tid);
       }
    }
  } catch(e) {
    console.warn("Failed to delete fatura transactions", e);
  }

  await remove('faturas', id);
}`;

const newFn = `export async function deletarFatura(id: string) {
  if (!isBrowser()) return;
  const db = getDb();
  
  try {
    const faturaSnap = await getDoc(doc(db, getCollectionPath('faturas'), id));
    if (faturaSnap.exists()) {
       const fatData = faturaSnap.data() as Fatura;
       const tIds = fatData.transacaoIds || [];
       // NUNCA apaga os lancamentos — apenas desvincula (limpa faturaId)
       // para que sincronizarFaturasPendentes possa reagrupa-los na fatura correta
       for (const tid of tIds) {
          try {
            await updateDoc(doc(db, getCollectionPath('transacoes'), tid), { faturaId: null });
          } catch(e) {}
       }
    }
  } catch(e) {
    console.warn("Failed to unlink fatura transactions", e);
  }

  await remove('faturas', id);
}`;

if (c.includes(oldFn)) {
  c = c.replace(oldFn, newFn);
  fs.writeFileSync('src/lib/storage.ts', c);
  console.log('SUCCESS: Fixed deletarFatura');
} else {
  // Try normalized
  const norm = c.replace(/\r\n/g, '\n');
  const oldNorm = oldFn.replace(/\r\n/g, '\n');
  if (norm.includes(oldNorm)) {
    const fixed = norm.replace(oldNorm, newFn);
    fs.writeFileSync('src/lib/storage.ts', fixed);
    console.log('SUCCESS (normalized): Fixed deletarFatura');
  } else {
    console.log('FAILED - searching for partial match...');
    const idx = c.indexOf('export async function deletarFatura');
    console.log('Found at index:', idx);
    if (idx > -1) {
      console.log(c.substring(idx, idx + 400));
    }
  }
}
