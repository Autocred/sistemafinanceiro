const fs = require('fs');

let lines = fs.readFileSync('src/components/ModalLancamento.tsx', 'utf8').split('\n');

const fLabelIdx = lines.findIndex(l => l.includes("=== 'receita' ? 'Cliente' : 'Fornecedor'}</label>"));
const fStartIdx = fLabelIdx - 2;

let fEndIdx = fStartIdx;
let bracketCount = 0;
let started = false;
for (let i = fStartIdx; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('{')) bracketCount += (line.match(/\{/g) || []).length;
    if (line.includes('}')) bracketCount -= (line.match(/\}/g) || []).length;
    if (bracketCount > 0) started = true;
    if (started && bracketCount === 0) {
        fEndIdx = i;
        break;
    }
}
let fBlock = lines.slice(fStartIdx, fEndIdx + 1).join('\n');
for (let i = fStartIdx; i <= fEndIdx; i++) lines[i] = '';

const rStart = "{/* Recorrência */}";
const rStartIdx = lines.findIndex(l => l.includes(rStart));
let rEndIdx = rStartIdx;
bracketCount = 0;
started = false;
for (let i = rStartIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('{')) bracketCount += (line.match(/\{/g) || []).length;
    if (line.includes('}')) bracketCount -= (line.match(/\}/g) || []).length;
    if (bracketCount > 0) started = true;
    if (started && bracketCount === 0) {
        rEndIdx = i;
        break;
    }
}
let rBlock = lines.slice(rStartIdx, rEndIdx + 1).join('\n');
for (let i = rStartIdx; i <= rEndIdx; i++) lines[i] = '';

const cLabelIdx = lines.findIndex(l => l.includes(">Comportamento</label>"));
const cStartIdx = cLabelIdx - 2;
let cEndIdx = cStartIdx;
bracketCount = 0;
started = false;
for (let i = cStartIdx; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('{')) bracketCount += (line.match(/\{/g) || []).length;
    if (line.includes('}')) bracketCount -= (line.match(/\}/g) || []).length;
    if (bracketCount > 0) started = true;
    if (started && bracketCount === 0) {
        cEndIdx = i;
        break;
    }
}
let cBlock = lines.slice(cStartIdx, cEndIdx + 1).join('\n');
for (let i = cStartIdx; i <= cEndIdx; i++) lines[i] = '';


fBlock = fBlock.replace(
    /if \(forn\) setForm\(f => \(\{ \.\.\.f, fornecedorId: forn\.id, fornecedorNome: forn\.nome \} as any\)\);/,
    `if (forn) {
              setForm(f => ({ ...f, fornecedorId: forn.id, fornecedorNome: forn.nome } as any));
              const historicoSorted = [...historico].sort((a,b)=>b.count-a.count);
              const match = historicoSorted.find(h => h.fornecedorId === forn.id);
              if (match) {
                  setForm(prev => {
                      const nf = { ...prev };
                      if (match.categoriaId && !prev.categoriaId) nf.categoriaId = match.categoriaId;
                      if (match.centroCustoId && !prev.centroCustoId) nf.centroCustoId = match.centroCustoId;
                      if (match.contaId && !prev.contaId) nf.contaId = match.contaId;
                      if (match.formaPagamento && !prev.formaPagamento) nf.formaPagamento = match.formaPagamento;
                      return nf;
                  });
              }
            }`
);

fBlock = fBlock.replace(
    /if \(cli\) setForm\(f => \(\{ \.\.\.f, clienteId: cli\.id, clienteNome: cli\.nome \} as any\)\);/,
    `if (cli) {
              setForm(f => ({ ...f, clienteId: cli.id, clienteNome: cli.nome } as any));
              const historicoSorted = [...historico].sort((a,b)=>b.count-a.count);
              const match = historicoSorted.find(h => h.fornecedorId === cli.id); // For clientes, currently using fornecedorId in schema for contatos
              if (match) {
                  setForm(prev => {
                      const nf = { ...prev };
                      if (match.categoriaId && !prev.categoriaId) nf.categoriaId = match.categoriaId;
                      if (match.centroCustoId && !prev.centroCustoId) nf.centroCustoId = match.centroCustoId;
                      if (match.contaId && !prev.contaId) nf.contaId = match.contaId;
                      if (match.formaPagamento && !prev.formaPagamento) nf.formaPagamento = match.formaPagamento;
                      return nf;
                  });
              }
            }`
);

// We keep the outermost { ... } inside fBlock, rBlock, cBlock, BUT we actually don't want them nesting.
// Wait, bracket counting extracts the ENTIRE `{(...) && (...)}` !
// Actually, it's safer to just inject them directly in the TopLevel and let React evaluate them!

const newTopLevel = `
      {/* NOVO TOPO (Fornecedor, Recorrente, Comportamento) */}
      <div className="grid-responsive-3" style={{ alignItems: 'flex-start', marginBottom: 16 }}>
         <div style={{ zIndex: 10 }}>${fBlock}</div>
         <div style={{ marginTop: 18 }}>${rBlock}</div>
         <div style={{ flex: 1, minWidth: 150 }}>${cBlock.replace('width: 150', 'width: "100%"')}</div>
      </div>
`;

let content = lines.join('\n');
content = content.replace(/<div style=\{\{ display: 'flex', flexDirection: 'column', gap: 12 \}\}>(\s*)<div className="grid-responsive-3">/g, `<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>\n${newTopLevel}\n$1<div className="grid-responsive-3">`);

fs.writeFileSync('src/components/ModalLancamento.tsx', content);
console.log('Successfully patched index bracket based!');
