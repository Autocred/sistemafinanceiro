const fs = require('fs');
let c = fs.readFileSync('src/components/Login.tsx', 'utf8');

const anchor = 'if (requirePasswordChange) {';

const renderPin = `
  if (modo === 'pin') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative" style={{ backgroundColor: cfg.corFundo || '#f1f5f9' }}>
        <div className="max-w-md w-full bg-white rounded-xl shadow-2xl p-8 relative z-10 flex flex-col items-center">
           <Unlock size={48} color={cfg.corPrimaria || '#2563eb'} style={{ marginBottom: 16 }} />
           <h2 className="text-2xl font-bold text-center mb-2" style={{ color: cfg.corPrimaria || '#2563eb' }}>
             Digite seu PIN
           </h2>
           <p className="text-gray-500 text-center mb-8 text-sm">
             Sua sessão expirou, mas você pode usar seu PIN rápido para entrar.
           </p>

           <div className="flex gap-4 mb-8 justify-center">
             {[0, 1, 2, 3].map(i => (
               <div key={i} className="w-4 h-4 rounded-full border-2 transition-all duration-200"
                    style={{
                      borderColor: cfg.corPrimaria || '#2563eb',
                      backgroundColor: pinDigitado.length > i ? (cfg.corPrimaria || '#2563eb') : 'transparent'
                    }}
               />
             ))}
           </div>

           {erro && <div className="text-red-500 text-sm font-semibold mb-4 text-center">{erro}</div>}
           {loading && <div className="text-gray-500 text-sm font-semibold mb-4 text-center">Desbloqueando conta...</div>}

           <div className="grid grid-cols-3 gap-4 w-full max-w-[280px] mx-auto">
             {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
               <button
                 key={n}
                 onClick={() => handlePinUnlock(n.toString())}
                 disabled={loading}
                 className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-semibold shadow-sm mx-auto active:scale-95 transition-transform"
                 style={{ backgroundColor: '#f8fafc', color: cfg.corPrimaria || '#2563eb', border: '1px solid #e2e8f0' }}
               >
                 {n}
               </button>
             ))}
             <div className="w-16 h-16"></div>
             <button
               onClick={() => handlePinUnlock('0')}
               disabled={loading}
               className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-semibold shadow-sm mx-auto active:scale-95 transition-transform"
               style={{ backgroundColor: '#f8fafc', color: cfg.corPrimaria || '#2563eb', border: '1px solid #e2e8f0' }}
             >
               0
             </button>
             <button
               onClick={handlePinApagar}
               disabled={loading}
               className="w-16 h-16 rounded-full flex items-center justify-center text-sm font-bold shadow-sm mx-auto active:scale-95 transition-transform bg-red-50 text-red-500 border border-red-100"
             >
               APAGAR
             </button>
           </div>
           
           <div className="mt-8 pt-4 border-t w-full text-center">
             <button 
               onClick={() => { setModo('login'); setPinDigitado(''); }} 
               className="text-sm font-semibold hover:underline"
               style={{ color: cfg.corSecundaria || '#475569' }}
             >
               Acessar com E-mail e Senha
             </button>
           </div>
        </div>
      </div>
    );
  }

`;

if (c.includes(anchor) && !c.includes("if (modo === 'pin') {")) {
  c = c.replace(anchor, renderPin + anchor);
  fs.writeFileSync('src/components/Login.tsx', c, 'utf8');
  console.log('Patch UI injected successfully!');
} else {
  console.log('Anchor missing or already patched!');
}
