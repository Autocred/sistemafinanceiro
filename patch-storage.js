const fs = require('fs');
let c = fs.readFileSync('src/lib/storage.ts', 'utf8');

c = c.replace(/export async function sincronizarVencimentosCartao.*?\}\n\}/s, `export async function sincronizarVencimentosCartao(cartaoId: string, novoDiaVencimento: number): Promise<void> {
  if (!isBrowser()) return;
  const faturas = await getFaturas();
  const faturasCartao = faturas.filter(f => f.cartaoId === cartaoId && f.status !== 'paga');
  for (const fat of faturasCartao) {
    const p = fat.mesReferencia.split('-');
    if (p.length === 2) {
      let ano = parseInt(p[0]);
      let mes = parseInt(p[1]);
      const cartoes = await getCartoes();
      const cartao = cartoes.find(c => c.id === cartaoId);
      if (!cartao) continue;
      const diaFechamento = cartao.dataFechamento || 1;
      if (novoDiaVencimento <= diaFechamento) {
        mes += 1;
        if (mes > 12) { mes = 1; ano += 1; }
      }
      const pad = (n) => String(n).padStart(2, '0');
      const novaData = \`\${ano}-\${pad(mes)}-\${pad(novoDiaVencimento)}\`;
      if (fat.dataVencimento !== novaData) {
        fat.dataVencimento = novaData;
        const { setDoc, doc } = await import('firebase/firestore');
        await setDoc(doc(getDb(), getCollectionPath('faturas'), fat.id), fat, { merge: true });
      }
    }
  }
}`);

fs.writeFileSync('src/lib/storage.ts', c);
console.log('Fixed storage');
