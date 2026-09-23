const fs = require('fs');
const data = JSON.parse(fs.readFileSync('db-dump.json', 'utf8'));

const faturaAberta = data.faturas.find(f => f.id === 'msemqbcvznj3wz');
console.log("Fatura aberta (Agosto real / Setembro fatura):", faturaAberta.valorTotal);

const transacoes = data.transacoes.filter(l => faturaAberta.transacaoIds.includes(l.id));
console.log(`Transações vinculadas encontradas: ${transacoes.length} de ${faturaAberta.transacaoIds.length}`);

let sum = 0;
for (const t of transacoes) {
    console.log(`- ${t.id} | ${t.descricao} | ${t.valor} | ${t.data}`);
    sum += Number(t.valor);
}
console.log("Soma calculada (transações vinculadas):", sum);

// Find missing linked transactions
const linkedIdsFound = transacoes.map(t => t.id);
const missingIds = faturaAberta.transacaoIds.filter(id => !linkedIdsFound.includes(id));
console.log("IDs vinculados não encontrados no dump:", missingIds);

// The user wants the fatura open to be 1543.65.
const unlinked = data.transacoes.filter(l => l.cartaoId === faturaAberta.cartaoId && !faturaAberta.transacaoIds.includes(l.id) && l.formaPagamento === 'cartao_credito');
console.log("\nUnlinked credit card transactions for this card:");
for (const t of unlinked) {
    console.log(`- ${t.id} | ${t.descricao} | ${t.valor} | ${t.data}`);
}

const allForCard = data.transacoes.filter(l => l.cartaoId === faturaAberta.cartaoId && l.formaPagamento === 'cartao_credito');
console.log("\nALL credit card transactions for this card in DB:");
let allSum = 0;
for (const t of allForCard) {
    console.log(`- ${t.id} | ${t.descricao} | ${t.valor} | ${t.data} | Fatura: ${t.faturaId}`);
    allSum += Number(t.valor);
}
console.log("Total geral:", allSum);

