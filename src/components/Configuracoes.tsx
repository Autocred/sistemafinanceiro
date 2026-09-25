'use client';

import { useState, useEffect, useCallback } from 'react';
import { getConfiguracoes, salvarConfiguracoes } from '@/lib/storage';
import { getFirebaseAuth } from '@/lib/auth';
import { ConfiguracaoApp } from '@/lib/types';
import { getUserProfile, AppUser } from '@/lib/auth';
import { Settings, User, Building, Palette, Shield, Database, Save, Activity, Upload, Download, RotateCcw, AlertTriangle, Fingerprint, Check, Eye, EyeOff, Key, Bell, MessageCircle, LogOut, Zap, Trash2, Info, History, Undo2 } from 'lucide-react';
import { getDb } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { updatePassword } from 'firebase/auth';
import { registrarBiometriaLocal, desabilitarBiometria, isBiometriaHabilitada } from '@/lib/biometria';

import { playSound, isAudioEnabled, getAudioVolume, setAudioConfig } from '@/lib/audio';
import { fazerBackup, restaurarBackup, desfazerRestauracao, listarBackups, listarLogsBackup, restaurarBackupDeJSON } from '@/lib/backup';
import { BackupApp, LogBackup } from '@/lib/types';

export default function Configuracoes() {

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const handleEnableWebPush = async () => {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        alert('Seu navegador nao suporta notificações Push.');
        return;
      }
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        alert('Permissão de notificação negada! Verifique as configurações do navegador e do celular.');
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const pubKey = 'BNIPGpo2FSX_novxEx4lSAJa397ugkht4aYZBFacXeiorCbWQa0VDBa2rBzYgqaNe1BtQd_n-mT2Gu302TpN6Z0';
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(pubKey)
      });
      setCfg(c => ({ ...c, webPushSubscription: JSON.stringify(sub) }));
      alert('notificações ativadas com sucesso neste dispositivo! O sistema tentará entregar os pop-ups nativos quando o app estiver fechado. Lembre-se de clicar no botão Salvar Configurações no topo!');
    } catch (e) {
      console.error(e);
      alert('Erro ao ativar notificações: ' + e);
    }
  };

  const [audioAtivo, setAudioAtivo] = useState(true);
  const [audioVolume, setAudioVolume] = useState(0.3);
  const [cfg, setCfg] = useState<ConfiguracaoApp>({
    nomeUsuario: '',
    moeda: 'BRL',
    provedorIA: 'offline',
    notificacoesAtivas: true,
    backupAutomatico: true,
    tema: 'dark' as 'dark',
  });
  const [abaAtiva, setAbaAtiva] = useState<'perfil' | 'aparencia' | 'sons' | 'ia' | 'seguranca'>('perfil');
  const [mostrarKey, setMostrarKey] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [novaSenha, setNovaSenha] = useState('');
  const [erroSenha, setErroSenha] = useState('');
  const [novoCargo, setNovoCargo] = useState('');
  
  const [biometriaAtiva, setBiometriaAtiva] = useState<boolean>(false);
  const [pinAtivo, setPinAtivo] = useState<boolean>(false);
  const [biometriaLoading, setBiometriaLoading] = useState(false);
  const [versaoUi, setVersaoUi] = useState<string>('v2');
  
  // Backup Module States
  const [backupsList, setBackupsList] = useState<BackupApp[]>([]);
  const [logsList, setLogsList] = useState<LogBackup[]>([]);
  const [backupLoading, setBackupLoading] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [showOldBackups, setShowOldBackups] = useState(false);
  
  const isMasterOrAdmin = profile?.role === 'admin' || (typeof window !== 'undefined' && (() => { try { return (() => { try { return sessionStorage.getItem('master_bypass'); } catch(e) { return null; } })(); } catch(e) { return null; } })() === 'true');
  
  const TELAS_DISPONIVEIS = ['dashboard', 'lancamentos', 'relatorios', 'contas', 'cadastros', 'chat', 'configuracoes', 'admin'];
  const NOMES_TELAS: Record<string, string> = {
    dashboard: 'Dashboard', lancamentos: 'Lançamentos', relatorios: 'Relatórios',
    contas: 'Contas & Cartões', cadastros: 'Cadastros', chat: 'IA Analista',
    configuracoes: 'Configurações', admin: 'Administração'
  };

  useEffect(() => {
    (async () => {
      const auth = getFirebaseAuth();
      const isAdminFirebase = auth.currentUser && auth.currentUser.email && (auth.currentUser.email === 'clovis@financeai.com' || auth.currentUser.email === 'clovis@email.com' || auth.currentUser.email === 'clovis');
    const isBypassAtivo = (typeof window !== 'undefined' && (() => { try { return (() => { try { return sessionStorage.getItem('master_bypass'); } catch(e) { return null; } })(); } catch(e) { return null; } })() === 'true') || isAdminFirebase;
      const uid = isBypassAtivo ? 'clovis-master-bypass' : (auth.currentUser?.uid || 'app');
      const configDB = await getConfiguracoes(uid);
      setCfg(configDB);
      setBiometriaAtiva(isBiometriaHabilitada());
      setPinAtivo(!!localStorage.getItem('app_pin_code'));
      
      if (!isBypassAtivo && auth.currentUser) {
         const p = await getUserProfile(auth.currentUser.uid);
         setProfile(p);
      }
      
      setAudioAtivo(isAudioEnabled());
      setAudioVolume(getAudioVolume());
      
      // Load backups
      try {
        const bs = await listarBackups();
        const ls = await listarLogsBackup();
        setBackupsList(bs);
        setLogsList(ls);
      } catch (e) {
        console.error('Erro ao carregar backups:', e);
      }
      setVersaoUi(localStorage.getItem('versao_ui') || 'v2');
      setLoading(false);
    })();
  }, []);

//   // Aplicação Dinâmica de Cores Local (Feedback Imediato)
//   useEffect(() => {
//     if (typeof window === 'undefined') return;
//     if (cfg?.corPrimaria) {
//       document.documentElement.style.setProperty('--primary', cfg.corPrimaria);
//       document.documentElement.style.setProperty('--primary-hover', cfg.corPrimaria);
//       let meta = document.querySelector('meta[name="theme-color"]');
//       if (!meta) {
//         meta = document.createElement('meta');
//         meta.setAttribute('name', 'theme-color');
//         document.head.appendChild(meta);
//       }
//       meta.setAttribute('content', cfg.corPrimaria);
//     }
//     if (cfg?.corSecundaria) {
//       document.documentElement.style.setProperty('--primary-dark', cfg.corSecundaria);
//     }
//     if (cfg?.corAcento) {
//       document.documentElement.style.setProperty('--blue', cfg.corAcento);
//     }
//     if (cfg?.corFundo) {
//       document.documentElement.style.setProperty('--bg-primary', cfg.corFundo);
//       document.documentElement.style.setProperty('--bg-secondary', cfg.corFundo);
//       document.documentElement.style.setProperty('--bg-card', cfg.corFundo);
//     }
//   }, [cfg?.corPrimaria, cfg?.corSecundaria, cfg?.corAcento, cfg?.corFundo]);

  const salvar = async (overrideCfg?: ConfiguracaoApp) => {
    const auth = getFirebaseAuth();
    const isAdminFirebase = auth.currentUser && auth.currentUser.email && (auth.currentUser.email === 'clovis@financeai.com' || auth.currentUser.email === 'clovis@email.com' || auth.currentUser.email === 'clovis');
    const isBypassAtivo = (typeof window !== 'undefined' && (() => { try { return (() => { try { return sessionStorage.getItem('master_bypass'); } catch(e) { return null; } })(); } catch(e) { return null; } })() === 'true') || isAdminFirebase;
    const uid = isBypassAtivo ? 'clovis-master-bypass' : (auth.currentUser?.uid || 'app');
    const finalCfg = overrideCfg || cfg;
    try {
      const cleanCfg = JSON.parse(JSON.stringify(finalCfg));
      if (cleanCfg.corPrimaria) localStorage.setItem('saved_primary_color', cleanCfg.corPrimaria);
      if (cleanCfg.corSecundaria) localStorage.setItem('saved_secondary_color', cleanCfg.corSecundaria);
      if (cleanCfg.corAcento) localStorage.setItem('saved_accent_color', cleanCfg.corAcento);
      await salvarConfiguracoes(cleanCfg, uid);

    
    if (profile && !isBypassAtivo) {
       if (profile.tenantId) {
          await setDoc(doc(getDb(), `tenants/${profile.tenantId}/users`, profile.uid), profile, { merge: true });
       }
       await setDoc(doc(getDb(), 'users', profile.uid), profile, { merge: true });
    }
    
    if (novaSenha && !isBypassAtivo && auth.currentUser) {
       try {
          await updatePassword(auth.currentUser, novaSenha);
          setNovaSenha('');
          setErroSenha('');
       } catch (err: any) {
          console.error(err);
          setErroSenha('Erro ao atualizar senha. Talvez seja necessário deslogar e logar novamente.');
       }
    }
    
    setSalvo(true);
    
    const targetTheme = cfg.tema || 'dark';
    document.documentElement.setAttribute('data-theme', targetTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme_preference', targetTheme);
    }
    
    setTimeout(() => {
      setSalvo(false);
    }, 2000);
  } catch (e: any) {
      console.error(e);
      alert('ERRO AO SALVAR: ' + e.message);
    }
};
  
  const handleFazerBackup = async () => {
    if (backupLoading) return;
    setBackupLoading(true);
    try {
      const b = await fazerBackup('manual');
      setBackupsList(prev => [b, ...prev]);
      const ls = await listarLogsBackup();
      setLogsList(ls);
      alert('Backup manual realizado com sucesso!');
    } catch (e) {
      console.error(e);
      alert('Erro ao realizar backup');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestaurar = async (id: string) => {
    if (!confirm('Tem certeza? Isso fará um backup atual por segurança, e depois sobrescreverá todos os seus dados atuais com os do backup selecionado. A página será recarregada.')) return;
    setBackupLoading(true);
    try {
      await restaurarBackup(id);
      window.location.reload();
    } catch (e) {
      console.error(e);
      alert('Erro ao restaurar. Tente novamente.');
      setBackupLoading(false);
    }
  };

  const handleDownloadBackup = (backup: BackupApp) => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(backup.dados);
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `backup_financeai_${backup.dataHora.replace(/[:.]/g, '-')}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    } catch(e) {
      alert('Erro ao baixar o backup.');
    }
  };

  const handleUploadBackup = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const contents = ev.target?.result as string;
          const parsedData = JSON.parse(contents);
          
          if (!confirm('Tem certeza? Isso fará um backup atual por segurança, e depois sobrescreverá todos os seus dados atuais com os do arquivo selecionado. A página será recarregada.')) return;
          
          setBackupLoading(true);
          await restaurarBackupDeJSON(parsedData);
          alert('Backup restaurado com sucesso a partir do arquivo.');
          window.location.reload();
        } catch (err: any) {
          alert('Erro ao processar o arquivo de backup: Arquivo inválido ou corrompido.');
          setBackupLoading(false);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleDesfazerRestauracao = async () => {
    if (!confirm('Deseja realmente desfazer a íºltima restauração e voltar ao estado original?')) return;
    setBackupLoading(true);
    try {
      await desfazerRestauracao();
      alert('Restauração desfeita com sucesso! A página será recarregada.');
      window.location.reload();
    } catch (e: any) {
      console.error(e);
      alert('Erro: ' + e.message);
      setBackupLoading(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Carregando...</div>;
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', paddingBottom: 60, animation: 'fadeIn 0.5s ease-out' }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .config-card { transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); }
        .config-card:hover { transform: translateY(-2px); border-color: rgba(204,0,0,0.2); box-shadow: 0 12px 40px rgba(0,0,0,0.15); }
        .apple-toggle { transition: background-color 0.3s cubic-bezier(0.4, 0.0, 0.2, 1); }
        .apple-toggle-knaob { transition: transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1), box-shadow 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
      `}</style>
      <div style={{ marginBottom: 36, textAlign: 'center' }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.8px', marginBottom: 8 }}>Ajustes do Sistema</h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Configure suas preferências, IA e parâmetros globais</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Seletor de Versão de Interface (Rollback) */}
        <div style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(56,189,248,0.1) 100%)', borderRadius: 16, padding: 24, border: '1px solid rgba(139,92,246,0.3)', display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeIn 0.6s ease-out' }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>Versão da Interface</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Você pode alternar entre a versão Clássica e a nova versão Ultra Premium livremente. Serve como um "desfazer" da atualização visual. Nenhuma transação será perdida.</p>
          </div>
          <div className="grid-responsive-2" style={{ gap: 12 }}>
            <button 
              onClick={() => { localStorage.setItem('versao_ui', 'v1'); window.location.reload(); }}
              style={{ padding: '16px', borderRadius: 12, border: versaoUi === 'v1' ? '2px solid #8b5cf6' : '1px solid var(--border)', background: versaoUi === 'v1' ? 'rgba(139,92,246,0.1)' : 'var(--bg-secondary)', color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 4 }}
            >
              <span style={{ fontSize: 14 }}>Versão 2.0 Ultra Premium ✨</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>Tabelas padrão, sem efeitos 3D ou vidro.</span>
            </button>
            <button 
              onClick={() => { localStorage.setItem('versao_ui', 'v2'); window.location.reload(); }}
              style={{ padding: '16px', borderRadius: 12, border: versaoUi === 'v2' ? '2px solid #0ea5e9' : '1px solid var(--border)', background: versaoUi === 'v2' ? 'rgba(14,165,233,0.15)' : 'var(--bg-secondary)', color: 'var(--text-primary)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 4 }}
            >
              <span style={{ fontSize: 14 }}>Versão 2.0 Ultra Premium ✨</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>Novo design Bento Box, Física elástica, Fundo Aurora e Timeline.</span>
            </button>
          </div>
        </div>

        {/* Perfil */}
        
        {/* TABS MENU */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingBottom: 12, marginBottom: 20, borderBottom: '1px solid var(--border)', scrollbarWidth: 'none' }}>
          {[
            { id: 'perfil', label: 'Perfil & Conta', icon: <User size={16} /> },
            { id: 'aparencia', label: 'Aparência & Design', icon: <Palette size={16} /> },
            { id: 'sons', label: 'notificações & Sons', icon: <Bell size={16} /> },
            { id: 'ia', label: 'Inteligência Artificial', icon: <Zap size={16} /> },
            { id: 'seguranca', label: 'Segurança & Backups', icon: <Shield size={16} /> }
          ].map(aba => (
            <button
              key={aba.id}
              onClick={() => setAbaAtiva(aba.id as any)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: '10px',
                border: 'none', background: abaAtiva === aba.id ? 'var(--blue)' : 'var(--bg-secondary)',
                color: abaAtiva === aba.id ? 'white' : 'var(--text-secondary)',
                fontWeight: 600, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s'
              }}
            >
              {aba.icon} {aba.label}
            </button>
          ))}
        </div>

        {abaAtiva === 'perfil' && (
        <SecaoConfig titulo="Meu Perfil" icone={<User size={18} color="var(--blue)" />}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>Seu Nome</label>
            <input
              className="input-field"
              value={profile?.nome || cfg.nomeUsuario || ''}
              onChange={e => {
                 setCfg(c => ({ ...c, nomeUsuario: e.target.value }));
                 if (profile) setProfile({ ...profile, nome: e.target.value });
              }}
              placeholder="Como quer ser chamado?"
            />
          </div>
          <div className="grid-responsive-2">
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>Telefone</label>
              <input
                className="input-field"
                value={profile?.telefone || ''}
                onChange={e => profile && setProfile({ ...profile, telefone: e.target.value })}
                placeholder="Seu telefone"
                disabled={!profile}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>Empresa</label>
              <input
                className="input-field"
                value={profile?.empresa || ''}
                onChange={e => profile && setProfile({ ...profile, empresa: e.target.value })}
                placeholder="Sua empresa"
                disabled={!profile}
              />
            </div>
          </div>
          
          <div style={{ background: 'var(--bg-glass)', borderRadius: 10, padding: 16, border: '1px solid var(--border)' }}>
             <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Informações da Conta (Somente Leitura)</p>
             <div className="grid-responsive-3">
               <div>
                 <label style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>UID</label>
                 <div style={{ fontSize: 13, background: 'var(--bg-primary)', padding: '8px 12px', borderRadius: 6, color: 'var(--text-secondary)', fontFamily: 'monaospace', wordBreak: 'break-all' }}>{profile?.uid || 'N/A'}</div>
               </div>
               <div>
                 <label style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Permissão (Role)</label>
                 <div style={{ fontSize: 13, background: 'var(--bg-primary)', padding: '8px 12px', borderRadius: 6, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{profile?.role || 'N/A'}</div>
               </div>
               <div>
                 <label style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Status</label>
                 <div style={{ fontSize: 13, background: 'var(--bg-primary)', padding: '8px 12px', borderRadius: 6, color: profile?.status === 'aprovado' ? '#10b981' : '#f59e0b', textTransform: 'capitalize', fontWeight: 600 }}>{profile?.status || 'N/A'}</div>
               </div>
             </div>
          </div>

          <div>
             <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>Alterar Senha de Acesso</label>
             <input
               className="input-field"
               type="password"
               value={novaSenha}
               onChange={e => { setNovaSenha(e.target.value); setErroSenha(''); }}
               placeholder="Digite uma nova senha para alterar (min. 8 caracteres)"
             />
             {erroSenha && <p style={{ color: '#ef4444', fontSize: 12, marginTop: 4 }}>{erroSenha}</p>}
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>Nome do Sistema</label>
            <input
              className="input-field"
              value={cfg.nomeSistema || ''}
              onChange={e => setCfg(c => ({ ...c, nomeSistema: e.target.value }))}
              placeholder="Ex: Minhas Finanças"
            />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>Foto de Perfil</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {cfg.fotoPerfil ? (
                <img src={cfg.fotoPerfil} alt="Perfil" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--bg-glass)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={24} color="var(--text-muted)" />
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) {
                                        const reader = new FileReader();
                    reader.onloadend = () => {
                      const img = new Image();
                      img.onload = () => {
                        const canvas = document.createElement('canvas');
                        let w = img.width, h = img.height;
                        if (w > 200 || h > 200) {
                          if (w > h) { h = h * (200 / w); w = 200; }
                          else { w = w * (200 / h); h = 200; }
                        }
                        canvas.width = w; canvas.height = h;
                        const ctx = canvas.getContext('2d');
                        if (ctx) ctx.drawImage(img, 0, 0, w, h);
                        setCfg(c => ({ ...c, fotoPerfil: canvas.toDataURL('image/jpeg', 0.8) }));
                      };
                      img.src = reader.result as string;
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                style={{ fontSize: 13, color: 'var(--text-secondary)' }}
              />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>Moeda</label>
            <select className="input-field" value={cfg.moeda} onChange={e => setCfg(c => ({ ...c, moeda: e.target.value }))}>
              <option value="BRL">x!x! BRL - Real Brasileiro</option>
              <option value="USD">x!x! USD - Dólar Americanao</option>
              <option value="EUR">x!x! EUR - Euro</option>
            </select>
          
          {/* Automação de Push notificações */}
          <div style={{ marginTop: 24, borderTop: '1px solid var(--border)', paddingTop: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>notificações Push (Pop-up do Celular)</h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
              Receba os alertas de vencimento diários direto na tela do seu celular, como um aplicativo normal, mesmo com o sistema fechado (via CRON).
            </p>
            <button 
              onClick={handleEnableWebPush} 
              className="btn-primary" 
              style={{ padding: '10px 16px', background: cfg.webPushSubscription ? '#10b981' : 'var(--primary)', border: 'none', borderRadius: 8, cursor: 'pointer', color: 'white', fontWeight: 700 }}
            >
              {cfg.webPushSubscription ? 'S& Push Ativo Neste Dispositivo' : 'x Ativar notificações Pop-up'}
              </button>

              <div style={{ marginTop: 24 }}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 8 }}>Dias da Semana</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dia, i) => {
                    const ativo = !cfg.pushDias || cfg.pushDias.includes(i.toString());
                    return (
                      <button 
                        key={dia}
                        onClick={() => {
                          const novos = cfg.pushDias ? [...cfg.pushDias] : ['0', '1', '2', '3', '4', '5', '6'];
                          if (ativo) {
                            const index = novos.indexOf(i.toString());
                            if (index > -1) novos.splice(index, 1);
                          } else {
                            novos.push(i.toString());
                          }
                          setCfg(c => ({ ...c, pushDias: novos }));
                        }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 20,
                          border: `1px solid ${ativo ? 'var(--primary)' : 'var(--border)'}`,
                          background: ativo ? 'var(--primary)' : 'transparent',
                          color: ativo ? 'white' : 'var(--text-secondary)',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        {dia}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 8 }}>Horário do Alerta Diário</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input 
                    type="time" 
                    className="input-field" 
                    style={{ width: 120 }}
                    value={cfg.pushHorario || '08:00'} 
                    onChange={e => setCfg(c => ({ ...c, pushHorario: e.target.value }))} 
                  />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-active)', padding: '6px 10px', borderRadius: 6 }}>
                    Nota: O Vercel CRON (gratuito) agrupa os disparos automáticos pela manhã, mas o horário será respeitado localmente quando possível.
                  </span>
                </div>
              </div>
          </div>

        </div>
        </SecaoConfig>
        )}

        {/* Aparência */}
        {abaAtiva === 'aparencia' && (
        <SecaoConfig titulo="APARÊNCIA & DESIGN SYSTEM" icone={<Palette size={18} color="#3b82f6" />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 8 }}>
                Modo de Aparência
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => { const newCfg = { ...cfg, tema: 'light' as 'light', corFundo: '', paletaAtiva: '' }; setCfg(newCfg); document.documentElement.setAttribute('data-theme', 'light'); localStorage.setItem('theme_preference', 'light'); salvar(newCfg); }}
                  style={{
                    padding: '12px 10px', borderRadius: 12, cursor: 'pointer',
                    border: `2px solid ${cfg.tema === 'light' ? '#cc0000' : 'var(--border)'}`,
                    background: cfg.tema === 'light' ? 'rgba(204,0,0,0.1)' : 'var(--bg-glass)',
                    color: cfg.tema === 'light' ? '#cc0000' : 'var(--text-primary)', textAlign: 'center',
                    fontWeight: 700, fontSize: 13, transition: 'all 0.2s ease'
                  }}>
                  ☀️ Claro
                </button>
                <button
                  type="button"
                  onClick={() => { const newCfg = { ...cfg, tema: 'dark' as 'dark', corFundo: '', paletaAtiva: '' }; setCfg(newCfg); document.documentElement.setAttribute('data-theme', 'dark'); localStorage.setItem('theme_preference', 'dark'); salvar(newCfg); }}
                  style={{
                    padding: '12px 10px', borderRadius: 12, cursor: 'pointer',
                    border: `2px solid ${cfg.tema === 'dark' || !cfg.tema ? '#cc0000' : 'var(--border)'}`,
                    background: cfg.tema === 'dark' || !cfg.tema ? 'rgba(204,0,0,0.1)' : 'var(--bg-glass)',
                    color: cfg.tema === 'dark' || !cfg.tema ? '#cc0000' : 'var(--text-primary)', textAlign: 'center',
                    fontWeight: 700, fontSize: 13, transition: 'all 0.2s ease'
                  }}>
                  🌙 Escuro
                </button>
                <button
                  type="button"
                  onClick={() => { const newCfg = { ...cfg, tema: 'auto' as 'auto', corFundo: '', paletaAtiva: '' }; setCfg(newCfg); document.documentElement.setAttribute('data-theme', 'auto'); localStorage.setItem('theme_preference', 'auto'); salvar(newCfg); }}
                  style={{
                    padding: '12px 10px', borderRadius: 12, cursor: 'pointer',
                    border: `2px solid ${cfg.tema === 'auto' ? '#cc0000' : 'var(--border)'}`,
                    background: cfg.tema === 'auto' ? 'rgba(204,0,0,0.1)' : 'var(--bg-glass)',
                    color: cfg.tema === 'auto' ? '#cc0000' : 'var(--text-primary)', textAlign: 'center',
                    fontWeight: 700, fontSize: 13, transition: 'all 0.2s ease'
                  }}>
                  ⚙️ Automático
                </button>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Ajustes Visuais Avançados
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={cfg.mostrarAnimacoes ?? true}
                    onChange={e => setCfg(c => ({ ...c, mostrarAnimacoes: e.target.checked }))}
                    style={{ accentColor: '#cc0000', width: 16, height: 16 }}
                  />
                  <span>Mostrar animações</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={cfg.reduzirAnimacoes ?? false}
                    onChange={e => setCfg(c => ({ ...c, reduzirAnimacoes: e.target.checked }))}
                    style={{ accentColor: '#cc0000', width: 16, height: 16 }}
                  />
                  <span>Reduzir animações</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={cfg.altoContraste ?? false}
                    onChange={e => setCfg(c => ({ ...c, altoContraste: e.target.checked }))}
                    style={{ accentColor: '#cc0000', width: 16, height: 16 }}
                  />
                  <span>Alto contraste (WCAG)</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={cfg.compactarInterface ?? false}
                    onChange={e => setCfg(c => ({ ...c, compactarInterface: e.target.checked }))}
                    style={{ accentColor: '#cc0000', width: 16, height: 16 }}
                  />
                  <span>Compactar interface</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={cfg.mostrarSombras ?? true}
                    onChange={e => setCfg(c => ({ ...c, mostrarSombras: e.target.checked }))}
                    style={{ accentColor: '#cc0000', width: 16, height: 16 }}
                  />
                  <span>Mostrar sombras</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={cfg.transparencias ?? true}
                    onChange={e => setCfg(c => ({ ...c, transparencias: e.target.checked }))}
                    style={{ accentColor: '#cc0000', width: 16, height: 16 }}
                  />
                  <span>Transparências / Glassmorphic</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-primary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={cfg.bordasArredondadas ?? true}
                    onChange={e => setCfg(c => ({ ...c, bordasArredondadas: e.target.checked }))}
                    style={{ accentColor: '#cc0000', width: 16, height: 16 }}
                  />
                  <span>Bordas arredondadas</span>
                </label>
              </div>
            </div>
          </div>
        </SecaoConfig>
        )}

        {/* White Label */}
        {abaAtiva === 'aparencia' && (
        <SecaoConfig titulo="Personalização Visual (White Label)" icone={<Palette size={18} color="#8b5cf6" />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase' }}>
                Paletas de Cores Prontas
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                {[
                  { id: 'azul_autocred', nome: 'Azul (Padrão)', colors: { p: '#2563eb', s: '#1d4ed8', a: '#3b82f6', f: '#f8fafc' } },
                  { id: 'azul_marinho', nome: 'Azul Marinho', colors: { p: '#1e3a8a', s: '#172554', a: '#60a5fa', f: '#ffffff' } },
                  { id: 'ciano_azul', nome: 'Ciano & Azul', colors: { p: '#06b6d4', s: '#0891b2', a: '#22d3ee', f: '#f8fafc' } },
                  { id: 'verde_azul', nome: 'Verde & Azul', colors: { p: '#059669', s: '#047857', a: '#3b82f6', f: '#ffffff' } },
                  { id: 'vermelho', nome: 'Vermelho & Cinza', colors: { p: '#dc2626', s: '#991b1b', a: '#ef4444', f: '#f8fafc' } },
                  { id: 'laranja', nome: 'Laranja Vibrante', colors: { p: '#ea580c', s: '#9a3412', a: '#f97316', f: '#ffffff' } },
                  { id: 'ouro_moderno', nome: 'Ouro Moderno (Gold)', colors: { p: '#d4af37', s: '#997a00', a: '#fcd34d', f: '#f8fafc' } },
                ].map(paleta => (
                  <div
                    key={paleta.id}
                    onClick={() => {
                      const newCfg = { 
                        ...cfg, 
                        paletaAtiva: paleta.id,
                        corPrimaria: paleta.colors.p,
                        corSecundaria: paleta.colors.s,
                        corAcento: paleta.colors.a,
                        corFundo: paleta.colors.f
                      };
                      setCfg(newCfg);
                      document.documentElement.style.setProperty('--primary', paleta.colors.p);
                      document.documentElement.style.setProperty('--primary-hover', paleta.colors.p);
                      document.documentElement.style.setProperty('--primary-dark', paleta.colors.s);
                      document.documentElement.style.setProperty('--blue', paleta.colors.a);
                      document.documentElement.style.setProperty('--bg-primary', paleta.colors.f);
                      localStorage.setItem('saved_primary_color', paleta.colors.p);
                      localStorage.setItem('saved_secondary_color', paleta.colors.s);
                      localStorage.setItem('saved_accent_color', paleta.colors.a);
                      document.documentElement.style.setProperty('--bg-secondary', paleta.colors.f);
                      document.documentElement.style.setProperty('--bg-card', paleta.colors.f);
                      localStorage.setItem('saved_primary_color', paleta.colors.p);
                      localStorage.setItem('saved_secondary_color', paleta.colors.s);
                      let meta = document.querySelector('meta[name="theme-color"]');
                      if (meta) meta.setAttribute('content', paleta.colors.p);
                      else {
                        meta = document.createElement('meta');
                        meta.setAttribute('name', 'theme-color');
                        meta.setAttribute('content', paleta.colors.p);
                        document.head.appendChild(meta);
                      }
                      salvar(newCfg);
                    }}
                    style={{
                      border: `1px solid ${cfg.paletaAtiva === paleta.id ? 'var(--blue)' : 'var(--border)'}`,
                      borderRadius: 12, padding: '12px', cursor: 'pointer', background: paleta.colors.f,
                      boxShadow: cfg.paletaAtiva === paleta.id ? '0 0 0 2px rgba(59, 130, 246, 0.3)' : 'none',
                      flex: '1 1 180px', transition: 'all 0.2s'
                    }}
                  >
                    <p style={{ fontSize: 13, fontWeight: 600, color: paleta.colors.f.toLowerCase() === '#ffffff' || paleta.colors.f.toLowerCase() === '#f8fafc' ? '#0F172A' : '#FFFFFF', marginBottom: 10 }}>{paleta.nome}</p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <div style={{ width: 16, height: 16, borderRadius: '50%', background: paleta.colors.p }} />
                      <div style={{ width: 16, height: 16, borderRadius: '50%', background: paleta.colors.s }} />
                      <div style={{ width: 16, height: 16, borderRadius: '50%', background: paleta.colors.a }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginTop: 10 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Cor Primária</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 8px' }}>
                  <input type="color" value={cfg.corPrimaria || '#cc092f'} onChange={e => { const val = e.target.value; setCfg(c => ({ ...c, paletaAtiva: 'custom', corPrimaria: val, corSecundaria: val })); document.documentElement.style.setProperty('--primary', val); document.documentElement.style.setProperty('--primary-hover', val); document.documentElement.style.setProperty('--primary-dark', val); localStorage.setItem('saved_secondary_color', val);  let meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.setAttribute('content', val); else { meta = document.createElement('meta'); meta.setAttribute('name', 'theme-color'); meta.setAttribute('content', val); document.head.appendChild(meta); } localStorage.setItem('saved_primary_color', val); }} onBlur={e => salvar({ ...cfg, paletaAtiva: 'custom', corPrimaria: e.target.value })} style={{ width: 30, height: 30, padding: 0, border: 'none', background: 'none', cursor: 'pointer' }} />
                  <input type="text" value={cfg.corPrimaria || '#cc092f'} onChange={e => { const val = e.target.value; setCfg(c => ({ ...c, paletaAtiva: 'custom', corPrimaria: val, corSecundaria: val })); document.documentElement.style.setProperty('--primary', val); document.documentElement.style.setProperty('--primary-hover', val); document.documentElement.style.setProperty('--primary-dark', val); localStorage.setItem('saved_secondary_color', val);  let meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.setAttribute('content', val); else { meta = document.createElement('meta'); meta.setAttribute('name', 'theme-color'); meta.setAttribute('content', val); document.head.appendChild(meta); } localStorage.setItem('saved_primary_color', val); }} onBlur={e => salvar({ ...cfg, paletaAtiva: 'custom', corPrimaria: e.target.value })} style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: 'var(--text-primary)', width: '100%' }} />
                </div>
              </div>
              
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Cor Secundária</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 8px' }}>
                  <input type="color" value={cfg.corSecundaria || '#88061f'} onChange={e => { const val = e.target.value; setCfg(c => ({ ...c, paletaAtiva: 'custom', corSecundaria: val })); document.documentElement.style.setProperty('--primary-dark', val); localStorage.setItem('saved_secondary_color', val); }} onBlur={e => salvar({ ...cfg, paletaAtiva: 'custom', corSecundaria: e.target.value })} style={{ width: 30, height: 30, padding: 0, border: 'none', background: 'none', cursor: 'pointer' }} />
                  <input type="text" value={cfg.corSecundaria || '#88061f'} onChange={e => { const val = e.target.value; setCfg(c => ({ ...c, paletaAtiva: 'custom', corSecundaria: val })); document.documentElement.style.setProperty('--primary-dark', val); localStorage.setItem('saved_secondary_color', val); }} onBlur={e => salvar({ ...cfg, paletaAtiva: 'custom', corSecundaria: e.target.value })} style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: 'var(--text-primary)', width: '100%' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Cor de Acento</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 8px' }}>
                  <input type="color" value={cfg.corAcento || '#0284c7'} onChange={e => { const val = e.target.value; setCfg(c => ({ ...c, paletaAtiva: 'custom', corAcento: val })); document.documentElement.style.setProperty('--blue', val); localStorage.setItem('saved_accent_color', val); }} onBlur={e => salvar({ ...cfg, paletaAtiva: 'custom', corAcento: e.target.value })} style={{ width: 30, height: 30, padding: 0, border: 'none', background: 'none', cursor: 'pointer' }} />
                  <input type="text" value={cfg.corAcento || '#0284c7'} onChange={e => { const val = e.target.value; setCfg(c => ({ ...c, paletaAtiva: 'custom', corAcento: val })); document.documentElement.style.setProperty('--blue', val); localStorage.setItem('saved_accent_color', val); }} onBlur={e => salvar({ ...cfg, paletaAtiva: 'custom', corAcento: e.target.value })} style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: 'var(--text-primary)', width: '100%' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Cor de Fundo</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 8px' }}>
                  <input type="color" value={cfg.corFundo || '#F8FAFC'} onChange={e => { const val = e.target.value; setCfg(c => ({ ...c, paletaAtiva: 'custom', corFundo: val })); document.documentElement.style.setProperty('--bg-primary', val); document.documentElement.style.setProperty('--bg-secondary', val); document.documentElement.style.setProperty('--bg-card', val); }} onBlur={e => salvar({ ...cfg, paletaAtiva: 'custom', corFundo: e.target.value })} style={{ width: 30, height: 30, padding: 0, border: 'none', background: 'none', cursor: 'pointer' }} />
                  <input type="text" value={cfg.corFundo || '#F8FAFC'} onChange={e => { const val = e.target.value; setCfg(c => ({ ...c, paletaAtiva: 'custom', corFundo: val })); document.documentElement.style.setProperty('--bg-primary', val); document.documentElement.style.setProperty('--bg-secondary', val); document.documentElement.style.setProperty('--bg-card', val); }} onBlur={e => salvar({ ...cfg, paletaAtiva: 'custom', corFundo: e.target.value })} style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: 'var(--text-primary)', width: '100%' }} />
                </div>
              </div>
            </div>
            
            <button
              onClick={async () => {
                await salvar();
                alert('Cores salvas com sucesso!');
              }}
              style={{
                marginTop: 10, alignSelf: 'flex-start', background: salvo ? '#10b981' : 'var(--blue)', color: 'white',
                border: 'none', borderRadius: 8, padding: '12px 20px', fontWeight: 600, fontSize: 14,
                display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              {salvo ? <Check size={18} /> : <Save size={18} />}
              {salvo ? 'Cores Salvas!' : 'Salvar Alterações White Label'}
            </button>
          </div>
        </SecaoConfig>
        )}

        {/* Alertas Sonaoros Bancários */}
        {abaAtiva === 'sons' && (
        <SecaoConfig titulo="Alertas Sonaoros Bancários" icone={<Bell size={18} color="#f59e0b" />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Efeitos Sonaoros do Sistema</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Ativar toques de confirmação, receitas, despesas e alertas</p>
              </div>
              <input
                type="checkbox"
                checked={audioAtivo}
                onChange={e => {
                  setAudioAtivo(e.target.checked);
                  setAudioConfig(e.target.checked, audioVolume);
                }}
                style={{ accentColor: '#10b981', width: 18, height: 18, cursor: 'pointer' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' }}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Volume dos Sons ({Math.round(audioVolume * 100)}%)
                </label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => playSound('sucesso')}
                    className="btn-secondary"
                    style={{ padding: '3px 10px', fontSize: 11 }}
                  >
                    x` Testar Sucesso
                  </button>
                  <button
                    type="button"
                    onClick={() => playSound('recebimento')}
                    className="btn-secondary"
                    style={{ padding: '3px 10px', fontSize: 11 }}
                  >
                    x Testar Receita
                  </button>
                </div>
              </div>
              <input
                type="range"
                min="0.05"
                max="1"
                step="0.05"
                value={audioVolume}
                onChange={e => {
                  const val = parseFloat(e.target.value);
                  setAudioVolume(val);
                  setAudioConfig(audioAtivo, val);
                }}
                style={{ width: '100%', accentColor: '#3b82f6' }}
              />
            </div>
          </div>
        </SecaoConfig>
        )}

        {/* Segurança e Sessão */}
        {abaAtiva === 'seguranca' && (
        <SecaoConfig titulo="Segurança e Sessão" icone={<Shield size={18} color="#cc0000" />}>
          
          <div style={{ marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid var(--border)' }}>
             <label style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Fingerprint size={16} color="#3b82f6" />
                Desbloqueio por Biometria (App Lock)
             </label>
             <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                Utilize a impressão digital ou reconhecimento facial (FaceID / TouchID / Windows Hello) do seu aparelho para desbloquear o sistema sem precisar digitar a senha da sua conta.
             </p>
             <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                   className={biometriaAtiva ? 'btn-secondary' : 'btn-primary'}
                   disabled={biometriaLoading}
                   onClick={async () => {
                      setBiometriaLoading(true);
                      if (biometriaAtiva) {
                         desabilitarBiometria();
                         setBiometriaAtiva(false);
                         alert("Desbloqueio por biometria desativado neste dispositivo.");
                      } else {
                         const auth = getFirebaseAuth();
                         const isAdminFirebase = auth.currentUser && auth.currentUser.email && (auth.currentUser.email === 'clovis@financeai.com' || auth.currentUser.email === 'clovis@email.com' || auth.currentUser.email === 'clovis');
    const isBypassAtivo = (typeof window !== 'undefined' && (() => { try { return (() => { try { return sessionStorage.getItem('master_bypass'); } catch(e) { return null; } })(); } catch(e) { return null; } })() === 'true') || isAdminFirebase;
                         const currentUser = auth.currentUser;
                         
                         const uidParaBiometria = isBypassAtivo ? 'clovis-master-bypass' : currentUser?.uid;
                         const emailParaBiometria = isBypassAtivo ? 'clovis@financeai.com' : (currentUser?.email || 'Usuário');

                         if (!uidParaBiometria) { alert("Sessão inválida"); setBiometriaLoading(false); return; }
                         const ok = await registrarBiometriaLocal(uidParaBiometria, emailParaBiometria);
                         if (ok) {
                            setBiometriaAtiva(true);
                            alert("Biometria habilitada com sucesso neste dispositivo!");
                         } else {
                            alert("Não foi possível habilitar a biometria. Verifique se o seu dispositivo possui leitor de digital/facial ou se o navegador suporta este recurso.");
                         }
                      }
                      setBiometriaLoading(false);
                   }}
                >
                   {biometriaLoading ? 'Aguarde...' : (biometriaAtiva ? 'Desativar Biometria' : 'Habilitar Biometria Agora')}
                </button>
                {biometriaAtiva && <span style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }}>Ativo neste dispositivo ✓</span>}
             </div>
          </div>

          <div className="config-card">
             <label style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Key size={16} color="#3b82f6" />
                Desbloqueio por PIN (4 Dígitos)
             </label>
             <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                Cadastre uma senha numérica rápida de 4 dígitos para acessar o sistema no celular sem precisar digitar seu e-mail e senha longa. Ideal para aplicativos (APK) sem suporte a biometria nativa.
             </p>
             <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                   className={pinAtivo ? 'btn-secondary' : 'btn-primary'}
                   onClick={() => {
                      if (pinAtivo) {
                         localStorage.removeItem('app_pin_code');
                         setPinAtivo(false);
                         alert("Desbloqueio por PIN desativado com sucesso!");
                      } else {
                         const novoPin = window.prompt("Digite um PIN de 4 dígitos para desbloqueio rápido:");
                         if (!novoPin) return;
                         if (!/^\d{4}$/.test(novoPin)) {
                            alert("O PIN deve conter exatamente 4 números!");
                            return;
                         }
                         localStorage.setItem('app_pin_code', novoPin);
                         setPinAtivo(true);
                         alert("PIN ativado! Agora você pode usar esse PIN para desbloquear o sistema rapidamente.");
                      }
                   }}
                >
                   {pinAtivo ? 'Desativar PIN' : 'Habilitar PIN Agora'}
                </button>
                {pinAtivo && <span style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }}>Ativo neste dispositivo ✓</span>}
             </div>
          </div>

          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>
              Tempo de Inatividade para Logoff Automático
            </label>
            <select
              className="input-field"
              value={cfg.tempoInatividade ?? 0}
              onChange={e => setCfg(c => ({ ...c, tempoInatividade: parseInt(e.target.value, 10) }))}>
              <option value="0">Desativado (Manter logado)</option>
              <option value="5">5 Minutos</option>
              <option value="10">10 Minutos</option>
              <option value="15">15 Minutos (Recomendado)</option>
              <option value="30">30 Minutos</option>
              <option value="60">60 Minutos (1 Hora)</option>
            </select>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              O sistema deslogará automaticamente caso fique sem nenhuma interação durante o tempo estipulado.
            </p>
          </div>

          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <button
              onClick={async () => {
                if (confirm('Deseja realmente sair do sistema?')) {
                  const { logout } = await import('@/lib/auth');
                  await logout();
                  window.location.reload();
                }
              }}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 10,
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8
              }}>
              <LogOut size={16} color="#ef4444" />
              Sair da Conta (Fazer Logoff)
            </button>
          </div>
        </SecaoConfig>
        )}

        {/* IA */}
        {abaAtiva === 'ia' && (
        <SecaoConfig titulo="Inteligência Artificial" icone={<Key size={18} color="#10b981" />}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>Provedor de IA</label>
            <div className="grid-responsive-3">
              {[
                { id: 'offline' as const, label: 'x Offline', desc: 'Motor de Regras (Gratuito)' },
                { id: 'openai' as const, label: 'x OpenAI', desc: 'GPT-4 (Mais inteligente)' },
                { id: 'gemini' as const, label: '✨ Gemini', desc: 'Google (Alternativa)' },
              ].map(op => (
                <button key={op.id}
                  onClick={() => setCfg(c => ({ ...c, provedorIA: op.id }))}
                  style={{
                    padding: '12px 10px', borderRadius: 10, cursor: 'pointer',
                    border: `1px solid ${cfg.provedorIA === op.id ? 'rgba(16,185,129,0.4)' : 'var(--border)'}`,
                    background: cfg.provedorIA === op.id ? 'rgba(16,185,129,0.1)' : 'var(--bg-glass)',
                    color: cfg.provedorIA === op.id ? '#10b981' : 'var(--text-secondary)', textAlign: 'center',
                    transition: 'all 0.15s',
                  }}>
                  <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{op.label}</p>
                  <p style={{ fontSize: 10, opacity: 0.7 }}>{op.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {cfg.provedorIA === 'openai' && (
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>OpenAI API Key</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input-field"
                  type={mostrarKey ? 'text' : 'password'}
                  value={cfg.openaiApiKey || ''}
                  onChange={e => setCfg(c => ({ ...c, openaiApiKey: e.target.value }))}
                  placeholder="sk-..."
                  style={{ paddingRight: 44 }}
                />
                <button onClick={() => setMostrarKey(!mostrarKey)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  {mostrarKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                Obtenha sua chave em <a href="https://platform.openai.com/api-keys" target="_blank" rel="naoopener naoreferrer" style={{ color: '#818cf8' }}>platform.openai.com</a>. Ela fica salva apenas nao seu dispositivo.
              </p>
            </div>
          )}

          {cfg.provedorIA === 'gemini' && (
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }}>Google Gemini API Key</label>
              <input
                className="input-field"
                type="password"
                value={cfg.geminiApiKey || ''}
                onChange={e => setCfg(c => ({ ...c, geminiApiKey: e.target.value }))}
                placeholder="AIza..."
              />
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                Obtenha sua chave em <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="naoopener naoreferrer" style={{ color: '#818cf8' }}>aistudio.google.com</a>.
              </p>
            </div>
          )}

          {cfg.provedorIA === 'offline' && (
            <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 10, padding: '12px 14px' }}>
              <p style={{ fontSize: 12, color: '#34d399', fontWeight: 600, marginBottom: 4 }}>✅ Modo Offline Ativo</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                O motor de regras inteligente interpreta seus lançamentos automaticamente, offline e sem custo. Reconhece mais de 200 padrões de categorias, fornecedores, formas de pagamento e muito mais.
              </p>
            </div>
          )}
        </SecaoConfig>
        )}

        {/* notificações e Lembretes */}
        {abaAtiva === 'sons' && (
        <SecaoConfig titulo="notificações e Lembretes" icone={<Bell size={18} color="#f59e0b" />}>
          <ToggleConfig
            label="Alertas Pop-up Diários"
            descricao="Mostra um aviso na tela inicial sobre as contas vencendo hoje"
            ativo={cfg.lembretesPopup ?? true}
            onChange={v => setCfg(c => ({ ...c, lembretesPopup: v }))}
          />
          {cfg.lembretesPopup !== false && (
             <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginTop: 12, marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <ToggleConfig
                  label="Mostrar apenas ao Iniciar Sessão"
                  descricao="Não mostrar o popup toda vez que atualizar a página, mas apenas na primeira vez do dia ou quando iniciar o aplicativo."
                  ativo={cfg.lembretesPopupAoIniciar ?? true}
                  onChange={v => setCfg(c => ({ ...c, lembretesPopupAoIniciar: v }))}
                />
                
                <div>
                  <label style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                    Horários Específicos para Lembrete Diário (Opcional)
                  </label>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.5 }}>
                    Caso deseje que o popup suba novamente durante o dia de forma automática, defina os horários. Separe por vírgula (Ex: 09:00, 15:30). Máx: 4 horários.
                  </p>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="09:00, 14:00"
                    defaultValue={(cfg.lembretesPopupHorarios || []).join(', ')}
                    onBlur={e => {
                       const v = e.target.value.split(',').map(s => s.trim()).filter(s => s);
                       setCfg(c => ({ ...c, lembretesPopupHorarios: v.slice(0, 4) }));
                    }}
                    style={{ width: '100%', maxWidth: 300 }}
                  />
                </div>
             </div>
          )}
          <ToggleConfig
            label="Central de Alertas (Sino)"
            descricao="Habilita a central de notificações nao topo da tela"
            ativo={cfg.lembretesSinao ?? true}
            onChange={v => setCfg(c => ({ ...c, lembretesSinao: v }))}
          />
        </SecaoConfig>
        )}

        {/* Automação de WhatsApp */}
        {abaAtiva === 'ia' && (
        <SecaoConfig titulo="Automação de WhatsApp" icone={<MessageCircle size={18} color="#10b981" />}>
          <ToggleConfig
            label="Enviar Resumo Diário"
            descricao="Você receberá um resumo financeiro e alertas de vencimento todos os dias"
            ativo={cfg.whatsappAtivo ?? false}
            onChange={v => setCfg(c => ({ ...c, whatsappAtivo: v }))}
          />
          
          {cfg.whatsappAtivo && (
            <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Níºmeros de WhatsApp</label>
                <input
                  className="input-field"
                  placeholder="Ex: 11999999999, 11888888888"
                  value={cfg.whatsappNumeros || ''}
                  onChange={e => setCfg(c => ({ ...c, whatsappNumeros: e.target.value }))}
                />
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Separe os níºmeros por vírgula (com DDD).</p>
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Horário do Envio</label>
                <input
                  type="time"
                  className="input-field"
                  value={cfg.whatsappHorario || '09:00'}
                  onChange={e => setCfg(c => ({ ...c, whatsappHorario: e.target.value }))}
                />
              </div>
              <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 8, padding: 12, marginTop: 4 }}>
                <p style={{ fontSize: 12, color: '#34d399', fontWeight: 600, marginBottom: 4 }}>x Como funciona?</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  Todos os dias nao horário configurado, o sistema gerará automaticamente um resumo do que vence hoje e naos próximos dias, além de um panaorama rápido do seu saldo.
                </p>
              </div>
            </div>
          )}
          
          <div style={{ marginTop: 24, borderTop: '1px solid var(--border)', paddingTop: 24 }}>
            <ToggleConfig
              label="Bot Financeiro (Lançamentos por WhatsApp)"
              descricao="Permite criar lançamentos financeiros enviando mensagens de texto pelo WhatsApp"
              ativo={cfg.whatsappBotAtivo ?? false}
              onChange={v => setCfg(c => ({ ...c, whatsappBotAtivo: v }))}
            />
            
            {cfg.whatsappBotAtivo && (
              <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Telefone Autorizado (O seu)</label>
                  <input
                    className="input-field"
                    placeholder="Ex: 5549998266304"
                    value={cfg.whatsappBotTelefone || ''}
                    onChange={e => setCfg(c => ({ ...c, whatsappBotTelefone: e.target.value.replace(/\D/g, '') }))}
                  />
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Apenas este níºmero poderá criar transações. Coloque o DDI (55) + DDD + Níºmero.</p>
                </div>
                
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Token de Segurança (Para o Webhook)</label>
                  <input
                    className="input-field"
                    placeholder="Ex: minha-senha-secreta-123"
                    value={cfg.whatsappBotToken || ''}
                    onChange={e => setCfg(c => ({ ...c, whatsappBotToken: e.target.value }))}
                  />
                </div>
                
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Sua URL de Webhook</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      className="input-field"
                      style={{ fontFamily: 'monaospace', fontSize: 12, flex: 1, background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
                      readOnly
                      value={typeof window !== 'undefined' ? `${window.location.origin}/api/whatsapp/webhook?token=${cfg.whatsappBotToken || 'seu-token'}` : ''}
                    />
                    <button 
                      className="btn-secondary"
                      onClick={(e) => {
                        e.preventDefault();
                        navigator.clipboard.writeText(`${window.location.origin}/api/whatsapp/webhook?token=${cfg.whatsappBotToken || 'seu-token'}`);
                        alert('URL copiada!');
                      }}
                    >
                      Copiar
                    </button>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Cole esta URL nao painel do Evolution API, Z-API, ou ChatPro para receber as mensagens.</p>
                </div>
                
                <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 8, padding: 12, marginTop: 4 }}>
                  <p style={{ fontSize: 12, color: '#34d399', fontWeight: 600, marginBottom: 4 }}>x Como funciona?</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    Mande mensagens como <i>"Gastei 50 nao posto de gasolina"</i> ou <i>"Recebi 200 do cliente Joao"</i>. A Inteligência Artificial lerá sua mensagem e registrará a transação automaticamente!
                  </p>
                </div>
              </div>
            )}
          </div>
        </SecaoConfig>
        )}

        {/* Dados */}
        {abaAtiva === 'seguranca' && (
        <SecaoConfig titulo="Dados & Privacidade" icone={<Shield size={18} color="#06b6d4" />}>
          <ToggleConfig
            label="Backup Automático"
            descricao="Exporta os dados automaticamente (em breve)"
            ativo={cfg.backupAutomatico}
            onChange={v => setCfg(c => ({ ...c, backupAutomatico: v }))}
          />

          <div style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)', borderRadius: 10, padding: '12px 14px' }}>
            <p style={{ fontSize: 12, color: '#67e8f9', fontWeight: 600, marginBottom: 4 }}>x Dados 100% Privados</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Todos os seus dados são armazenados localmente nao seu navegador (IndexedDB). Nenhuma informação financeira é enviada para servidores externaos, exceto quando você usa uma API de IA e envia explicitamente o contexto.
            </p>
          </div>

          {/* Zerar Dados */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--bg-glass)' }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>Zerar Sistema (Reset)</p>
              <p style={{ fontSize: 12, color: '#ef4444' }}>Apaga todos os seus dados. Não pode ser desfeito!</p>
            </div>
            <button
              className="btn-primary"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', padding: '8px 12px', fontSize: 12 }}
              onClick={() => {
                if (window.confirm('Tem certeza absoluta que deseja apagar TODOS os seus lançamentos, cartões, contas e cadastros? Essa ação nao pode ser desfeita.')) {
                  const req = indexedDB.deleteDatabase('financeapp');
                  req.onsuccess = () => {
                    window.location.reload();
                  };
                  req.onerror = () => {
                    alert('Erro ao apagar banco de dados. Tente limpar os dados do navegador manualmente.');
                  };
                }
              }}
            >
              Apagar Tudo
            </button>
          </div>

          {/* Exportar dados */}
          <div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Exportar dados</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-secondary" onClick={async () => {
                const { getTransacoes } = await import('@/lib/storage');
                const t = await getTransacoes();
                const json = JSON.stringify(t, null, 2);
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = 'financeai-backup.json'; a.click();
              }}>
                x JSON
              </button>
              <button className="btn-secondary" onClick={async () => {
                const { getTransacoes, formatarMoeda } = await import('@/lib/storage');
                const t = await getTransacoes();
                const header = 'Tipo,Descrição,Valor,Data,Categoria,Fornecedor,Conta,Forma de Pagamento,Status\n';
                const rows = t.map(tx => `${tx.tipo},"${tx.descricao}",${tx.valor},${tx.data},"${tx.categoriaNome || ''}","${tx.fornecedorNome || ''}","${tx.contaNome || ''}",${tx.formaPagamento},${tx.status}`).join('\n');
                const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url; a.download = 'financeai-lancamentos.csv'; a.click();
              }}>
                x` CSV
              </button>
            </div>
          </div>
        </SecaoConfig>
        )}

        {/* Funcionalidades Avançadas */}
        {abaAtiva === 'ia' && (
        <SecaoConfig titulo="Funcionalidades Avançadas" icone={<Zap size={18} color="#eab308" />}>
          <ToggleConfig
            label="Integração Open Finance"
            descricao="Importa extratos e faturas automaticamente via conexão bancária (Simulação)"
            ativo={cfg.openFinanceAtivo ?? false}
            onChange={v => setCfg(c => ({ ...c, openFinanceAtivo: v }))}
          />
          <ToggleConfig
            label="Relatórios Automáticos por E-mail"
            descricao="Receba um balanço financeiro semanal/mensal nao e-mail cadastrado"
            ativo={cfg.relatoriosEmail ?? false}
            onChange={v => setCfg(c => ({ ...c, relatoriosEmail: v }))}
          />
          <ToggleConfig
            label="Fechamento de Mês Automático"
            descricao="Bloqueia edição de lançamentos em meses já encerrados para evitar fraude ou divergências na DRE"
            ativo={cfg.fechamentoAutomatico ?? false}
            onChange={v => setCfg(c => ({ ...c, fechamentoAutomatico: v }))}
          />
        </SecaoConfig>
        )}

        {/* Sobre */}
        {abaAtiva === 'perfil' && (
        <SecaoConfig titulo="Sobre" icone={<Info size={18} color="#8b5cf6" />}>
          <div className="grid-responsive-2">
            {[
              { label: 'Versão', valor: '2.0.0 Ultra' },
              { label: 'Tecnologia', valor: 'Next.js + TypeScript' },
              { label: 'Storage', valor: 'IndexedDB (Local)' },
              { label: 'IA Motor', valor: 'Regras + OpenAI' },
              { label: 'Gráficos', valor: 'Recharts' },
              { label: 'PWA', valor: 'Suportado S&' },
            ].map((item, i) => (
              <div key={i} style={{ background: 'var(--bg-glass)', borderRadius: 8, padding: '10px 12px' }}>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, marginBottom: 3 }}>{item.label}</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{item.valor}</p>
              </div>
            ))}
          </div>
        </SecaoConfig>
        )}

        {/* Segurança e Backups */}
        {abaAtiva === 'seguranca' && (
        <SecaoConfig titulo="Segurança e Backups" icone={<Database size={18} color="var(--purple)" />}>
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
              Proteja seus dados fazendo backups regulares ou ativando a rotina automática.
            </p>
            
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 24, flexWrap: 'wrap' }}>
              <button 
                onClick={handleFazerBackup}
                disabled={backupLoading}
                style={{
                  background: 'linear-gradient(135deg, var(--purple), var(--pink))',
                  color: 'white', border: 'none', padding: '10px 16px', borderRadius: 8,
                  fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
                  cursor: backupLoading ? 'not-allowed' : 'pointer',
                  opacity: backupLoading ? 0.7 : 1
                }}
              >
                <Save size={16} /> {backupLoading ? 'Processando...' : 'Fazer Backup Agora'}
              </button>
              
              <button 
                onClick={handleUploadBackup}
                disabled={backupLoading}
                style={{
                  background: 'rgba(33, 150, 243, 0.1)',
                  color: '#2196F3', border: '1px solid rgba(33, 150, 243, 0.2)', padding: '10px 16px', borderRadius: 8,
                  fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
                  cursor: backupLoading ? 'not-allowed' : 'pointer',
                  opacity: backupLoading ? 0.7 : 1
                }}
              >
                <Upload size={16} /> Importar Arquivo
              </button>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Backup Automático:</span>
                <select 
                  className="input-field"
                  style={{ padding: '4px 8px', minHeight: 30, fontSize: 12, width: 120 }}
                  value={cfg.frequenciaBackup || 'nunca'}
                  onChange={e => setCfg(c => ({ ...c, frequenciaBackup: e.target.value as any, backupAutomatico: e.target.value !== 'nunca' }))}
                >
                  <option value="nunca">Desativado</option>
                  <option value="diario">Diário</option>
                  <option value="semanal">Semanal</option>
                  <option value="mensal">Mensal</option>
                </select>
                
                {cfg.frequenciaBackup && cfg.frequenciaBackup !== 'nunca' && (
                  <>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>Horário:</span>
                    <input 
                      type="time" 
                      className="input-field" 
                      style={{ padding: '4px 8px', minHeight: 30, fontSize: 12, width: 90 }}
                      value={cfg.horarioBackup || '00:00'}
                      onChange={e => setCfg(c => ({ ...c, horarioBackup: e.target.value }))}
                    />
                  </>
                )}
              </div>
              
              {backupsList.some(b => b.tipo === 'pre_restauracao') && (
                <button 
                  onClick={handleDesfazerRestauracao}
                  disabled={backupLoading}
                  style={{
                    background: 'rgba(255,165,0,0.1)', color: '#ff9800', border: '1px solid rgba(255,165,0,0.2)',
                    padding: '8px 14px', borderRadius: 8, fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
                    cursor: backupLoading ? 'not-allowed' : 'pointer', marginLeft: 'auto'
                  }}
                  title="Desfazer a íºltima restauração"
                >
                  <Undo2 size={16} /> Desfazer Restauração
                </button>
              )}
            </div>
            
            {/* Lista de Backups */}
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-color)' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <History size={14} color="var(--blue)" /> altimos Backups
                </h4>
                <button 
                  onClick={() => setShowLogs(!showLogs)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  {showLogs ? 'Esconder Logs' : 'Ver Logs de Atividade'}
                </button>
              </div>
              
              {showLogs ? (
                <div style={{ maxHeight: 250, overflowY: 'auto', padding: 12 }}>
                  {logsList.length === 0 ? (
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>Nenhum log encontrado.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {logsList.map(log => (
                        <div key={log.id} style={{ fontSize: 12, display: 'flex', gap: 12, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                            {new Date(log.dataHora).toLocaleString('pt-BR')}
                          </span>
                          <span style={{ 
                            color: log.acao === 'restaurado' ? '#ff9800' : log.acao === 'desfeito' ? '#4CAF50' : 'var(--blue)',
                            fontWeight: 600, width: 90
                          }}>
                            {log.acao.toUpperCase()}
                          </span>
                          <span style={{ color: 'var(--text-primary)' }}>{log.detalhes}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ maxHeight: 250, overflowY: 'auto' }}>
                  <div style={{ display: 'flex', gap: 10, paddingBottom: 12, borderBottom: '1px solid var(--border-color)', marginBottom: 12 }}>
                    <button 
                      onClick={() => setShowOldBackups(false)}
                      style={{ background: !showOldBackups ? 'rgba(204,9,47,0.1)' : 'transparent', color: !showOldBackups ? '#cc092f' : 'var(--text-muted)', border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                    >
                      Desta Semana
                    </button>
                    <button 
                      onClick={() => setShowOldBackups(true)}
                      style={{ background: showOldBackups ? 'rgba(204,9,47,0.1)' : 'transparent', color: showOldBackups ? '#cc092f' : 'var(--text-muted)', border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                    >
                      Semanas Anteriores
                    </button>
                  </div>
                  {(() => {
                    const umaSemanaAtras = new Date();
                    umaSemanaAtras.setDate(umaSemanaAtras.getDate() - 7);
                    const validBackups = backupsList.filter(b => b.tipo !== 'pre_restauracao');
                    const backupsRecentes = validBackups.filter(b => new Date(b.dataHora) >= umaSemanaAtras);
                    const backupsAntigos = validBackups.filter(b => new Date(b.dataHora) < umaSemanaAtras);
                    const backupsParaMostrar = showOldBackups ? backupsAntigos : backupsRecentes;

                    if (backupsParaMostrar.length === 0) {
                      return <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 30 }}>Nenhum backup {showOldBackups ? 'antigo' : 'recente'} disponível.</p>;
                    }

                    return (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.02)', textAlign: 'left' }}>
                          <th style={{ padding: '10px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Data e Hora</th>
                          <th style={{ padding: '10px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Tipo</th>
                          <th style={{ padding: '10px 16px', color: 'var(--text-muted)', fontWeight: 600 }}>Registros</th>
                          <th style={{ padding: '10px 16px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'right' }}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {backupsParaMostrar.map(backup => (
                          <tr key={backup.id} style={{ borderTop: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '10px 16px', color: 'var(--text-primary)' }}>
                              {new Date(backup.dataHora).toLocaleString('pt-BR')}
                            </td>
                            <td style={{ padding: '10px 16px' }}>
                              <span style={{ 
                                padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 600,
                                background: backup.tipo === 'automatico' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(33, 150, 243, 0.1)',
                                color: backup.tipo === 'automatico' ? '#4CAF50' : '#2196F3'
                              }}>
                                {backup.tipo.toUpperCase()}
                              </span>
                            </td>
                            <td style={{ padding: '10px 16px', color: 'var(--text-muted)' }}>
                              {backup.tamanhoRegistros}
                            </td>
                            <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                              <button
                                onClick={() => handleRestaurar(backup.id)}
                                disabled={backupLoading}
                                style={{
                                  background: 'rgba(255,165,0,0.1)', color: '#ff9800', border: 'none',
                                  padding: '6px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                                  cursor: backupLoading ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4
                                }}
                              >
                                <RotateCcw size={12} /> Restaurar
                              </button>
                              <button
                                onClick={() => handleDownloadBackup(backup)}
                                disabled={backupLoading}
                                style={{
                                  background: 'rgba(33,150,243,0.1)', color: '#2196F3', border: 'none',
                                  padding: '6px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                                  cursor: backupLoading ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4,
                                  marginLeft: 8
                                }}
                              >
                                <Download size={12} /> Baixar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </SecaoConfig>
        )}
        {/* Botão salvar */}
        <button onClick={() => salvar()} className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '14px' }}>
          {salvo ? <><Check size={18} /> Salvo com sucesso!</> : <><Save size={18} /> Salvar Configurações</>}
        </button>
      </div>
    </div>
  );
}

function SecaoConfig({ titulo, icone, children }: { titulo: string; icone: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="glass config-card" style={{ padding: '24px', overflow: 'hidden', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: 'linear-gradient(to bottom, var(--primary), transparent)' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
          {icone}
        </div>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>{titulo}</h2>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {children}
      </div>
    </div>
  );
}

function ToggleConfig({ label, descricao, ativo, onChange }: { label: string; descricao: string; ativo: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, padding: '8px 0' }}>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{label}</p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>{descricao}</p>
      </div>
      <button
        onClick={() => onChange(!ativo)}
        className="apple-toggle"
        style={{
          width: 52, height: 30, borderRadius: 99, border: 'none', cursor: 'pointer', flexShrink: 0,
          background: ativo ? '#34C759' : 'rgba(120,120,128,0.32)',
          position: 'relative',
        }}>
        <div 
          className="apple-toggle-knaob"
          style={{
          width: 26, height: 26, borderRadius: '50%', background: 'white',
          position: 'absolute', top: 2,
          transform: ativo ? 'translateX(24px)' : 'translateX(2px)',
        }} />
      </button>
    </div>
  );
}


