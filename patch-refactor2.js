const fs = require('fs');

let c = fs.readFileSync('src/components/ModalLancamento.tsx', 'utf8');

// Use robust regex for target
const targetRx = /<div style=\{\{ display: 'flex', flexDirection: 'column', gap: 12 \}\}>\s*<div className="grid-responsive-3">/;

const match = c.match(targetRx);
if (!match) {
    console.error('Target not found!');
    process.exit(1);
}

const rxFornecedor = /\{\(form\.tipo as string\) !== 'transferencia' && \(\s*<div>\s*<label style=\{\{ fontSize: 11, color: 'var\(--text-muted\)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0\.5px', display: 'block', marginBottom: 5 \}\}>\{\(form\.tipo as string\) === 'receita' \? 'Cliente' : 'Fornecedor'\}<\/label>[\s\S]*?<\/div>\s*\)\}/;
const matchFornecedor = c.match(rxFornecedor);
if (matchFornecedor) c = c.replace(rxFornecedor, '');

const rxRecorrente = /\{\/\* Recorrência \*\/\}\s*\{\(form\.tipo as string\) !== 'transferencia' && form\.formaPagamento !== 'cartao_credito' && \(\s*<div style=\{\{ background: 'rgba\(245,158,11,0\.06\)[\s\S]*?<\/div>\s*\)\}/;
const matchRecorrente = c.match(rxRecorrente);
if (matchRecorrente) c = c.replace(rxRecorrente, '');

const rxComportamento = /\{?\['master', '9yxuafoC0AV9BrIKem05ponbmgn2', 'autocred-promotora-de-credito'\]\.includes\(getTenantId\(\)\) && \(form\.tipo as string\) !== 'transferencia' && \(\s*<div style=\{\{ width: 150 \}\}>[\s\S]*?<\/div>\s*\)\}?/;
const matchComportamento = c.match(rxComportamento);
if (matchComportamento) c = c.replace(rxComportamento, '');

if (matchFornecedor && matchRecorrente && matchComportamento) {
    let fBlock = matchFornecedor[0];
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

    // Now format them into a single line wrapper
    const newTopLevel = `
      {/* NOVO TOPO (Fornecedor, Recorrente, Comportamento) */}
      {(form.tipo as string) !== 'transferencia' && (
      <div className="grid-responsive-3" style={{ alignItems: 'flex-start', marginBottom: 16 }}>
         <div>${fBlock.replace(/\{\(form\.tipo as string\) !== 'transferencia' && \(/g, '').replace(/\)\}/g, '')}</div>
         <div>${matchRecorrente[0].replace(/\{\(form\.tipo as string\) !== 'transferencia' && form\.formaPagamento !== 'cartao_credito' && \(/g, '').replace(/\)\}/g, '')}</div>
         <div style={{ flex: 1, minWidth: 150 }}>${matchComportamento[0].replace('width: 150', 'width: "100%"').replace(/\{\(form\.tipo as string\) !== 'transferencia' && \(/g, '').replace(/\)\}/g, '')}</div>
      </div>
      )}
    `;

    c = c.replace(targetRx, `<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>\n${newTopLevel}\n      <div className="grid-responsive-3">`);
    fs.writeFileSync('src/components/ModalLancamento.tsx', c);
    console.log('Successfully patched everything!');
}
