const fs = require('fs');
let c = fs.readFileSync('src/components/ModalLancamento.tsx', 'utf8');

// 1. AI cache
c = c.replace(
  /const dict = JSON\.parse\(localStorage\.getItem\('ai_learning_dictionary'\) \|\| '\{\}'\);/g,
  "const dict = (window as any).__ai_dictCache || ((window as any).__ai_dictCache = JSON.parse(localStorage.getItem('ai_learning_dictionary') || '{}'));"
);
c = c.replace(
  /localStorage\.setItem\('ai_learning_dictionary',\s*JSON\.stringify\(dict\)\);/g,
  "localStorage.setItem('ai_learning_dictionary', JSON.stringify(dict)); (window as any).__ai_dictCache = dict;"
);

// 2. Sort mutative fix
c = c.replace(
  /const match = historico\.sort\(\(a,b\)=>b\.count-a\.count\)\.find\(h => h\.texto && descLower\.includes\(h\.texto\.toLowerCase\(\)\)\);/g,
  "const historicoSorted = [...historico].sort((a,b)=>b.count-a.count); const match = historicoSorted.find(h => h.texto && descLower.includes(h.texto.toLowerCase()));"
);

// 3. Proper useMemo at the top of the component
const topOfComponent = `export default function ModalLancamento({ onClose, onSalvo, transacaoEditar }: Props) {`;
const memoInjections = `
  // MEMOIZATIONS to prevent heavy re-renders
  const [categorias, setCategorias] = useState<any[]>([]); // dummy to find it
`;
// Wait, I shouldn't inject after the function declaration. I'll inject after the state declarations!
const stateBlock = `const [scanData, setScanData] = useState<any>(null);`;
const memoCode = `
  const catsListOptions = useMemo(() => categorias.map(c => <option key={c.id} value={c.nome} />), [categorias]);
  const ccListOptions = useMemo(() => centrosCusto.map(c => <option key={c.id} value={c.nome} />), [centrosCusto]);
  const clientesFornecedoresOptionsEdit = useMemo(() => {
    return (form.tipo === 'receita') ? clientes.map(c => <option key={c.id} value={c.nome} />) : fornecedores.map(f => <option key={f.id} value={f.nome} />);
  }, [form.tipo, clientes, fornecedores]);
  const contasOptions = useMemo(() => contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>), [contas]);
  const cartoesOptions = useMemo(() => cartoes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>), [cartoes]);
`;

c = c.replace(stateBlock, stateBlock + "\\n" + memoCode);

// Replace datalists inside the component
c = c.replace(/\{categorias\.map\(c => <option key=\{c\.id\} value=\{c\.nome\} \/>\)\}/g, "{catsListOptions}");
c = c.replace(/\{centrosCusto\.map\(c => <option key=\{c\.id\} value=\{c\.nome\} \/>\)\}/g, "{ccListOptions}");
c = c.replace(/\{form\.tipo === 'receita' \? clientes\.map\(c => <option key=\{c\.id\} value=\{c\.nome\} \/>\) : fornecedores\.map\(f => <option key=\{f\.id\} value=\{f\.nome\} \/>\)\}/g, "{clientesFornecedoresOptionsEdit}");
c = c.replace(/\{\(form\.tipo as string\) === 'receita' \? clientes\.map\(c => <option key=\{c\.id\} value=\{c\.nome\} \/>\) : fornecedores\.map\(f => <option key=\{f\.id\} value=\{f\.nome\} \/>\)\}/g, "{clientesFornecedoresOptionsEdit}");
c = c.replace(/\{contas\.map\(c => <option key=\{c\.id\} value=\{c\.id\}>\{c\.nome\}<\/option>\)\}/g, "{contasOptions}");
c = c.replace(/\{cartoes\.map\(c => <option key=\{c\.id\} value=\{c\.id\}>\{c\.nome\}<\/option>\)\}/g, "{cartoesOptions}");

fs.writeFileSync('src/components/ModalLancamento.tsx', c, 'utf8');
console.log('Fixed memoizations');
