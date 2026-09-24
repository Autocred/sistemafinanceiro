import fs from 'fs';
let c = fs.readFileSync('src/components/MetasGamificadasV2.tsx', 'utf8');

c = c.replace(/width: `\${Math.min\(destaqueProgresso.pct, 100\)}%`/g, "width: Math.min(destaqueProgresso.pct, 100) + '%'");
c = c.replace(/tickFormatter={\(v\) => `R\$ \${\(v\/1000\).toFixed\(0\)}k`}/g, 'tickFormatter={(v) => "R$ " + (v/1000).toFixed(0) + "k"}');
c = c.replace(/border: `1px solid \${isClosed \? 'var\(--border\)' : '#3b82f6'}`/g, "border: '1px solid ' + (isClosed ? 'var(--border)' : '#3b82f6')");
c = c.replace(/width: `\${Math.min\(prog.pct, 100\)}%`/g, "width: Math.min(prog.pct, 100) + '%'");

// The markdown actually passed: `width: \`\${Math.min(prog.pct, 100)}%\``
// Let's just catch any backtick strings that look like \`\${...}\`
c = c.replace(/\\`\\\$\\{Math\.min\(destaqueProgresso\.pct, 100\)\\}%\\`/g, "Math.min(destaqueProgresso.pct, 100) + '%'");
c = c.replace(/\\`R\\$ \\\$\\{\(v\/1000\)\.toFixed\(0\)\\}k\\`/g, '"R$ " + (v/1000).toFixed(0) + "k"');
c = c.replace(/\\`1px solid \\\$\\{isClosed \? 'var\(--border\)' : '#3b82f6'\\}\\`/g, "'1px solid ' + (isClosed ? 'var(--border)' : '#3b82f6')");
c = c.replace(/\\`\\\$\\{Math\.min\(prog\.pct, 100\)\\}%\\`/g, "Math.min(prog.pct, 100) + '%'");

fs.writeFileSync('src/components/MetasGamificadasV2.tsx', c);
console.log('Done!');
