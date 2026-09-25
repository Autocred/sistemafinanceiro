import { useState, useEffect } from 'react';
import { Lock, Unlock, UserPlus, Mail, AlertCircle, ShieldAlert, Key, Phone, Building, CreditCard, ArrowLeft } from 'lucide-react';
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
      if (pinSalvo && savedPass && savedEmail) {
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

  if (perfilStatus) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20, background: 'var(--bg-primary)'
      }}>
        <div className="glass" style={{ maxWidth: 440, width: '100%', padding: 40, textAlign: 'center' }}>
          {perfilStatus.status === 'pendente' && (
            <>
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'color-mix(in srgb, var(--primary) 10%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: 'var(--primary)' }}>
                <AlertCircle size={40} />
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12 }}>Aguardando Aprovação</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>
                Sua conta foi criada com sucesso, mas precisa ser aprovada por um administrador antes que você possa acessar o sistema financeiro.
              </p>
            </>
          )}
          
          {perfilStatus.status === 'recusado' && (
            <>
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: '#ef4444' }}>
                <ShieldAlert size={40} />
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12 }}>Acesso Negado</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>
                Infelizmente o seu cadastro não foi aprovado pelo administrador. Você não possui acesso a este sistema.
              </p>
            </>
          )}

          {perfilStatus.status === 'desativado' && (
            <>
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: '#ef4444' }}>
                <ShieldAlert size={40} />
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12 }}>Conta Desativada</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>
                Sua conta foi desativada pelo administrador.
              </p>
            </>
          )}

          <button onClick={async () => {
             try { await getFirebaseAuth().signOut(); } catch(e){} 
             setPerfilStatus(null); 
             setModo('login'); 
          }} className="btn-secondary">
            Voltar para o Login
          </button>
        </div>
      </div>
    );
  }

  if (requirePasswordChange) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20, background: 'var(--bg-primary)'
      }}>
        <div className="glass" style={{ maxWidth: 440, width: '100%', padding: 40, textAlign: 'center' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', color: '#ef4444' }}>
            <Key size={40} />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12 }}>Segurança Exigida</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>
            Por motivos de segurança, você precisa alterar a sua senha inicial gerada pelo sistema antes de acessar o painel.
          </p>

          <form onSubmit={handleTrocarSenhaObrigatoria} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ textAlign: 'left' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Nova Senha</label>
              <div style={{ position: 'relative' }}>
                <Key size={18} color="var(--text-muted)" style={{ position: 'absolute', left: 16, top: 15 }} />
                <input
                  type="password"
                  className="input-field"
                  style={{ paddingLeft: 46 }}
                  placeholder="Mínimo 8 caracteres"
                  value={novaSenhaReset}
                  onChange={(e) => setNovaSenhaReset(e.target.value)}
                  required
                />
              </div>
            </div>
            <div style={{ textAlign: 'left' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Confirmar Nova Senha</label>
              <div style={{ position: 'relative' }}>
                <Key size={18} color="var(--text-muted)" style={{ position: 'absolute', left: 16, top: 15 }} />
                <input
                  type="password"
                  className="input-field"
                  style={{ paddingLeft: 46 }}
                  placeholder="Repita a senha"
                  value={confirmarNovaSenhaReset}
                  onChange={(e) => setConfirmarNovaSenhaReset(e.target.value)}
                  required
                />
              </div>
            </div>

            {erro && <div className="error-message">{erro}</div>}
            {sucesso && <div className="success-message">{sucesso}</div>}

            <button type="submit" disabled={loading} className="btn-primary" style={{ marginTop: 8 }}>
              {loading ? 'Salvando...' : 'Salvar e Acessar'}
            </button>
            <button type="button" onClick={async () => {
               try { await getFirebaseAuth().signOut(); } catch(e){} 
               setRequirePasswordChange(false);
               setTempProfile(null);
               setModo('login');
            }} className="btn-secondary">
              Cancelar e Sair
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, background: 'var(--bg-primary)',
      backgroundImage: 'none'
    }}>
      <div className="glass" style={{ maxWidth: 400, width: '100%', padding: 40, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'color-mix(in srgb, var(--primary) 10%, transparent)',
            border: '2px solid color-mix(in srgb, var(--primary) 30%, transparent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 0 25px color-mix(in srgb, var(--primary) 25%, transparent)'
          }}>
                      {(() => {
            const cachedLogo = typeof window !== 'undefined' ? localStorage.getItem('cached_foto_perfil') : null;
            const finalLogo = configuracoes?.fotoPerfil || cachedLogo || "/icon.png?v=10";
            return <img src={finalLogo} alt="Logo" style={{ width: 56, height: 56, borderRadius: 12, objectFit: 'contain' }} />
          })()}
          </div>

          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
            {configuracoes.nomeSistema || 'Sistema Financeiro Pessoal'}
          </h1>
          
          <p style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <span>🕒 Último Acesso: {new Date().toLocaleDateString('pt-BR')} às {new Date().getHours().toString().padStart(2, '0')}:{new Date().getMinutes().toString().padStart(2, '0')}</span>
          </p>

          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 24 }}>
            {modo === 'login' ? 'Informe o Usuário e Senha fornecidos pelo administrador.' : modo === 'recuperar' ? 'Digite seu e-mail de recuperação cadastrado.' : 'Crie sua conta para solicitar acesso.'}
          </p>

          {modo === 'login' && temBiometria && (
            <div style={{ marginBottom: 24 }}>
               <button
                  type="button"
                  onClick={handleBiometricLogin}
                  disabled={loading}
                  style={{
                     width: '100%',
                     display: 'flex',
                     alignItems: 'center',
                     justifyContent: 'center',
                     gap: 10,
                     padding: '16px',
                     borderRadius: 14,
                     background: 'var(--primary)',
                     color: 'white',
                     fontWeight: 700,
                     fontSize: 16,
                     border: 'none',
                     cursor: 'pointer',
                     boxShadow: '0 8px 25px rgba(59, 130, 246, 0.4)',
                     transition: 'transform 0.2s, box-shadow 0.2s'
                  }}
                  className="hover:scale-[1.02] active:scale-95"
               >
                  <Fingerprint size={24} />
                  Acessar com Biometria
               </button>
               
               <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', gap: 12 }}>
                  <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Ou use sua senha</span>
                  <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
               </div>
            </div>
          )}

          <form onSubmit={handleAuth}>
            {modo === 'cadastro' && (
              <>
                <div style={{ marginBottom: 16, textAlign: 'left' }}>
                  <input
                    type="text" value={nome} onChange={e => { setNome(e.target.value); setErro(''); }}
                    placeholder="Nome completo" className="input-field" style={{ fontSize: 15 }} required
                  />
                </div>
                <div style={{ marginBottom: 16, textAlign: 'left' }}>
                  <input
                    type="text" value={cpf} onChange={e => { setCpf(e.target.value); setErro(''); }}
                    placeholder="CPF (Opcional)" className="input-field" style={{ fontSize: 15 }}
                  />
                </div>
                <div style={{ marginBottom: 16, textAlign: 'left' }}>
                  <input
                    type="text" value={telefone} onChange={e => { setTelefone(e.target.value); setErro(''); }}
                    placeholder="Telefone" className="input-field" style={{ fontSize: 15 }} required
                  />
                </div>
                <div style={{ marginBottom: 16, textAlign: 'left' }}>
                  <input
                    type="text" value={empresa} onChange={e => { setEmpresa(e.target.value); setErro(''); }}
                    placeholder="Empresa (Opcional)" className="input-field" style={{ fontSize: 15 }}
                  />
                </div>
              </>
            )}
            
            <div style={{ marginBottom: 16, textAlign: 'left' }}>
              <input
                type="text" value={email} onChange={e => { setEmail(e.target.value); setErro(''); }}
                placeholder={modo === 'recuperar' ? 'E-mail para recuperação' : 'Usuário (Login)'} className="input-field" style={{ fontSize: 15 }} required autoCapitalize="none" autoComplete="username"
              />
            </div>
            
            
            {modo !== 'recuperar' && (
              <div style={{ marginBottom: 24, textAlign: 'left' }}>
                <input
                  type="password" value={senha} onChange={e => { setSenha(e.target.value); setErro(''); }}
                  placeholder="Sua senha secreta" className="input-field" style={{ fontSize: 15 }} required minLength={modo === 'cadastro' ? 8 : 6}
                />
                
                {modo === 'cadastro' && senha.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: 'flex', gap: 4, height: 4, marginBottom: 4 }}>
                       {[1,2,3,4,5].map(i => (
                         <div key={i} style={{ flex: 1, background: forca >= i ? coresForca[forca] : 'var(--border)', borderRadius: 2 }} />
                       ))}
                    </div>
                    <span style={{ fontSize: 11, color: coresForca[forca] }}>{textosForca[forca]}</span>
                  </div>
                )}
                
                {modo === 'cadastro' && (
                  <input
                    type="password" value={confirmarSenha} onChange={e => { setConfirmarSenha(e.target.value); setErro(''); }}
                    placeholder="Confirmar Senha" className="input-field" style={{ fontSize: 15, marginTop: 16 }} required minLength={8}
                  />
                )}

                {modo === 'login' && (
                   <div style={{ textAlign: 'right', marginTop: 8 }}>
                     <button type="button" onClick={() => { setModo('recuperar'); setErro(''); setSucesso(''); }} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 13, cursor: 'pointer' }}>Esqueci minha senha</button>
                   </div>
                )}
              </div>
            )}
            
            {erro && <p style={{ color: '#ef4444', fontSize: 13, marginTop: -12, marginBottom: 16, textAlign: 'center' }}>{erro}</p>}
            {sucesso && <p style={{ color: '#22c55e', fontSize: 13, marginTop: -12, marginBottom: 16, textAlign: 'center' }}>{sucesso}</p>}

            <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 15 }} disabled={loading || !email || (modo !== 'recuperar' && !senha)}>
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Unlock size={18} /> Aguarde...</span>
              ) : (
                modo === 'login' ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Lock size={18} /> Entrar</span>
                ) : modo === 'recuperar' ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Mail size={18} /> Recuperar Senha</span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><UserPlus size={18} /> Criar Conta</span>
                )
              )}
            </button>
          </form>

          <div style={{ marginTop: 24 }}>
            {modo === 'recuperar' ? (
               <button type="button" onClick={() => { setModo('login'); setErro(''); setSucesso(''); }} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, margin: '0 auto' }}><ArrowLeft size={16} /> Voltar para Login</button>
            ) : (
              <button 
                type="button"
                onClick={() => { setModo(modo === 'login' ? 'cadastro' : 'login'); setErro(''); setSucesso(''); }} 
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                {modo === 'login' ? 'Não possui conta? Cadastre-se' : 'Já possui conta? Faça login'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
