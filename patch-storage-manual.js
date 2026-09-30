const fs = require('fs');
let c = fs.readFileSync('src/lib/storage.ts', 'utf8');

c = c.replace(/if \(dataVencimentoManual\) \{/g, `  const ciclo = calcularCicloFatura(data, _diaFechamento, _diaVencimento);
  if (dataVencimentoManual && dataVencimentoManual !== ciclo.dataVencimento) {`);

c = c.replace(/  \} else \{\n    \/\/ ⚠️ REGRA DE OURO IMPLEMENTADA ⚠️\n    const ciclo = calcularCicloFatura\(data, _diaFechamento, _diaVencimento\);\n/g, `  } else {\n`);

fs.writeFileSync('src/lib/storage.ts', c);
console.log('Fixed storage manual override');
