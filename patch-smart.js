const fs = require('fs');
let c = fs.readFileSync('src/components/ModalLancamento.tsx', 'utf8');

// Revert previous naive slice
c = c.replace(/clientes\.slice\(0,50\)\.map\(/g, 'clientes.map(');
c = c.replace(/fornecedores\.slice\(0,50\)\.map\(/g, 'fornecedores.map(');
c = c.replace(/categorias\.slice\(0,50\)\.map\(/g, 'categorias.map(');

// Apply smart filtering
c = c.replace(
  /\{p\.tipo === 'receita' \? clientes\.map\(c => <option key=\{c\.id\} value=\{c\.nome\} \/>\) : fornecedores\.map\(f => <option key=\{f\.id\} value=\{f\.nome\} \/>\)\}/g,
  `{p.tipo === 'receita' 
    ? clientes.filter(c => c.nome.toLowerCase().includes((p.clienteNome||'').toLowerCase())).slice(0,30).map(c => <option key={c.id} value={c.nome} />) 
    : fornecedores.filter(f => f.nome.toLowerCase().includes((p.fornecedorNome||'').toLowerCase())).slice(0,30).map(f => <option key={f.id} value={f.nome} />)
  }`
);

// Apply to others if they exist
c = c.replace(
  /categorias\.map\(c => <option key=\{c\.id\} value=\{c\.nome\} \/>\)/g,
  `categorias.filter(c => c.nome.toLowerCase().includes((p.categoriaNome||'').toLowerCase())).slice(0,30).map(c => <option key={c.id} value={c.nome} />)`
);

c = c.replace(
  /centrosCusto\.map\(c => <option key=\{c\.id\} value=\{c\.nome\} \/>\)/g,
  `centrosCusto.filter(c => c.nome.toLowerCase().includes((p.centroCustoNome||'').toLowerCase())).slice(0,30).map(c => <option key={c.id} value={c.nome} />)`
);

fs.writeFileSync('src/components/ModalLancamento.tsx', c);
console.log('smart optimized');
