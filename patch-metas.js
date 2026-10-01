const fs = require('fs');
let src = fs.readFileSync('src/components/MetasGamificadasV2.tsx', 'utf8');

// 1. Inserir a função clonarParaProximoMes após abrirEditarMeta
const clonarFn = `
  const clonarParaProximoMes = (meta: MetaFinanceira) => {
    try {
      const dataTerminoAtual = parseISO(meta.dataTermino);
      const dataInicioNovo = startOfMonth(addMonths(dataTerminoAtual, 1));
      const dataTerminoNovo = endOfMonth(dataInicioNovo);

      setEditingMeta({
        ...meta,
        id: '', // Força a criação de uma nova
        dataInicio: format(dataInicioNovo, 'yyyy-MM-dd'),
        dataTermino: format(dataTerminoNovo, 'yyyy-MM-dd'),
        status: 'ativa', // Reseta para ativa
      });
      const display = meta.valorAlvo > 0
        ? meta.valorAlvo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : '';
      setValorAlvoStr(display);
      setModalOpen(true);
    } catch(e) {
      console.error(e);
      alert('Erro ao clonar a meta');
    }
  };
`;

const anchor1 = `  const abrirEditarMeta = (meta: MetaFinanceira) => {`;
if (!src.includes('clonarParaProximoMes')) {
  src = src.replace(anchor1, clonarFn + '\n' + anchor1);
}

// 2. Inserir o botão "Recriar Próximo Mês" no painel destaque
const painelAnchor = `<button onClick={() => abrirEditarMeta(metaDestaque)} style={{
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff', borderRadius: 8, padding: '8px 14px',
              fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
            }}>
              <Edit2 size={14} /> Editar Meta
            </button>
          </div>`;

const newPainelBtn = `<div style={{ display: 'flex', gap: 8 }}>
              {metaDestaque.status === 'concluida' && (
                <button onClick={() => clonarParaProximoMes(metaDestaque)} style={{
                  background: 'rgba(52, 211, 153, 0.2)', border: '1px solid rgba(52, 211, 153, 0.4)',
                  color: '#34d399', borderRadius: 8, padding: '8px 14px',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
                }}>
                  <RefreshCw size={14} /> Recriar (Mês Seguinte)
                </button>
              )}
              <button onClick={() => abrirEditarMeta(metaDestaque)} style={{
                background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff', borderRadius: 8, padding: '8px 14px',
                fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
              }}>
                <Edit2 size={14} /> Editar Meta
              </button>
            </div>
          </div>`;

if (src.includes(painelAnchor)) {
  src = src.replace(painelAnchor, newPainelBtn);
}

// 3. Atualizar a listagem de Metas (Ativas e Histórico)
const regexTabs = /\{\/\* ── Seletor de Meta Destaque ── \*\/\}[\s\S]*?\{\/\* ── Painel Destaque ── \*\/\}/m;

const newTabsAnchor = `{/* ── Seletor de Meta Destaque ── */}
      {metas.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16, alignItems: 'center' }}>
          <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, marginRight: 4 }}>Ativas:</div>
          {metas.filter(m => m.status === 'ativa').map(m => (
            <button key={m.id} onClick={() => setMetaDestaqueId(m.id)} style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer',
              background: metaDestaqueId === m.id ? 'var(--primary)' : 'transparent',
              color: metaDestaqueId === m.id ? '#fff' : '#93c5fd',
              border: \`1px solid \${metaDestaqueId === m.id ? 'var(--primary)' : '#334155'}\`
            }}>
              {m.nome}
            </button>
          ))}
          {metas.filter(m => m.status === 'ativa').length === 0 && <span style={{ fontSize: 12, color: '#64748b' }}>Nenhuma meta ativa</span>}
          
          {metas.filter(m => m.status === 'concluida').length > 0 && (
            <>
              <div style={{ width: 1, height: 20, background: '#334155', margin: '0 8px' }} />
              <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, marginRight: 4 }}>Histórico:</div>
              {metas.filter(m => m.status === 'concluida').map(m => (
                <button key={m.id} onClick={() => setMetaDestaqueId(m.id)} style={{
                  padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  background: metaDestaqueId === m.id ? '#4b5563' : 'transparent',
                  color: metaDestaqueId === m.id ? '#fff' : '#94a3b8',
                  border: \`1px solid \${metaDestaqueId === m.id ? '#6b7280' : '#334155'}\`,
                  display: 'flex', alignItems: 'center', gap: 4
                }}>
                  <CheckCircle2 size={12} color="#fcd34d" />
                  {m.nome}
                </button>
              ))}
            </>
          )}
        </div>
      )}`;

src = src.replace(regexTabs, newTabsAnchor + '\n\n      {/* ── Painel Destaque ── */}');

fs.writeFileSync('src/components/MetasGamificadasV2.tsx', src);
console.log('Fixed');
