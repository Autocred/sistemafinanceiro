const fs = require('fs');
const lines = fs.readFileSync('src/components/ModalLancamento.tsx', 'utf8').split('\n');

// Extrair e apagar os blocos originais
function extractBlock(startMarker, endMarker) {
    const start = lines.findIndex(l => l.includes(startMarker));
    if (start === -1) return [];
    const end = lines.findIndex((l, i) => i > start && l.includes(endMarker));
    if (end === -1) return [];
    const block = lines.slice(start, end + 1);
    for (let i = start; i <= end; i++) lines[i] = ''; // clear
    return block;
}

// 1. Extract Fornecedor
const fornecedorBlock = extractBlock("{(form.tipo as string) !== 'transferencia' && (", "        )}");
// It might match another block? Let's check.
console.log('Done script definition.');
