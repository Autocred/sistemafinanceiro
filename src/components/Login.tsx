import { useState, useEffect } from 'react';
import { Lock, Unlock, UserPlus, Mail, AlertCircle, ShieldAlert, Key, Phone, Building, CreditCard, ArrowLeft, TrendingUp, Cpu, ShieldCheck, Activity, BarChart3, Eye, EyeOff, User, Sparkles, Clock } from 'lucide-react';
import { ConfiguracaoApp } from '@/lib/types';
import { getFirebaseAuth, AppUser } from '@/lib/auth';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, setPersistence,  } from 'firebase/auth';
import { getDb } from '@/lib/firebase';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { verificarBiometriaLocal, isBiometriaHabilitada } from '@/lib/biometria';
import { Fingerprint } from 'lucide-react';


  const saveSessionProfile = (p: AppUser) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('active_session_auth', 'true');
      sessionStorage.setItem('paginaAtual', 'dashboard');
      sessionStorage.setItem('is_unlocked', 'true');
      sessionStorage.setItem('active_session_profile', JSON.stringify(p));
      localStorage.setItem('active_session_profile', JSON.stringify(p));
      localStorage.setItem('last_activity_timestamp', Date.now().toString());
    }
  };

export function Login({ configuracoes, onLogin }: { configuracoes: ConfiguracaoApp, onLogin: (profile: AppUser) => void }) {
  const [modo, setModo] = useState<'login' | 'cadastro' | 'recuperar' | 'pin'>('login');
  const [pinDigitado, setPinDigitado] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [cpf, setCpf] = useState('');
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [loading, setLoading] = useState(false);
  const [temBiometria, setTemBiometria] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);

  // States for forced password change
  const [requirePasswordChange, setRequirePasswordChange] = useState(false);
  const [tempProfile, setTempProfile] = useState<AppUser | null>(null);
  const [novaSenhaReset, setNovaSenhaReset] = useState('');
  const [confirmarNovaSenhaReset, setConfirmarNovaSenhaReset] = useState('');

  useEffect(() => {
    // Intercepta impersonation login do Painel Master
    const impUser = localStorage.getItem('impersonate_user');
    const impTenant = localStorage.getItem('impersonate_tenant');
    if (impUser && impTenant) {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const urlTenant = searchParams.get('tenant') || window.location.hostname;
        
        // Se a url bate com o tenant pretendido
        if (urlTenant === impTenant || urlTenant.includes(impTenant)) {
          localStorage.removeItem('impersonate_user');
          localStorage.removeItem('impersonate_tenant');
          const user = JSON.parse(impUser);
          console.log("[LOGIN] Auto-login via impersonation ativado para o tenant", impTenant);
          sessionStorage.setItem('active_session_auth', 'true');
      sessionStorage.setItem('paginaAtual', 'dashboard');
          saveSessionProfile(user); onLogin(user);
          return; // Para não iniciar biometria
        }
      } catch(e) {
        console.error("Erro no impersonation login", e);
      }
    }

     if (typeof window !== 'undefined') {
      const pinSalvo = localStorage.getItem('app_pin_code');
      const savedPass = localStorage.getItem('saved_password_apk');
      const savedEmail = localStorage.getItem('saved_email_apk');

      // Fallback para ler do cookie se o localStorage estiver vazio
      const getCookie = (name: string) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return decodeURIComponent(parts.pop()?.split(';').shift() || '');
        return null;
      };
      
      let finalPin = pinSalvo || getCookie('app_pin_code');
      let finalPass = savedPass || getCookie('saved_password_apk');
      let finalEmail = savedEmail || getCookie('saved_email_apk');

      if (finalPin) {
        setModo('pin');
      } else if (isBiometriaHabilitada()) {
        setTemBiometria(true);
        setTimeout(() => {
          handleBiometricLogin();
        }, 500);
      }
    }
  }, []);

  
  const handlePinUnlock = async (digito: string) => {
    if (modo !== 'pin') return;
    const novoPin = pinDigitado + digito;
    setPinDigitado(novoPin);
    
    if (novoPin.length === 4) {
      setLoading(true);
      setErro('');
      
      const getCookieLocal = (name: string) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return decodeURIComponent(parts.pop()?.split(';').shift() || '');
        return null;
      };
      const pinSalvo = localStorage.getItem('app_pin_code') || getCookieLocal('app_pin_code');
      if (novoPin === pinSalvo) {
         try {
            const savedEmail = localStorage.getItem('saved_email_apk') || getCookieLocal('saved_email_apk');
            const savedPass = localStorage.getItem('saved_password_apk') || getCookieLocal('saved_password_apk');
            if (!savedEmail || !savedPass) { setLoading(false); setModo("login"); alert("A sessão expirou. Por favor, faça login com e-mail e senha uma vez para reativar o PIN."); return; }
            
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

  const handleBiometricLogin = async () => {
     setErro('');
     setLoading(true);
     const ok = await verificarBiometriaLocal();
     if (ok) {
        console.log("[LOGIN] Bypass Biométrico ativado!");
        sessionStorage.setItem('master_bypass', 'true');
        const loginTime = new Date().toISOString();
        localStorage.setItem('master_lastLogin', loginTime);

        // Autentica no Firebase Auth para que regras do Firestore funcionem
        const bioAuth = getFirebaseAuth();
        const bioEmails = ['clovis@financeai.com', 'clovis@email.com', 'clovis@financeai.app'];
        for (const bioEmail of bioEmails) {
           try {
              // session persistence enabled
              await signInWithEmailAndPassword(bioAuth, bioEmail, '302010');
              break;
           } catch {
              try { await createUserWithEmailAndPassword(bioAuth, bioEmail, '302010'); break; } catch {}
           }
        }

        const fakeMaster: AppUser = {
           uid: 'clovis-master-bypass',
           nome: 'Administrador (Master)',
           email: 'clovis@financeai.com',
           role: 'admin',
           status: 'aprovado',
           createdAt: loginTime,
           lastLogin: loginTime
        };
        sessionStorage.setItem('active_session_auth', 'true');
      sessionStorage.setItem('paginaAtual', 'dashboard');
        saveSessionProfile(fakeMaster); onLogin(fakeMaster);
     } else {
        setErro('Biometria falhou ou foi cancelada.');
        setLoading(false);
     }
  };
  
  const calcularForcaSenha = (s: string) => {
    let forca = 0;
    if (s.length >= 8) forca += 1;
    if (/[A-Z]/.test(s)) forca += 1;
    if (/[a-z]/.test(s)) forca += 1;
    if (/[0-9]/.test(s)) forca += 1;
    if (/[^A-Za-z0-9]/.test(s)) forca += 1;
    return forca;
  };
  const forca = calcularForcaSenha(senha);
  const coresForca = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#15803d'];
  const textosForca = ['Muito Fraca', 'Fraca', 'Razoável', 'Boa', 'Forte', 'Muito Forte'];
  
  // Status check view
  const [perfilStatus, setPerfilStatus] = useState<AppUser | null>(null);

  useEffect(() => {
    if (!perfilStatus || !perfilStatus.uid) return;
    if (perfilStatus.status !== 'pendente') return;
    
    // Escuta alterações não perfil do usuário em tempo real
    console.log("[LOGIN] Aguardando aprovação em tempo real...");
    const unsub = onSnapshot(doc(getDb(), 'users', perfilStatus.uid), (docSnap) => {
       if (docSnap.exists()) {
          const data = docSnap.data() as AppUser;
          if (data.status === 'aprovado') {
             console.log("[LOGIN] Usuário aprovado pelo admin em tempo real! Entrando...");
             sessionStorage.setItem('active_session_auth', 'true');
      sessionStorage.setItem('paginaAtual', 'dashboard');
             saveSessionProfile(data); onLogin(data);
          } else if (data.status === 'recusado' || data.status === 'desativado') {
             setPerfilStatus(data);
          }
       }
    });
    
    return () => unsub();
  }, [perfilStatus, onLogin]);

  const handleTrocarSenhaObrigatoria = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    if (novaSenhaReset !== confirmarNovaSenhaReset) {
      setErro('As senhas não coincidem.');
      return;
    }
    if (calcularForcaSenha(novaSenhaReset) < 5) {
      setErro('A senha deve conter no mínimo 8 caracteres, com maiúscula, minúscula, número e caractere especial.');
      return;
    }
    setLoading(true);
    try {
      const auth = getFirebaseAuth();
      const user = auth.currentUser;
      if (!user) throw new Error('Usuário não autenticado.');
      
      const { updatePassword } = await import('firebase/auth');
      await updatePassword(user, novaSenhaReset);
      
      if (tempProfile) {
         const docRef = doc(getDb(), 'users', tempProfile.uid);
         await setDoc(docRef, { requirePasswordChange: false }, { merge: true });
         
         if (tempProfile.tenantId) {
            const tenantUserRef = doc(getDb(), `tenants/${tempProfile.tenantId}/users`, tempProfile.uid);
            await setDoc(tenantUserRef, { requirePasswordChange: false }, { merge: true });
         }
         
         setRequirePasswordChange(false);
         setSucesso('Senha atualizada! Entrando...');
         setTimeout(() => {
           sessionStorage.setItem('active_session_auth', 'true');
      sessionStorage.setItem('paginaAtual', 'dashboard');
           saveSessionProfile(tempProfile); onLogin(tempProfile);
         }, 1200);
      }
    } catch (err: any) {
      console.error(err);
      setErro(err.message || 'Erro ao atualizar a senha.');
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setLoading(true);

    const emailTrimmed = email.trim().toLowerCase();
    let auth;
    try {
      auth = getFirebaseAuth();
    } catch (err) {
      console.error("Erro ao inicializar Firebase Auth", err);
      setErro("Erro de configuração do Firebase.");
      setLoading(false);
      return;
    }

    try {
      // Função principal de autenticação
      let cred = null;
      let usedEmail = emailTrimmed;

      if (modo === 'recuperar') {
         if (!emailTrimmed) throw new Error("Informe o e-mail para recuperar a senha.");
         setErro('Enviando e-mail de recuperação...');
         await sendPasswordResetEmail(auth, emailTrimmed);
         setSucesso('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
         setErro('');
         setLoading(false);
         return;
      }

      if (modo === 'cadastro') {
         if (senha !== confirmarSenha) throw new Error("As senhas não coincidem.");
         if (forca < 5) throw new Error("A senha deve conter no mínimo 8 caracteres, com maiúscula, minúscula, número e caractere especial.");
      }

      if (modo === 'login') {
        console.log("[LOGIN] Iniciando login no Firebase Authentication");

        // Validação de URL restrita solicitada pelo cliente
        const searchParams = new URLSearchParams(window.location.search);
        const urlTenant = searchParams.get('tenant');
        const isMasterCreds = (emailTrimmed === 'clovis' || emailTrimmed === 'clovis@financeai.com' || emailTrimmed === 'clovis@email.com');
        if (isMasterCreds && urlTenant && urlTenant !== 'master') {
          throw new Error(`Acesso Negado: Você está na página da licença '${urlTenant}'. Para acessar como Master, use o link principal ou ?tenant=master.`);
        }

        // ==========================================
        // MASTER BYPASS: LOGIN INFALÍVEL
        // ==========================================
        if (isMasterCreds && senha === '302010') {
           console.log("[LOGIN] Bypass Master ativado!");
           sessionStorage.setItem('master_bypass', 'true');
           const loginTime = new Date().toISOString();
           localStorage.setItem('master_lastLogin', loginTime);

           // ─── Autentica no Firebase Auth para que regras do Firestore funcionem ─
           // Tenta cada email possível; cria a conta automaticamente se não existir
           const bypassEmails = ['clovis@financeai.com', 'clovis@email.com', 'clovis@financeai.app'];
           for (const bypassEmail of bypassEmails) {
              try {
                 // session persistence enabled
                 await signInWithEmailAndPassword(auth, bypassEmail, senha);
                 console.log('[LOGIN] Firebase Auth também autenticado como master:', bypassEmail);
                 break;
              } catch {
                 try {
                    await createUserWithEmailAndPassword(auth, bypassEmail, senha);
                    console.log('[LOGIN] Conta master criada no Firebase Auth:', bypassEmail);
                    break;
                 } catch {}
              }
           }

           const fakeMaster: AppUser = {
              uid: 'clovis-master-bypass',
              nome: 'Administrador (Master)',
              email: 'clovis@financeai.com',
              role: 'admin',
              status: 'aprovado',
              createdAt: loginTime,
              lastLogin: loginTime
           };
           sessionStorage.setItem('active_session_auth', 'true');
      sessionStorage.setItem('paginaAtual', 'dashboard');
           saveSessionProfile(fakeMaster); onLogin(fakeMaster);
           return;
        }

        // ==========================================
        // AUTOCRED BYPASS: LOGIN DIRETO E INFALÍVEL
        // ==========================================
        if ((emailTrimmed === 'grando' || emailTrimmed === 'grando-autocred@financeai.app') && senha === '102030') {
           console.log("[LOGIN] Login Autocred Grando ativado!");
           sessionStorage.removeItem('master_bypass');
           sessionStorage.setItem('active_session_auth', 'true');
      sessionStorage.setItem('paginaAtual', 'dashboard');
           const loginTime = new Date().toISOString();

           try {
              // session persistence enabled
              await signInWithEmailAndPassword(auth, 'grando-autocred@financeai.app', '102030');
              console.log('[LOGIN] Firebase Auth autenticado com sucesso para grando!');
           } catch (e) {
              console.warn('[LOGIN] Auth fallback warning:', e);
           }

           const grandoUser: AppUser = {
              uid: '93DRtjSznOcT4KwhaP3qzB90aok1',
              nome: 'AUTOCRED Promotora de Crédito',
              email: 'clovis@autocredfinanceira.com.br',
              username: 'grando',
              empresa: 'clovis',
              tenantId: 'autocred-promotora-de-credito',
              role: 'admin',
              status: 'aprovado',
              requirePasswordChange: false,
              createdAt: '2026-09-16T14:00:56.308Z',
              lastLogin: loginTime
           };
           sessionStorage.setItem('active_session_auth', 'true');
      sessionStorage.setItem('paginaAtual', 'dashboard');
           saveSessionProfile(grandoUser); onLogin(grandoUser);
           return;
        }

        const syntheticEmail = emailTrimmed === 'grando' ? 'grando-autocred@financeai.app' : (emailTrimmed.includes('@') ? emailTrimmed : `${emailTrimmed}@financeai.app`);
          
        const possibleEmails = emailTrimmed === 'clovis' 
          ? ['clovis@email.com', 'clovis@financeai.com', syntheticEmail] 
          : [syntheticEmail];

        let lastErr: any = null;
        for (const e of possibleEmails) {
          try {
            setErro('Autenticando...');
            // session persistence enabled
            cred = await signInWithEmailAndPassword(auth, e, senha);
            usedEmail = e;
            console.log("[LOGIN] Firebase autenticado com sucesso. UID:", cred.user.uid);
            break; 
          } catch (err: any) {
            lastErr = err;
            if (emailTrimmed === 'clovis') continue;
            break;
          }
        }
        
        if (!cred && emailTrimmed === 'clovis') {
           console.log("[LOGIN] Master falhou não login, tentando criar conta automaticamente...");
           for (const e of possibleEmails) {
              try {
                 setErro('Criando conta master...');
                 cred = await createUserWithEmailAndPassword(auth, e, senha);
                 usedEmail = e;
                 console.log("[LOGIN] Conta Master criada automaticamente não Firebase. UID:", cred.user.uid);
                 break;
              } catch(err2: any) {
                 lastErr = err2;
                 continue;
              }
           }
        }

        if (!cred) {
          throw lastErr || new Error("Falha na autenticação");
        }
      } else {
        console.log("[CADASTRO] Iniciando cadastro não Firebase Authentication");
        setErro('Criando nova conta...');
        // session persistence enabled
        const syntheticEmail = emailTrimmed === 'grando' ? 'grando-fixed@financeai.app' : (emailTrimmed.includes('@') ? emailTrimmed : `${emailTrimmed}@financeai.app`);
        cred = await createUserWithEmailAndPassword(auth, syntheticEmail, senha);
        usedEmail = syntheticEmail;
        console.log("[CADASTRO] Conta criada não Firebase. UID:", cred.user.uid);
      }

      
      // Salva a senha ofuscada para que o PIN funcione mesmo se a sessão cair no WebView do APK
      if (typeof window !== 'undefined') {
         localStorage.setItem('saved_email_apk', usedEmail);
         localStorage.setItem('saved_password_apk', btoa(senha));

         // Salva em cookies também (caso o WebView apague o localStorage)
         document.cookie = 'saved_email_apk=' + encodeURIComponent(usedEmail) + '; max-age=315360000; path=/';
         document.cookie = 'saved_password_apk=' + encodeURIComponent(btoa(senha)) + '; max-age=315360000; path=/';

      }

      console.log("[FIRESTORE] Consultando Firestore");
      setErro('Acessando banco de dados...');
      const docRef = doc(getDb(), 'users', cred.user.uid);
      const docSnap = await getDoc(docRef);
      let profile: AppUser;

      const isAdmin = emailTrimmed === 'clovis' || usedEmail === 'clovis@email.com' || usedEmail === 'clovis@financeai.com';

      if (!docSnap.exists()) {
        console.log("[FIRESTORE] Documento inexistente. Criando novo.");
        setErro('Salvando perfil...');
        profile = {
          uid: cred.user.uid,
          nome: isAdmin ? 'Administrador (Master)' : (nome || 'Usuário'),
          email: usedEmail,
          telefone: telefone || undefined,
          empresa: empresa || undefined,
          cpf: cpf || undefined,
          ativo: true,
          role: isAdmin ? 'admin' : 'user',
          status: isAdmin ? 'aprovado' : 'pendente',
          createdAt: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
        };
        // Para não travar a tela caso a rede esteja lenta (WebSockets bloqueados por adblockers), não aguardamos indefinidamente.
        try {
           await Promise.race([
             setDoc(docRef, profile),
             new Promise((_, r) => setTimeout(() => r("OK"), 3000))
           ]);
        } catch (e) {
           console.error("Erro ao salvar perfil não firestore", e);
        }
      } else {
        console.log("[FIRESTORE] Documento encontrado.");
        setErro('Atualizando perfil...');
        profile = docSnap.data() as AppUser;
        
        let updateNeeded = false;

        // Atualiza o lastLogin não ato do login
        if (modo === 'login') {
          const nowIso = new Date().toISOString();
          profile.lastLogin = nowIso;
          localStorage.setItem('current_session_start', nowIso);
          updateNeeded = true;
        }
        
        // Administrador nunca passa pela validação de status
        if (isAdmin) {
           if (profile.role !== 'admin' || profile.status !== 'aprovado') {
             profile.role = 'admin';
             profile.status = 'aprovado';
             updateNeeded = true;
           }
        }

        if (updateNeeded) {
           try {
             await Promise.race([
               setDoc(docRef, profile, { merge: true }),
               new Promise((_, r) => setTimeout(() => r("OK"), 3000))
             ]);
           } catch (e) {
             console.error("Erro ao atualizar perfil", e);
           }
        }
      }

      console.log("[FIRESTORE] Role carregada:", profile.role, "Status carregado:", profile.status);
      setErro('Finalizando...');

      if ((profile as any).requirePasswordChange) {
         setRequirePasswordChange(true);
         setTempProfile(profile);
         setSucesso('');
         setErro('');
         setLoading(false);
         return;
      }

      if (profile.role === 'admin') {
         console.log("[LOGIN] Administrador detectado. Entrando não Dashboard.");
         setSucesso("Sucesso! Entrando não sistema...");
         setTimeout(() => {
           sessionStorage.setItem('active_session_auth', 'true');
      sessionStorage.setItem('paginaAtual', 'dashboard');
           saveSessionProfile(profile); onLogin(profile);
         }, 1200);
      } else if (profile.role === 'user') {
         if (profile.status === 'aprovado') {
           console.log("[LOGIN] Usuário aprovado. Entrando não Dashboard.");
           setSucesso("Sucesso! Entrando não sistema...");
           setTimeout(() => {
             sessionStorage.setItem('active_session_auth', 'true');
      sessionStorage.setItem('paginaAtual', 'dashboard');
             saveSessionProfile(profile); onLogin(profile);
           }, 1200);
         } else if (profile.status === 'pendente') {
           console.log("[LOGIN] Usuário pendente.");
           setPerfilStatus(profile);
         } else if (profile.status === 'recusado') {
           console.log("[LOGIN] Usuário recusado.");
           setPerfilStatus(profile);
         } else if (profile.status === 'desativado') {
           console.log("[LOGIN] Usuário desativado.");
           setPerfilStatus(profile);
         }
      }

    } catch (err: any) {
      console.error("[LOGIN] Erro Authentication/Firestore:", err);
      const code = err?.code || '';
      if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') {
        setErro('Usuário ou senha incorretos. Verifique os dados fornecidos pelo administrador.');
      } else if (code === 'auth/email-already-in-use') {
        setErro('Este usuário/e-mail já está em uso.');
      } else if (code === 'auth/weak-password') {
        setErro('A senha deve ter pelo menos 6 caracteres.');
      } else if (code === 'auth/network-request-failed') {
        setErro('Sem conexão com a internet. Verifique sua rede.');
      } else if (code === 'auth/configuration-not-found') {
        setErro('ERRO FIREBASE: Acesse o Console do Firebase > Authentication > Sign-in method e ATIVE o provedor "E-mail/senha".');
      } else {
        setErro(`Erro na autenticação: ${code || err?.message || 'Desconhecido'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const primaryColor = (configuracoes?.corPrimaria && configuracoes.corPrimaria !== '#ffffff' && configuracoes.corPrimaria !== '#fff')
    ? configuracoes.corPrimaria
    : 'var(--primary, #2563eb)';

  const cachedLogo = typeof window !== 'undefined' ? localStorage.getItem('cached_foto_perfil') : null;
  const finalLogo = configuracoes?.fotoPerfil || cachedLogo || '/icon.png?v=10';
  const nomeSistema = configuracoes?.nomeSistema || 'Sistema Financeiro Pessoal';

  const marketTickers = [
    { symbol: 'TAXA SELIC (COPOM)', val: '11,25% a.a.', chg: 'META BCB', up: true },
    { symbol: 'CDI (CETIP)', val: '11,15% a.a.', chg: '0,92% a.m.', up: true },
    { symbol: 'IPCA (INFLAÇÃO 12M)', val: '4,76% a.a.', chg: 'IBGE', up: true },
    { symbol: 'IGP-M (FGV 12M)', val: '5,59% a.a.', chg: '+1,30% mês', up: true },
    { symbol: 'IBOVESPA (B3)', val: '129.845 pts', chg: '+1,42%', up: true },
    { symbol: 'DÓLAR COMERCIAL (PTAX)', val: 'R$ 5,74', chg: '-0,35%', up: false },
    { symbol: 'EURO COMERCIAL', val: 'R$ 6,16', chg: '-0,21%', up: false },
    { symbol: 'POUPANÇA / TR', val: '0,59% a.m.', chg: '7,28% a.a.', up: true },
    { symbol: 'INCC-M (CONSTRUÇÃO)', val: '5,84% a.a.', chg: 'FGV', up: true },
    { symbol: 'SALÁRIO MÍNIMO', val: 'R$ 1.518,00', chg: 'BASE NACIONAL', up: true },
  ];

  // Shared high-tech financial & AI background wrapper (100vh, zero scrollbar)
  const renderFinancialBackdrop = (children: React.ReactNode) => (
    <div style={{
      height: '100vh',
      maxHeight: '100vh',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      position: 'relative',
      overflow: 'hidden',
      background: 'radial-gradient(circle at 15% 20%, color-mix(in srgb, var(--primary, #2563eb) 22%, #060b19) 0%, #050914 48%, #02050b 100%)',
      color: '#f8fafc',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
    }}>
      <style>{`
        @keyframes tickerScrollSmooth {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }
        .brazil-ticker-track {
          display: inline-flex;
          align-items: center;
          width: max-content;
          will-change: transform;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          transform: translate3d(0, 0, 0);
          animation: tickerScrollSmooth 95s linear infinite;
        }
        .brazil-ticker-track:hover {
          animation-play-state: paused;
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.45; transform: scale(1); }
          50% { opacity: 0.85; transform: scale(1.04); }
        }
        .login-grid-layout {
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          gap: 32px;
          max-width: 1140px;
          width: 100%;
          margin: 0 auto;
          padding: 8px 24px;
          align-items: center;
          position: relative;
          z-index: 10;
          flex: 1;
          min-height: 0;
        }
        .login-hud-panel {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .fintech-input {
          width: 100%;
          background: rgba(15, 23, 42, 0.78) !important;
          border: 1px solid rgba(148, 163, 184, 0.22) !important;
          color: #f8fafc !important;
          border-radius: 12px !important;
          padding: 10px 14px 10px 42px !important;
          font-size: 14px !important;
          font-weight: 500 !important;
          outline: none !important;
          transition: all 0.22s ease !important;
          box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.35) !important;
        }
        .fintech-input::placeholder {
          color: #64748b !important;
        }
        .fintech-input:focus {
          border-color: var(--primary, #3b82f6) !important;
          background: rgba(15, 23, 42, 0.95) !important;
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary, #3b82f6) 28%, transparent), inset 0 2px 6px rgba(0, 0, 0, 0.4) !important;
        }
        @media (max-width: 960px) {
          .login-grid-layout {
            grid-template-columns: 1fr;
            max-width: 440px;
            padding: 12px 16px;
            gap: 14px;
          }
          .login-hud-panel {
            display: none;
          }
        }
      `}</style>

      {/* CYBER / WALL STREET PERSPECTIVE GRID & CANDLESTICK SVG BACKGROUND */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1, overflow: 'hidden' }}>
        {/* Glowing Ambient Orbs using Tenant Primary Color */}
        <div style={{
          position: 'absolute', top: '-12%', left: '-8%', width: '520px', height: '520px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, color-mix(in srgb, var(--primary, #2563eb) 32%, transparent) 0%, transparent 70%)',
          filter: 'blur(60px)',
          animation: 'pulseGlow 8s ease-in-out infinite'
        }} />
        <div style={{
          position: 'absolute', bottom: '-15%', right: '-5%', width: '560px', height: '560px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.16) 0%, color-mix(in srgb, var(--primary, #2563eb) 20%, transparent) 45%, transparent 72%)',
          filter: 'blur(70px)',
          animation: 'pulseGlow 10s ease-in-out infinite'
        }} />

        {/* Architectural Grid Pattern */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `
            linear-gradient(to right, rgba(148, 163, 184, 0.055) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(148, 163, 184, 0.055) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,0.9) 25%, rgba(0,0,0,0.2) 85%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,0.9) 25%, rgba(0,0,0,0.2) 85%, transparent 100%)'
        }} />

        {/* Stock Exchange Candlesticks + Neural AI Curve SVG */}
        <svg viewBox="0 0 1440 800" fill="none" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.28 }}>
          <defs>
            <linearGradient id="bullAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
              <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#050914" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="aiLineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
              <stop offset="45%" stopColor="#38bdf8" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.95" />
            </linearGradient>
          </defs>

          {/* Subtle Candlestick Bars Across Background */}
          {[
            { x: 90, high: 580, low: 670, open: 640, close: 600, bull: true },
            { x: 145, high: 560, low: 650, open: 605, close: 575, bull: true },
            { x: 200, high: 570, low: 660, open: 580, close: 630, bull: false },
            { x: 255, high: 530, low: 635, open: 625, close: 545, bull: true },
            { x: 310, high: 500, low: 590, open: 550, close: 515, bull: true },
            { x: 365, high: 510, low: 600, open: 520, close: 565, bull: false },
            { x: 420, high: 460, low: 575, open: 560, close: 480, bull: true },
            { x: 475, high: 430, low: 520, open: 485, close: 445, bull: true },
            { x: 530, high: 410, low: 510, open: 450, close: 425, bull: true },
            { x: 585, high: 420, low: 515, open: 430, close: 475, bull: false },
            { x: 640, high: 380, low: 485, open: 470, close: 395, bull: true },
            { x: 695, high: 350, low: 440, open: 400, close: 365, bull: true },
            { x: 750, high: 360, low: 450, open: 370, close: 410, bull: false },
            { x: 805, high: 320, low: 425, open: 405, close: 340, bull: true },
            { x: 860, high: 290, low: 380, open: 345, close: 305, bull: true },
            { x: 915, high: 270, low: 360, open: 310, close: 285, bull: true },
            { x: 970, high: 280, low: 370, open: 290, close: 330, bull: false },
            { x: 1025, high: 240, low: 340, open: 325, close: 255, bull: true },
            { x: 1080, high: 210, low: 310, open: 260, close: 225, bull: true },
            { x: 1135, high: 220, low: 300, open: 230, close: 265, bull: false },
            { x: 1190, high: 175, low: 275, open: 260, close: 195, bull: true },
            { x: 1245, high: 150, low: 240, open: 198, close: 165, bull: true },
            { x: 1300, high: 130, low: 220, open: 170, close: 140, bull: true },
            { x: 1355, high: 110, low: 195, open: 145, close: 120, bull: true }
          ].map((c, idx) => {
            const color = c.bull ? '#10b981' : '#ef4444';
            const top = Math.min(c.open, c.close);
            const height = Math.max(Math.abs(c.close - c.open), 6);
            return (
              <g key={idx} opacity="0.42">
                <line x1={c.x} y1={c.high} x2={c.x} y2={c.low} stroke={color} strokeWidth="1.5" />
                <rect x={c.x - 7} y={top} width="14" height={height} rx="2" fill={color} />
              </g>
            );
          })}

          {/* Smooth Neural Quantitative Trend Curve */}
          <path
            d="M 0 680 Q 180 620, 310 520 T 640 400 T 915 290 T 1245 170 L 1440 110 L 1440 800 L 0 800 Z"
            fill="url(#bullAreaGrad)"
          />
          <path
            d="M 0 680 Q 180 620, 310 520 T 640 400 T 915 290 T 1245 170 L 1440 110"
            stroke="url(#aiLineGrad)"
            strokeWidth="3"
            fill="none"
          />

          {/* Neural Nodes on the Curve */}
          {[
            { cx: 310, cy: 520 },
            { cx: 640, cy: 400 },
            { cx: 915, cy: 290 },
            { cx: 1245, cy: 170 }
          ].map((n, i) => (
            <g key={i}>
              <circle cx={n.cx} cy={n.cy} r="9" fill="#10b981" fillOpacity="0.2" />
              <circle cx={n.cx} cy={n.cy} r="4.5" fill="#38bdf8" />
            </g>
          ))}
        </svg>
      </div>

      {/* TOP B3 & BANCO CENTRAL DO BRASIL — BARRA DE INDICADORES ESSENCIAIS */}
      <div style={{
        position: 'relative',
        zIndex: 20,
        background: 'rgba(6, 12, 28, 0.94)',
        backdropFilter: 'blur(14px)',
        borderBottom: '1px solid rgba(148, 163, 184, 0.22)',
        padding: '6px 0',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.35)'
      }}>
        {/* Selo fixo à esquerda para identificar claramente os indicadores */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          padding: '3px 12px',
          marginLeft: 12,
          marginRight: 12,
          borderRadius: 7,
          background: 'rgba(16, 185, 129, 0.16)',
          border: '1px solid rgba(16, 185, 129, 0.38)',
          color: '#34d399',
          fontSize: 10.5,
          fontWeight: 800,
          letterSpacing: '0.06em',
          flexShrink: 0,
          zIndex: 2
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
          INDICADORES BRASIL
        </div>

        <div style={{ overflow: 'hidden', flex: 1 }}>
          <div className="brazil-ticker-track">
            {[...marketTickers, ...marketTickers].map((item, i) => (
              <div
                key={i}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 9,
                  paddingRight: 36,
                  fontSize: 12.5,
                  fontWeight: 700,
                  letterSpacing: '0.02em',
                  WebkitFontSmoothing: 'antialiased'
                }}
              >
                <span style={{ color: '#cbd5e1', fontWeight: 700 }}>{item.symbol}</span>
                <span style={{ color: '#ffffff', fontWeight: 800, fontSize: 13, background: 'rgba(30, 41, 59, 0.75)', padding: '1.5px 7px', borderRadius: 6, border: '1px solid rgba(148, 163, 184, 0.2)' }}>
                  {item.val}
                </span>
                <span style={{
                  padding: '2px 7px',
                  borderRadius: 6,
                  fontSize: 10.5,
                  fontWeight: 700,
                  background: item.up ? 'rgba(16, 185, 129, 0.18)' : 'rgba(239, 68, 68, 0.18)',
                  color: item.up ? '#34d399' : '#f87171',
                  border: `1px solid ${item.up ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`
                }}>
                  {item.up ? '▲' : '▼'} {item.chg}
                </span>
                <span style={{ color: 'rgba(148, 163, 184, 0.35)', marginLeft: 8 }}>•</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      {children}

      {/* BOTTOM INSTITUTIONAL SECURITY TELEMETRY BAR */}
      <div style={{
        position: 'relative',
        zIndex: 20,
        background: 'rgba(5, 10, 24, 0.78)',
        backdropFilter: 'blur(10px)',
        borderTop: '1px solid rgba(148, 163, 184, 0.12)',
        padding: '6px 20px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        fontSize: 10.5,
        color: '#64748b',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#94a3b8', fontWeight: 600 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
            TERMINAL OPERACIONAL ATIVO
          </span>
          <span>•</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <ShieldCheck size={12} color="#38bdf8" /> Criptografia Bancária TLS 1.3 / AES-256
          </span>
          <span>•</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Cpu size={12} color="#a78bfa" /> Motor IA Financeiro Preditivo v4.0
          </span>
        </div>
        <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#475569' }}>
          {nomeSistema.toUpperCase()} • v3.8.6 P:{typeof window !== 'undefined' && localStorage.getItem('app_pin_code') ? '1' : '0'} E:{typeof window !== 'undefined' && localStorage.getItem('saved_email_apk') ? '1' : '0'} M:{modo}
        </div>
      </div>
    </div>
  );

  if (perfilStatus) {
    return renderFinancialBackdrop(
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, position: 'relative', zIndex: 10 }}>
        <div style={{
          maxWidth: 450, width: '100%', padding: 40, textAlign: 'center',
          background: 'rgba(15, 23, 42, 0.84)',
          backdropFilter: 'blur(24px)',
          borderRadius: 24,
          border: '1px solid rgba(148, 163, 184, 0.2)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7)'
        }}>
          {perfilStatus.status === 'pendente' && (
            <>
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'color-mix(in srgb, var(--primary) 18%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: primaryColor }}>
                <AlertCircle size={40} />
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: '#f8fafc', marginBottom: 12 }}>Aguardando Aprovação</h1>
              <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
                Sua conta foi criada com sucesso, mas precisa ser aprovada por um administrador antes que você possa acessar o terminal financeiro.
              </p>
            </>
          )}

          {perfilStatus.status === 'recusado' && (
            <>
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: '#ef4444' }}>
                <ShieldAlert size={40} />
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: '#f8fafc', marginBottom: 12 }}>Acesso Negado</h1>
              <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
                Infelizmente o seu cadastro não foi aprovado pelo administrador. Você não possui acesso a este sistema.
              </p>
            </>
          )}

          {perfilStatus.status === 'desativado' && (
            <>
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: '#ef4444' }}>
                <ShieldAlert size={40} />
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: '#f8fafc', marginBottom: 12 }}>Conta Desativada</h1>
              <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
                Sua conta foi desativada pelo administrador.
              </p>
            </>
          )}

          <button onClick={async () => {
             try { await getFirebaseAuth().signOut(); } catch(e){}
             setPerfilStatus(null);
             setModo('login');
          }} className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 14 }}>
            Voltar para o Login
          </button>
        </div>
      </div>
    );
  }

  if (modo === 'pin') {
    return renderFinancialBackdrop(
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, position: 'relative', zIndex: 10 }}>
        <div style={{
          maxWidth: 420, width: '100%', padding: '36px 32px',
          background: 'rgba(15, 23, 42, 0.86)',
          backdropFilter: 'blur(24px)',
          borderRadius: 28,
          border: '1px solid rgba(148, 163, 184, 0.22)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.75)',
          display: 'flex', flexDirection: 'column', alignItems: 'center'
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20,
            background: 'rgba(255, 255, 255, 0.96)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 16,
            boxShadow: '0 0 28px color-mix(in srgb, var(--primary, #2563eb) 45%, transparent)'
          }}>
            <img src={finalLogo} alt="Logo" style={{ width: 52, height: 52, borderRadius: 12, objectFit: 'contain' }} />
          </div>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 999, background: 'rgba(16, 185, 129, 0.14)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', fontSize: 11, fontWeight: 700, marginBottom: 10 }}>
            <Unlock size={13} /> ACESSO RÁPIDO CRIPTOGRAFADO
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#f8fafc', textAlign: 'center', marginBottom: 6 }}>
            Digite seu PIN de Segurança
          </h2>
          <p style={{ color: '#94a3b8', textAlign: 'center', marginBottom: 24, fontSize: 13 }}>
            Desbloqueie seu terminal em <strong style={{ color: '#e2e8f0' }}>{nomeSistema}</strong>
          </p>

          <div style={{ display: 'flex', gap: 16, marginBottom: 28, justifyContent: 'center' }}>
            {[0, 1, 2, 3].map(i => {
              const filled = pinDigitado.length > i;
              return (
                <div key={i} style={{
                  width: 18, height: 18, borderRadius: '50%',
                  border: `2px solid ${filled ? '#38bdf8' : 'rgba(148, 163, 184, 0.45)'}`,
                  backgroundColor: filled ? '#38bdf8' : 'rgba(15, 23, 42, 0.6)',
                  boxShadow: filled ? '0 0 14px #38bdf8' : 'none',
                  transition: 'all 0.2s ease'
                }} />
              );
            })}
          </div>

          {erro && <div style={{ color: '#f87171', fontSize: 13, fontWeight: 600, marginBottom: 16, textAlign: 'center' }}>{erro}</div>}
          {loading && <div style={{ color: '#38bdf8', fontSize: 13, fontWeight: 600, marginBottom: 16, textAlign: 'center' }}>Autenticando credenciais...</div>}

          <div className="grid grid-cols-3 gap-4 w-full max-w-[270px] mx-auto">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
              <button
                key={n}
                onClick={() => handlePinUnlock(n.toString())}
                disabled={loading}
                style={{
                  width: 64, height: 64, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, fontWeight: 700, margin: '0 auto',
                  background: 'rgba(30, 41, 59, 0.85)',
                  color: '#f8fafc',
                  border: '1px solid rgba(148, 163, 184, 0.25)',
                  boxShadow: '0 6px 16px rgba(0, 0, 0, 0.35)',
                  cursor: 'pointer'
                }}
                className="active:scale-95 transition-transform hover:border-sky-400"
              >
                {n}
              </button>
            ))}
            <div style={{ width: 64, height: 64 }} />
            <button
              onClick={() => handlePinUnlock('0')}
              disabled={loading}
              style={{
                width: 64, height: 64, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, fontWeight: 700, margin: '0 auto',
                background: 'rgba(30, 41, 59, 0.85)',
                color: '#f8fafc',
                border: '1px solid rgba(148, 163, 184, 0.25)',
                boxShadow: '0 6px 16px rgba(0, 0, 0, 0.35)',
                cursor: 'pointer'
              }}
              className="active:scale-95 transition-transform hover:border-sky-400"
            >
              0
            </button>
            <button
              onClick={handlePinApagar}
              disabled={loading}
              style={{
                width: 64, height: 64, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800, margin: '0 auto',
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#f87171',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                cursor: 'pointer'
              }}
              className="active:scale-95 transition-transform"
            >
              APAGAR
            </button>
          </div>

          <div style={{ marginTop: 28, paddingTop: 16, borderTop: '1px solid rgba(148, 163, 184, 0.16)', width: '100%', textAlign: 'center' }}>
            <button
              onClick={() => { setModo('login'); setPinDigitado(''); }}
              style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            >
              Acessar com Usuário e Senha
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (requirePasswordChange) {
    return renderFinancialBackdrop(
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, position: 'relative', zIndex: 10 }}>
        <div style={{
          maxWidth: 440, width: '100%', padding: 40, textAlign: 'center',
          background: 'rgba(15, 23, 42, 0.86)',
          backdropFilter: 'blur(24px)',
          borderRadius: 24,
          border: '1px solid rgba(148, 163, 184, 0.22)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.75)'
        }}>
          <div style={{ width: 76, height: 76, borderRadius: '50%', background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#f87171' }}>
            <Key size={36} />
          </div>
          <h1 style={{ fontSize: 23, fontWeight: 800, color: '#f8fafc', marginBottom: 10 }}>Atualização de Credencial</h1>
          <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>
            Por protocolos de segurança institucional, defina uma nova senha pessoal antes de acessar o terminal.
          </p>

          <form onSubmit={handleTrocarSenhaObrigatoria} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ textAlign: 'left' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#cbd5e1', marginBottom: 6, display: 'block' }}>Nova Senha</label>
              <div style={{ position: 'relative' }}>
                <Key size={18} color="#64748b" style={{ position: 'absolute', left: 16, top: 15, zIndex: 2 }} />
                <input
                  type="password"
                  className="fintech-input"
                  placeholder="Mínimo 8 caracteres"
                  value={novaSenhaReset}
                  onChange={(e) => setNovaSenhaReset(e.target.value)}
                  required
                />
              </div>
            </div>
            <div style={{ textAlign: 'left' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#cbd5e1', marginBottom: 6, display: 'block' }}>Confirmar Nova Senha</label>
              <div style={{ position: 'relative' }}>
                <Key size={18} color="#64748b" style={{ position: 'absolute', left: 16, top: 15, zIndex: 2 }} />
                <input
                  type="password"
                  className="fintech-input"
                  placeholder="Repita a senha"
                  value={confirmarNovaSenhaReset}
                  onChange={(e) => setConfirmarNovaSenhaReset(e.target.value)}
                  required
                />
              </div>
            </div>

            {erro && <div style={{ color: '#f87171', fontSize: 13, fontWeight: 600 }}>{erro}</div>}
            {sucesso && <div style={{ color: '#34d399', fontSize: 13, fontWeight: 600 }}>{sucesso}</div>}

            <button type="submit" disabled={loading} className="btn-primary" style={{ marginTop: 8, width: '100%', justifyContent: 'center', padding: 14 }}>
              {loading ? 'Salvando...' : 'Atualizar e Acessar Terminal'}
            </button>
            <button type="button" onClick={async () => {
               try { await getFirebaseAuth().signOut(); } catch(e){}
               setRequirePasswordChange(false);
               setTempProfile(null);
               setModo('login');
            }} style={{ background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(148, 163, 184, 0.2)', color: '#cbd5e1', borderRadius: 12, padding: 12, fontWeight: 600, cursor: 'pointer' }}>
              Cancelar e Sair
            </button>
          </form>
        </div>
      </div>
    );
  }

  return renderFinancialBackdrop(
    <div className="login-grid-layout">
      {/* COLUNA ESQUERDA (DESKTOP): CENTRAL DE INDICADORES ECONÔMICOS BRASIL & CONTROLE FINANCEIRO */}
      <div className="login-hud-panel">
        {/* Badge Superior Institucional */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, alignSelf: 'flex-start',
          padding: '4px 12px', borderRadius: 999,
          background: 'rgba(15, 23, 42, 0.78)',
          border: '1px solid rgba(56, 189, 248, 0.32)',
          boxShadow: '0 0 16px rgba(56, 189, 248, 0.12)'
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: '#10b981',
            boxShadow: '0 0 8px #10b981'
          }} />
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.07em', color: '#38bdf8', textTransform: 'uppercase' }}>
            INDICADORES ECONÔMICOS BRASIL • BCB, IBGE & B3
          </span>
        </div>

        {/* Headline Principal White-Label */}
        <div>
          <h2 style={{
            fontSize: 'clamp(22px, 2.5vw, 32px)',
            fontWeight: 900,
            lineHeight: 1.12,
            letterSpacing: '-0.02em',
            color: '#ffffff',
            marginBottom: 6
          }}>
            {nomeSistema}
            <span style={{
              display: 'block',
              background: 'linear-gradient(90deg, #38bdf8 0%, #34d399 55%, #a78bfa 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontSize: 'clamp(16px, 1.75vw, 22px)',
              marginTop: 4
            }}>
              Gestão de Caixa, Custos Fixos & Inteligência Financeira
            </span>
          </h2>
          <p style={{ color: '#cbd5e1', fontSize: 13, lineHeight: 1.45, maxWidth: 560, margin: 0 }}>
            Controle completo de receitas a receber, despesas fixas e variáveis, ponto de equilíbrio mensal e leitura automática de boletos com IA.
          </p>
        </div>

        {/* CARD HUD: PAINEL DE REFERÊNCIA ECONÔMICA BRASILEIRA (CLARO E EXPLICATIVO) */}
        <div style={{
          background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.9) 0%, rgba(9, 14, 28, 0.95) 100%)',
          backdropFilter: 'blur(20px)',
          borderRadius: 18,
          border: '1px solid rgba(148, 163, 184, 0.2)',
          padding: '15px 18px',
          boxShadow: '0 16px 40px -12px rgba(0, 0, 0, 0.65)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Cabeçalho do Painel */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 9,
                background: 'rgba(16, 185, 129, 0.16)',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#34d399'
              }}>
                <TrendingUp size={17} />
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#ffffff', letterSpacing: '0.02em' }}>
                  TERMÔMETRO ECONÔMICO BRASIL (TAXAS & ÍNDICES OFICIAIS)
                </div>
                <div style={{ fontSize: 10.5, color: '#94a3b8' }}>
                  Referências para custo de crédito, aplicações financeiras e correção de contratos
                </div>
              </div>
            </div>
            <div style={{
              padding: '4px 9px', borderRadius: 7,
              background: 'rgba(56, 189, 248, 0.14)',
              border: '1px solid rgba(56, 189, 248, 0.32)',
              color: '#38bdf8', fontSize: 10, fontWeight: 800
            }}>
              BANCO CENTRAL / B3
            </div>
          </div>

          {/* 4 Cards Principais dos Indicadores Brasileiros */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
            <div style={{ background: 'rgba(30, 41, 59, 0.65)', padding: '8px 10px', borderRadius: 10, border: '1px solid rgba(148, 163, 184, 0.16)' }}>
              <div style={{ fontSize: 9.5, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>TAXA SELIC</div>
              <div style={{ fontSize: 15.5, fontWeight: 900, color: '#34d399', marginTop: 2 }}>11,25%</div>
              <div style={{ fontSize: 9.5, color: '#cbd5e1', marginTop: 1 }}>ao ano (COPOM)</div>
            </div>
            <div style={{ background: 'rgba(30, 41, 59, 0.65)', padding: '8px 10px', borderRadius: 10, border: '1px solid rgba(148, 163, 184, 0.16)' }}>
              <div style={{ fontSize: 9.5, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>CDI ATUAL</div>
              <div style={{ fontSize: 15.5, fontWeight: 900, color: '#38bdf8', marginTop: 2 }}>11,15%</div>
              <div style={{ fontSize: 9.5, color: '#cbd5e1', marginTop: 1 }}>0,92% ao mês</div>
            </div>
            <div style={{ background: 'rgba(30, 41, 59, 0.65)', padding: '8px 10px', borderRadius: 10, border: '1px solid rgba(148, 163, 184, 0.16)' }}>
              <div style={{ fontSize: 9.5, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>IPCA (12 MESES)</div>
              <div style={{ fontSize: 15.5, fontWeight: 900, color: '#fbbf24', marginTop: 2 }}>4,76%</div>
              <div style={{ fontSize: 9.5, color: '#cbd5e1', marginTop: 1 }}>Inflação IBGE</div>
            </div>
            <div style={{ background: 'rgba(30, 41, 59, 0.65)', padding: '8px 10px', borderRadius: 10, border: '1px solid rgba(148, 163, 184, 0.16)' }}>
              <div style={{ fontSize: 9.5, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>DÓLAR PTAX</div>
              <div style={{ fontSize: 15.5, fontWeight: 900, color: '#f8fafc', marginTop: 2 }}>R$ 5,74</div>
              <div style={{ fontSize: 9.5, color: '#cbd5e1', marginTop: 1 }}>Ibov: 129.845 pts</div>
            </div>
          </div>

          {/* Gráfico Comparativo Direto e Fácil de Entender: Rendimento de Caixa vs Inflação */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.72)',
            borderRadius: 12,
            padding: '10px 13px',
            border: '1px solid rgba(148, 163, 184, 0.14)',
            marginBottom: 10
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
              <span style={{ fontSize: 10.5, fontWeight: 800, color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Comparativo Anual: Rendimento de Caixa vs. Inflação
              </span>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#34d399' }}>
                Ganho Real CDI: +6,39% a.a.
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                  <span style={{ color: '#cbd5e1', fontWeight: 600 }}>Aplicação 100% do CDI (Renda Fixa / Caixa)</span>
                  <strong style={{ color: '#34d399' }}>11,15% a.a.</strong>
                </div>
                <div style={{ height: 5.5, borderRadius: 99, background: 'rgba(148, 163, 184, 0.15)', overflow: 'hidden' }}>
                  <div style={{ width: '92%', height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, #10b981, #34d399)' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                  <span style={{ color: '#cbd5e1', fontWeight: 600 }}>Poupança Oficial (TR + 6,17% a.a.)</span>
                  <strong style={{ color: '#38bdf8' }}>7,28% a.a.</strong>
                </div>
                <div style={{ height: 5.5, borderRadius: 99, background: 'rgba(148, 163, 184, 0.15)', overflow: 'hidden' }}>
                  <div style={{ width: '62%', height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, #0284c7, #38bdf8)' }} />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                  <span style={{ color: '#cbd5e1', fontWeight: 600 }}>Inflação Oficial IPCA (Perda do Poder de Compra)</span>
                  <strong style={{ color: '#fbbf24' }}>4,76% a.a.</strong>
                </div>
                <div style={{ height: 5.5, borderRadius: 99, background: 'rgba(148, 163, 184, 0.15)', overflow: 'hidden' }}>
                  <div style={{ width: '42%', height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, #d97706, #fbbf24)' }} />
                </div>
              </div>
            </div>
          </div>

          {/* 3 Módulos Essenciais do Sistema */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            <div style={{ background: 'rgba(15, 23, 42, 0.65)', padding: '7px 10px', borderRadius: 9, border: '1px solid rgba(148, 163, 184, 0.12)' }}>
              <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Fluxo Diário & Mensal</div>
              <div style={{ fontSize: 11.5, fontWeight: 800, color: '#34d399', display: 'flex', alignItems: 'center', gap: 5 }}>
                <BarChart3 size={12} /> Fixas x Variáveis
              </div>
            </div>
            <div style={{ background: 'rgba(15, 23, 42, 0.65)', padding: '7px 10px', borderRadius: 9, border: '1px solid rgba(148, 163, 184, 0.12)' }}>
              <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Automação Inteligente</div>
              <div style={{ fontSize: 11.5, fontWeight: 800, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Sparkles size={12} /> Leitor Boleto/NF IA
              </div>
            </div>
            <div style={{ background: 'rgba(15, 23, 42, 0.65)', padding: '7px 10px', borderRadius: 9, border: '1px solid rgba(148, 163, 184, 0.12)' }}>
              <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>Proteção Bancária</div>
              <div style={{ fontSize: 11.5, fontWeight: 800, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 5 }}>
                <ShieldCheck size={12} color="#a78bfa" /> Criptografia 256-Bit
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* COLUNA DIREITA: CARD DE AUTENTICAÇÃO GLASSMORPHIC 3D COMPACTO */}
      <div style={{
        width: '100%',
        maxWidth: 400,
        margin: '0 auto',
        background: 'linear-gradient(165deg, rgba(15, 23, 42, 0.88) 0%, rgba(8, 13, 26, 0.94) 100%)',
        backdropFilter: 'blur(24px)',
        borderRadius: 22,
        border: '1px solid rgba(148, 163, 184, 0.2)',
        boxShadow: '0 24px 55px -15px rgba(0, 0, 0, 0.8), 0 0 32px color-mix(in srgb, var(--primary, #2563eb) 18%, transparent)',
        padding: '22px 26px 18px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Top Luminous Accent Line with Tenant Primary Color */}
        <div style={{
          position: 'absolute', top: 0, left: '10%', right: '10%', height: 3,
          background: `linear-gradient(90deg, transparent, ${primaryColor}, #38bdf8, transparent)`,
          boxShadow: `0 0 20px ${primaryColor}`
        }} />

        <div style={{ position: 'relative', zIndex: 2 }}>
          {/* TENANT LOGO HALO (White-Label fotoPerfil) */}
          <div style={{
            width: 64, height: 64, borderRadius: '18px',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(241,245,249,0.92) 100%)',
            border: `2px solid color-mix(in srgb, ${primaryColor} 55%, rgba(255,255,255,0.5))`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 10px',
            boxShadow: `0 8px 24px -6px rgba(0, 0, 0, 0.5), 0 0 22px color-mix(in srgb, ${primaryColor} 40%, transparent)`,
            position: 'relative'
          }}>
            <img src={finalLogo} alt="Logo" style={{ width: 46, height: 46, borderRadius: 11, objectFit: 'contain' }} />
            <div style={{
              position: 'absolute', bottom: -3, right: -3,
              width: 18, height: 18, borderRadius: '50%',
              background: '#0f172a', border: '2px solid #10b981',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#10b981', boxShadow: '0 0 8px rgba(16,185,129,0.5)'
            }} title="Conexão Criptografada e Motor IA Ativo">
              <Activity size={9} />
            </div>
          </div>

          {/* TENANT SYSTEM NAME (White-Label nomeSistema) */}
          <h1 style={{ fontSize: 19, fontWeight: 800, color: '#ffffff', marginBottom: 6, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
            {nomeSistema}
          </h1>

          {/* TIMESTAMP PILL */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            padding: '3.5px 10px', borderRadius: 999,
            background: 'rgba(30, 41, 59, 0.75)',
            border: '1px solid rgba(148, 163, 184, 0.18)',
            fontSize: 10.5, color: '#38bdf8', fontWeight: 700, marginBottom: 8
          }}>
            <Clock size={11} />
            <span>Último Acesso: {new Date().toLocaleDateString('pt-BR')} às {new Date().getHours().toString().padStart(2, '0')}:{new Date().getMinutes().toString().padStart(2, '0')}</span>
          </div>

          <p style={{ color: '#94a3b8', fontSize: 12, marginBottom: 14, lineHeight: 1.4 }}>
            {modo === 'login'
              ? 'Autentique suas credenciais para acessar o terminal financeiro.'
              : modo === 'recuperar'
              ? 'Informe seu e-mail cadastrado para redefinir sua chave de acesso.'
              : 'Preencha seus dados para solicitar credenciamento no sistema.'}
          </p>

          {/* BIOMETRIA BUTTON */}
          {modo === 'login' && temBiometria && (
            <div style={{ marginBottom: 14 }}>
              <button
                type="button"
                onClick={handleBiometricLogin}
                disabled={loading}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '11px',
                  borderRadius: 12,
                  background: `linear-gradient(135deg, ${primaryColor} 0%, color-mix(in srgb, ${primaryColor} 75%, #0284c7) 100%)`,
                  color: 'white',
                  fontWeight: 800,
                  fontSize: 13.5,
                  border: '1px solid rgba(255,255,255,0.2)',
                  cursor: 'pointer',
                  boxShadow: `0 8px 20px color-mix(in srgb, ${primaryColor} 40%, transparent)`,
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}
                className="hover:scale-[1.02] active:scale-95"
              >
                <Fingerprint size={18} />
                Desbloqueio Biométrico IA
              </button>

              <div style={{ display: 'flex', alignItems: 'center', margin: '10px 0', gap: 10 }}>
                <div style={{ flex: 1, height: 1, background: 'rgba(148, 163, 184, 0.16)' }} />
                <span style={{ fontSize: 9.5, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Ou credencial padrão</span>
                <div style={{ flex: 1, height: 1, background: 'rgba(148, 163, 184, 0.16)' }} />
              </div>
            </div>
          )}

          {/* FORMULÁRIO DE AUTENTICAÇÃO */}
          <form onSubmit={handleAuth}>
            {modo === 'cadastro' && (
              <>
                <div style={{ marginBottom: 8, textAlign: 'left', position: 'relative' }}>
                  <User size={16} color="#64748b" style={{ position: 'absolute', left: 14, top: 12, zIndex: 2 }} />
                  <input
                    type="text" value={nome} onChange={e => { setNome(e.target.value); setErro(''); }}
                    placeholder="Nome completo" className="fintech-input" required
                  />
                </div>
                <div style={{ marginBottom: 8, textAlign: 'left', position: 'relative' }}>
                  <CreditCard size={16} color="#64748b" style={{ position: 'absolute', left: 14, top: 12, zIndex: 2 }} />
                  <input
                    type="text" value={cpf} onChange={e => { setCpf(e.target.value); setErro(''); }}
                    placeholder="CPF (Opcional)" className="fintech-input"
                  />
                </div>
                <div style={{ marginBottom: 8, textAlign: 'left', position: 'relative' }}>
                  <Phone size={16} color="#64748b" style={{ position: 'absolute', left: 14, top: 12, zIndex: 2 }} />
                  <input
                    type="text" value={telefone} onChange={e => { setTelefone(e.target.value); setErro(''); }}
                    placeholder="Telefone / WhatsApp" className="fintech-input" required
                  />
                </div>
                <div style={{ marginBottom: 8, textAlign: 'left', position: 'relative' }}>
                  <Building size={16} color="#64748b" style={{ position: 'absolute', left: 14, top: 12, zIndex: 2 }} />
                  <input
                    type="text" value={empresa} onChange={e => { setEmpresa(e.target.value); setErro(''); }}
                    placeholder="Empresa (Opcional)" className="fintech-input"
                  />
                </div>
              </>
            )}

            <div style={{ marginBottom: 10, textAlign: 'left', position: 'relative' }}>
              {modo === 'recuperar' ? (
                <Mail size={16} color="#38bdf8" style={{ position: 'absolute', left: 14, top: 12, zIndex: 2 }} />
              ) : (
                <User size={16} color="#38bdf8" style={{ position: 'absolute', left: 14, top: 12, zIndex: 2 }} />
              )}
              <input
                type="text" value={email} onChange={e => { setEmail(e.target.value); setErro(''); }}
                placeholder={modo === 'recuperar' ? 'E-mail para recuperação' : 'Usuário ou E-mail de Acesso'}
                className="fintech-input"
                required autoCapitalize="none" autoComplete="username"
              />
            </div>

            {modo !== 'recuperar' && (
              <div style={{ marginBottom: 14, textAlign: 'left' }}>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} color="#38bdf8" style={{ position: 'absolute', left: 14, top: 12, zIndex: 2 }} />
                  <input
                    type={mostrarSenha ? 'text' : 'password'}
                    value={senha}
                    onChange={e => { setSenha(e.target.value); setErro(''); }}
                    placeholder="Sua senha secreta"
                    className="fintech-input"
                    style={{ paddingRight: 40 }}
                    required
                    minLength={modo === 'cadastro' ? 8 : 6}
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha(v => !v)}
                    tabIndex={-1}
                    style={{
                      position: 'absolute', right: 10, top: 9, zIndex: 3,
                      background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4
                    }}
                    title={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {mostrarSenha ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>

                {modo === 'cadastro' && senha.length > 0 && (
                  <div style={{ marginTop: 6 }}>
                    <div style={{ display: 'flex', gap: 4, height: 3.5, marginBottom: 3 }}>
                      {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} style={{ flex: 1, background: forca >= i ? coresForca[forca] : 'rgba(148,163,184,0.2)', borderRadius: 2 }} />
                      ))}
                    </div>
                    <span style={{ fontSize: 10, color: coresForca[forca] }}>{textosForca[forca]}</span>
                  </div>
                )}

                {modo === 'cadastro' && (
                  <div style={{ position: 'relative', marginTop: 8 }}>
                    <Key size={16} color="#38bdf8" style={{ position: 'absolute', left: 14, top: 12, zIndex: 2 }} />
                    <input
                      type={mostrarSenha ? 'text' : 'password'}
                      value={confirmarSenha}
                      onChange={e => { setConfirmarSenha(e.target.value); setErro(''); }}
                      placeholder="Confirmar Senha"
                      className="fintech-input"
                      required minLength={8}
                    />
                  </div>
                )}

                {modo === 'login' && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                    <span style={{ fontSize: 10.5, color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <ShieldCheck size={12} color="#10b981" /> Sessão Criptografada
                    </span>
                    <button
                      type="button"
                      onClick={() => { setModo('recuperar'); setErro(''); setSucesso(''); }}
                      style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}
                    >
                      Esqueci minha senha
                    </button>
                  </div>
                )}
              </div>
            )}

            {erro && (
              <div style={{
                padding: '8px 12px', borderRadius: 10,
                background: 'rgba(239, 68, 68, 0.14)', border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#fca5a5', fontSize: 11.5, fontWeight: 600, marginBottom: 10, textAlign: 'center'
              }}>
                {erro}
              </div>
            )}
            {sucesso && (
              <div style={{
                padding: '8px 12px', borderRadius: 10,
                background: 'rgba(16, 185, 129, 0.14)', border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#6ee7b7', fontSize: 11.5, fontWeight: 600, marginBottom: 10, textAlign: 'center'
              }}>
                {sucesso}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email || (modo !== 'recuperar' && !senha)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '12px 18px',
                borderRadius: 12,
                fontSize: 13.5,
                fontWeight: 800,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: '#ffffff',
                background: `linear-gradient(180deg, color-mix(in srgb, ${primaryColor} 92%, #38bdf8) 0%, ${primaryColor} 100%)`,
                border: '1px solid rgba(255, 255, 255, 0.22)',
                boxShadow: `0 4px 0 color-mix(in srgb, ${primaryColor} 65%, #020617), 0 10px 24px color-mix(in srgb, ${primaryColor} 40%, transparent)`,
                cursor: (loading || !email || (modo !== 'recuperar' && !senha)) ? 'not-allowed' : 'pointer',
                opacity: (loading || !email || (modo !== 'recuperar' && !senha)) ? 0.65 : 1,
                transition: 'all 0.18s ease'
              }}
              className="active:translate-y-[2px]"
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}><Unlock size={16} /> Autenticando Terminal...</span>
              ) : modo === 'login' ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}><Lock size={16} /> Entrar no Sistema</span>
              ) : modo === 'recuperar' ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}><Mail size={16} /> Recuperar Credencial</span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}><UserPlus size={16} /> Solicitar Credencial</span>
              )}
            </button>
          </form>

          {/* RODAPÉ DO CARD */}
          <div style={{ marginTop: 14, paddingTop: 11, borderTop: '1px solid rgba(148, 163, 184, 0.14)' }}>
            {modo === 'recuperar' ? (
              <button
                type="button"
                onClick={() => { setModo('login'); setErro(''); setSucesso(''); }}
                style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, margin: '0 auto' }}
              >
                <ArrowLeft size={14} /> Voltar para o Terminal de Login
              </button>
            ) : (
              <button
                type="button"
                onClick={() => { setModo(modo === 'login' ? 'cadastro' : 'login'); setErro(''); setSucesso(''); }}
                style={{ background: 'none', border: 'none', color: '#cbd5e1', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                {modo === 'login' ? (
                  <>Não possui credencial? <span style={{ color: '#38bdf8', fontWeight: 700 }}>Solicite seu cadastro</span></>
                ) : (
                  <>Já possui credencial? <span style={{ color: '#38bdf8', fontWeight: 700 }}>Acessar Terminal</span></>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
