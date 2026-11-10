const fs = require('fs');

['src/components/Lancamentos.tsx', 'src/components/LancamentosV2.tsx'].forEach(f => {
  let c = fs.readFileSync(f, 'utf8');

  // Replace ano
  const regex = /\} else if \(periodoFiltro === 'ano'\) \{[\s\S]*?\} else if \(periodoFiltro === 'data_especifica'\)/;

  const newLogic = `} else if (periodoFiltro === 'ano') {
      const anoAtual = format(hojeData, 'yyyy');
      naoPeriodo = String(dataRef || '').startsWith(anoAtual);
    } else if (periodoFiltro === 'data_especifica')`;

  c = c.replace(regex, newLogic);
  fs.writeFileSync(f, c);
});
