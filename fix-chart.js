const fs = require('fs');
let content = fs.readFileSync('src/components/DashboardMensal.tsx', 'utf-8');

// Fix YAxis intervals so no category label is hidden
content = content.replace(/<YAxis dataKey="nome" type="category" stroke="var\(--text-secondary\)" fontSize=\{13\} tickLine=\{false\} axisLine=\{false\} width=\{130\} \/>/g, '<YAxis dataKey="nome" type="category" stroke="var(--text-secondary)" fontSize={13} tickLine={false} axisLine={false} width={130} interval={0} />');

// Make heights dynamic based on number of bars so it doesn't look stretched and weird
content = content.replace(/<div style=\{\{ height: 400, width: '100%' \}\}>/g, "<div style={{ height: Math.max(250, gastosPorCategoria.length * 60 + 40), width: '100%' }}>");
content = content.replace(/<div style=\{\{ height: 350, width: '100%' \}\}>/g, "<div style={{ height: Math.max(250, gastosPorCentroCusto.length * 60 + 40), width: '100%' }}>");

fs.writeFileSync('src/components/DashboardMensal.tsx', content);
