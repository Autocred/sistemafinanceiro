// Bump the Contas.tsx migration script version so it runs again and also
// fixes the existing October invoice with wrong due date 04/10
const fs = require('fs');
let c = fs.readFileSync('src/components/Contas.tsx', 'utf8');

// Bump version so it runs again
c = c.replace(/fix_mp_2026_v4/g, 'fix_faturas_v5');

// Replace the body of the fixMercadoPago function with a comprehensive fix
c = c.replace(
  /const fixMercadoPago = async \(\) => \{[\s\S]*?localStorage\.setItem\('fix_faturas_v5', '1'\);[\s\S]*?\};/,
  `const fixFaturas = async () => {
      if (localStorage.getItem('fix_faturas_v5') === '1') return;
      try {
        const { collection, getDocs, doc, updateDoc } = await import('firebase/firestore');
        const { getCollectionPath } = await import('@/lib/storage');
        const { getDb } = await import('@/lib/firebase');
        const db = getDb();
        
        // Fix all open invoices for Mercado Pago that have wrong due date
        // Card config: fechamento=28, vencimento=4
        const faturasRef = collection(db, getCollectionPath('faturas'));
        const faturasSnap = await getDocs(faturasRef);
        
        for (const d of faturasSnap.docs) {
          const f = { id: d.id, ...d.data() } as any;
          if (f.cartaoNome !== 'Mercado Pago' || f.status === 'paga') continue;
          
          // Parse mesReferencia e recalculate correct due date
          // mesReferencia = "2026-10" means invoice closes on 28/10 and is due on 04/11
          const [ano, mes] = (f.mesReferencia || '').split('-').map(Number);
          if (!ano || !mes) continue;
          
          // Due date = day 4 of next month (since 4 < 28)
          const mesVenc = mes === 12 ? 1 : mes + 1;
          const anoVenc = mes === 12 ? ano + 1 : ano;
          const correctDue = \`\${anoVenc}-\${String(mesVenc).padStart(2,'0')}-04\`;
          const correctClose = \`\${ano}-\${String(mes).padStart(2,'0')}-28\`;
          
          if (f.dataVencimento !== correctDue || f.dataFechamento !== correctClose) {
            await updateDoc(doc(db, getCollectionPath('faturas'), f.id), {
              dataVencimento: correctDue,
              dataFechamento: correctClose
            });
            console.log(\`Fixed fatura \${f.mesReferencia}: \${f.dataVencimento} -> \${correctDue}\`);
          }
        }
        
        localStorage.setItem('fix_faturas_v5', '1');
        window.location.reload();
      } catch (e) {
        console.error('Fix faturas error:', e);
      }
    };`
);

// Also rename the call from fixMercadoPago() to fixFaturas()
c = c.replace(/fixMercadoPago\(\);/, 'fixFaturas();');

fs.writeFileSync('src/components/Contas.tsx', c);
console.log('Done: bumped to v5 with comprehensive invoice fix');
