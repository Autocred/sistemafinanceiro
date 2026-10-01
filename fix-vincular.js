const fs = require('fs');
let content = fs.readFileSync('src/lib/storage.ts', 'utf8');

// Find and replace the entire vincularTransacaoFatura function body
const oldBody = `  let strFechamento = '';
  let strVencimento = '';
  let mesRef = '';

    const ciclo = calcularCicloFatura(data, _diaFechamento, _diaVencimento);
  if (dataVencimentoManual && dataVencimentoManual !== ciclo.dataVencimento) {
    strVencimento = dataVencimentoManual;
    const [anoStr, mesStr] = dataVencimentoManual.split('-');
    mesRef = \`\${anoStr}-\${mesStr}\`;
    const d = new Date(dataVencimentoManual + 'T12:00:00Z');
    d.setDate(d.getDate() - 7);
    strFechamento = d.toISOString().split('T')[0];
  } else {
    // ⚠️ REGRA DE OURO IMPLEMENTADA ⚠️
    const ciclo = calcularCicloFatura(data, _diaFechamento, _diaVencimento);
    mesRef = ciclo.mesReferencia;
    strFechamento = ciclo.dataFechamento;
    strVencimento = ciclo.dataVencimento;
  }

  let fatura = await getFaturaAberta(cartaoId, mesRef);
  if (!fatura) {
    // Nova fatura — começa com valorTotal = valor da transação atual
    fatura = {
      id: gerarId(), cartaoId, cartaoNome, cartaoCor, mesReferencia: mesRef,
      dataFechamento: strFechamento, dataVencimento: strVencimento, valorTotal: valor,
      status: 'aberta', transacaoIds: [transacaoId], pagamentos: []
    };
  } else {
    // Fatura existente — adiciona a transação se ainda não estiver na lista
    if (!fatura.transacaoIds.includes(transacaoId)) {
      fatura.transacaoIds.push(transacaoId);
    }
    // ⚠️ BLINDAGEM: Recalcula o total SEMPRE a partir dos lançamentos reais do banco
    let totalRecalculado = 0;
    for (const tid of fatura.transacaoIds) {
      if (tid === transacaoId) {
        totalRecalculado += Math.abs(valor);
      } else {
        try {
          const { getDoc, doc } = await import('firebase/firestore');
          const tSnap = await getDoc(doc(getDb(), getCollectionPath('transacoes'), tid));
          if (tSnap.exists()) totalRecalculado += Math.abs(tSnap.data().valor || 0);
        } catch (e) { /* ignora erros de leitura individual */ }
      }
    }
    fatura.valorTotal = totalRecalculado;
  }
  await salvarFatura(fatura);
  
  // PREVINE LOOP INFINITO: passamos __skipFaturaRelink para que atualizarTransacao não chame vincular novamente
  await atualizarTransacao(transacaoId, { faturaId: fatura.id, __oldCartaoId: cartaoId, __skipFaturaRelink: true } as any);
}`;

const newBody = `  // REGRA DE OURO: SEMPRE calcula ciclo pela configuracao do cartao (fechamento e vencimento)
  // NUNCA usa dataVencimentoManual para derivar mesReferencia — isso causava bug de fatura errada!
  const ciclo = calcularCicloFatura(data, _diaFechamento, _diaVencimento);
  const mesRef = ciclo.mesReferencia;
  const strFechamento = ciclo.dataFechamento;
  const strVencimento = ciclo.dataVencimento;

  let fatura = await getFaturaAberta(cartaoId, mesRef);
  if (!fatura) {
    // Nova fatura — começa com valorTotal = valor da transação atual
    fatura = {
      id: gerarId(), cartaoId, cartaoNome, cartaoCor, mesReferencia: mesRef,
      dataFechamento: strFechamento, dataVencimento: strVencimento, valorTotal: valor,
      status: 'aberta', transacaoIds: [transacaoId], pagamentos: []
    };
  } else {
    // Fatura existente — adiciona a transação se ainda não estiver na lista
    if (!fatura.transacaoIds.includes(transacaoId)) {
      fatura.transacaoIds.push(transacaoId);
    }
    // ✅ Sempre corrige o vencimento e fechamento para o calculado corretamente
    fatura.dataVencimento = strVencimento;
    fatura.dataFechamento = strFechamento;
    // ⚠️ BLINDAGEM: Recalcula o total SEMPRE a partir dos lançamentos reais do banco
    let totalRecalculado = 0;
    for (const tid of fatura.transacaoIds) {
      if (tid === transacaoId) {
        totalRecalculado += Math.abs(valor);
      } else {
        try {
          const { getDoc, doc } = await import('firebase/firestore');
          const tSnap = await getDoc(doc(getDb(), getCollectionPath('transacoes'), tid));
          if (tSnap.exists()) totalRecalculado += Math.abs(tSnap.data().valor || 0);
        } catch (e) { /* ignora erros de leitura individual */ }
      }
    }
    fatura.valorTotal = totalRecalculado;
  }
  await salvarFatura(fatura);
  
  // PREVINE LOOP INFINITO: passamos __skipFaturaRelink para que atualizarTransacao não chame vincular novamente
  await atualizarTransacao(transacaoId, { faturaId: fatura.id, dataVencimento: strVencimento, __oldCartaoId: cartaoId, __skipFaturaRelink: true } as any);
}`;

if (content.includes(oldBody)) {
  content = content.replace(oldBody, newBody);
  fs.writeFileSync('src/lib/storage.ts', content);
  console.log('SUCCESS: vincularTransacaoFatura fixed!');
} else {
  console.log('FAILED: Could not find old body. Trying line-by-line replacement...');
  // Try to find it with normalized line endings
  const normalized = content.replace(/\r\n/g, '\n');
  const oldNorm = oldBody.replace(/\r\n/g, '\n');
  if (normalized.includes(oldNorm)) {
    const fixed = normalized.replace(oldNorm, newBody);
    fs.writeFileSync('src/lib/storage.ts', fixed);
    console.log('SUCCESS: Fixed with normalized line endings');
  } else {
    console.log('FAILED: Cannot find pattern. Manual edit required.');
    // Show what the current function looks like
    const start = content.indexOf('async function vincularTransacaoFatura');
    console.log('Current function start:', content.substring(start, start + 200));
  }
}
