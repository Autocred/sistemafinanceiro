const fs = require('fs');
let c = fs.readFileSync('src/components/ModalLancamento.tsx', 'utf8');

const badBlock = `      const clientesFornecedoresOptionsEdit = useMemo(() => {
    return (form.tipo === 'receita') ? clientes.map(c => <option key={c.id} value={c.nome} />) : fornecedores.map(f => <option key={f.id} value={f.nome} />);
  }, [form.tipo, clientes, fornecedores]);`;

c = c.replace(badBlock, '');
c = c.replace("const catsListOptions = useMemo(() => categorias.map(c => <option key={c.id} value={c.nome} />), [categorias]);", "");
c = c.replace("const ccListOptions = useMemo(() => centrosCusto.map(c => <option key={c.id} value={c.nome} />), [centrosCusto]);", "");

fs.writeFileSync('src/components/ModalLancamento.tsx', c, 'utf8');
console.log('Fixed duplicates');
