const fs = require('fs');

let c = fs.readFileSync('src/components/DashboardMensal.tsx', 'utf8');

// Fix Grafico 1 (Gastos por Categoria) - Make them all Red
c = c.replace(/<stop offset="5%" stopColor=\{COLORS\[index % COLORS\.length\]\} stopOpacity=\{0\.9\}\/>/g, '<stop offset="5%" stopColor="#ef4444" stopOpacity={0.9}/>');
c = c.replace(/<stop offset="95%" stopColor=\{COLORS\[index % COLORS\.length\]\} stopOpacity=\{0\.5\}\/>/g, '<stop offset="95%" stopColor="#ef4444" stopOpacity={0.5}/>');

// Fix Grafico 2 (Gastos por CC) - Make them all Red
c = c.replace(/<stop offset="5%" stopColor=\{COLORS\[\(index \+ 3\) % COLORS\.length\]\} stopOpacity=\{0\.9\}\/>/g, '<stop offset="5%" stopColor="#ef4444" stopOpacity={0.9}/>');
c = c.replace(/<stop offset="95%" stopColor=\{COLORS\[\(index \+ 3\) % COLORS\.length\]\} stopOpacity=\{0\.5\}\/>/g, '<stop offset="95%" stopColor="#ef4444" stopOpacity={0.5}/>');

// Fix Table Bars (Tabela Resumida) - Make them Red
c = c.replace(/background: COLORS\[idx % COLORS\.length\]/g, "background: '#ef4444'");

// If there's any other place using COLORS inside a style
// c = c.replace(/COLORS\[.*?\]/g, "'#ef4444'"); // maybe too aggressive

// Also let's change Saldo do Mês to "card-darkblue" and add the CSS for it if they want really dark blue.
c = c.replace(/\.card-cyan \.card-icon/g, '.card-darkblue .card-icon { background: linear-gradient(135deg, #1e3a8a, #172554); }\n        .card-cyan .card-icon');
c = c.replace(/<div className="bi-card card-blue glass-panel hover-lift fade-in-up" style={{ animationDelay: '0\.3s' }}>\s*<div className="card-icon"><DollarSign size={24} \/><\/div>\s*<div className="card-info">\s*<h3>Saldo do Mês<\/h3>/g, 
  `<div className="bi-card card-darkblue glass-panel hover-lift fade-in-up" style={{ animationDelay: '0.3s' }}>
          <div className="card-icon"><DollarSign size={24} /></div>
          <div className="card-info">
            <h3>Saldo do Mês</h3>`);

// And in "Indicadores Automáticos", Saldo do Mês color
c = c.replace(/<b style=\{\{color: saldoMes >= 0 \? '#10b981' : '#ef4444'\}\}>\{formatarMoeda\(saldoMes\)\}<\/b>/g, "<b style={{color: '#1e3a8a'}}>{formatarMoeda(saldoMes)}</b>");

fs.writeFileSync('src/components/DashboardMensal.tsx', c);
console.log('Patched colors');
