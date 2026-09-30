const fs = require('fs');

let c = fs.readFileSync('src/components/ModalLancamento.tsx', 'utf8').replace(/\r\n/g, '\n');

const getStrBetween = (str, start, end) => {
    const s = str.indexOf(start);
    if (s === -1) return null;
    const e = str.indexOf(end, s);
    if (e === -1) return null;
    return str.substring(s, e + end.length);
};

const recorrenteStr = "<div style={{ marginTop: 18 }}>\n{/* Recorrência */}\n      {(form.tipo as string) !== 'transferencia' && form.formaPagamento !== 'cartao_credito' && (\n      <div style={{ background: 'rgba(245,158,11,0.06)'";
const rBlockFull = getStrBetween(c, recorrenteStr, "      </div>\n      )}\n</div>");

if (!rBlockFull) {
    console.error('Recorrente block full not found!');
    // fallback check
    console.log(c.substring(c.indexOf('<div style={{ marginTop: 18 }}>\n{/* Recorrência */}'), c.indexOf('<div style={{ marginTop: 18 }}>\n{/* Recorrência */}') + 500));
    process.exit(1);
}

// Extract just the inner recorrente string without the outer <div style={{ marginTop: 18 }}>
const rInner = getStrBetween(rBlockFull, "{/* Recorrência */}", "      </div>\n      )}");

c = c.replace(rBlockFull + '\n', ''); // remove from NOVO TOPO

const catEndStr = "            <button type=\"button\" onClick={() => setNovoCadastro('centroCusto')} className=\"btn-secondary hover-lift active-press\" style={{ padding: '0 12px', flexShrink: 0 }}>\n              <Plus size={16} />\n            </button>\n          </div>\n        </div>\n      </div>\n      )}";
const insertPos = c.indexOf(catEndStr) + catEndStr.length;

if (c.indexOf(catEndStr) === -1) {
    console.error('Categoria end not found!');
    process.exit(1);
}

// Insert right after the Categoria/CentroDeCusto block
c = c.substring(0, insertPos) + "\n\n      " + rInner + c.substring(insertPos);

fs.writeFileSync('src/components/ModalLancamento.tsx', c);
console.log('Successfully moved Lançamento Recorrente below Categoria/Centro de Custo!');
