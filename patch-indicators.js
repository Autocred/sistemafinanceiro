const fs = require('fs');

let c = fs.readFileSync('src/components/DashboardMensal.tsx', 'utf8');

c = c.replace(/<div className="ind-item"><span>Maior Despesa<\/span> <b>/g, '<div className="ind-item"><span>Maior Despesa</span> <b style={{color: \'#ef4444\'}}>');
c = c.replace(/<div className="ind-item"><span>Menor Despesa<\/span> <b>/g, '<div className="ind-item"><span>Menor Despesa</span> <b style={{color: \'#ef4444\'}}>');
c = c.replace(/<div className="ind-item"><span>Cat\. Mais Gastou<\/span> <b>/g, '<div className="ind-item"><span>Cat. Mais Gastou</span> <b style={{color: \'#ef4444\'}}>');
c = c.replace(/<div className="ind-item"><span>Cat\. Menos Gastou<\/span> <b>/g, '<div className="ind-item"><span>Cat. Menos Gastou</span> <b style={{color: \'#ef4444\'}}>');
c = c.replace(/<div className="ind-item"><span>Média por Lcto\.<\/span> <b>/g, '<div className="ind-item"><span>Média por Lcto.</span> <b style={{color: \'#ef4444\'}}>');

fs.writeFileSync('src/components/DashboardMensal.tsx', c);
console.log('Patched indicators colors');
