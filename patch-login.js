const fs = require('fs');

let content = fs.readFileSync('src/components/Login.tsx', 'utf8');

// 1. Add 'pin' to the modo state type
content = content.replace(
  "useState<'login' | 'cadastro' | 'recuperar'>('login');",
  "useState<'login' | 'cadastro' | 'recuperar' | 'pin'>('login');\n  const [pinDigitado, setPinDigitado] = useState('');"
);

// 2. In useEffect, detect if we should show PIN instead of Login
const useEffectFind = "if (typeof window !== 'undefined' && isBiometriaHabilitada()) {";
const useEffectReplace = `
    if (typeof window !== 'undefined') {
      const pinSalvo = localStorage.getItem('app_pin_code');
      const savedPass = localStorage.getItem('saved_password_apk');
      const savedEmail = localStorage.getItem('saved_email_apk');
      if (pinSalvo && savedPass && savedEmail) {
        setModo('pin');
      } else if (isBiometriaHabilitada()) {
        setTemBiometria(true);
        setTimeout(() => {
          handleBiometricLogin();
        }, 500);
      }
    }
`;
if (content.includes(useEffectFind)) {
  content = content.replace(
     "if (typeof window !== 'undefined' && isBiometriaHabilitada()) {\n        setTemBiometria(true);\n        // Tenta auto-acionar a biometria com pequenão delay para o navegador inicializar\n        setTimeout(() => {\n          handleBiometricLogin();\n        }, 500);\n     }",
     useEffectReplace
  );
}

// 3. Save password upon successful manual login
const onLoginFind = "if (!cred) {\n          throw lastErr || new Error(\"Falha na autenticação\");\n        }";
const onLoginReplace = `
        if (!cred) {
          throw lastErr || new Error("Falha na autenticação");
        }
        
        // Salva a senha ofuscada para que o PIN funcione mesmo se a sessão cair no WebView do APK
        if (typeof window !== 'undefined') {
           localStorage.setItem('saved_email_apk', usedEmail);
           localStorage.setItem('saved_password_apk', btoa(senha));
        }
`;
if (content.includes(onLoginFind)) {
  content = content.replace(onLoginFind, onLoginReplace);
}

// 4. Handle PIN unlock logic
const pinUnlockFn = `
  const handlePinUnlock = async (digito: string) => {
    if (modo !== 'pin') return;
    const novoPin = pinDigitado + digito;
    setPinDigitado(novoPin);
    
    if (novoPin.length === 4) {
      setLoading(true);
      setErro('');
      const pinSalvo = localStorage.getItem('app_pin_code');
      if (novoPin === pinSalvo) {
         try {
            const savedEmail = localStorage.getItem('saved_email_apk');
            const savedPass = localStorage.getItem('saved_password_apk');
            if (!savedEmail || !savedPass) throw new Error("Credenciais não encontradas");
            
            const auth = getFirebaseAuth();
            const cred = await signInWithEmailAndPassword(auth, savedEmail, atob(savedPass));
            
            // Depois do login no firebase auth, o app redireciona/carrega normal.
            // Para não bugar, simulamos o handleSubmit aqui apenas forçando o recarregamento,
            // OU apenas deixamos a página renderizar usando o reload (mais seguro).
            window.location.reload();
         } catch(e) {
            setErro('Erro ao restaurar a sessão.');
            setPinDigitado('');
            setLoading(false);
         }
      } else {
         setErro('PIN incorreto!');
         setPinDigitado('');
         setLoading(false);
      }
    }
  };

  const handlePinApagar = () => {
    setPinDigitado(prev => prev.slice(0, -1));
  };
`;
content = content.replace("const handleBiometricLogin = async () => {", pinUnlockFn + "\n  const handleBiometricLogin = async () => {");


// 5. Render PIN UI if modo === 'pin'
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
               onClick={() => setModo('login')} 
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

  // ===================== REQUIRE PASSWORD CHANGE =====================
`;

content = content.replace("  // ===================== REQUIRE PASSWORD CHANGE =====================", renderPin);

fs.writeFileSync('src/components/Login.tsx', content, 'utf8');
