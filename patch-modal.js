const fs = require('fs');

let c = fs.readFileSync('src/components/ModalLancamento.tsx', 'utf8');

c = c.replace(/className="modal-box slide-up" style=\{\{ padding: 24 \}\}/g, 'className="modal-box slide-up" style={{ padding: 24, maxWidth: 840 }}');

// Agora vou trocar vários "grid-responsive-2" por "grid-responsive-3" onde faz sentido.
// Linha 824: "grid-responsive-2" -> "grid-responsive-3"
c = c.replace(
  /<div className="grid-responsive-2">(\s*<div>\s*<label[^>]+>Tipo<\/label>[\s\S]*?)<\/div>\s*<\/div>/,
  `<div className="grid-responsive-3">
$1
  </div>
  <div>
    <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>Data</label>
    <input className="input-field" type="date" value={p.dataLancamento || p.data} onChange={e => set({ dataLancamento: e.target.value, data: e.target.value })} />
  </div>
</div>`
);

// We need to carefully rewrite the form instead of hacky regex.
// Wait, I can just replace all `grid-responsive-2` with `grid-responsive-3` since he wants 3 fields per line.
// Let's do that for the ones that make sense!

c = c.replace(/<div className="grid-responsive-2">/g, '<div className="grid-responsive-3">');

fs.writeFileSync('src/components/ModalLancamento.tsx', c);
console.log('patched');
