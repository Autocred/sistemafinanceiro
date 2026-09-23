'use client';

import { useEffect, useState } from 'react';
import { getTenantByHostname, LicencaMaster } from '@/lib/saas/tenantManager';
import { setTenantId } from '@/lib/storage';

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState<LicencaMaster | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTenant() {
      try {
        const hostname = window.location.hostname;
        const pathname = window.location.pathname;
        const searchParams = new URLSearchParams(window.location.search);
        const forceTenant = searchParams.get('tenant');
        
        // Ignorar em ambiente de desenvolvimento local caso não usemos hosts virtuais, 
        // ou se for a rota Master Administrativa (salvo se tiver o forceTenant)
        if (!forceTenant && (hostname === 'localhost' || hostname === '127.0.0.1' || pathname.startsWith('/master'))) {
          // Mantém null para default, ou pode injetar um tenant de teste 'local-dev'
          setLoading(false);
          return;
        }

        const domainToSearch = forceTenant || hostname;
        const t = await getTenantByHostname(domainToSearch);
        
        if (t) {
          if (t.status === 'inadimplente' || t.status === 'suspensa') {
            setError(`Esta licença encontra-se ${t.status}. Entre em contato com o suporte.`);
          } else {
            setTenantId(t.id);
            if (typeof window !== 'undefined') localStorage.setItem('tenant_dominio', t.dominio);
            setTenant(t);
          }
        } else {
          // Se não encontrou o tenant, e não é um domínio base do sistema, mostrar erro
          if (!hostname.includes('sistemafinanceiropessoal.vercel.app')) {
             setError('Licença não encontrada para este domínio.');
          }
        }
      } catch (e) {
        console.error('Erro ao carregar tenant', e);
      } finally {
        setLoading(false);
      }
    }

    loadTenant();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[var(--bg-primary)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[var(--bg-primary)] p-4 text-center">
        <div className="max-w-md p-8 glass-panel border border-red-500/30 rounded-2xl shadow-xl">
          <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2 text-[var(--text-primary)]">Acesso Bloqueado</h2>
          <p className="text-[var(--text-secondary)]">{error}</p>
        </div>
      </div>
    );
  }

  // Se tudo ok, injeta CSS customizado do tenant se existir
  return (
    <>
      {tenant?.configuracoes?.corPrincipal && (
        <style dangerouslySetInnerHTML={{
          __html: `
            :root {
              --primary: ${tenant.configuracoes.corPrincipal};
            }
          `
        }} />
      )}
      {children}
    </>
  );
}
