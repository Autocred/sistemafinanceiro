const fs = require('fs');

function patchLockScreen() {
  let content = fs.readFileSync('src/components/LockScreen.tsx', 'utf8');

  // Add the logic for PIN
  if (!content.includes('const pinSalvo = typeof window')) {
    content = content.replace(
      'const [erro, setErro] = useState(\'\');',
      `const [erro, setErro] = useState('');
  const [pinMode, setPinMode] = useState(false);
  const [pinDigits, setPinDigits] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const pinSalvo = localStorage.getItem('app_pin_code');
      if (pinSalvo) setPinMode(true);
    }
  }, []);

  useEffect(() => {
    if (pinDigits.length === 4) {
      const pinSalvo = localStorage.getItem('app_pin_code');
      if (pinDigits === pinSalvo) {
        playSound('sucesso');
        onDesbloquear(''); // bypass com pin
      } else {
        playSound('erro');
        setErro('PIN incorreto.');
        setPinDigits('');
      }
    }
  }, [pinDigits]);`
    );
  }

  // Handle PIN input render
  const pinRender = `
        {pinMode ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              {[0, 1, 2, 3].map(i => (
                <div key={i} style={{ width: 16, height: 16, borderRadius: '50%', background: pinDigits.length > i ? 'var(--primary)' : 'rgba(255,255,255,0.1)', transition: 'all 0.2s' }} />
              ))}
            </div>
            {erro && <p style={{ fontSize: 12, color: 'var(--primary)', marginTop: 4 }}>{erro}</p>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 12 }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                <button
                  key={n}
                  onClick={() => { setErro(''); if(pinDigits.length < 4) setPinDigits(prev => prev + n) }}
                  style={{ width: 60, height: 60, borderRadius: 30, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 24, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  {n}
                </button>
              ))}
              <div />
              <button
                onClick={() => { setErro(''); if(pinDigits.length < 4) setPinDigits(prev => prev + '0') }}
                style={{ width: 60, height: 60, borderRadius: 30, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 24, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                0
              </button>
              <button
                onClick={() => { setErro(''); setPinDigits(prev => prev.slice(0, -1)) }}
                style={{ width: 60, height: 60, borderRadius: 30, background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                Limpar
              </button>
            </div>
            <button onClick={() => setPinMode(false)} style={{ background: 'transparent', border: 'none', color: '#3b82f6', fontSize: 13, cursor: 'pointer', marginTop: 12 }}>
              Usar Senha Completa
            </button>
          </div>
        ) : (
          <form onSubmit={handleUnlock} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <input
                type="password"
                className="input-field"
                value={senha}
                onChange={e => { setSenha(e.target.value); setErro(''); }}
                placeholder="Sua senha..."
                style={{ textAlign: 'center', fontSize: 14, height: 44, borderRadius: 12 }}
                autoFocus
              />
              {erro && <p style={{ fontSize: 12, color: 'var(--primary)', marginTop: 6 }}>{erro}</p>}
            </div>

            <button
              type="submit"
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', height: 44, fontSize: 14, borderRadius: 12 }}
            >
              <Unlock size={16} /> Desbloquear
            </button>
          </form>
        )}
  `;

  if (!content.includes('pinMode ?')) {
    content = content.replace(
      /<form onSubmit=\{handleUnlock\}[\s\S]*?<\/form>/,
      pinRender
    );
  }

  fs.writeFileSync('src/components/LockScreen.tsx', content, 'utf8');
}

patchLockScreen();
console.log('LockScreen patched');
