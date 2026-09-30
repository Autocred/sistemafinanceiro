const fs = require('fs');

let c = fs.readFileSync('src/components/ModalLancamento.tsx', 'utf8').replace(/\r\n/g, '\n');

const getStrBetween = (str, start, end) => {
    const s = str.indexOf(start);
    if (s === -1) return null;
    const e = str.indexOf(end, s);
    if (e === -1) return null;
    return str.substring(s, e + end.length);
};

const fornecedorStr = "{(form.tipo as string) !== 'transferencia' && (\n      <div>\n        <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>{(form.tipo as string) === 'receita' ? 'Cliente' : 'Fornecedor'}</label>";
let fBlock = getStrBetween(c, fornecedorStr, "      </div>\n      )}");

const recorrenteStr = "{/* Recorrência */}\n      {(form.tipo as string) !== 'transferencia' && form.formaPagamento !== 'cartao_credito' && (\n      <div style={{ background: 'rgba(245,158,11,0.06)'";
let rBlock = getStrBetween(c, recorrenteStr, "      </div>\n      )}");

const comportamentoStr = "{['master', '9yxuafoC0AV9BrIKem05ponbmgn2', 'autocred-promotora-de-credito'].includes(getTenantId()) && (form.tipo as string) !== 'transferencia' && (\n            <div style={{ width: 150 }}>\n              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 5 }}>Comportamento</label>";
let cBlock = getStrBetween(c, comportamentoStr, "            </div>\n          )}");

if (!fBlock || !rBlock || !cBlock) {
    console.error('Blocks not found!', { f: !!fBlock, r: !!rBlock, c: !!cBlock });
    process.exit(1);
}

// Remove them from current position
c = c.replace(fBlock, '');
c = c.replace(rBlock, '');
c = c.replace(cBlock, '');

// Apply AI auto-fill to Fornecedor
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

const newTopLevel = `
      {/* NOVO TOPO (Fornecedor, Recorrente, Comportamento) */}
      <div className="grid-responsive-3" style={{ alignItems: 'flex-start', marginBottom: 16 }}>
         <div style={{ zIndex: 10 }}>\n${fBlock}\n</div>
         <div style={{ marginTop: 18 }}>\n${rBlock}\n</div>
         <div style={{ flex: 1, minWidth: 150 }}>\n${cBlock.replace('width: 150', 'width: "100%"')}\n</div>
      </div>
`;

c = c.replace(
    /<div style=\{\{ display: 'flex', flexDirection: 'column', gap: 12 \}\}>\n\n      <div className="grid-responsive-3">/,
    `<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>\n${newTopLevel}\n      <div className="grid-responsive-3">`
);

fs.writeFileSync('src/components/ModalLancamento.tsx', c);
console.log('Successfully patched with exact match!');
