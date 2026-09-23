'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { ConfiguracaoApp } from '@/lib/types';
import { NotificationCenter } from '@/components/NotificationCenter';
import { DailyReminderPopup } from '@/components/DailyReminderPopup';
import { DashboardHeader } from '@/components/NewMobileBankApp';
import {
  LayoutDashboard, ListOrdered, BarChart3, CreditCard,
  Settings, Server, Bot, PlusCircle, BookOpen, LogOut, ShieldCheck,
  BrainCircuit, Calendar, RefreshCw, Zap, Users, TrendingUp, Target, ChevronDown, ChevronRight, Menu, Search
} from 'lucide-react';
import { setTenantId } from '@/lib/storage';
import { MENU_PERMISSION_MAP } from '@/lib/permissions';
import { ErrorBoundary } from '@/components/ErrorBoundary';

type Pagina = 'atualizacoes' | 'dashboard' | 'dashboard_mensal' | 'dashboard_v2' | 'cfo' | 'cfo_legacy' | 'extrato' | 'lancamentos' | 'calendario' | 'conciliacao' | 'aprovacoes' | 'regras' | 'relatorios' | 'relatorio_avancado' | 'contas' | 'cadastros' | 'equipe' | 'chat' | 'configuracoes' | 'admin' | 'auditoria' | 'licencas' | 'metas' | 'investimentos' | 'cartoes';

// ─── Todos os componentes que usam Firebase carregam APENAS no browser ────────
const PlanejamentoOrcamentario = dynamic(() => import('@/components/PlanejamentoOrcamentario'), { ssr: false });
const Dashboard     = dynamic(() => import('@/components/Dashboard'),     { ssr: false });
const DashboardMensal = dynamic(() => import('@/components/DashboardMensal'), { ssr: false });
const GerenciamentoClientes = dynamic(() => import('@/components/GerenciamentoClientes'), { ssr: false });
const ModuloLicencas = dynamic(() => import('@/components/ModuloLicencas'), { ssr: false });
const Equipe = dynamic(() => import('@/components/Equipe'), { ssr: false });
const CFOExecutiveDashboard = dynamic(() => import('@/components/CFOExecutiveDashboard').then(m => ({ default: m.CFOExecutiveDashboard })), { ssr: false });
const CorporateCards = dynamic(() => import('@/components/CorporateCards'), { ssr: false });
const CalendarioFinanceiro = dynamic(() => import('@/components/CalendarioFinanceiro').then(m => ({ default: m.CalendarioFinanceiro })), { ssr: false });
const CentralConciliacao = dynamic(() => import('@/components/CentralConciliacao').then(m => ({ default: m.CentralConciliacao })), { ssr: false });
const CentralAprovacoes = dynamic(() => import('@/components/CentralAprovacoes').then(m => ({ default: m.CentralAprovacoes })), { ssr: false });
const RegrasAutomacaoTab = dynamic(() => import('@/components/RegrasAutomacaoTab').then(m => ({ default: m.RegrasAutomacaoTab })), { ssr: false });
const ExtratoBancario = dynamic(() => import('@/components/ExtratoBancario'), { ssr: false });
const Lancamentos   = dynamic(() => import('@/components/Lancamentos'),   { ssr: false });
const LancamentosV2 = dynamic(() => import('@/components/LancamentosV2'), { ssr: false });
const Relatorios    = dynamic(() => import('@/components/Relatorios'),    { ssr: false });
const AutoBackup    = dynamic(() => import('@/components/AutoBackup').then(m => ({ default: m.AutoBackup })), { ssr: false });
const Contas        = dynamic(() => import('@/components/Contas'),        { ssr: false });
const Cadastros     = dynamic(() => import('@/components/Cadastros'),     { ssr: false });
const ChatIA        = dynamic(() => import('@/components/ChatIA'),        { ssr: false });
const ChatIAV2      = dynamic(() => import('@/components/ChatIAV2'),      { ssr: false });
const Configuracoes = dynamic(() => import('@/components/Configuracoes'), { ssr: false });
const AuditoriaTab  = dynamic(() => import('@/components/AuditoriaTab'),  { ssr: false });
const ModalLancamento = dynamic(() => import('@/components/ModalLancamento'), { ssr: false });
const Login = dynamic(() => import('@/components/Login').then(m => ({ default: m.Login })), { ssr: false });
const AdminPanel = dynamic(() => import('@/components/AdminPanel'), { ssr: false });
const ToastContainer = dynamic(() => import('@/components/ToastContainer').then(m => ({ default: m.ToastContainer })), { ssr: false });
const NotificationDrawer = dynamic(() => import('@/components/NotificationDrawer').then(m => ({ default: m.NotificationDrawer })), { ssr: false });
const LockScreen = dynamic(() => import('@/components/LockScreen').then(m => ({ default: m.LockScreen })), { ssr: false });
const MetasGamificadas = dynamic(() => import('@/components/MetasGamificadas').then(m => ({ default: m.MetasGamificadas })), { ssr: false });
const MetasGamificadasV2 = dynamic(() => import('@/components/MetasGamificadasV2'), { ssr: false });
const HubInvestimentos = dynamic(() => import('@/components/HubInvestimentos').then(m => ({ default: m.HubInvestimentos })), { ssr: false });
const FloatingScroller = dynamic(() => import('@/components/FloatingScroller').then(m => ({ default: m.FloatingScroller })), { ssr: false });
const RelatorioAvancado = dynamic(() => import('@/components/RelatorioAvancado'), { ssr: false });
const AtualizacoesCliente = dynamic(() => import('@/components/AtualizacoesCliente'), { ssr: false });

const NAV_ITEMS = [
  { id: 'dashboard'    as Pagina, label: 'Dashboard',        icon: LayoutDashboard, grupo: 'Principal' },
  { id: 'dashboard_mensal' as Pagina, label: 'Dashboard Mensal', icon: BarChart3, grupo: 'Principal' },
  { id: 'lancamentos'  as Pagina, label: 'Lançamentos',      icon: ListOrdered,     grupo: 'Principal' },
  { id: 'metas'        as Pagina, label: 'Metas & Orçamentos', icon: Target,      grupo: 'Principal' },
  

  { id: 'cfo'          as Pagina, label: 'Cockpit CFO',      icon: BrainCircuit,    grupo: 'Inteligência' },
  { id: 'relatorio_avancado' as Pagina, label: 'Relatório Premium', icon: Target,   grupo: 'Inteligência' },
  { id: 'relatorios'   as Pagina, label: 'Relatórios',       icon: BarChart3,       grupo: 'Inteligência' },
  { id: 'investimentos'as Pagina, label: 'Hub Patrimônio',   icon: TrendingUp,      grupo: 'Inteligência' },
  
  { id: 'cartoes'      as Pagina, label: 'Cartões Corp.',    icon: CreditCard,      grupo: 'Kaminão (Banking)' },
  
  { id: 'contas'       as Pagina, label: 'Contas & Cartões', icon: CreditCard,      grupo: 'Gestão' },
  { id: 'extrato'      as Pagina, label: 'Extrato Bancário', icon: BookOpen,        grupo: 'Gestão' },
  { id: 'conciliacao'  as Pagina, label: 'Conciliação OFX',  icon: RefreshCw,       grupo: 'Gestão' },
  { id: 'calendario'   as Pagina, label: 'Calendário ERP',   icon: Calendar,        grupo: 'Gestão' },

  { id: 'aprovacoes'   as Pagina, label: 'Aprovações',       icon: ShieldCheck,     grupo: 'Operacional' },
  { id: 'regras'       as Pagina, label: 'Automações',       icon: Zap,             grupo: 'Operacional' },
  { id: 'equipe'       as Pagina, label: 'Minha Equipe',     icon: Users,           grupo: 'Operacional' },
  { id: 'auditoria'    as Pagina, label: 'Auditoria',        icon: ShieldCheck,     grupo: 'Operacional' },

  { id: 'atualizacoes' as Pagina, label: 'Atualizações',     icon: Server,          grupo: 'Configurações' },
  { id: 'cadastros'    as Pagina, label: 'Cadastros',        icon: BookOpen,        grupo: 'Configurações' },
  { id: 'configuracoes'as Pagina, label: 'Configurações',    icon: Settings,        grupo: 'Configurações' },
];


function generatePixPayload(chavePix: string, nomeReceptor: string, cidadeReceptor: string, valor: number) {
  function formatField(id: string, value: string) {
    const len = value.length.toString().padStart(2, '0');
    return `${id}${len}${value}`;
  }

  const payloadFormatIndicator = formatField('00', '01');
  const merchantAccountInformation = formatField('26', 
    formatField('00', 'BR.GOV.BCB.PIX') + 
    formatField('01', chavePix)
  );
  const merchantCategoryCode = formatField('52', '0000');
  const transactionCurrency = formatField('53', '986');
  
  let transactionAmount = '';
  if (valor) {
    transactionAmount = formatField('54', valor.toFixed(2));
  }
  
  const countryCode = formatField('58', 'BR');
  const merchantName = formatField('59', (nomeReceptor || 'Finance SaaS').substring(0, 25).trim());
  const merchantCity = formatField('60', (cidadeReceptor || 'Sao Paulo').substring(0, 15).trim());
  const additionalDataFieldTemplate = formatField('62', formatField('05', '***'));
  
  const payload = payloadFormatIndicator + merchantAccountInformation + merchantCategoryCode + transactionCurrency + transactionAmount + countryCode + merchantName + merchantCity + additionalDataFieldTemplate;
  
  const payloadWithCrcId = payload + '6304';
  
  let crc = 0xFFFF;
  for (let i = 0; i < payloadWithCrcId.length; i++) {
    crc ^= payloadWithCrcId.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = crc << 1;
      }
    }
  }
  crc = crc & 0xFFFF;
  const crcHex = crc.toString(16).toUpperCase().padStart(4, '0');
  
  return payloadWithCrcId + crcHex;
}





import { collection, query, where, getDocs } from 'firebase/firestore';

function CommandPalette({ isOpen, onClose, onSelect, tenantId }: { isOpen: boolean; onClose: () => void; onSelect: (t: any) => void; tenantId?: string | null }) {
  const [queryStr, setQueryStr] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [transacoes, setTransacoes] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (isOpen && tenantId) {
      setQueryStr('');
      setTimeout(() => inputRef.current?.focus(), 100);
      
      const fetchT = async () => {
        setLoading(true);
        try {
          const { getDb } = await import('@/lib/firebase');
          const db = getDb();
          const { getCollectionPath } = await import('@/lib/storage');
          const q = collection(db, getCollectionPath('transacoes'));
          const snap = await getDocs(q);
          const data = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
          data.sort((a,b) => (b.data || '').localeCompare(a.data || ''));
          setTransacoes(data);
        } catch (e) {
          console.error(e);
        }
        setLoading(false);
      };
      fetchT();
    }
  }, [isOpen, tenantId]);

  if (!isOpen) return null;

  const results = transacoes
    .filter(t => t.descricao?.toLowerCase().includes(queryStr.toLowerCase()) || (t.fornecedorNome && t.fornecedorNome.toLowerCase().includes(queryStr.toLowerCase())))
    .slice(0, 8);

  return (
    <div className="fixed inset-0 z-[99999] flex items-start justify-center pt-[10vh] bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col" onClick={e => e.stopPropagation()} style={{ border: '1px solid var(--border)' }}>
        <div className="flex items-center px-4 py-4 border-b border-gray-200 dark:border-slate-800">
          <Search className="w-6 h-6 text-gray-400 mr-3" />
          <input 
            ref={inputRef}
            type="text" 
            value={queryStr}
            onChange={e => setQueryStr(e.target.value)}
            className="flex-1 bg-transparent text-xl outline-none text-gray-800 dark:text-gray-100 placeholder-gray-400"
            placeholder="Pesquisar lançamentos ou fornecedores..."
          />
          <div className="text-xs font-bold text-gray-400 border border-gray-300 rounded px-2 py-1">ESC</div>
        </div>
        {loading && <div className="p-6 text-center text-gray-500">Carregando dados...</div>}
        {!loading && queryStr.length > 0 && (
          <div className="overflow-y-auto max-h-[60vh]">
            {results.length === 0 ? (
              <div className="p-6 text-center text-gray-500">Nenhum resultado encontrado para "{queryStr}"</div>
            ) : (
              <div className="p-2">
                <div className="px-3 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider">Lançamentos Encontrados</div>
                {results.map(t => (
                  <div key={t.id} onClick={() => onSelect(t)} className="flex items-center justify-between p-3 mx-1 my-1 rounded-xl cursor-pointer hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg shadow-sm" style={{ backgroundColor: t.categoriaCor || '#64748b' }}>
                        {t.categoriaIcone || '🏷️'}
                      </div>
                      <div>
                        <div className="font-bold text-gray-800 dark:text-gray-100">{t.descricao}</div>
                        <div className="text-sm text-gray-500">{t.data?.split('-').reverse().join('/')} {t.fornecedorNome ? '• ' + t.fornecedorNome : ''}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-gray-800 dark:text-gray-100">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(t.valor) || 0)}
                      </div>
                      <div className="text-xs font-bold" style={{ color: t.tipo === 'receita' ? '#16a34a' : '#ef4444' }}>
                        {t.tipo === 'receita' ? 'Receita' : 'Despesa'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {!loading && !queryStr && (
          <div className="p-6 text-center text-gray-400 flex flex-col items-center gap-2">
            <Search className="w-12 h-12 text-gray-300" />
            <span>Digite para encontrar lançamentos instantaneamente.</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const [paginaAtual, setPaginaAtual] = useState<Pagina>(
    typeof window !== 'undefined' ? ((sessionStorage.getItem('paginaAtual') as Pagina) || 'dashboard') : 'dashboard'
  );
  const [modalAberto, setModalAberto] = useState(false);

  
  
  const [tenantBloqueadoData, setTenantBloqueadoData] = useState<any>(null);
  const [mostrarBoleto, setMostrarBoleto] = useState<boolean>(false);
  const [transacaoEditar, setTransacaoEditar] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [cfg, setCfg] = useState<ConfiguracaoApp | null>(null);
  const [modulosAtivos, setModulosAtivos] = useState<any>({});
  const [drawerNotificacoesAberto, setDrawerNotificacoesAberto] = useState(false);
  const [bloqueadoInatividade, setBloqueadoInatividade] = useState(false);

  const [bloqueadoBiometria, setBloqueadoBiometria] = useState(false);
  const [cmdPaletteAberto, setCmdPaletteAberto] = useState(false);
  
  // ATALHO CTRL+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (!bloqueadoBiometria && !bloqueadoInatividade) {
          setCmdPaletteAberto(true);
        }
      }
      if (e.key === 'Escape') {
        setCmdPaletteAberto(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [bloqueadoBiometria, bloqueadoInatividade]);
  
  // Auth states
  const [autenticado, setAutenticado] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null); // AppUser
  const [filtroRapidoLancamentos, setFiltroRapidoLancamentos] = useState<string>('');
  const [faturaDestinoId, setFaturaDestinoId] = useState<string | null>(null);
  const [dataAcesso, setDataAcesso] = useState('');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [appInfo, setAppInfo] = useState<any>(null);
  
  const [gruposExpandidos, setGruposExpandidos] = useState<Record<string, boolean>>({
    'Principal': true // Apenas o grupo Principal começa aberto
  });
  const [mobileMenuAberto, setMobileMenuAberto] = useState(false);

  const toggleGrupo = (nome: string) => {
    setGruposExpandidos(prev => ({
      ...prev,
      [nome]: !prev[nome]
    }));
  };

  useEffect(() => {
    setTenantId(userProfile?.tenantId || null);
  }, [userProfile]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Auto-trigger PWA install prompt for browser
      setTimeout(() => {
        try { e.prompt(); } catch (err) {}
      }, 1000);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleLogout = async () => {
    try {
      const { logout } = await import('@/lib/auth');
      await logout();
    } catch (e) {
      console.error("Erro ao fazer logout:", e);
    }
    
    // Clear session info on logout
    localStorage.removeItem('current_session_start');
    localStorage.removeItem('current_user_name');
    localStorage.removeItem('current_user_email');
    localStorage.removeItem('current_user_role');
    localStorage.removeItem('master_lastLogin');
    
    setAutenticado(false);
    setUserProfile(null);
    setCfg(null);
    sessionStorage.removeItem('active_session_auth');
    localStorage.removeItem('last_activity_timestamp');
  };

  // ─── MONITOREAMENTO DE INATIVIDADE (DESLOGAR SOZINHO) E SESSÃO INICIAL ─────────────────────────
  const [versaoUi, setVersaoUi] = useState('v2');
  
  useEffect(() => {
    setMounted(true);
    setVersaoUi(localStorage.getItem('versao_ui') || 'v2');
  }, []);

  // Aplicação Dinâmica de Cores White Label
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    if (cfg?.corPrimaria) {
      document.documentElement.style.setProperty('--primary', cfg.corPrimaria); localStorage.setItem('saved_primary_color', cfg.corPrimaria);
      document.documentElement.style.setProperty('--primary-hover', cfg.corPrimaria);
      let meta = document.querySelector('meta[name="theme-color"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', 'theme-color');
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', cfg.corPrimaria);
    } else { 
      const savedP = typeof window !== 'undefined' ? localStorage.getItem('saved_primary_color') : null;
      if (savedP) {
        document.documentElement.style.setProperty('--primary', savedP);
        document.documentElement.style.setProperty('--primary-hover', savedP);
      }
      let meta = document.querySelector('meta[name="theme-color"]');
      if (meta) {
        meta.setAttribute('content', savedP || '#cc092f');
      }
    }
    
    if (cfg?.corSecundaria) {
      document.documentElement.style.setProperty('--primary-dark', cfg.corSecundaria); localStorage.setItem('saved_secondary_color', cfg.corSecundaria);
    } else if (cfg?.corPrimaria) {
      document.documentElement.style.setProperty('--primary-dark', cfg.corPrimaria);
    } else {
      const savedP = typeof window !== 'undefined' ? localStorage.getItem('saved_primary_color') : null;
      const savedS = typeof window !== 'undefined' ? localStorage.getItem('saved_secondary_color') : null;
      if (savedS) document.documentElement.style.setProperty('--primary-dark', savedS);
      else if (savedP) document.documentElement.style.setProperty('--primary-dark', savedP);
      else document.documentElement.style.removeProperty('--primary-dark');
    }
    
    if (cfg?.corAcento) {
      document.documentElement.style.setProperty('--blue', cfg.corAcento);
    } else {
      document.documentElement.style.removeProperty('--blue');
    }
    
            let temaAtivo = cfg?.tema || (typeof window !== 'undefined' ? localStorage.getItem('theme_preference') : null) || 'dark';
    if (temaAtivo === 'auto' && typeof window !== 'undefined') {
      temaAtivo = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    if (cfg?.corFundo) {
      document.documentElement.style.setProperty('--bg-primary', cfg.corFundo);
      document.documentElement.style.setProperty('--bg-secondary', cfg.corFundo);
      document.documentElement.style.setProperty('--bg-card', cfg.corFundo);

      let hex = cfg.corFundo.replace('#', '');
      if (hex.length === 3) hex = hex.split('').map(char => char + char).join('');
      if (hex.length === 6) {
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        
        if (brightness > 128) {
          temaAtivo = 'light';
        } else {
          temaAtivo = 'dark';
        }
      }
    } else {
      document.documentElement.style.removeProperty('--bg-primary');
      document.documentElement.style.removeProperty('--bg-secondary');
      document.documentElement.style.removeProperty('--bg-card');
    }
    
    document.documentElement.setAttribute('data-theme', temaAtivo);
    
    document.documentElement.style.removeProperty('--text-primary');
    document.documentElement.style.removeProperty('--text-secondary');
    document.documentElement.style.removeProperty('--text-muted');
    document.documentElement.style.removeProperty('--text-title');
    document.documentElement.style.removeProperty('--border');
  }, [cfg?.corPrimaria, cfg?.corSecundaria, cfg?.corAcento, cfg?.corFundo]);

  // COLD START: Lock on new session (tab open), but allow F5 reload
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (sessionStorage.getItem('is_unlocked') === 'true') {
        setBloqueadoBiometria(false);
      } else {
        setBloqueadoBiometria(true);
      }
    }
  }, []);

  // INACTIVITY: Lock (not logout) after timeout
  useEffect(() => {
    if (!autenticado || !cfg?.tempoInatividade || cfg.tempoInatividade <= 0) return;

    const timeoutMs = cfg.tempoInatividade * 60 * 1000;

    const checkInactivity = () => {
      const lastStr = localStorage.getItem('last_activity_timestamp');
      if (lastStr) {
        const last = parseInt(lastStr, 10);
        if (Date.now() - last >= timeoutMs) {
          setBloqueadoBiometria(true);
          return true;
        }
      }
      return false;
    };

    const resetTimer = () => {
      localStorage.setItem('last_activity_timestamp', Date.now().toString());
    };

    if (!checkInactivity()) {
      resetTimer();
    }

    const eventos = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'];
    eventos.forEach(ev => window.addEventListener(ev, resetTimer, { passive: true }));

    const onVisibilityChange = () => {
       if (document.visibilityState === 'visible') checkInactivity();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    const intervalCheck = setInterval(checkInactivity, 10000);

    return () => {
      clearInterval(intervalCheck);
      eventos.forEach(ev => window.removeEventListener(ev, resetTimer));
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [autenticado, cfg?.tempoInatividade]);

  
  // ATALHO GLOBAL: Alt + N para Novo Lançamento
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        // Verifica se não está bloqueado e o modal não está aberto
        if (!bloqueadoBiometria && !bloqueadoInatividade && !modalAberto) {
          setTransacaoEditar(null);
          setModalAberto(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [bloqueadoBiometria, bloqueadoInatividade, modalAberto]);

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      alert("📲 Para instalar o App não seu Computador ou Celular:\n\n1. No Chrome ou Edge, clique não ícone de instalação (💻 ou ➕) localizado não canto superior direito da barra de endereço.\n\n2. Clique em 'Instalar'. O aplicativo funcionará como um programa nativo com o novo ícone Dourado!");
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const { subscribeAuth } = await import('@/lib/auth');
        const { getConfiguracoes, seedDadosPadraoSeVazio } = await import('@/lib/storage');
        
        
        subscribeAuth(async (user, profile) => {
          let effectiveProfile = profile;
          const p = profile || effectiveProfile;
          if (!effectiveProfile && typeof window !== 'undefined') {
            const activeAuth = sessionStorage.getItem('active_session_auth');
            const activeProfileStr = sessionStorage.getItem('active_session_profile') || localStorage.getItem('active_session_profile');
            if (activeAuth === 'true' && activeProfileStr) {
              try {
                effectiveProfile = JSON.parse(activeProfileStr);
              } catch(e) {}
            }
          }

          if (effectiveProfile && (effectiveProfile as any).forceLogout) {
            const { logout } = await import('@/lib/auth');
            const { getDb } = await import('@/lib/firebase');
            const { doc, updateDoc } = await import('firebase/firestore');
            
            // clear the flag so they can log back in later
            try {
              const db = getDb();
              await updateDoc(doc(db, 'users', user!.uid), { forceLogout: false });
            } catch(e) {}
            
            await logout();
            alert('Sua sessão foi encerrada pelo administrador.');
            window.location.reload();
            return;
          }

          // ==========================================
          // MASTER BYPASS VERIFICATION & IMPERSONATION
          // ==========================================
          const isAdminFirebase = user && user.email && (user.email === 'clovis@financeai.com' || user.email === 'clovis@email.com' || user.email === 'clovis');
          if (typeof window !== 'undefined' && (() => { try { return sessionStorage.getItem('master_bypass'); } catch(e) { return null; } })()) { 
  // master bypass preserved 
}
const isMasterProfile = !effectiveProfile || !effectiveProfile.tenantId || effectiveProfile.tenantId === 'master' || effectiveProfile.uid === 'clovis-master-bypass';
          const isBypassAtivo = isMasterProfile && ((typeof window !== 'undefined' && (() => { try { return sessionStorage.getItem('master_bypass'); } catch(e) { return null; } })() === 'true') || isAdminFirebase);
          const impersonateTenantId = typeof window !== 'undefined' ? localStorage.getItem('impersonate_tenantId') : null;
          
          if (isBypassAtivo) {
             // ─── Master usa tenantId='9yxuafoC0AV9BrIKem05ponbmgn2' — banco original ───────
             const finalTenantId = impersonateTenantId || '9yxuafoC0AV9BrIKem05ponbmgn2';
             setTenantId(finalTenantId);
             setAutenticado(true);
             
             // If impersonating, we might want to act as the tenant's admin, but we can just use the master profile 
             // with the tenantId set. The backend storage.ts will route to the correct tenant.
             setUserProfile({
                uid: 'clovis-master-bypass',
                nome: impersonateTenantId ? `Master (Acessando ${impersonateTenantId})` : 'Clovis',
                email: 'clovis@financeai.com',
                role: 'admin',
                tenantId: finalTenantId,
                status: 'aprovado',
                lastLogin: new Date().toISOString()
             });
             
             // Try to load custom config if any, otherwise default
             const c = await getConfiguracoes('clovis-master-bypass').catch(() => null);
             setCfg(c);
             await seedDadosPadraoSeVazio();
             
             let temaAtivo = c?.tema || (typeof window !== 'undefined' ? localStorage.getItem('theme_preference') : null) || 'dark';
  if (temaAtivo === 'auto' && typeof window !== 'undefined') {
    temaAtivo = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
             document.documentElement.setAttribute('data-theme', temaAtivo);
             
             const storedLogin = localStorage.getItem('master_lastLogin');
             const agora = storedLogin ? new Date(storedLogin) : new Date();
             
             // Master backup check
             if (c?.backupAutomatico && c?.frequenciaBackup && c.frequenciaBackup !== 'nunca') {
                import('@/lib/backup').then(({ listarBackups, fazerBackup, shouldRunAutoBackup }) => {
                  listarBackups().then(backups => {
                    const autos = backups.filter(b => b.tipo === 'automatico');
                    const lastAuto = autos.length > 0 ? autos[0].dataHora : undefined;
                    
                    if (shouldRunAutoBackup(c.frequenciaBackup, c.horarioBackup, lastAuto)) {
                      console.log('Rodando backup automático (Master)...');
                      fazerBackup('automatico').catch(console.error);
                    }
                  }).catch(console.error);
                });
             }
             setDataAcesso(`${agora.toLocaleDateString('pt-BR')} - ${agora.getHours().toString().padStart(2,'0')}h${agora.getMinutes().toString().padStart(2,'0')}`);
             
             sessionStorage.setItem('current_user_name', 'Clovis (Master)');
             sessionStorage.setItem('current_user_email', 'clovis@financeai.com');
             sessionStorage.setItem('current_user_role', 'admin');
             sessionStorage.setItem('current_session_start', agora.toISOString());
             
             localStorage.setItem('current_user_name', 'Clovis (Master)');
             localStorage.setItem('current_user_email', 'clovis@financeai.com');
             localStorage.setItem('current_user_role', 'admin');
             localStorage.setItem('current_session_start', agora.toISOString());
             setAuthLoading(false);
             return; // Pula o resto da validação do Firebase!
          }

          if (user) {
            // Profile não veio? Busca novamente
            let p = profile || effectiveProfile;
            if (!p) {
               const { getUserProfile } = await import('@/lib/auth');
               p = await getUserProfile(user.uid);
            }
            
            const email = user.email || '';
            const isAdminEmail = email === 'clovis@financeai.com' || email === 'clovis@email.com' || email === 'clovis';
            
            if (!p && isAdminEmail) {
               // Admin não tem perfil, criar
               console.log("[page.tsx] Master não tem perfil, criando automático");
               const { doc, setDoc } = await import('firebase/firestore');
               const { getDb } = await import('@/lib/firebase');
               p = {
                 uid: user.uid,
                 nome: 'Clovis',
                 email: email,
                 role: 'admin',
                 status: 'aprovado',
                 createdAt: new Date().toISOString(),
                 lastLogin: new Date().toISOString()
               } as any;
               await setDoc(doc(getDb(), 'users', user.uid), p);
            }

            if (p) {
               // ─── SaaS TENANT BLOCK CHECK ────────────────────────────────
               let tenantAcessoPermitido = true;
               let tenantMensagem = "";
               if (p.tenantId && p.tenantId !== 'master') {
                 const { getDoc, doc } = await import('firebase/firestore');
                 const { getDb } = await import('@/lib/firebase');
                 const tenantSnap = await getDoc(doc(getDb(), 'tenants', p.tenantId!));
                 if (tenantSnap.exists()) {
                   const tData = tenantSnap.data();
                   if (tData.status === 'Bloqueado' || tData.status === 'pendente' || tData.status === 'suspensa' || tData.status === 'inadimplente') {
                     tenantAcessoPermitido = false;
                     tenantMensagem = tData.status === 'pendente' ? 'Sua licença foi gerada e aguarda o primeiro pagamento para liberação.' : 'O acesso desta empresa está suspenso. Contate o suporte.';
                   } else if (tData.dataVencimentoBloqueio) {
                     if (new Date() > new Date(tData.dataVencimentoBloqueio)) {
                       tenantAcessoPermitido = false;
                       tenantMensagem = "Assinatura vencida. O acesso foi bloqueado automaticamente.";
                     }
                   }
                 }
               }
               
               if (!tenantAcessoPermitido) {
                 // Seta os dados para mostrar a tela de bloqueio
                 const { getDoc, doc } = await import('firebase/firestore');
                 const { getDb } = await import('@/lib/firebase');
                 const tenantSnap = await getDoc(doc(getDb(), 'tenants', p.tenantId!));
                 setTenantBloqueadoData({
                   ...tenantSnap.data(),
                   mensagem: tenantMensagem,
                   id: p.tenantId
                 });
                 setAutenticado(true);
                 setUserProfile(p);
                 setAuthLoading(false);
               } else if (p.role === 'admin' || p.status === 'aprovado') {
                 setTenantId(p.tenantId || null);
                 setAutenticado(true);
                 setUserProfile(p);
                 
                  let sessionStart = p.lastLogin;
                  if (!sessionStart) {
                    sessionStart = new Date().toISOString();
                    p.lastLogin = sessionStart;
                    // Salva não banco de dados para que seja persistente a partir de agora
                    import('firebase/firestore').then(({ doc, setDoc }) => {
                       import('@/lib/firebase').then(({ getDb }) => {
                           setDoc(doc(getDb(), 'users', user.uid), { lastLogin: sessionStart }, { merge: true });
                       });
                    });
                  }
                  
                  const d = new Date(sessionStart);
                  setDataAcesso(`${d.toLocaleDateString('pt-BR')} - ${d.getHours().toString().padStart(2,'0')}h${d.getMinutes().toString().padStart(2,'0')}`);
                  
                  localStorage.setItem('current_session_start', sessionStart);
                  localStorage.setItem('current_user_name', p.nome || 'Sistema');
                  localStorage.setItem('current_user_email', p.email || '');
                  localStorage.setItem('current_user_role', p.role || 'usuario');
                  
                  // Also set in sessionStorage just in case other parts still use it
                  sessionStorage.setItem('current_session_start', sessionStart);
                  sessionStorage.setItem('current_user_name', p.nome || 'Sistema');
                  sessionStorage.setItem('current_user_email', p.email || '');
                  sessionStorage.setItem('current_user_role', p.role || 'usuario');

                 const c = await getConfiguracoes(user.uid);
                 setCfg(c);
                 await seedDadosPadraoSeVazio();
                 
                 // Auto backup check
                 if (c?.backupAutomatico && c?.frequenciaBackup && c.frequenciaBackup !== 'nunca') {
                    import('@/lib/backup').then(({ listarBackups, fazerBackup, shouldRunAutoBackup }) => {
                      listarBackups().then(backups => {
                        const autos = backups.filter(b => b.tipo === 'automatico');
                        const lastAuto = autos.length > 0 ? autos[0].dataHora : undefined;
                        
                        if (shouldRunAutoBackup(c.frequenciaBackup, c.horarioBackup, lastAuto)) {
                          console.log('Rodando backup automático...');
                          fazerBackup('automatico').catch(console.error);
                        }
                      }).catch(console.error);
                    });
                 }
                 
                 let temaAtivo = c?.tema || (typeof window !== 'undefined' ? localStorage.getItem('theme_preference') : null) || 'dark';
  if (temaAtivo === 'auto' && typeof window !== 'undefined') {
    temaAtivo = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
                 document.documentElement.setAttribute('data-theme', temaAtivo);
               } else {
                 // user but not aprovado
                 setAutenticado(false);
                 setUserProfile(null);
                 setCfg(null);
                 const { getFirebaseAuth } = await import('@/lib/auth');
                 await getFirebaseAuth().signOut();
               }
            } else {
               // User exists in auth but não profile in firestore, force logout
               setAutenticado(false);
               setUserProfile(null);
               setCfg(null);
               const { getFirebaseAuth } = await import('@/lib/auth');
               await getFirebaseAuth().signOut();
            }
          } else {
            // Nenhum user logado (e sem bypass)
              setAutenticado(false);
              setUserProfile(null);
              const { getConfiguracoes } = await import('@/lib/storage');
              const c = await getConfiguracoes('app').catch(() => null);
              setCfg(c);
              if (c?.tema && typeof document !== 'undefined') {
                  document.documentElement.setAttribute('data-theme', c.tema);
              }
          }
          setAuthLoading(false);
        });

      } catch (error) {
        console.error('Erro na autenticação:', error);
        setAuthLoading(false);
      } finally {
          // Removemos o setDataAcesso do finally para não sobrescrever o horário do login
        setMounted(true);
      }
    })();
  }, [refreshKey]);


  useEffect(() => {
    if (cfg?.fotoPerfil && typeof window !== 'undefined') {
      localStorage.setItem('cached_foto_perfil', cfg.fotoPerfil);
    }
  }, [cfg?.fotoPerfil]);

  // Persistir paginaAtual
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('paginaAtual', paginaAtual);
    }
  }, [paginaAtual]);

  // AUTO-FIX V5 - AJUSTAR LIMITE CARTAO
  useEffect(() => {
    if (autenticado && typeof window !== 'undefined' && localStorage.getItem('cartao_autofix_v1') !== 'true') {
      import('@/lib/storage').then(async (m) => {
        try {
          const cartoes = await m.getCartoes();
          const cartao = cartoes.find(c => c.nome === 'Mercado Pago');
          if (cartao) {
            cartao.limite = 1700;
            cartao.limiteDisponivel = 904.22;
            await m.salvarCartao(cartao);
            localStorage.setItem('cartao_autofix_v1', 'true');
            alert('Aviso Automático: Limite do cartão corrigido com sucesso para Disponível: R$ 904,22 e Utilizado: R$ 795,78 (Total: 1700)!');
            window.location.reload();
          }
        } catch(e) { console.error(e); }
      });
    }
  }, [autenticado]);

  // AUTO-FIX V4 - REABRIR E PAGAR AUTOMATICAMENTE COM JUROS
  useEffect(() => {
    if (autenticado && typeof window !== 'undefined' && localStorage.getItem('fatura_autofix_done_v4') !== 'true') {
      import('@/lib/storage').then(async (m) => {
        try {
          const { getDb } = await import('@/lib/firebase');
          const { collection, getDocs, query, where } = await import('firebase/firestore');
          const db = getDb();
          
          // Acha a fatura
          const faturasRef = collection(db, m.getCollectionPath('faturas'));
          const qFatura = query(faturasRef, where('cartaoNome', '==', 'Mercado Pago'), where('mesReferencia', '==', '2026-08'));
          const snapFatura = await getDocs(qFatura);
          
          if (!snapFatura.empty) {
            const faturaDoc = snapFatura.docs[0];
            const faturaId = faturaDoc.id;
            
            // Acha a conta Mercado Pago para o debito
            const contasRef = collection(db, m.getCollectionPath('contas'));
            const snapContas = await getDocs(contasRef);
            let contaAlvo = { id: '', nome: '' };
            snapContas.forEach(d => {
              if (d.data().nome.toLowerCase().includes('mercado pago')) {
                contaAlvo = { id: d.id, nome: d.data().nome };
              }
            });
            
            // Se não achar, pega a primeira
            if (!contaAlvo.id && !snapContas.empty) {
               contaAlvo = { id: snapContas.docs[0].id, nome: snapContas.docs[0].data().nome };
            }

            console.log('AUTO-FIX V4: REABRINDO FATURA:', faturaId);
            await m.reabrirFatura(faturaId);
            
            // Aguarda 1 segundo para garantir que Firestore salvou
            await new Promise(r => setTimeout(r, 1000));
            
            console.log('AUTO-FIX V4: PAGANDO FATURA COM JUROS...');
            await m.pagarFatura(
               faturaId, 
               1870.00, // Valor CC
               contaAlvo.id, 
               contaAlvo.nome, 
               'pix', 
               '2026-08-03', 
               14.90 // Juros
            );
            
            alert('PRONTO! Fatura reaberta e re-paga automaticamente com juros embutidos e sem duplicidade!');
            window.location.reload();
          }
          localStorage.setItem('fatura_autofix_done_v4', 'true');
        } catch(e) { console.error('Erro no autofix V4', e); }
      });
    }
  }, [autenticado]);

  // Hook de inatividade global
  useEffect(() => {
    if (!autenticado || !cfg?.tempoInatividade || cfg.tempoInatividade <= 0) return;

    let timeoutId: NodeJS.Timeout;

    const resetarTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setBloqueadoInatividade(true);
        handleLogout();
      }, cfg.tempoInatividade! * 60 * 1000);
    };

    const eventos = ['mousemove', 'keydown', 'wheel', 'touchstart', 'click'];
    
    eventos.forEach(evento => window.addEventListener(evento, resetarTimer));
    resetarTimer(); // Inicializa o timer

    return () => {
      clearTimeout(timeoutId);
      eventos.forEach(evento => window.removeEventListener(evento, resetarTimer));
    };
  }, [autenticado, cfg?.tempoInatividade]);

  if (!mounted || authLoading) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#0f0a0a' }}>
        <div style={{ textAlign:'center' }}>
          
          {(() => {
            const cachedLogo = typeof window !== 'undefined' ? localStorage.getItem('cached_foto_perfil') : null;
            const finalLogo = cfg?.fotoPerfil || cachedLogo || "/icon.png?v=10";
            return <img src={finalLogo} alt="ERP Logo Dourado" style={{ width: 84, height: 84, marginBottom: 16, borderRadius: '50%', objectFit: 'cover', filter: 'drop-shadow(0 6px 16px rgba(255,215,0,0.35))' }} />
          })()}
          <div style={{ color:'#ffffff', fontSize:22, fontWeight:800, letterSpacing:'-0.5px' }}>{cfg?.nomeSistema || 'Sistema Financeiro ERP Pro'}</div>
          <div style={{ color:'#ffd700', fontSize:13, fontWeight:600, marginTop:8 }}>Iniciando ambiente bancário seguro...</div>
        </div>
      </div>
    );
  }

  if (!autenticado) {
    return (
      <>
        <Login configuracoes={cfg || { nomeSistema: 'FinanceAI' } as any} onLogin={async (profile) => {
          sessionStorage.setItem('active_session_auth', 'true');
          sessionStorage.setItem('active_session_profile', JSON.stringify(profile));
          localStorage.setItem('last_activity_timestamp', Date.now().toString());
          // ─── Banco separado: master = tenants/9yxuafoC0AV9BrIKem05ponbmgn2/, clientes = tenants/{slug}/ ───
          const isBypassLogin = (typeof window !== 'undefined' && (() => { try { return sessionStorage.getItem('master_bypass'); } catch(e) { return null; } })() === 'true') || (profile && profile.email && (profile.email === 'clovis@financeai.com' || profile.email === 'clovis@email.com' || profile.email === 'clovis'));
          
          const efectiveTenantId = (!profile.tenantId && isBypassLogin) ? '9yxuafoC0AV9BrIKem05ponbmgn2' : (profile.tenantId || null);
          
          if (efectiveTenantId) {
            const { setTenantId } = await import('@/lib/storage');
            setTenantId(efectiveTenantId);
          }

          setAutenticado(true);
          setUserProfile(profile);
          setDataAcesso(new Date().toLocaleString('pt-BR'));
          
          // Refetch configuracoes com base no novo tenantId
          const { getConfiguracoes } = await import('@/lib/storage');
          const c = await getConfiguracoes(profile.uid);
          setCfg(c);
          
          // ─── Aplica o tema imediatamente (bypass não passa pelo subscribeAuth) ───
          let temaAtivo = c?.tema || (typeof window !== 'undefined' ? localStorage.getItem('theme_preference') : null) || 'dark';
  if (temaAtivo === 'auto' && typeof window !== 'undefined') {
    temaAtivo = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
          if (typeof document !== 'undefined') {
            document.documentElement.setAttribute('data-theme', temaAtivo);
          }
          
          // Seed para TODOS os usuários (inclusive master bypass)
          const { seedDadosPadraoSeVazio } = await import('@/lib/storage');
          await seedDadosPadraoSeVazio().catch(() => {});
          
          // Feature flags apenas para clientes com tenantId
          if (!profile.tenantId) return;
          try {
            const { getDb } = await import('@/lib/firebase');
            const { doc, getDoc } = await import('firebase/firestore');
            const licencaDoc = await getDoc(doc(getDb(), 'admin_master_licencas', profile.tenantId));
            if (licencaDoc.exists() && licencaDoc.data().configuracoes?.modulos) {
              setModulosAtivos(licencaDoc.data().configuracoes.modulos);
            }
          } catch (e) { console.error('Erro módulos', e); }
        }} />
      </>
    );
  }

  let navItemsFiltrados = [...NAV_ITEMS];
  const isMasterOrAdmin = userProfile?.role === 'admin' || (typeof window !== 'undefined' && (() => { try { return sessionStorage.getItem('master_bypass'); } catch(e) { return null; } })() === 'true');
  
  // ─── PERMISSION-BASED NAV FILTERING ──────────────────────────────────
  // Uses MENU_PERMISSION_MAP: each nav page maps to a single menu_* toggle.
  // If the toggle is false/missing, the menu is completely hidden.
  // MENU_PERMISSION_MAP imported at top

  if (isMasterOrAdmin) {
    // Admin/Master sees everything
    
    // Somente o Super Admin (Master) vê o atalho de licenças do SaaS
    const isSuperAdminMaster = typeof window !== 'undefined' && (() => { try { return sessionStorage.getItem('master_bypass'); } catch(e) { return null; } })() === 'true' || userProfile?.uid === 'clovis-master-bypass' || userProfile?.email?.includes('clovis@financeai.com');
    if (isSuperAdminMaster) {
      navItemsFiltrados.push(
        { id: 'licencas' as Pagina, label: 'Painel Master', icon: BookOpen, grupo: 'Configurações' }
      );
    }
    
    // Even if admin, check feature flags for Premium modules
    navItemsFiltrados = navItemsFiltrados.filter(item => {
      if (item.id === 'relatorio_avancado' && !modulosAtivos?.relatorioAvancado) {
        return false;
      }
      return true;
    });
  } else {
    // Non-admin: filter nav items based on user's menu_* permissions
    const perms = userProfile?.permissoes || {};
    navItemsFiltrados = navItemsFiltrados.filter(item => {
      if (item.id === 'relatorio_avancado' && !modulosAtivos?.relatorioAvancado) {
        return false;
      }
      
      const menuPermKey = MENU_PERMISSION_MAP[item.id];
      if (!menuPermKey) return false; // Unknown page = hide
      return perms[menuPermKey] === true;
    });
  }

  const renderPagina = () => {
    switch (paginaAtual) {
      case 'dashboard':     return <Dashboard     key={refreshKey} onNovoLancamento={() => { setTransacaoEditar(null); setModalAberto(true); }} onEditarLancamento={(t) => { setTransacaoEditar(t); setModalAberto(true); }} onDuplicarLancamento={(t: any) => { setTransacaoEditar({...t, id: undefined, dataVencimento: new Date().toISOString().split('T')[0], dataPagamento: null, status: 'pendente'}); setModalAberto(true); }} onNavigateToLancamentos={(filtro?: string) => { setFiltroRapidoLancamentos(filtro || ''); setPaginaAtual('lancamentos'); }} onNavigateToCartoes={(id?: string) => { setFaturaDestinoId(id || null); setPaginaAtual('contas'); }} />;
      case 'dashboard_mensal': return <DashboardMensal key={refreshKey} />;
      case 'cfo':           return <PlanejamentoOrcamentario key={refreshKey} />;
      case 'extrato':       return <ExtratoBancario key={refreshKey} />;
      case 'lancamentos':   return versaoUi === 'v1' ? <Lancamentos key={refreshKey} onNovoLancamento={() => { setTransacaoEditar(null); setModalAberto(true); }} onEditarLancamento={(t) => { setTransacaoEditar(t); setModalAberto(true); }} onDuplicarLancamento={(t: any) => { setTransacaoEditar({...t, id: undefined, dataVencimento: new Date().toISOString().split('T')[0], dataPagamento: null, status: 'pendente'}); setModalAberto(true); }} filtroRapido={filtroRapidoLancamentos} /> : <LancamentosV2 key={refreshKey} onNovoLancamento={() => { setTransacaoEditar(null); setModalAberto(true); }} onEditarLancamento={(t) => { setTransacaoEditar(t); setModalAberto(true); }} onDuplicarLancamento={(t: any) => { setTransacaoEditar({...t, id: undefined, dataVencimento: new Date().toISOString().split('T')[0], dataPagamento: null, status: 'pendente'}); setModalAberto(true); }} filtroRapido={filtroRapidoLancamentos} />;
      case 'calendario':    return <CalendarioFinanceiro key={refreshKey} />;
      case 'conciliacao':   return <CentralConciliacao key={refreshKey} />;
      case 'aprovacoes':    return <CentralAprovacoes key={refreshKey} />;
      case 'regras':        return <RegrasAutomacaoTab key={refreshKey} />;
      case 'relatorios':    return <Relatorios    key={refreshKey} />;
      case 'relatorio_avancado': return <RelatorioAvancado key={refreshKey} />;
      case 'contas':        return <Contas key={refreshKey} faturaOpenId={faturaDestinoId} onClearFaturaOpen={() => setFaturaDestinoId(null)} />;
      case 'cadastros':     return <Cadastros     key={refreshKey} />;
      case 'chat':          return versaoUi === 'v1' ? <ChatIA key={refreshKey} /> : <ChatIAV2 key={refreshKey} />;
      case 'configuracoes': return <Configuracoes key={refreshKey} />;
      case 'atualizacoes':  return <AtualizacoesCliente key={refreshKey} />;
      case 'admin':         return <AdminPanel    key={refreshKey} />;
      case 'auditoria':     return <AuditoriaTab  key={refreshKey} />;
      case 'licencas':      
        if (typeof window !== 'undefined') window.location.href = '/master';
        return <div className="p-8 text-center">Redirecionando para o Painel Master...</div>;
      case 'equipe':        return <Equipe        key={refreshKey} />;
      case 'metas':         return versaoUi === 'v1' ? <MetasGamificadas key={refreshKey} /> : <MetasGamificadasV2 key={refreshKey} />;
      case 'cartoes':       return <CorporateCards key={refreshKey} />;
      case 'investimentos': return <HubInvestimentos key={refreshKey} />;
      case 'dashboard_v2':  return <Dashboard key={refreshKey} onNovoLancamento={() => { setTransacaoEditar(null); setModalAberto(true); }} onEditarLancamento={(t) => { setTransacaoEditar(t); setModalAberto(true); }} onDuplicarLancamento={(t: any) => { setTransacaoEditar({...t, id: undefined, dataVencimento: new Date().toISOString().split('T')[0], dataPagamento: null, status: 'pendente'}); setModalAberto(true); }} onNavigateToLancamentos={(filtro?: string) => { setFiltroRapidoLancamentos(filtro || ''); setPaginaAtual('lancamentos'); }} onNavigateToCartoes={(id?: string) => { setFaturaDestinoId(id || null); setPaginaAtual('contas'); }} />;
      case 'cfo_legacy':    return <Dashboard key={refreshKey} onNovoLancamento={() => setModalAberto(true)} onNavigateToLancamentos={(filtro?: string) => { setFiltroRapidoLancamentos(filtro || ''); setPaginaAtual('lancamentos'); }} onNavigateToCartoes={(id?: string) => { setFaturaDestinoId(id || null); setPaginaAtual('contas'); }} />;
      default:              return <Dashboard key={refreshKey} onNovoLancamento={() => { setTransacaoEditar(null); setModalAberto(true); }} onEditarLancamento={(t) => { setTransacaoEditar(t); setModalAberto(true); }} onDuplicarLancamento={(t: any) => { setTransacaoEditar({...t, id: undefined, dataVencimento: new Date().toISOString().split('T')[0], dataPagamento: null, status: 'pendente'}); setModalAberto(true); }} onNavigateToLancamentos={(filtro?: string) => { setFiltroRapidoLancamentos(filtro || ''); setPaginaAtual('lancamentos'); }} onNavigateToCartoes={(id?: string) => { setFaturaDestinoId(id || null); setPaginaAtual('contas'); }} />;
    }
  };

  return (
    <>
      <AutoBackup />
      <ToastContainer />
      <FloatingScroller />
      <NotificationDrawer aberto={drawerNotificacoesAberto} onClose={() => setDrawerNotificacoesAberto(false)} />

      {/* TELA DE BLOQUEIO (cold start + inatividade) */}
      {bloqueadoBiometria && (
        <LockScreen
          usuarioNome={cfg?.nomeUsuario || userProfile?.nome || 'Usuário'}
          onDesbloquear={async (senha) => {
            if (!senha) {
              setBloqueadoBiometria(false); sessionStorage.setItem('is_unlocked', 'true');
              localStorage.setItem('last_activity_timestamp', Date.now().toString());
              return true;
            }
            const isMaster = (() => { try { return sessionStorage.getItem('master_bypass'); } catch(e) { return null; } })() === 'true' || userProfile?.uid === 'clovis-master-bypass';
            if (isMaster) {
              if (senha === '302010') {
                setBloqueadoBiometria(false); sessionStorage.setItem('is_unlocked', 'true');
                localStorage.setItem('last_activity_timestamp', Date.now().toString());
                return true;
              }
              return false;
            }
            try {
              const { getAuth, signInWithEmailAndPassword } = await import('firebase/auth');
              const fbAuth = getAuth();
              const currentEmail = fbAuth.currentUser?.email || userProfile?.email;
              if (currentEmail) {
                await signInWithEmailAndPassword(fbAuth, currentEmail, senha);
                setBloqueadoBiometria(false); sessionStorage.setItem('is_unlocked', 'true');
                localStorage.setItem('last_activity_timestamp', Date.now().toString());
                return true;
              }
              if (cfg?.senha && senha === cfg.senha) {
                setBloqueadoBiometria(false); sessionStorage.setItem('is_unlocked', 'true');
                localStorage.setItem('last_activity_timestamp', Date.now().toString());
                return true;
              }
              return false;
            } catch (e) {
              if (cfg?.senha && senha === cfg.senha) {
                setBloqueadoBiometria(false); sessionStorage.setItem('is_unlocked', 'true');
                localStorage.setItem('last_activity_timestamp', Date.now().toString());
                return true;
              }
              return false;
            }
          }}
          onLogout={handleLogout}
          isBiometria={false}
        />
      )}

      {tenantBloqueadoData ? (<>
        <div className="flex h-screen w-screen bg-[#0f172a] items-center justify-center p-4">
          <div className="bg-[#1e293b] border border-red-500/30 rounded-3xl p-8 max-w-lg w-full text-center shadow-2xl shadow-red-900/20">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <LogOut size={40} className="text-red-500" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">{tenantBloqueadoData.mensagem?.includes('aguarda') ? 'Aguardando Pagamento' : 'Acesso Suspenso'}</h1>
            <p className="text-gray-400 mb-6">{tenantBloqueadoData.mensagem}</p>
            <div className="bg-[#0f172a] rounded-xl p-5 mb-6 text-left border border-[#334155]">
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Detalhes da Assinatura</h3>
              <div className="flex justify-between mb-2">
                <span className="text-gray-400">Empresa</span>
                <span className="text-white font-medium">{tenantBloqueadoData.nome || tenantBloqueadoData.nomeFantasia}</span>
              </div>
              <div className="flex justify-between mb-4">
                <span className="text-gray-400">Planão</span>
                <span className="text-white font-medium capitalize">{tenantBloqueadoData.planão}</span>
              </div>
              <div className="flex justify-between border-t border-[#334155] pt-4 mt-2">
                <span className="text-gray-400">Valor Pendente</span>
                <span className="text-green-400 font-bold text-xl">R$ {tenantBloqueadoData.valorAssinatura?.toFixed(2).replace('.',',')}</span>
              </div>
            </div>

            
            <div className="bg-[#0f172a] rounded-xl p-5 mb-4 text-left border border-[#334155]">
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">Opções de Pagamento</h3>
              <p className="text-gray-400 text-xs mb-3">Após o pagamento, clique em "Já Paguei" para notificar e agilizar a liberação.</p>
              
              <div className="flex flex-col md:flex-row gap-4 mb-4">
                <div className="flex-1 bg-white/5 border border-white/10 p-4 rounded-xl flex flex-col items-center">
                  <h4 className="text-white font-medium mb-3 text-sm">PIX (Aprovação Imediata)</h4>
                  <div className="bg-white p-2 rounded-xl mb-3">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(generatePixPayload('02398455955', 'Clovis Grando', 'Sao Paulo', tenantBloqueadoData.valorAssinatura || 0))}`} 
                      alt="QR Code PIX" 
                      className="w-32 h-32" 
                    />
                  </div>
                  <div className="flex items-center w-full bg-[#1e293b] p-2 rounded border border-[#334155]">
                     <span className="text-xs text-gray-400 truncate flex-1 mr-2">02398455955</span>
                     <button onClick={() => { navigator.clipboard.writeText('02398455955'); alert('Chave PIX copiada!'); }} className="text-blue-400 hover:text-blue-300 text-xs font-bold px-2 py-1 bg-blue-500/10 rounded">Copiar</button>
                  </div>
                </div>

                <div className="flex-1 bg-white/5 border border-white/10 p-4 rounded-xl flex flex-col items-center justify-center">
                  <h4 className="text-white font-medium mb-3 text-sm">Boleto Bancário</h4>
                  <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400"><path d="M3 5h18"/><path d="M3 9h18"/><path d="M3 13h18"/><path d="M3 17h18"/><path d="M3 21h18"/></svg>
                  </div>
                  <p className="text-gray-400 text-xs text-center mb-4">O pagamento via boleto pode levar até 3 dias úteis para ser compensado.</p>
                  <button 
                    onClick={() => setMostrarBoleto(true)}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Gerar Boleto
                  </button>
                </div>
              </div>

              {tenantBloqueadoData.valorAssinatura ? <p className="text-center text-sm text-gray-400">Total a pagar: <span className="text-green-400 font-bold text-lg">R$ {tenantBloqueadoData.valorAssinatura.toFixed(2).replace('.', ',')}</span></p> : null}
            </div>
<div className="flex gap-3 mt-2">
              <button onClick={() => {
                 setAutenticado(false);
                 setUserProfile(null);
                 setTenantBloqueadoData(null);
                 import('@/lib/auth').then(m => m.getFirebaseAuth().signOut());
              }} className="flex-1 px-4 py-3 bg-[#334155] text-white rounded-xl font-medium hover:bg-[#475569] transition-colors text-sm">
                Sair
              </button>
              <button onClick={() => alert('Notificação enviada! Nossa equipe irá verificar o pagamento e liberar seu acesso em breve.')} className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-500 transition-colors text-sm">
                ✓ Já Paguei
              </button>
            </div>

          </div>
        </div>

      {/* BOLETO MODAL */}
      {mostrarBoleto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="bg-gray-100 px-6 py-4 border-b border-gray-200 flex justify-between items-center shrink-0">
              <h2 className="text-xl font-bold text-gray-800">Boleto Bancário</h2>
              <div className="flex gap-2">
                <button onClick={() => window.print()} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium text-sm transition-colors flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                  Imprimir
                </button>
                <button onClick={() => setMostrarBoleto(false)} className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded font-medium text-sm transition-colors">
                  Fechar
                </button>
              </div>
            </div>
            
            <div className="p-8 overflow-y-auto bg-white text-black print:p-0 print:m-0" id="boleto-content">
              {/* Recibo do Pagador */}
              <div className="border border-black p-2 mb-8 text-xs relative">
                <div className="flex border-b border-black pb-2 mb-2 items-end">
                  <div className="w-32 font-bold text-xl tracking-tighter">BANCO DO BRASIL</div>
                  <div className="px-4 font-bold text-lg border-x border-black mx-4">001-9</div>
                  <div className="flex-1 text-right font-bold text-lg">00190.00009 00000.000000 00000.000000 1 00000000000000</div>
                </div>
                
                <div className="grid grid-cols-4 gap-2 mb-2">
                  <div className="col-span-3 border-r border-black pr-2">
                    <span className="block text-[10px] text-gray-600">Local de Pagamento</span>
                    <span className="font-semibold text-sm">PAGÁVEL EM QUALQUER BANCO ATÉ O VENCIMENTO</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-gray-600">Vencimento</span>
                    <span className="font-semibold text-sm">{new Date().toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 mb-2 border-t border-black pt-2">
                  <div className="col-span-3 border-r border-black pr-2">
                    <span className="block text-[10px] text-gray-600">Beneficiário</span>
                    <span className="font-semibold text-sm">FINANCE SAAS LTDA - CNPJ: 00.000.000/0001-00</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-gray-600">Agência/Código Beneficiário</span>
                    <span className="font-semibold text-sm">1234-5 / 123456-7</span>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 mb-2 border-t border-black pt-2">
                  <div>
                    <span className="block text-[10px] text-gray-600">Data do Documento</span>
                    <span className="font-semibold text-sm">{new Date().toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-gray-600">Nº do Documento</span>
                    <span className="font-semibold text-sm">FAT-{Math.floor(Math.random() * 100000)}</span>
                  </div>
                  <div className="border-r border-black pr-2">
                    <span className="block text-[10px] text-gray-600">Espécie Doc.</span>
                    <span className="font-semibold text-sm">DM</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-gray-600">Nosso Número</span>
                    <span className="font-semibold text-sm">12345678901</span>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 mb-4 border-t border-black pt-2">
                  <div className="col-span-3 border-r border-black pr-2">
                    <span className="block text-[10px] text-gray-600">Pagador</span>
                    <span className="font-semibold text-sm">{tenantBloqueadoData?.nome || tenantBloqueadoData?.nomeFantasia}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-gray-600">Valor do Documento</span>
                    <span className="font-bold text-base">R$ {(tenantBloqueadoData?.valorAssinatura || 0).toFixed(2).replace('.', ',')}</span>
                  </div>
                </div>

                <div className="mt-8 flex justify-center">
                  <img src="https://barcode.orcascan.com/?type=code128&data=00190000090000000000000000000000100000000000000" alt="Código de Barras" className="h-16 w-3/4 object-fill" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )} </>

      ) : (
      <div className="app-layout-root" style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', maxWidth: '100vw', overflow: 'hidden' }}>
        
        {/* BANNER MODO SUPORTE */}
        {(userProfile as any)?.isImpersonating && (
          <div suppressHydrationWarning className="bg-red-600 text-white px-4 py-2 flex items-center justify-between z-[9999] relative font-bold">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              MODO SUPORTE: Você está logado na licença de <span suppressHydrationWarning>{typeof window !== 'undefined' ? localStorage.getItem('suporte_impersonate_nome') : ''}</span>
            </div>
            <button 
              onClick={() => {
                localStorage.removeItem('suporte_impersonate_tenant');
                localStorage.removeItem('suporte_impersonate_nome');
                window.location.href = '/master/licencas';
              }}
              className="bg-white text-red-600 px-3 py-1 rounded text-sm hover:bg-red-50"
            >
              Encerrar Suporte
            </button>
          </div>
        )}

        {userProfile?.uid && !bloqueadoBiometria && !bloqueadoInatividade && !tenantBloqueadoData && (
          <DailyReminderPopup userId={userProfile.uid} setActiveTab={tab => setPaginaAtual(tab as Pagina)} />
        )}

        {/* HEADER BANCÁRIO NUBANK/INTER (RED #cc0000) */}
        <DashboardHeader cfg={cfg} userProfile={userProfile} dataAcesso={dataAcesso} onLogout={handleLogout} />

        {/* BODY CONTAINER (SIDEBAR + MAIN) */}
        <div className="app-body-container" style={{ display: 'flex', flex: 1, width: '100%', maxWidth: '100vw', overflow: 'hidden', position: 'relative' }}>
          
          {/* OVERLAY PARA MOBILE */}
          {mobileMenuAberto && (
             <div 
               className="mobile-overlay"
               onClick={() => setMobileMenuAberto(false)}
               style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 90, backdropFilter: 'blur(2px)' }}
             />
          )}

          {/* SIDEBAR */}
          <aside className={`sidebar ${mobileMenuAberto ? 'mobile-open' : ''}`}>
            <button className="flex items-center justify-center gap-2 w-full mb-6 bg-white py-3 rounded-2xl font-black text-sm transition-all border-b-[5px] border-gray-300 active:border-b-0 active:translate-y-[5px] shadow-[0_6px_15px_rgba(0,0,0,0.2)] hover:shadow-[0_8px_25px_rgba(0,0,0,0.3)] hover:brightness-95" style={{ letterSpacing: '0.5px', color: 'var(--primary)' }}
              onClick={() => { setMobileMenuAberto(false); setTransacaoEditar(null); setModalAberto(true); }}>
              <PlusCircle size={20} strokeWidth={2.5} />
              <span>Novo Lançamento</span>
            </button>
            <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto', paddingRight: 4 }}>
              {(() => {
                const grupos = navItemsFiltrados.reduce((acc, item) => {
                  const g = item.grupo || 'Outros';
                  if (!acc[g]) acc[g] = [];
                  acc[g].push(item);
                  return acc;
                }, {} as Record<string, typeof navItemsFiltrados>);

                // Fixar a ordem dos grupos para manter a consistência
                const ordemDesejada = ['Principal', 'Inteligência', 'Gestão', 'Operacional', 'Configurações', 'Outros'];
                const chavesOrdenadas = Object.keys(grupos).sort((a, b) => {
                    let idxA = ordemDesejada.indexOf(a);
                    let idxB = ordemDesejada.indexOf(b);
                    if(idxA === -1) idxA = 999;
                    if(idxB === -1) idxB = 999;
                    return idxA - idxB;
                });

                return chavesOrdenadas.map((nomeGrupo) => {
                  const itens = grupos[nomeGrupo];
                  return (
                    <div key={nomeGrupo} style={{ marginBottom: 2 }}>
                      <div 
                        onClick={() => toggleGrupo(nomeGrupo)}
                        style={{ 
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                          padding: '8px 12px', cursor: 'pointer', 
                          color: 'rgba(255,255,255,0.7)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
                          borderRadius: 6
                        }}
                        className="transition-colors hover:bg-white/10"
                      >
                        {nomeGrupo}
                        {gruposExpandidos[nomeGrupo] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </div>
                      
                      <div 
                         style={{ 
                            display: 'flex', flexDirection: 'column', gap: 2, 
                            overflow: 'hidden',
                            transition: 'max-height 0.3s ease-in-out',
                            maxHeight: gruposExpandidos[nomeGrupo] ? '500px' : '0px'
                         }}
                      >
                        {itens.map(item => {
                          const Icon = item.icon;
                          return (
                            <button key={item.id}
                              className={`sidebar-link ${paginaAtual === item.id ? 'active' : ''}`}
                              onClick={() => { 
                                if (item.id === 'licencas') {
                                  window.location.href = '/master';
                                } else {
                                  setPaginaAtual(item.id); 
                                  setMobileMenuAberto(false); 
                                }
                              }}>
                              <Icon size={17} />
                              {item.label}
                              {item.id === 'licencas' && <span style={{marginLeft: 'auto', background: '#ef4444', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 10, fontWeight: 'bold', textShadow: '0 1px 2px rgba(0,0,0,0.3)'}}>NOVO MASTER</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()}
            </nav>
            <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
              <button
                style={{ 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '12px', background: 'rgba(255,255,255,0.2)', color: '#fff', borderRadius: '12px',
                  fontWeight: 700, fontSize: '13px', cursor: 'pointer', border: 'none',
                  boxShadow: '0 4px 0 rgba(0,0,0,0.2), 0 4px 10px rgba(0,0,0,0.1)',
                  transition: 'all 0.1s ease',
                  marginTop: '4px'
                }}
                onMouseDown={(e) => { e.currentTarget.style.transform = 'translateY(4px)'; e.currentTarget.style.boxShadow = '0 0px 0 rgba(0,0,0,0.2), 0 2px 4px rgba(0,0,0,0.1)'; }}
                onMouseUp={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 0 rgba(0,0,0,0.2), 0 4px 10px rgba(0,0,0,0.1)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 0 rgba(0,0,0,0.2), 0 4px 10px rgba(0,0,0,0.1)'; }}
                onClick={handleLogout}>
                <LogOut size={17} color="#fff" />
                Sair do Sistema
              </button>
              <div style={{ textAlign: 'center', marginTop: 12, fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>
                FinanceAI v2.0 Ultra &bull; Firebase &bull; Vercel
              </div>
            </div>
          </aside>

          {/* MAIN */}
          <main className="main-content" style={{ flex: 1, height: '100%', overflowY: 'auto', overflowX: 'hidden' }}>
            <ErrorBoundary fallbackTitle="Erro ao carregar o módulo do Dashboard">{renderPagina()}</ErrorBoundary>
          </main>
        </div>

        {/* BOTTOM NAV MOBILE */}
        <nav className="bottom-nav">
          {[
            { id: 'dashboard', label: 'Início', icon: LayoutDashboard },
            { id: 'lancamentos', label: 'Lançamentos', icon: ListOrdered },
            { id: 'metas', label: 'Metas', icon: Target },
          ].map(item => (
              <button key={item.id}
                className={`bottom-nav-item ${paginaAtual === item.id && !mobileMenuAberto ? 'active' : ''}`}
                onClick={() => { setPaginaAtual(item.id as Pagina); setMobileMenuAberto(false); }}>
                <item.icon size={20} />
                <span>{item.label}</span>
              </button>
          ))}
          
          <button 
            className="bottom-nav-item"
            onClick={() => { setCmdPaletteAberto(true); setMobileMenuAberto(false); }}>
            <Search size={20} />
            <span>Buscar</span>
          </button>
          <button 
            className={`bottom-nav-item ${mobileMenuAberto ? 'active' : ''}`}
            onClick={() => setMobileMenuAberto(!mobileMenuAberto)}>
            <Menu size={20} />
            <span>Menu</span>
          </button>
        </nav>

      {/* MOBILE FAB */}
      <button className="mobile-fab" onClick={() => { setTransacaoEditar(null); setModalAberto(true); }}>
        <PlusCircle size={24} />
      </button>

      {modalAberto && (
        <ModalLancamento
          onClose={() => { setModalAberto(false); setTransacaoEditar(null); }}
          onSalvo={() => { setModalAberto(false); setTransacaoEditar(null); setRefreshKey(k => k + 1); }}
          transacaoEditar={transacaoEditar}
        />
      )}

      {cmdPaletteAberto && (
        <CommandPalette tenantId={userProfile?.tenantId} isOpen={cmdPaletteAberto} 
          onClose={() => setCmdPaletteAberto(false)} 
          onSelect={(t: any) => { 
            setCmdPaletteAberto(false); 
            setTransacaoEditar(t); 
            setModalAberto(true); 
          }} 
        />
      )}

      </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          #mobile-header { display: flex !important; }
          .main-content { padding-top: 64px !important; }
        }
      `}</style>
    </>
  );
}
