const fs = require('fs');

let c = fs.readFileSync('src/components/MetasGamificadasV2.tsx', 'utf8');

const hookCode = `
  const [metaAtingidaShow, setMetaAtingidaShow] = useState<any>(null);

  useEffect(() => {
    if (metas.length === 0 || transacoes.length === 0) return;
    try {
      const celebradas = JSON.parse(localStorage.getItem('metas_celebradas') || '[]');
      let found = false;
      for (const m of metas) {
        if (m.status === 'ativa' && !celebradas.includes(m.id)) {
          const calc = calcularMeta(m);
          if (calc && calc.pct >= 100) {
            setMetaAtingidaShow({ ...m, realizado: calc.realizado });
            celebradas.push(m.id);
            localStorage.setItem('metas_celebradas', JSON.stringify(celebradas));
            found = true;
            break;
          }
        }
      }
      if (found) {
        setTimeout(() => setMetaAtingidaShow(null), 8000);
      }
    } catch {}
  }, [metas, transacoes, calcularMeta]);

  // ── Handlers ────────────────────────────────────────────────────────────────`;

c = c.replace('  // ── Handlers ────────────────────────────────────────────────────────────────', hookCode);

const balloonCode = `  return (
    <div style={{ padding: '20px 24px 120px 24px' }}>
      {metaAtingidaShow && (
        <>
          <style>{\`
            @keyframes floatBalloon {
              0% { transform: translateY(150px) scale(0.5); opacity: 0; }
              10% { transform: translateY(0px) scale(1.1); opacity: 1; }
              15% { transform: translateY(0px) scale(1); opacity: 1; }
              85% { transform: translateY(0px) scale(1); opacity: 1; }
              100% { transform: translateY(-300px) scale(0.8); opacity: 0; }
            }
          \`}</style>
          <div style={{
            position: 'fixed',
            bottom: 40,
            right: 40,
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: '#fff',
            padding: '24px 32px',
            borderRadius: '24px',
            boxShadow: '0 15px 35px rgba(16, 185, 129, 0.4)',
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            animation: 'floatBalloon 8s ease-in-out forwards',
            pointerEvents: 'none',
            border: '2px solid rgba(255,255,255,0.2)'
          }}>
            <div style={{ fontSize: 50, marginBottom: 8, filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.2))' }}>🎈🎉</div>
            <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Parabéns!</div>
            <div style={{ fontSize: 15, fontWeight: 600, opacity: 0.9, textAlign: 'center', maxWidth: 220 }}>
              Você atingiu a meta:<br/><strong>{metaAtingidaShow.nome}</strong>
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, marginTop: 12, background: 'rgba(0,0,0,0.2)', padding: '6px 16px', borderRadius: 12 }}>
              {metaAtingidaShow.realizado ? metaAtingidaShow.realizado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ 0,00'}
            </div>
          </div>
        </>
      )}
      {/* ── Header ── */}`;

c = c.replace("  return (\n    <div style={{ padding: '20px 24px 120px 24px' }}>\n      {/* ── Header ── */}", balloonCode);

fs.writeFileSync('src/components/MetasGamificadasV2.tsx', c);
console.log('Patched balloon 2');
