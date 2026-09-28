const fs = require('fs');
let c = fs.readFileSync('src/components/ModalLancamento.tsx', 'utf8');

const memoDatalists = `
  // Memoizing datalists to prevent heavy DOM diffing on every keystroke
  const catsListOptions = useMemo(() => categorias.map(c => <option key={c.id} value={c.nome} />), [categorias]);
  const ccListOptions = useMemo(() => centrosCusto.map(c => <option key={c.id} value={c.nome} />), [centrosCusto]);
  const clientesFornecedoresOptionsEdit = useMemo(() => {
    return (form.tipo === 'receita') ? clientes.map(c => <option key={c.id} value={c.nome} />) : fornecedores.map(f => <option key={f.id} value={f.nome} />);
  }, [form.tipo, clientes, fornecedores]);
`;

if (!c.includes('const catsListOptions = useMemo(')) {
  c = c.replace(/return\s*\(\s*<div/g, memoDatalists + "\n  return (\n    <div");
  
  c = c.replace(/\{categorias\.map\(c => <option key=\{c\.id\} value=\{c\.nome\} \/>\)\}/g, "{catsListOptions}");
  c = c.replace(/\{centrosCusto\.map\(c => <option key=\{c\.id\} value=\{c\.nome\} \/>\)\}/g, "{ccListOptions}");
  
  c = c.replace(/\{form\.tipo === 'receita' \? clientes\.map\(c => <option key=\{c\.id\} value=\{c\.nome\} \/>\) : fornecedores\.map\(f => <option key=\{f\.id\} value=\{f\.nome\} \/>\)\}/g, "{clientesFornecedoresOptionsEdit}");
  c = c.replace(/\{\(form\.tipo as string\) === 'receita' \? clientes\.map\(c => <option key=\{c\.id\} value=\{c\.nome\} \/>\) : fornecedores\.map\(f => <option key=\{f\.id\} value=\{f\.nome\} \/>\)\}/g, "{clientesFornecedoresOptionsEdit}");
  
  // also fix `p.tipo === 'receita'` in edit rateio 
  // actually wait, rateio has its own `p.tipo`, so we leave that alone or memoize it too.
  
  fs.writeFileSync('src/components/ModalLancamento.tsx', c, 'utf8');
  console.log('Memoized datalists');
}
