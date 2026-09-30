const fs = require('fs');
let c = fs.readFileSync('src/components/Relatorios.tsx', 'utf8');

c = c.replace(
  /const saldo = totalReceitas - totalDespesas;/g,
  "const totalTransferencias = transacoesFiltradas.filter(t => t.tipo === 'transferencia').reduce((acc, t) => acc + getValorFinal(t), 0);\n  const saldo = totalReceitas - totalDespesas;"
);

c = c.replace(
  /<tr style=\{\{ background: '#f8fafc' \}\}>\s*<td colSpan=\{4\} style=\{\{ padding: '12px 8px', textAlign: 'right', fontWeight: 700, color: '#475569' \}\}>TOTAL DESPESAS:<\/td>\s*<td style=\{\{ padding: '12px 8px', textAlign: 'right', fontWeight: 800, color: '#dc2626' \}\}>\{fmt\(totalDespesas\)\}<\/td>\s*<\/tr>/,
  `<tr style={{ background: '#f8fafc' }}>
                    <td colSpan={4} style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 700, color: '#475569' }}>TOTAL DESPESAS:</td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 800, color: '#dc2626' }}>{fmt(totalDespesas)}</td>
                  </tr>
                  {(filtros.tipo === 'transferencia' || totalTransferencias > 0) && (
                    <tr style={{ background: '#f8fafc' }}>
                      <td colSpan={4} style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 700, color: '#475569' }}>TOTAL TRANSFERÊNCIAS:</td>
                      <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 800, color: '#3b82f6' }}>{fmt(totalTransferencias)}</td>
                    </tr>
                  )}`
);

c = c.replace(
  /<td style=\{\{ padding: '12px 8px', color: '#475569' \}\}>\{t\.contaNome \|\| '-'\}<\/td>/g,
  "<td style={{ padding: '12px 8px', color: '#475569' }}>{t.tipo === 'transferencia' ? `${t.contaNome || '?'} → ${t.contaDestinãoNome || '?'}` : (t.contaNome || '-')}</td>"
);

c = c.replace(
  /<td style=\{\{ padding: '12px 8px', textAlign: 'right', fontWeight: 700, color: t\.tipo === 'receita' \? '#16a34a' : '#dc2626' \}\}>\s*\{t\.tipo === 'receita' \? '\+' : '-'\}\{fmt\(getValorFinal\(t\)\)\}\s*<\/td>/g,
  `<td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 700, color: t.tipo === 'receita' ? '#16a34a' : t.tipo === 'transferencia' ? '#3b82f6' : '#dc2626' }}>
                        {t.tipo === 'receita' ? '+' : t.tipo === 'transferencia' ? '' : '-'}{fmt(getValorFinal(t))}
                      </td>`
);

fs.writeFileSync('src/components/Relatorios.tsx', c);
console.log('Fixed Relatorios.tsx');
