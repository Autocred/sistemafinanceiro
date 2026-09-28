const fs = require('fs');
let c = fs.readFileSync('src/components/ModalLancamento.tsx', 'utf8');

const memoCode = `
  const catsListOptions = useMemo(() => categorias.map(c => <option key={c.id} value={c.nome} />), [categorias]);
  const ccListOptions = useMemo(() => centrosCusto.map(c => <option key={c.id} value={c.nome} />), [centrosCusto]);
  const clientesFornecedoresOptionsEdit = useMemo(() => {
    return (form.tipo === 'receita') ? clientes.map(c => <option key={c.id} value={c.nome} />) : fornecedores.map(f => <option key={f.id} value={f.nome} />);
  }, [form.tipo, clientes, fornecedores]);
  const contasOptions = useMemo(() => contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>), [contas]);
  const cartoesOptions = useMemo(() => cartoes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>), [cartoes]);
`;

c = c.replace(/if\s*\(sucesso\)\s*\{\s*return\s*\(/, memoCode + "\n  if (sucesso) {\n    return (");

fs.writeFileSync('src/components/ModalLancamento.tsx', c, 'utf8');
console.log('Injected useMemo safely');
