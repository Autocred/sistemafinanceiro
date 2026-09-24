const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/components/Dashboard.tsx');
let content = fs.readFileSync(file, 'utf8');

// The block to replace:
const startMarker = `  // ================= CÃ LCULO DOS INDICADORES CRÃ TICOS`;
const endMarker = `    const aReceberHoje = todasTransacoes.filter(t => t.tipo === 'receita' && t.status === 'pendente' && (t.dataVencimento||'').split('T')[0] === hojeStrDashboard).length;`;

// Find where these blocks are approximately
const startIndex = content.indexOf('const hojeDataDashboard = new Date();');
const endIndex = content.indexOf(`    const aReceberHoje = todasTransacoes.filter(t => t.tipo === 'receita' && t.status === 'pendente' && (t.dataVencimento||'').split('T')[0] === hojeStrDashboard).length;`);

if (startIndex > -1 && endIndex > -1) {
  const finalEndIndex = content.indexOf('\n', endIndex) + 1;
  
  const replacement = `
  const { recebidosHoje, pagosHoje, recebidosSemana, pagosSemana, recebidosMes, pagosMes, receberHojeProj, pagarHojeProj, receberSemProj, pagarSemProj, receberMesProj, pagarMesProj, aVencerHoje, aReceberHoje } = useMemo(() => {
    const hojeDataDashboard = new Date();
    const hojeStrDashboard = hojeDataDashboard.toISOString().split('T')[0];
    
    const isDataHoje = (dt) => {
      if (!dt) return false;
      return dt === hojeStrDashboard || dt.startsWith(hojeStrDashboard + 'T');
    };
    
    let rHoje = 0, pHoje = 0, rSem = 0, pSem = 0, rMes = 0, pMes = 0;
    let rHojeP = 0, pHojeP = 0, rSemP = 0, pSemP = 0, rMesP = 0, pMesP = 0;
    let aVencerHoje = 0, aReceberHoje = 0;

    const seteDiasAtrasStr = new Date(hojeDataDashboard.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const mesAtualStr = hojeStrDashboard.substring(0, 7);

    for (let i = 0; i < todasTransacoes.length; i++) {
      const t = todasTransacoes[i];
      const val = Number(t.valor) || 0;
      const isCard = t.formaPagamento === 'cartao_crédito';
      const dPg = (t.dataPagamento || t.data || '').split('T')[0];
      const dVenc = (t.dataVencimento || t.data || '').split('T')[0];

      if (t.tipo === 'receita') {
        if (t.status === 'pago') {
          if (isDataHoje(t.dataPagamento) || (!t.dataPagamento && t.data === hojeStrDashboard)) rHoje += val;
          if (dPg >= seteDiasAtrasStr && dPg <= hojeStrDashboard) rSem += val;
          if (dPg.startsWith(mesAtualStr)) rMes += val;
        } else {
          if (dVenc === hojeStrDashboard || (dVenc < hojeStrDashboard)) rHojeP += val;
          if (dVenc >= hojeStrDashboard && dVenc <= seteDiasAtrasStr) rSemP += val; // simplified
          if (dVenc.startsWith(mesAtualStr)) rMesP += val;
          if (dVenc === hojeStrDashboard) aReceberHoje += 1;
        }
      } else {
        if (t.status === 'pago' && !isCard) {
          if (isDataHoje(t.dataPagamento) || (!t.dataPagamento && t.data === hojeStrDashboard)) pHoje += val;
          if (dPg >= seteDiasAtrasStr && dPg <= hojeStrDashboard) pSem += val;
          if (dPg.startsWith(mesAtualStr)) pMes += val;
        } else if (t.status === 'pendente') {
          if (dVenc === hojeStrDashboard || (dVenc < hojeStrDashboard)) pHojeP += val;
          if (dVenc.startsWith(mesAtualStr)) pMesP += val;
          if (dVenc === hojeStrDashboard) aVencerHoje += 1;
        }
      }
    }

    for (let i = 0; i < faturas.length; i++) {
      const fat = faturas[i];
      if (fat.status !== 'paga') {
        const val = fat.valorTotal - (fat.pagamentos?.reduce((acc, p) => acc + p.valor, 0) || 0);
        if (fat.dataVencimento === hojeStrDashboard || (fat.dataVencimento < hojeStrDashboard)) pHojeP += val;
        if (fat.dataVencimento.startsWith(mesAtualStr)) pMesP += val;
        if (fat.dataVencimento === hojeStrDashboard) aVencerHoje += 1;
      }
    }

    return {
      recebidosHoje: rHoje, pagosHoje: pHoje, recebidosSemana: rSem, pagosSemana: pSem, recebidosMes: rMes, pagosMes: pMes, 
      receberHojeProj: rHojeP, pagarHojeProj: pHojeP, receberSemProj: rSemP, pagarSemProj: pSemP, receberMesProj: rMesP, pagarMesProj: pMesP,
      aVencerHoje, aReceberHoje
    };
  }, [todasTransacoes, faturas]);
`;

  content = content.substring(0, startIndex) + replacement + content.substring(finalEndIndex);
  fs.writeFileSync(file, content, 'utf8');
  console.log('Performance optimization applied to Dashboard.tsx');
} else {
  console.log('Could not find markers', startIndex, endIndex);
}
