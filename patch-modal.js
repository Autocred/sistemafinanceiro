const fs = require('fs');

let c = fs.readFileSync('src/components/ModalLancamento.tsx', 'utf8');

c = c.replace(
  '{fornecedores.map(f => <option key={f.id} value={f.nome} />)}{clientes.map(c => <option key={c.id} value={c.nome} />)}', 
  '{form.tipo === "receita" ? Array.from(new Set(clientes.map(c => c.nome))).map((nome, i) => <option key={`cli-${i}`} value={nome} />) : Array.from(new Set(fornecedores.map(f => f.nome))).map((nome, i) => <option key={`forn-${i}`} value={nome} />)}'
);

fs.writeFileSync('src/components/ModalLancamento.tsx', c);
console.log('Fixed ModalLancamento datalist');
