'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Building2, CreditCard, Settings, ShieldCheck, 
  BarChart3, LifeBuoy, Server, Database, Activity, LogOut, Search, Bell, Home
} from 'lucide-react';

export default function MasterLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuAberto, setMenuAberto] = useState(false);

  const menus = [
    { nome: 'Dashboard', url: '/master', icone: <BarChart3 className="w-5 h-5" /> },
    { nome: 'Licenças', url: '/master/licencas', icone: <Building2 className="w-5 h-5" /> },
    { nome: 'Planos', url: '/master/planos', icone: <CreditCard className="w-5 h-5" /> },
    { nome: 'Monitoramento', url: '/master/monitoramento', icone: <Activity className="w-5 h-5" /> },
    { nome: 'Backups', url: '/master/backups', icone: <Database className="w-5 h-5" /> },
    { nome: 'Atualizações', url: '/master/atualizacoes', icone: <Server className="w-5 h-5" /> },
    { nome: 'Financeiro', url: '/master/financeiro', icone: <CreditCard className="w-5 h-5" /> },
    { nome: 'Suporte', url: '/master/suporte', icone: <LifeBuoy className="w-5 h-5" /> },
    { nome: 'Segurança', url: '/master/seguranca', icone: <ShieldCheck className="w-5 h-5" /> },
    { nome: 'Configurações', url: '/master/configuracoes', icone: <Settings className="w-5 h-5" /> },
  ];

  // ─── Ir ao App Principal COM dados do Master (Clovis) ────────────────────────
  const handleIrAppPrincipal = async () => {
    // 1. Deslogar do Firebase para limpar qualquer sessão de cliente
    try {
      const { getFirebaseAuth } = await import('@/lib/auth');
      await getFirebaseAuth().signOut();
    } catch (e) {}

    // 2. Limpar impersonações
    localStorage.removeItem('impersonate_tenant');
    localStorage.removeItem('impersonate_tenantId');
    localStorage.removeItem('impersonate_user');
    sessionStorage.removeItem('active_session_auth');
    
    // 3. Ativar bypass master
    localStorage.setItem('master_bypass', 'true');
    localStorage.setItem('master_lastLogin', new Date().toISOString());
    
    // 4. Ir ao app principal (login vai aparecer limpo, digitar clovis/302010)
    window.location.href = '/';
  };

  // ─── Logout completo: limpa tudo e vai para login ─────────────────────────────
  const handleLogoutCompleto = async () => {
    try {
      const { getFirebaseAuth } = await import('@/lib/auth');
      await getFirebaseAuth().signOut();
    } catch (e) {}

    localStorage.removeItem('master_bypass');
    localStorage.removeItem('master_lastLogin');
    localStorage.removeItem('impersonate_tenant');
    localStorage.removeItem('impersonate_tenantId');
    localStorage.removeItem('impersonate_user');
    localStorage.removeItem('current_user_name');
    localStorage.removeItem('current_user_email');
    localStorage.removeItem('current_user_role');
    localStorage.removeItem('current_session_start');
    sessionStorage.removeItem('active_session_auth');
    sessionStorage.removeItem('paginaAtual');

    window.location.href = '/';
  };

  return (
    <div className="flex h-screen w-full bg-[var(--bg-primary)] overflow-hidden font-sans">
      
      {/* SIDEBAR MASTER */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-[var(--bg-secondary)] border-r border-[var(--border)] transition-transform duration-300 flex flex-col ${menuAberto ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-[var(--text-primary)]">SaaS Master</h1>
              <p className="text-xs text-[var(--text-secondary)] font-medium">Central de Licenças</p>
            </div>
          </div>
          <button className="lg:hidden p-2" onClick={() => setMenuAberto(false)}>
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
          {menus.map(m => {
            const isAtivo = pathname === m.url;
            return (
              <Link 
                key={m.nome}
                href={m.url}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isAtivo 
                    ? 'bg-indigo-600 text-white font-bold translate-x-1' 
                    : 'text-[var(--text-secondary)] hover:bg-slate-100 hover:text-indigo-600 hover:translate-x-1 hover:shadow-sm dark:hover:bg-slate-800'
                }`}
                style={isAtivo ? {
                  boxShadow: '0 4px 0 #3730a3, 0 8px 16px rgba(79, 70, 229, 0.3)',
                } : {}}
              >
                {m.icone}
                <span>{m.nome}</span>
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-[var(--border)] flex flex-col gap-3">
          {/* Botão que vai ao App Principal com os dados do Clovis */}
          <button
            onClick={handleIrAppPrincipal}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-500 text-white transition-all active:scale-95 active:translate-y-1"
            style={{ borderRadius: 12, boxShadow: '0 5px 0 #3730a3, 0 8px 15px rgba(0,0,0,0.2)', fontWeight: 700 }}
          >
            <Home size={18} />
            <span>Meus Lançamentos</span>
          </button>

          {/* Sair do sistema completamente */}
          <button
            onClick={handleLogoutCompleto}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500 text-white transition-all active:scale-95 active:translate-y-1"
            style={{ borderRadius: 12, boxShadow: '0 5px 0 #991b1b, 0 8px 15px rgba(0,0,0,0.2)', fontWeight: 700 }}
          >
            <LogOut size={18} />
            <span>Sair do Sistema</span>
          </button>
        </div>
      </aside>

      {/* OVERLAY MOBILE */}
      {menuAberto && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm" onClick={() => setMenuAberto(false)}></div>
      )}

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 flex flex-col min-w-0 min-h-0 bg-[var(--bg-primary)]">
        
        {/* HEADER TOP */}
        <header className="shrink-0 h-16 flex items-center justify-between px-6 border-b border-[var(--border)] bg-[var(--bg-secondary)]/80 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button className="lg:hidden p-2 bg-[var(--bg-tertiary)] rounded-lg text-[var(--text-primary)]" onClick={() => setMenuAberto(true)}>
              <MenuIcon className="w-5 h-5" />
            </button>
            
            <div className="hidden md:flex items-center bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-full px-4 py-1.5 focus-within:ring-2 focus-within:ring-indigo-500/50 transition-all">
              <Search className="w-4 h-4 text-[var(--text-secondary)] mr-2" />
              <input 
                type="text" 
                placeholder="Buscar licença ou cliente..." 
                className="bg-transparent border-none outline-none text-sm text-[var(--text-primary)] w-64 placeholder-[var(--text-secondary)]"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="relative p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] rounded-full transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            </button>
            <div className="flex items-center gap-2 border-l border-[var(--border)] pl-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                AD
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-semibold text-[var(--text-primary)] leading-tight">Super Admin</p>
                <p className="text-xs text-indigo-500 font-medium">Master</p>
              </div>
            </div>
          </div>
        </header>

        {/* ÁREA RENDERIZÁVEL */}
        <div className="flex-1 overflow-auto p-4 md:p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>

    </div>
  );
}

function MenuIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="3" y1="12" x2="21" y2="12"></line>
      <line x1="3" y1="6" x2="21" y2="6"></line>
      <line x1="3" y1="18" x2="21" y2="18"></line>
    </svg>
  );
}
