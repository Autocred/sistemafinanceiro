const fs = require('fs');
let c = fs.readFileSync('src/components/Contas.tsx', 'utf8');

const fixCode = `
  useEffect(() => {
    const fixMercadoPago = async () => {
      if (localStorage.getItem('fix_mp_2026_v3') === '1') return;
      try {
        const { collection, getDocs, doc, updateDoc, deleteDoc } = await import('firebase/firestore');
        // Usar import dinamico para evitar erro de inicializacao
        const { getDb, getCollectionPath } = await import('@/lib/storage');
        const db = getDb();
        const faturasRef = collection(db, getCollectionPath('faturas'));
        const transRef = collection(db, getCollectionPath('transacoes'));
        
        const faturasSnap = await getDocs(faturasRef);
        const faturasMp = faturasSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter((f) => f.cartaoNome === 'Mercado Pago' && f.status !== 'paga');
        
        const transSnap = await getDocs(transRef);
        const transMp = transSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter((t) => t.cartaoNome === 'Mercado Pago' && t.status === 'pendente' && faturasMp.some(f => f.id === t.faturaId));
        
        for (const t of transMp) {
          await updateDoc(doc(db, getCollectionPath('transacoes'), t.id), { faturaId: null });
        }
        for (const f of faturasMp) {
          await deleteDoc(doc(db, getCollectionPath('faturas'), f.id));
        }
        
        localStorage.setItem('fix_mp_2026_v3', '1');
        window.location.reload();
      } catch (e) {
        console.error(e);
      }
    };
    fixMercadoPago();
  }, []);
`;

c = c.replace(/useEffect\(\(\) => \{ carregar\(\); \}, \[carregar\]\);/, `useEffect(() => { carregar(); }, [carregar]);\n${fixCode}`);

fs.writeFileSync('src/components/Contas.tsx', c);
console.log('Fixed Contas.tsx');
