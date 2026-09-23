const fs = require('fs');
let content = fs.readFileSync('src/components/DashboardMensal.tsx', 'utf-8');

const oldFilters = `const txAno = useMemo(() => {
    return transacoes.filter(t => {
      if (!t.data) return false;
      const d = parseISO(t.data);
      return getYear(d) === ano;
    });
  }, [transacoes, ano]);

  const txMes = useMemo(() => {
    return txAno.filter(t => {
      const d = parseISO(t.data);
      return getMonth(d) === mes;
    });
  }, [txAno, mes]);

  const txMesPassado = useMemo(() => {
    const prevMes = mes === 0 ? 11 : mes - 1;
    const prevAno = mes === 0 ? ano - 1 : ano;
    return transacoes.filter(t => {
      if (!t.data) return false;
      const d = parseISO(t.data);
      return getYear(d) === prevAno && getMonth(d) === prevMes;
    });
  }, [transacoes, ano, mes]);`;

const newFilters = `const txAno = useMemo(() => {
    const anoStr = String(ano);
    return transacoes.filter(t => String(t.data || '').startsWith(anoStr));
  }, [transacoes, ano]);

  const txMes = useMemo(() => {
    const mesStr = \`\${ano}-\${String(mes + 1).padStart(2, '0')}\`;
    return transacoes.filter(t => String(t.data || '').startsWith(mesStr));
  }, [transacoes, ano, mes]);

  const txMesPassado = useMemo(() => {
    const prevM = mes === 0 ? 12 : mes; // mes is 0-indexed. If mes=0 (Jan), prevM=12 (Dec).
    const prevAno = mes === 0 ? ano - 1 : ano;
    const mesStr = \`\${prevAno}-\${String(prevM).padStart(2, '0')}\`;
    return transacoes.filter(t => String(t.data || '').startsWith(mesStr));
  }, [transacoes, ano, mes]);`;

content = content.replace(oldFilters, newFilters);

const oldDespesas = `const despesas = txMes.filter(t => t.tipo === 'despesa');`;
const newDespesas = `const despesas = txMes.filter(t => t.tipo === 'despesa' && t.categoriaNome !== 'Pagamento de Fatura');`;
content = content.replace(oldDespesas, newDespesas);

fs.writeFileSync('src/components/DashboardMensal.tsx', content);
console.log('Filters updated');
