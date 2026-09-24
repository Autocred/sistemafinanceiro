import fs from 'fs';
let c = fs.readFileSync('src/components/MetasGamificadasV2.tsx', 'utf8');
let lines = c.split('\\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('editingMeta.valorAlvo') && lines[i].includes('onChange')) {
    lines[i] = "                  <input required type=\"number\" step=\"0.01\" value={editingMeta.valorAlvo} onChange={e => setEditingMeta({...editingMeta, valorAlvo: Number(e.target.value)})} style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 14 }} />";
  }
}
fs.writeFileSync('src/components/MetasGamificadasV2.tsx', lines.join('\\n'));