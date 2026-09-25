const fs = require('fs');

function fixDashboard() {
  let content = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

  // Replace header
  content = content.replace(
    "<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>",
    "<div className=\"flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4\">"
  );
  content = content.replace(
    "<div style={{ display: 'flex', gap: 12, fontSize: 11, fontWeight: 700 }}>",
    "<div className=\"flex flex-wrap gap-3 text-[11px] font-bold\">"
  );

  // Define the old row block to be replaced
  const oldRowRegex = /<div\s+key=\{t\.id \|\| idx\}[\s\S]*?onMouseLeave=\{\(e\) => e\.currentTarget\.style\.background = 'rgba\(255,255,255,0\.05\)'\}\s*>[\s\S]*?<\/div>\s*\);\s*\}\)/;

  const newRow = `<div 
                    key={t.id || idx}
                    onClick={() => onEditarLancamento && onEditarLancamento(t)}
                    className="flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4 bg-white/5 hover:bg-white/10 p-3 md:p-4 rounded-lg cursor-pointer border border-white/10 transition-colors relative"
                  >
                    {/* Top Row on Mobile, Left Column on Desktop */}
                    <div className="flex items-center gap-3 w-full md:w-[196px] shrink-0 justify-between md:justify-start">
                      <div className="flex items-center gap-3">
                        <span style={{ background: badge.bg, color: badge.text, padding: '4px 8px', borderRadius: 12, fontSize: 10, fontWeight: 800, textAlign: 'center', width: 80 }}>
                          {t._alertStatus}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: isPagar ? '#ef4444' : '#10b981', fontSize: 12, fontWeight: 600, width: 100 }}>
                          {isPagar ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                          {isPagar ? 'Pagar' : 'Receber'}
                        </span>
                      </div>
                      
                      {/* Show value on top right in mobile only */}
                      <div className="md:hidden">
                        <span style={{ background: isPagar ? '#ef4444' : '#10b981', color: 'white', padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 800 }}>
                          <span className="valor-sensivel">{formatarMoeda(Math.abs(t.valor))}</span>
                        </span>
                      </div>
                    </div>

                    {/* Middle Column on Desktop, Second Row on Mobile */}
                    <div className="flex-1 min-w-0 flex flex-col md:flex-row md:items-center justify-between gap-1 md:gap-2 w-full">
                       <div style={{ color: 'white', fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                        {t.descricao} <span style={{ color: '#94a3b8', fontSize: 12, fontWeight: 400 }}>• {t.clienteNome || t.fornecedorNome || t.categoriaNome || ''}</span>
                       </div>
                       <span style={{ color: '#94a3b8', fontSize: 12, width: 'auto', md: {width: 140}, textAlign: 'left' }} className="md:text-center shrink-0">
                        Vence: {format(new Date((t.dataVencimento || t.data) + 'T12:00:00'), 'dd/MM/yyyy')}
                       </span>
                    </div>

                    {/* Right Column on Desktop (Value) - Hidden on Mobile */}
                    <div className="hidden md:flex shrink-0 w-[120px] justify-center">
                      <span style={{ background: isPagar ? '#ef4444' : '#10b981', color: 'white', padding: '6px 12px', borderRadius: 20, fontSize: 13, fontWeight: 800 }}>
                        <span className="valor-sensivel">{formatarMoeda(Math.abs(t.valor))}</span>
                      </span>
                    </div>
                  </div>
                );
              })`;

  content = content.replace(oldRowRegex, newRow);
  fs.writeFileSync('src/components/Dashboard.tsx', content, 'utf8');
}

fixDashboard();
console.log('Fixed Dashboard UI');
