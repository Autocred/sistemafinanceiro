const fs = require('fs');

let lines = fs.readFileSync('src/components/ModalLancamento.tsx', 'utf8').split('\n');

const getBlock = (startStr, endStr) => {
    const start = lines.findIndex(l => l.includes(startStr));
    if (start === -1) return null;
    let end = start;
    let openBrackets = 0;
    // Just find endStr literally after start
    end = lines.findIndex((l, i) => i > start && l.includes(endStr));
    if (end === -1) return null;
    
    const block = lines.slice(start, end + 1).join('\n');
    for (let i = start; i <= end; i++) lines[i] = ''; // clear
    return block;
};

// Start markers:
const fStart = "{(form.tipo as string) !== 'transferencia' && (";
const fStartIdx = lines.findIndex((l, i) => i > 1700 && l.includes(fStart) && lines[i+1] && lines[i+1].includes('<div>') && lines[i+2] && lines[i+2].includes('Fornecedor'));
if (fStartIdx === -1) { console.error('No Fornecedor'); process.exit(1); }

// Find the closing )} for Fornecedor
let fEndIdx = lines.findIndex((l, i) => i > fStartIdx && l.includes(')}'));
// Fornecedor block has an inner novoCadastro condition which also has `)}`.
fEndIdx = lines.findIndex((l, i) => i > fStartIdx + 30 && l.trim() === ')}');

let fBlock = lines.slice(fStartIdx, fEndIdx + 1).join('\n');
for (let i = fStartIdx; i <= fEndIdx; i++) lines[i] = '';

const rStart = "{/* Recorrência */}";
const rStartIdx = lines.findIndex(l => l.includes(rStart));
const rEndIdx = lines.findIndex((l, i) => i > rStartIdx && l.trim() === ')}');
let rBlock = lines.slice(rStartIdx, rEndIdx + 1).join('\n');
for (let i = rStartIdx; i <= rEndIdx; i++) lines[i] = '';

const cStartIdx = lines.findIndex(l => l.includes("['master', '9yxuafoC0AV9BrIKem05ponbmgn2', 'autocred-promotora-de-credito'].includes(getTenantId()) && (form.tipo as string) !== 'transferencia' && ("));
const cEndIdx = lines.findIndex((l, i) => i > cStartIdx && l.trim() === ')}');
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

// strip the wrappers
fBlock = fBlock.replace(/\{\(form\.tipo as string\) !== 'transferencia' && \(/g, '').replace(/\)\}/g, '');
rBlock = rBlock.replace(/\{\/\* Recorrência \*\/\}/g, '').replace(/\{\(form\.tipo as string\) !== 'transferencia' && form\.formaPagamento !== 'cartao_credito' && \(/g, '').replace(/\)\}/g, '');
cBlock = cBlock.replace(/\{?\['master', '9yxuafoC0AV9BrIKem05ponbmgn2', 'autocred-promotora-de-credito'\]\.includes\(getTenantId\(\)\) && \(form\.tipo as string\) !== 'transferencia' && \(/g, '').replace(/\)\}?/g, '').replace(/width: 150/g, 'width: "100%"');

const newTopLevel = `
      {/* NOVO TOPO (Fornecedor, Recorrente, Comportamento) */}
      {(form.tipo as string) !== 'transferencia' && (
      <div className="grid-responsive-3" style={{ alignItems: 'flex-start', marginBottom: 16 }}>
         <div>${fBlock}</div>
         <div>${rBlock}</div>
         <div>${cBlock}</div>
      </div>
      )}
`;

let content = lines.join('\n');
content = content.replace(/<div style=\{\{ display: 'flex', flexDirection: 'column', gap: 12 \}\}>\n\n\s*<div className="grid-responsive-3">/g, `<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>\n${newTopLevel}\n      <div className="grid-responsive-3">`);

fs.writeFileSync('src/components/ModalLancamento.tsx', content);
console.log('Successfully patched index based!');
