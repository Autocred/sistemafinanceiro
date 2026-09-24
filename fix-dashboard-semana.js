const fs = require('fs');
let c = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

c = c.replace(
  "const seteDiasAtrasStrDashboard = format(subDays(hojeDataDashboard, 7), 'yyyy-MM-dd');",
  "const inicioSemana = format(startOfWeek(hojeDataDashboard, { weekStartsOn: 1 }), 'yyyy-MM-dd');\n    const fimSemana = format(endOfWeek(hojeDataDashboard, { weekStartsOn: 1 }), 'yyyy-MM-dd');"
);

c = c.replace(
  "return d >= seteDiasAtrasStrDashboard && d <= hojeStrDashboard;",
  "return d >= inicioSemana && d <= fimSemana;"
);

c = c.replace(
  "return d >= seteDiasAtrasStrDashboard && d <= hojeStrDashboard;",
  "return d >= inicioSemana && d <= fimSemana;"
);

fs.writeFileSync('src/components/Dashboard.tsx', c);
