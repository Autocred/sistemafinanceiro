'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { ConfiguracaoApp } from '@/lib/types';
import { NotificationCenter } from '@/components/NotificationCenter';
import { DailyReminderPopup } from '@/components/DailyReminderPopup';
import { DashboardHeader } from '@/components/NewMobileBankApp';
import {
  LayoutDashboard, ListOrdered, BarChart3, CreditCard,
  Settings, Server, Bot, PlusCircle, BookOpen, LogOut, ShieldCheck, ShieldAlert,
  BrainCircuit, Calendar, RefreshCw, Zap, Users, TrendingUp, Target,
  ChevronDown, ChevronRight, ChevronsLeft, ChevronsRight, Menu, Search, AlertTriangle, Sparkles,
  Building2, Landmark, FileText, PieChart, Wallet, Receipt,
  ClipboardList, Bell, GitMerge, UserCheck, Activity, Lock, Cpu
} from 'lucide-react';
import { setTenantId } from '@/lib/storage';
import { MENU_PERMISSION_MAP } from '@/lib/permissions';
import { ErrorBoundary } from '@/components/ErrorBoundary';

type Pagina = 'previsao_ia' | 'atualizacoes' | 'dashboard' | 'dashboard_mensal' | 'dashboard_v2' | 'cfo' | 'cfo_legacy' | 'extrato' | 'comissoes' | 'lancamentos' | 'calendario' | 'conciliacao' | 'aprovacoes' | 'regras' | 'relatorios' | 'relatorio_avancado' | 'contas' | 'cadastros' | 'equipe' | 'chat' | 'configuracoes' | 'admin' | 'auditoria' | 'licencas' | 'metas' | 'investimentos' | 'cartoes' | 'inadimplencia' | 'radar_desperdicios';

// ─── Todos os componentes que usam Firebase carregam APENAS no browser ────────
const PrevisaoFluxoIA = dynamic(() => import('@/components/PrevisaoFluxoIA'), { ssr: false, loading: () => <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',flexDirection:'column'}}><div className='spinner'></div><p style={{marginTop:16,color:'var(--text-muted)'}}>Carregando módulo...</p></div> });
const PlanejamentoOrcamentario = dynamic(() => import('@/components/PlanejamentoOrcamentario'), { ssr: false, loading: () => <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',flexDirection:'column'}}><div className='spinner'></div><p style={{marginTop:16,color:'var(--text-muted)'}}>Carregando módulo...</p></div> });
const Dashboard     = dynamic(() => import('@/components/Dashboard'), { ssr: false, loading: () => <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',flexDirection:'column'}}><div className='spinner'></div><p style={{marginTop:16,color:'var(--text-muted)'}}>Carregando módulo...</p></div> });
const DashboardMensal = dynamic(() => import('@/components/DashboardMensal'), { ssr: false, loading: () => <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',flexDirection:'column'}}><div className='spinner'></div><p style={{marginTop:16,color:'var(--text-muted)'}}>Carregando módulo...</p></div> });
const GerenciamentoClientes = dynamic(() => import('@/components/GerenciamentoClientes'), { ssr: false, loading: () => <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',flexDirection:'column'}}><div className='spinner'></div><p style={{marginTop:16,color:'var(--text-muted)'}}>Carregando módulo...</p></div> });
const ModuloLicencas = dynamic(() => import('@/components/ModuloLicencas'), { ssr: false, loading: () => <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',flexDirection:'column'}}><div className='spinner'></div><p style={{marginTop:16,color:'var(--text-muted)'}}>Carregando módulo...</p></div> });
const Equipe = dynamic(() => import('@/components/Equipe'), { ssr: false, loading: () => <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',flexDirection:'column'}}><div className='spinner'></div><p style={{marginTop:16,color:'var(--text-muted)'}}>Carregando módulo...</p></div> });
const CFOExecutiveDashboard = dynamic(() => import('@/components/CFOExecutiveDashboard').then(m => ({ default: m.CFOExecutiveDashboard })), { ssr: false, loading: () => <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',flexDirection:'column'}}><div className='spinner'></div><p style={{marginTop:16,color:'var(--text-muted)'}}>Carregando módulo...</p></div> });
const CorporateCards = dynamic(() => import('@/components/CorporateCards'), { ssr: false, loading: () => <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',flexDirection:'column'}}><div className='spinner'></div><p style={{marginTop:16,color:'var(--text-muted)'}}>Carregando módulo...</p></div> });
const CalendarioFinanceiro = dynamic(() => import('@/components/CalendarioFinanceiro').then(m => ({ default: m.CalendarioFinanceiro })), { ssr: false, loading: () => <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',flexDirection:'column'}}><div className='spinner'></div><p style={{marginTop:16,color:'var(--text-muted)'}}>Carregando módulo...</p></div> });
const CentralConciliacao = dynamic(() => import('@/components/CentralConciliacao').then(m => ({ default: m.CentralConciliacao })), { ssr: false, loading: () => <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',flexDirection:'column'}}><div className='spinner'></div><p style={{marginTop:16,color:'var(--text-muted)'}}>Carregando módulo...</p></div> });
const CentralAprovacoes = dynamic(() => import('@/components/CentralAprovacoes').then(m => ({ default: m.CentralAprovacoes })), { ssr: false, loading: () => <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',flexDirection:'column'}}><div className='spinner'></div><p style={{marginTop:16,color:'var(--text-muted)'}}>Carregando módulo...</p></div> });
const RegrasAutomacaoTab = dynamic(() => import('@/components/RegrasAutomacaoTab').then(m => ({ default: m.RegrasAutomacaoTab })), { ssr: false, loading: () => <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',flexDirection:'column'}}><div className='spinner'></div><p style={{marginTop:16,color:'var(--text-muted)'}}>Carregando módulo...</p></div> });
const ExtratoBancario = dynamic(() => import('@/components/ExtratoBancario'), { ssr: false, loading: () => <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',flexDirection:'column'}}><div className='spinner'></div><p style={{marginTop:16,color:'var(--text-muted)'}}>Carregando módulo...</p></div> });
const Lancamentos   = dynamic(() => import('@/components/Lancamentos'), { ssr: false, loading: () => <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',flexDirection:'column'}}><div className='spinner'></div><p style={{marginTop:16,color:'var(--text-muted)'}}>Carregando módulo...</p></div> });
const LancamentosV2 = dynamic(() => import('@/components/LancamentosV2'), { ssr: false, loading: () => <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',flexDirection:'column'}}><div className='spinner'></div><p style={{marginTop:16,color:'var(--text-muted)'}}>Carregando módulo...</p></div> });
const Relatorios    = dynamic(() => import('@/components/Relatorios'), { ssr: false, loading: () => <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',flexDirection:'column'}}><div className='spinner'></div><p style={{marginTop:16,color:'var(--text-muted)'}}>Carregando módulo...</p></div> });
const AutoBackup    = dynamic(() => import('@/components/AutoBackup').then(m => ({ default: m.AutoBackup })), { ssr: false, loading: () => <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',flexDirection:'column'}}><div className='spinner'></div><p style={{marginTop:16,color:'var(--text-muted)'}}>Carregando módulo...</p></div> });
const Contas        = dynamic(() => import('@/components/Contas'), { ssr: false, loading: () => <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',flexDirection:'column'}}><div className='spinner'></div><p style={{marginTop:16,color:'var(--text-muted)'}}>Carregando módulo...</p></div> });
const Cadastros     = dynamic(() => import('@/components/Cadastros'), { ssr: false, loading: () => <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',flexDirection:'column'}}><div className='spinner'></div><p style={{marginTop:16,color:'var(--text-muted)'}}>Carregando módulo...</p></div> });
const ChatIA        = dynamic(() => import('@/components/ChatIA'), { ssr: false, loading: () => <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',flexDirection:'column'}}><div className='spinner'></div><p style={{marginTop:16,color:'var(--text-muted)'}}>Carregando módulo...</p></div> });
const ChatIAV2      = dynamic(() => import('@/components/ChatIAV2'), { ssr: false, loading: () => <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',flexDirection:'column'}}><div className='spinner'></div><p style={{marginTop:16,color:'var(--text-muted)'}}>Carregando módulo...</p></div> });
const Configuracoes = dynamic(() => import('@/components/Configuracoes'), { ssr: false, loading: () => <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',flexDirection:'column'}}><div className='spinner'></div><p style={{marginTop:16,color:'var(--text-muted)'}}>Carregando módulo...</p></div> });
const AuditoriaTab  = dynamic(() => import('@/components/AuditoriaTab'), { ssr: false, loading: () => <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',flexDirection:'column'}}><div className='spinner'></div><p style={{marginTop:16,color:'var(--text-muted)'}}>Carregando módulo...</p></div> });
const ModalImportarDocIA = dynamic(() => import('@/components/ModalImportarDocIA'), { ssr: false });
const ModalLancamento = dynamic(() => import('@/components/ModalLancamento'), { ssr: false, loading: () => <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',flexDirection:'column'}}><div className='spinner'></div><p style={{marginTop:16,color:'var(--text-muted)'}}>Carregando módulo...</p></div> });
const Login = dynamic(() => import('@/components/Login').then(m => ({ default: m.Login })), { ssr: false, loading: () => <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',flexDirection:'column'}}><div className='spinner'></div><p style={{marginTop:16,color:'var(--text-muted)'}}>Carregando módulo...</p></div> });
const AdminPanel = dynamic(() => import('@/components/AdminPanel'), { ssr: false, loading: () => <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',flexDirection:'column'}}><div className='spinner'></div><p style={{marginTop:16,color:'var(--text-muted)'}}>Carregando módulo...</p></div> });
const ToastContainer = dynamic(() => import('@/components/ToastContainer').then(m => ({ default: m.ToastContainer })), { ssr: false, loading: () => <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',flexDirection:'column'}}><div className='spinner'></div><p style={{marginTop:16,color:'var(--text-muted)'}}>Carregando módulo...</p></div> });
const NotificationDrawer = dynamic(() => import('@/components/NotificationDrawer').then(m => ({ default: m.NotificationDrawer })), { ssr: false, loading: () => <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',flexDirection:'column'}}><div className='spinner'></div><p style={{marginTop:16,color:'var(--text-muted)'}}>Carregando módulo...</p></div> });
const LockScreen = dynamic(() => import('@/components/LockScreen').then(m => ({ default: m.LockScreen })), { ssr: false, loading: () => <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',flexDirection:'column'}}><div className='spinner'></div><p style={{marginTop:16,color:'var(--text-muted)'}}>Carregando módulo...</p></div> });
const MetasGamificadas = dynamic(() => import('@/components/MetasGamificadas').then(m => ({ default: m.MetasGamificadas })), { ssr: false, loading: () => <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',flexDirection:'column'}}><div className='spinner'></div><p style={{marginTop:16,color:'var(--text-muted)'}}>Carregando módulo...</p></div> });
const MetasGamificadasV2 = dynamic(() => import('@/components/MetasGamificadasV2'), { ssr: false, loading: () => <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',flexDirection:'column'}}><div className='spinner'></div><p style={{marginTop:16,color:'var(--text-muted)'}}>Carregando módulo...</p></div> });
const HubInvestimentos = dynamic(() => import('@/components/HubInvestimentos').then(m => ({ default: m.HubInvestimentos })), { ssr: false, loading: () => <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',flexDirection:'column'}}><div className='spinner'></div><p style={{marginTop:16,color:'var(--text-muted)'}}>Carregando módulo...</p></div> });
const FloatingScroller = dynamic(() => import('@/components/FloatingScroller').then(m => ({ default: m.FloatingScroller })), { ssr: false, loading: () => <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',flexDirection:'column'}}><div className='spinner'></div><p style={{marginTop:16,color:'var(--text-muted)'}}>Carregando módulo...</p></div> });
const RelatorioAvancado = dynamic(() => import('@/components/RelatorioAvancado'), { ssr: false, loading: () => <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',flexDirection:'column'}}><div className='spinner'></div><p style={{marginTop:16,color:'var(--text-muted)'}}>Carregando módulo...</p></div> });
const AtualizacoesCliente = dynamic(() => import('@/components/AtualizacoesCliente'), { ssr: false, loading: () => <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',flexDirection:'column'}}><div className='spinner'></div><p style={{marginTop:16,color:'var(--text-muted)'}}>Carregando módulo...</p></div> });
const RadarDesperdicios  = dynamic(() => import('@/components/RadarDesperdicios'), { ssr: false, loading: () => <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',flexDirection:'column'}}><div className='spinner'></div><p style={{marginTop:16,color:'var(--text-muted)'}}>Carregando Radar de Desperdícios...</p></div> });
const AgingList          = dynamic(() => import('@/components/AgingList').then(m => ({ default: m.AgingList })), { ssr: false, loading: () => <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',flexDirection:'column'}}><div className='spinner'></div><p style={{marginTop:16,color:'var(--text-muted)'}}>Carregando módulo...</p></div> });
const CommandPalette     = dynamic(() => import('@/components/CommandPalette').then(m => ({ default: m.CommandPalette })), { ssr: false });
const WallStreetSuiteView = dynamic(() => import('@/components/WallStreetSuiteView'), { ssr: false, loading: () => <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',flexDirection:'column'}}><div className='spinner'></div><p style={{marginTop:16,color:'var(--text-muted)'}}>Carregando módulo...</p></div> });
import { gerarPixCopiaECola, gerarUrlQrCodePix } from '@/lib/pix';

const NAV_ITEMS = [
  // ── VISÃO GERAL ─────────────────────────────────────────────────────────
  { id: 'dashboard'         as Pagina, label: 'Dashboard',          sublabel: 'Visão do dia',         icon: LayoutDashboard, grupo: '📊 Visão Geral' },
  { id: 'dashboard_mensal'  as Pagina, label: 'Resumo Mensal',      sublabel: 'Análise mês a mês',    icon: BarChart3,       grupo: '📊 Visão Geral' },
  { id: 'wall_street'       as any,    label: 'Raio-X & Quitação',  sublabel: 'Cada R$ 100 e Dívidas',icon: Sparkles,        grupo: '📊 Visão Geral' },
  { id: 'lancamentos'       as Pagina, label: 'Lançamentos',        sublabel: 'Receitas e despesas',  icon: ListOrdered,     grupo: '📊 Visão Geral' },
  { id: 'metas'             as Pagina, label: 'Metas & Orçamentos', sublabel: 'Planejamento anual',   icon: Target,          grupo: '📊 Visão Geral' },

  // ── BANKING & CONTAS ─────────────────────────────────────────────────────
  { id: 'contas'            as Pagina, label: 'Contas & Cartões',   sublabel: 'Saldos e limites',     icon: Wallet,          grupo: '🏦 Banking & Contas' },
  { id: 'cartoes'           as Pagina, label: 'Cartões Corp.',      sublabel: 'Faturas e limites',    icon: CreditCard,      grupo: '🏦 Banking & Contas' },
  { id: 'extrato'           as Pagina, label: 'Extrato Bancário',   sublabel: 'Movimentações',        icon: Receipt,         grupo: '🏦 Banking & Contas' },
  { id: 'comissoes'         as Pagina, label: 'Bancos & Comissões', sublabel: 'Carteira diferida',    icon: Building2,       grupo: '🏦 Banking & Contas' },
  { id: 'conciliacao'       as Pagina, label: 'Conciliação OFX',   sublabel: 'Importar extrato',     icon: RefreshCw,       grupo: '🏦 Banking & Contas' },

  // ── INTELIGÊNCIA & ANÁLISE ────────────────────────────────────────────────
  { id: 'cfo'               as Pagina, label: 'Cockpit CFO',        sublabel: 'Painel executivo',     icon: BrainCircuit,    grupo: '🧠 Inteligência' },
  { id: 'previsao_ia'       as Pagina, label: 'Previsão Fluxo IA', sublabel: 'IA preditiva',         icon: TrendingUp,      grupo: '🧠 Inteligência' },
  { id: 'relatorio_avancado'as Pagina, label: 'Relatório Premium', sublabel: 'Análise profunda',     icon: PieChart,        grupo: '🧠 Inteligência' },
  { id: 'relatorios'        as Pagina, label: 'Relatórios',         sublabel: 'Gráficos e tabelas',  icon: BarChart3,       grupo: '🧠 Inteligência' },
  { id: 'investimentos'     as Pagina, label: 'Hub Patrimônio',    sublabel: 'Ativos e carteira',    icon: Landmark,        grupo: '🧠 Inteligência' },
  { id: 'inadimplencia'     as Pagina, label: 'Inadimplência',     sublabel: 'Aging & cobrança',     icon: AlertTriangle,   grupo: '🧠 Inteligência' },

  // ── OPERACIONAL ───────────────────────────────────────────────────────────
  { id: 'calendario'        as Pagina, label: 'Calendário ERP',    sublabel: 'Agenda financeira',    icon: Calendar,        grupo: '⚙️ Operacional' },
  { id: 'aprovacoes'        as Pagina, label: 'Aprovações',        sublabel: 'Fluxo de alçadas',     icon: UserCheck,       grupo: '⚙️ Operacional' },
  { id: 'regras'            as Pagina, label: 'Automações',        sublabel: 'Regras inteligentes',  icon: Zap,             grupo: '⚙️ Operacional' },
  { id: 'equipe'            as Pagina, label: 'Minha Equipe',      sublabel: 'Usuários & acessos',   icon: Users,           grupo: '⚙️ Operacional' },
  { id: 'auditoria'         as Pagina, label: 'Auditoria',         sublabel: 'Log de atividades',    icon: Activity,        grupo: '⚙️ Operacional' },

  // ── CONFIGURAÇÕES ─────────────────────────────────────────────────────────
  { id: 'cadastros'         as Pagina, label: 'Cadastros',         sublabel: 'Clientes, fornecedores',icon: ClipboardList,  grupo: '🔧 Configurações' },
  { id: 'atualizacoes'      as Pagina, label: 'Atualizações',      sublabel: 'Novidades do sistema', icon: Bell,            grupo: '🔧 Configurações' },
  { id: 'configuracoes'     as Pagina, label: 'Configurações',     sublabel: 'Personalização',       icon: Settings,        grupo: '🔧 Configurações' },
];


export default function Home() {
  const [paginaAtual, setPaginaAtual] = useState<Pagina>('dashboard');
  const [modalAberto, setModalAberto] = useState(false);
  const [modalImportarDocAberto, setModalImportarDocAberto] = useState(false);

  
  
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
    '📊 Visão Geral': true // Visão Geral começa aberta
  });
  const [mobileMenuAberto, setMobileMenuAberto] = useState(false);
  const [sidebarCompacta, setSidebarCompacta] = useState(false);
  const [versaoSistema, setVersaoSistema] = useState<string>('v3.8.6');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('sidebar_compacta');
      if (saved === 'true') setSidebarCompacta(true);
      const cachedVer = localStorage.getItem('cached_versao_sistema');
      if (cachedVer) setVersaoSistema(cachedVer);
    } catch(e) {}

    let unsub: (() => void) | undefined;
    (async () => {
      try {
        const { getDb } = await import('@/lib/firebase');
        const { collection, query, orderBy, limit, onSnapshot } = await import('firebase/firestore');
        const q = query(collection(getDb(), 'saas_releases'), orderBy('dataLancamento', 'desc'), limit(5));
        unsub = onSnapshot(q, (snap) => {
          for (const docSnap of snap.docs) {
            const data = docSnap.data();
            if (data?.versao && (!data.status || data.status === 'publicado')) {
              setVersaoSistema(data.versao);
              try { localStorage.setItem('cached_versao_sistema', data.versao); } catch(e) {}
              break;
            }
          }
        }, () => {});
      } catch (e) {}
    })();
    return () => { if (unsub) unsub(); };
  }, []);

  const toggleSidebar = () => {
    setSidebarCompacta(prev => {
      const next = !prev;
      try { localStorage.setItem('sidebar_compacta', String(next)); } catch(e) {}
      return next;
    });
  };

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
        setBloqueadoBiometria(true); } } }, []); useEffect(() => { if (autenticado && sessionStorage.getItem('is_unlocked') === 'true') { setBloqueadoBiometria(false); } }, [autenticado]);

  // INACTIVITY: Lock (not logout) after timeout
  useEffect(() => {
    if (!autenticado || !cfg?.tempoInatividade || cfg.tempoInatividade <= 0) return;

    const timeoutMs = cfg.tempoInatividade * 60 * 1000;

    const checkInactivity = () => {
      const lastStr = localStorage.getItem('last_activity_timestamp');
      if (lastStr) {
        const last = parseInt(lastStr, 10);
        if (Date.now() - last >= timeoutMs) {
          handleLogout();
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
             
             /* Master backup agora via CRON */
             setDataAcesso(`${agora.toLocaleDateString('pt-BR')} - ${agora.getHours().toString().padStart(2,'0')}h${agora.getMinutes().toString().padStart(2,'0')}`);
             
             sessionStorage.setItem('current_user_name', 'Clovis (Master)');
             sessionStorage.setItem('current_user_email', 'clovis@financeai.com');
             sessionStorage.setItem('current_user_role', 'admin');
             sessionStorage.setItem('current_session_start', agora.toISOString());
             
             localStorage.setItem('current_user_name', 'Clovis (Master)');
             localStorage.setItem('current_user_email', 'clovis@financeai.com');
             localStorage.setItem('current_user_role', 'admin');
             localStorage.setItem('current_session_start', agora.toISOString());
             setPaginaAtual('dashboard');
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
                 
                 /* Auto backup agora via CRON */
                 
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
              const { getConfiguracoes, setTenantId } = await import('@/lib/storage');
              const urlTenant = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('tenant') : null;
              const lastTenantId = typeof window !== 'undefined' ? localStorage.getItem('last_logged_tenantId') : null;
              if (urlTenant) {
                setTenantId(urlTenant);
              } else if (lastTenantId) {
                setTenantId(lastTenantId);
              }
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
            localStorage.setItem('last_logged_tenantId', efectiveTenantId);
          }

          setAutenticado(true);
          setUserProfile(profile);
          setPaginaAtual('dashboard');
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
        { id: 'licencas' as Pagina, label: 'Painel Master', sublabel: 'Gestão de Licenças', icon: BookOpen, grupo: '🔧 Configurações' }
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
      
      if ((item.id as string) === 'wall_street') return true;
      const menuPermKey = MENU_PERMISSION_MAP[item.id];
      if (!menuPermKey) return false; // Unknown page = hide
      return perms[menuPermKey] === true;
    });
  }

  const renderPagina = () => {
    switch (paginaAtual) {
      case 'dashboard':     return <Dashboard     key={refreshKey} onNovoLancamento={() => { setTransacaoEditar(null); setModalAberto(true); }} onEditarLancamento={(t) => { setTransacaoEditar(t); setModalAberto(true); }} onDuplicarLancamento={(t: any) => { setTransacaoEditar({...t, id: undefined, dataVencimento: new Date().toISOString().split('T')[0], dataPagamento: null, status: 'pendente'}); setModalAberto(true); }} onNavigateToLancamentos={(filtro?: string) => { setFiltroRapidoLancamentos(filtro || ''); setPaginaAtual('lancamentos'); }} onNavigateToCartoes={(id?: string) => { setFaturaDestinoId(id || null); setPaginaAtual('contas'); }} onNavigateToRadar={() => setPaginaAtual('radar_desperdicios')} />;
      case 'dashboard_mensal': return <DashboardMensal key={refreshKey} />;
      case 'wall_street' as any: return <WallStreetSuiteView key={refreshKey} />;
      case 'cfo':           return <PlanejamentoOrcamentario key={refreshKey} />;
      case 'previsao_ia':   return <PrevisaoFluxoIA key={refreshKey} />;
      case 'extrato':       return <ExtratoBancario key={refreshKey} />;
      case 'comissoes':     return <Relatorios defaultTab="comissoes" key={refreshKey} />;
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
      case 'inadimplencia': return <AgingList key={refreshKey} />;
      case 'radar_desperdicios': return <RadarDesperdicios key={refreshKey} onNavigateToLancamentos={(filtro?: string) => { setFiltroRapidoLancamentos(filtro || ''); setPaginaAtual('lancamentos'); }} />;
      case 'dashboard_v2':  return <Dashboard key={refreshKey} onNovoLancamento={() => { setTransacaoEditar(null); setModalAberto(true); }} onEditarLancamento={(t) => { setTransacaoEditar(t); setModalAberto(true); }} onDuplicarLancamento={(t: any) => { setTransacaoEditar({...t, id: undefined, dataVencimento: new Date().toISOString().split('T')[0], dataPagamento: null, status: 'pendente'}); setModalAberto(true); }} onNavigateToLancamentos={(filtro?: string) => { setFiltroRapidoLancamentos(filtro || ''); setPaginaAtual('lancamentos'); }} onNavigateToCartoes={(id?: string) => { setFaturaDestinoId(id || null); setPaginaAtual('contas'); }} onNavigateToRadar={() => setPaginaAtual('radar_desperdicios')} />;
      case 'cfo_legacy':    return <Dashboard key={refreshKey} onNovoLancamento={() => setModalAberto(true)} onNavigateToLancamentos={(filtro?: string) => { setFiltroRapidoLancamentos(filtro || ''); setPaginaAtual('lancamentos'); }} onNavigateToCartoes={(id?: string) => { setFaturaDestinoId(id || null); setPaginaAtual('contas'); }} onNavigateToRadar={() => setPaginaAtual('radar_desperdicios')} />;
      default:              return <Dashboard key={refreshKey} onNovoLancamento={() => { setTransacaoEditar(null); setModalAberto(true); }} onEditarLancamento={(t) => { setTransacaoEditar(t); setModalAberto(true); }} onDuplicarLancamento={(t: any) => { setTransacaoEditar({...t, id: undefined, dataVencimento: new Date().toISOString().split('T')[0], dataPagamento: null, status: 'pendente'}); setModalAberto(true); }} onNavigateToLancamentos={(filtro?: string) => { setFiltroRapidoLancamentos(filtro || ''); setPaginaAtual('lancamentos'); }} onNavigateToCartoes={(id?: string) => { setFaturaDestinoId(id || null); setPaginaAtual('contas'); }} onNavigateToRadar={() => setPaginaAtual('radar_desperdicios')} />;
    }
  };

  return (
    <>
      {/* AutoBackup ativado novamente (roda silenciosamente no browser) */}
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
                      src={gerarUrlQrCodePix(gerarPixCopiaECola({ chave: '02398455955', tipoChave: 'cpf', nomeTitular: 'Clovis Grando', cidadeTitular: 'Sao Paulo', valor: tenantBloqueadoData.valorAssinatura || 0 }), 150)} 
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
        <DashboardHeader cfg={cfg} userProfile={userProfile} dataAcesso={dataAcesso} onLogout={handleLogout} sidebarCompacta={sidebarCompacta} onToggleSidebar={toggleSidebar} />

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

          {/* SIDEBAR — DESIGN LEVE E MODERNO */}
          <aside className={`sidebar ${mobileMenuAberto ? 'mobile-open' : ''} ${sidebarCompacta ? 'compacta' : ''}`}>
            {/* TOPO DA SIDEBAR: CABEÇALHO MINIMALISTA + BOTÃO RECOLHER/EXPANDIR */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: sidebarCompacta ? 'center' : 'space-between',
              marginBottom: 8,
              padding: sidebarCompacta ? '2px 0' : '2px 4px',
            }}>
              {!sidebarCompacta && (
                <span style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.5)',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}>
                  Navegação
                </span>
              )}
              <button
                onClick={toggleSidebar}
                title={sidebarCompacta ? "Expandir menu lateral" : "Recolher menu lateral"}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: 'rgba(255,255,255,0.85)',
                  borderRadius: 7,
                  padding: sidebarCompacta ? '6px' : '3px 8px',
                  fontSize: '11px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseOver={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.85)';
                }}
              >
                {sidebarCompacta ? <ChevronsRight size={14} /> : <><ChevronsLeft size={13} /> <span>Recolher</span></>}
              </button>
            </div>

            {/* AÇÕES RÁPIDAS: NOVO LANÇAMENTO + LER COM IA */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
              <button 
                onClick={() => { setMobileMenuAberto(false); setTransacaoEditar(null); setModalAberto(true); }}
                title="Novo Lançamento"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  width: '100%',
                  padding: sidebarCompacta ? '9px 0' : '9px 12px',
                  background: '#ffffff',
                  color: 'var(--primary-dark, #0f172a)',
                  border: '1px solid rgba(255,255,255,0.9)',
                  borderRadius: '10px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  letterSpacing: '-0.01em',
                  transition: 'all 0.18s ease',
                }}
                onMouseOver={e => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.18)';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.12)';
                }}
              >
                <PlusCircle size={16} strokeWidth={2.4} style={{ flexShrink: 0, color: 'var(--primary, #1e40af)' }} />
                {!sidebarCompacta && <span>Novo Lançamento</span>}
              </button>

              <button
                onClick={() => { setMobileMenuAberto(false); setModalImportarDocAberto(true); }}
                title="Importar Boleto, Nota Fiscal ou Recibo com OCR e IA"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 7,
                  width: '100%',
                  padding: sidebarCompacta ? '8px 0' : '7px 10px',
                  borderRadius: '9px',
                  background: 'rgba(255, 255, 255, 0.07)',
                  border: '1px solid rgba(255, 255, 255, 0.13)',
                  color: 'rgba(255, 255, 255, 0.92)',
                  fontWeight: 500,
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                }}
                onMouseOver={e => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.13)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.24)';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.07)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.13)';
                }}
              >
                <Sparkles size={14} color="#c4b5fd" style={{ flexShrink: 0 }} />
                {!sidebarCompacta && (
                  <>
                    <span>Ler Boleto/NF</span>
                    <span style={{
                      fontSize: '9.5px',
                      fontWeight: 700,
                      padding: '1px 5px',
                      borderRadius: 99,
                      background: 'rgba(196, 181, 253, 0.2)',
                      color: '#e9d5ff',
                      letterSpacing: '0.03em'
                    }}>IA</span>
                  </>
                )}
              </button>
            </div>

            {/* LISTA DE NAVEGAÇÃO LEVE E MODERNA */}
            <nav className="sidebar-nav-scroll" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto', paddingRight: 2 }}>
              {(() => {
                const grupos = navItemsFiltrados.reduce((acc, item) => {
                  const g = item.grupo || 'Outros';
                  if (!acc[g]) acc[g] = [];
                  acc[g].push(item);
                  return acc;
                }, {} as Record<string, typeof navItemsFiltrados>);

                const ordemDesejada = ['📊 Visão Geral', '🏦 Banking & Contas', '🧠 Inteligência', '⚙️ Operacional', '🔧 Configurações', 'Outros'];
                const chavesOrdenadas = Object.keys(grupos).sort((a, b) => {
                  let idxA = ordemDesejada.indexOf(a);
                  let idxB = ordemDesejada.indexOf(b);
                  if(idxA === -1) idxA = 999;
                  if(idxB === -1) idxB = 999;
                  return idxA - idxB;
                });

                // Remove emojis pesados do título do grupo para visual mais limpo e moderno
                const formatarTituloGrupo = (titulo: string) =>
                  titulo.replace(/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\s]+/u, '').trim();

                return chavesOrdenadas.map((nomeGrupo, grupIdx) => {
                  const itens = grupos[nomeGrupo];
                  const isOpen = sidebarCompacta ? true : gruposExpandidos[nomeGrupo];
                  const temItemAtivo = itens.some(i => i.id === paginaAtual);
                  return (
                    <div key={nomeGrupo} style={{ marginBottom: 4 }}>
                      {/* Cabeçalho do grupo (oculto no modo compacto) */}
                      {!sidebarCompacta && (
                        <div
                          onClick={() => toggleGrupo(nomeGrupo)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '6px 8px',
                            cursor: 'pointer',
                            color: isOpen || temItemAtivo ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.48)',
                            fontSize: '10.5px',
                            fontWeight: 700,
                            letterSpacing: '0.07em',
                            textTransform: 'uppercase',
                            borderRadius: 7,
                            marginTop: grupIdx > 0 ? 6 : 0,
                            borderTop: grupIdx > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                            paddingTop: grupIdx > 0 ? 10 : 6,
                            userSelect: 'none',
                            transition: 'all 0.15s ease'
                          }}
                          className="hover:text-white/90"
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{
                              width: 5,
                              height: 5,
                              borderRadius: '50%',
                              background: temItemAtivo ? '#ffffff' : 'rgba(255,255,255,0.3)',
                              boxShadow: temItemAtivo ? '0 0 6px rgba(255,255,255,0.8)' : 'none',
                              transition: 'all 0.2s ease'
                            }} />
                            <span>{formatarTituloGrupo(nomeGrupo)}</span>
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'rgba(255,255,255,0.5)' }}>
                            {!isOpen && (
                              <span style={{ fontSize: '9.5px', fontWeight: 600, opacity: 0.7 }}>{itens.length}</span>
                            )}
                            {isOpen ? <ChevronDown size={12} strokeWidth={2} /> : <ChevronRight size={12} strokeWidth={2} />}
                          </span>
                        </div>
                      )}

                      {/* Itens do grupo */}
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                        overflow: 'hidden',
                        transition: 'max-height 0.25s cubic-bezier(0.4,0,0.2,1)',
                        maxHeight: isOpen ? '800px' : '0px'
                      }}>
                        {itens.map(item => {
                          const Icon = item.icon;
                          const isActive = paginaAtual === item.id;
                          const sub = (item as any).sublabel;
                          return (
                            <button key={item.id}
                              title={sidebarCompacta ? `${item.label}${sub ? ` — ${sub}` : ''}` : undefined}
                              onClick={() => {
                                if (item.id === 'licencas') {
                                  window.location.href = '/master';
                                } else {
                                  setPaginaAtual(item.id);
                                  setMobileMenuAberto(false);
                                }
                              }}
                              style={{
                                position: 'relative',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: sidebarCompacta ? 'center' : 'flex-start',
                                gap: 10,
                                padding: sidebarCompacta ? '8px 0' : '7px 9px',
                                borderRadius: 9,
                                cursor: 'pointer',
                                border: isActive ? '1px solid rgba(255,255,255,0.16)' : '1px solid transparent',
                                width: '100%',
                                textAlign: 'left',
                                background: isActive
                                  ? 'linear-gradient(90deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.08) 100%)'
                                  : 'transparent',
                                boxShadow: isActive ? '0 2px 10px rgba(0,0,0,0.08)' : 'none',
                                transition: 'all 0.16s ease',
                                color: '#ffffff',
                              }}
                              onMouseOver={e => {
                                if (!isActive) {
                                  e.currentTarget.style.background = 'rgba(255,255,255,0.07)';
                                }
                              }}
                              onMouseOut={e => {
                                if (!isActive) {
                                  e.currentTarget.style.background = 'transparent';
                                }
                              }}
                            >
                              <span style={{
                                width: 28,
                                height: 28,
                                borderRadius: 7,
                                flexShrink: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: isActive ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.06)',
                                color: isActive ? '#ffffff' : 'rgba(255,255,255,0.8)',
                                transition: 'all 0.16s ease'
                              }}>
                                <Icon size={14} strokeWidth={isActive ? 2.2 : 1.75} />
                              </span>
                              {!sidebarCompacta && (
                                <>
                                  <span style={{ flex: 1, minWidth: 0 }}>
                                    <span style={{
                                      display: 'block',
                                      fontSize: '12.5px',
                                      fontWeight: isActive ? 600 : 450,
                                      color: isActive ? '#ffffff' : 'rgba(255,255,255,0.88)',
                                      lineHeight: 1.25,
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      letterSpacing: '-0.01em'
                                    }}>{item.label}</span>
                                    {sub && (
                                      <span style={{
                                        display: 'block',
                                        fontSize: '10.5px',
                                        color: isActive ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.48)',
                                        lineHeight: 1.2,
                                        marginTop: 1,
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        fontWeight: 400
                                      }}>{sub}</span>
                                    )}
                                  </span>
                                  {item.id === 'licencas' && (
                                    <span style={{ background: '#ef4444', color: '#fff', fontSize: 8.5, padding: '1.5px 5px', borderRadius: 6, fontWeight: 700, flexShrink: 0 }}>MASTER</span>
                                  )}
                                  {isActive && (
                                    <span style={{
                                      width: 3,
                                      height: 16,
                                      borderRadius: 99,
                                      background: '#ffffff',
                                      boxShadow: '0 0 8px rgba(255,255,255,0.65)',
                                      flexShrink: 0
                                    }} />
                                  )}
                                </>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()}
            </nav>

            {/* RODAPÉ LEVE E MODERNO */}
            <div style={{
              marginTop: 'auto',
              paddingTop: 10,
              borderTop: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              flexShrink: 0
            }}>
              <button
                title={sidebarCompacta ? "Sair do Sistema" : undefined}
                style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 7,
                  padding: sidebarCompacta ? '8px 0' : '8px 12px',
                  background: 'rgba(255,255,255,0.07)',
                  color: 'rgba(255,255,255,0.9)',
                  borderRadius: '9px',
                  fontWeight: 500,
                  fontSize: '12px',
                  cursor: 'pointer',
                  border: '1px solid rgba(255,255,255,0.1)',
                  transition: 'all 0.18s ease',
                }}
                onMouseOver={e => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.22)';
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
                  e.currentTarget.style.color = '#ffffff';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.07)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.9)';
                }}
                onClick={handleLogout}
              >
                <LogOut size={14} />
                {!sidebarCompacta && <span>Sair do Sistema</span>}
              </button>
              <div
                onClick={() => { setPaginaAtual('atualizacoes'); setMobileMenuAberto(false); }}
                title={`Versão atual do sistema: ${versaoSistema} (clique para ver novidades)`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                  padding: '3px 6px',
                  borderRadius: 6,
                  fontSize: sidebarCompacta ? 9 : 10.5,
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.65)',
                  letterSpacing: '0.02em',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  userSelect: 'none'
                }}
                onMouseOver={e => { e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                onMouseOut={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.65)'; e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: '#34d399',
                  boxShadow: '0 0 6px rgba(52, 211, 153, 0.7)',
                  flexShrink: 0
                }} />
                {sidebarCompacta ? (
                  <span>{versaoSistema}</span>
                ) : (
                  <span>Versão {versaoSistema}</span>
                )}
              </div>
            </div>
          </aside>

          {/* MAIN */}
          <main className={`main-content ${sidebarCompacta ? 'sidebar-compacta' : ''}`} style={{ flex: 1, height: '100%', overflowY: 'auto', overflowX: 'hidden' }}>
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
          onSalvo={() => {
            if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
              (window as any).requestIdleCallback(() => setRefreshKey(k => k + 1));
            } else {
              setTimeout(() => setRefreshKey(k => k + 1), 60);
            }
          }}
          transacaoEditar={transacaoEditar}
        />
      )}

      {modalImportarDocAberto && (
        <ModalImportarDocIA
          onClose={() => setModalImportarDocAberto(false)}
          onSuccess={() => { setModalImportarDocAberto(false); setRefreshKey(k => k + 1); }}
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
