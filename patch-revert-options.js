const fs = require('fs');
let c = fs.readFileSync('src/components/ModalLancamento.tsx', 'utf8');

c = c.replace(/\{catsListOptions\}/g, "{categorias.map(c => <option key={c.id} value={c.nome} />)}");
c = c.replace(/\{ccListOptions\}/g, "{centrosCusto.map(c => <option key={c.id} value={c.nome} />)}");
c = c.replace(/\{contasOptions\}/g, "{contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}");
c = c.replace(/\{cartoesOptions\}/g, "{cartoes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}");

// For clientesFornecedoresOptionsEdit, it was used in both EditarPreLancamento and ManualForm. 
// Since both have their own conditionals, it's safer to just put BOTH mapping loops in the datalist and let HTML ignore irrelevant ones, 
// OR we can just inject both and it works perfectly because they just populate the datalist with suggestions.
c = c.replace(/\{clientesFornecedoresOptionsEdit\}/g, "{fornecedores.map(f => <option key={f.id} value={f.nome} />)}{clientes.map(c => <option key={c.id} value={c.nome} />)}");

// Remove the injected useMemo code block
c = c.replace(/const catsListOptions = useMemo[\s\S]+?const cartoesOptions = useMemo[^\n]+\n/g, '');

fs.writeFileSync('src/components/ModalLancamento.tsx', c, 'utf8');
console.log('Reverted option memoizations inline');
