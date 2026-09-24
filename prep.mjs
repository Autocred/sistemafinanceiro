import fs from 'fs';

let code = `
  const isDiaUtil = (d: Date) => {
    const dia = d.getDay();
    return dia !== 0 && dia !== 6; // Nao e domingo(0) nem sabado(6)
  };

  const calcularDiasUteis = (inicio: Date, fim: Date) => {
    let cont = 0;
    let atual = new Date(inicio);
    while (atual <= fim) {
      if (isDiaUtil(atual)) cont++;
      atual.setDate(atual.getDate() + 1);
    }
    return cont;
  };
`;
// I will just completely replace the render part for "metaDestaque".
