const fs = require('fs');
let c = fs.readFileSync('src/components/ModalLancamento.tsx', 'utf8');

const memoDatalists2 = `
  const contasOptions = useMemo(() => contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>), [contas]);
  const cartoesOptions = useMemo(() => cartoes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>), [cartoes]);
`;

if (!c.includes('const contasOptions = useMemo(')) {
  c = c.replace(/const catsListOptions = useMemo\(/g, memoDatalists2 + "\n  const catsListOptions = useMemo(");
  
  c = c.replace(/\{contas\.map\(c => <option key=\{c\.id\} value=\{c\.id\}>\{c\.nome\}<\/option>\)\}/g, "{contasOptions}");
  c = c.replace(/\{cartoes\.map\(c => <option key=\{c\.id\} value=\{c\.id\}>\{c\.nome\}<\/option>\)\}/g, "{cartoesOptions}");
  
  fs.writeFileSync('src/components/ModalLancamento.tsx', c, 'utf8');
  console.log('Memoized contas and cartoes');
}
