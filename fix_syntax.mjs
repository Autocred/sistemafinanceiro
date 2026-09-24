import fs from 'fs';
let c = fs.readFileSync('src/components/MetasGamificadasV2.tsx', 'utf8');

c = c.replace(/width: \\\`\\\$\\{Math.min\\(destaqueProgresso\\.pct, 100\\)\\}%\\\`/g, "width: Math.min(destaqueProgresso.pct, 100) + '%'");
c = c.replace(/tickFormatter=\\{\\(v\\) => \\\`R\\$ \\\$\\{(\\(v\\/1000\\)\\.toFixed\\(0\\))\\}k\\\`\\}/g, 'tickFormatter={(v) => "R$ " + (v/1000).toFixed(0) + "k"}');
c = c.replace(/border: \\\`1px solid \\\$\\{isClosed \\? 'var\\(--border\\)' : '#3b82f6'\\}\\\`/g, "border: '1px solid ' + (isClosed ? 'var(--border)' : '#3b82f6')");
c = c.replace(/width: \\\`\\\$\\{Math\\.min\\(prog\\.pct, 100\\)\\}%\\\`/g, "width: Math.min(prog.pct, 100) + '%'");

// actually the markdown parsing just gave: `\${Math...}%` which is invalid ts.
// let me just regex replace all `\${...}` and backticks if they are messed up.
