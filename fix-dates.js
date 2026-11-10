const fs = require('fs');

['src/components/Lancamentos.tsx', 'src/components/LancamentosV2.tsx'].forEach(f => {
  let c = fs.readFileSync(f, 'utf8');

  // Replace 2dias, semana, and mes
  const regex = /\} else if \(periodoFiltro === '2dias'\) \{[\s\S]*?\} else if \(periodoFiltro === 'ano'\)/;

  const newLogic = `} else if (periodoFiltro === '2dias') {
      const hoje = format(hojeData, 'yyyy-MM-dd');
      const doisDiasFrente = format(new Date(hojeData.getTime() + 2 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');
      naoPeriodo = dataRef >= hoje && dataRef <= doisDiasFrente;
    } else if (periodoFiltro === 'semana') {
      const inicioSemana = format(startOfWeek(hojeData, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const fimSemana = format(endOfWeek(hojeData, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      naoPeriodo = dataRef >= inicioSemana && dataRef <= fimSemana;
    } else if (periodoFiltro === 'mes') {
      const inicioMes = format(startOfMonth(hojeData), 'yyyy-MM-dd');
      const fimMes = format(endOfMonth(hojeData), 'yyyy-MM-dd');
      naoPeriodo = dataRef >= inicioMes && dataRef <= fimMes;
    } else if (periodoFiltro === 'ano')`;

  c = c.replace(regex, newLogic);
  fs.writeFileSync(f, c);
});
