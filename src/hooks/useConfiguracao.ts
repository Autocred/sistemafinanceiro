'use client';
import { useState, useEffect } from 'react';
import { getConfiguracoes, getTenantId, setTenantId as setStorageTenantId } from '@/lib/storage';
import { getFirebaseAuth, getUserProfile } from '@/lib/auth';
import { getDb } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

/**
 * Hook para carregar as configurações do Tenant com isolamento absoluto multi-tenant.
 * Respeita rigorosamente a Regra White Label SaaS:
 * - Identifica com precisão a licença ativa (URL, Session, LocalStorage, Auth).
 * - Isola completamente os dados entre licenças (NUNCA mistura dados com Master).
 * - Exibe o 'nomeSistema', 'fotoPerfil' e paleta da licença individual.
 */
export function useConfiguracao() {
  const [cfg, setCfg] = useState<any>({
    nomeSistema: 'Sistema Financeiro',
    fotoPerfil: '',
    corPrimaria: '#2563eb',
  });
  const [tenantId, setTenantId] = useState<string>('');
  const [uid, setUid] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        let activeTenant: string | null = null;

        // 1. Prioridade Máxima: Parâmetro explícito na URL (?tenant=...)
        if (typeof window !== 'undefined') {
          const urlTenant = new URLSearchParams(window.location.search).get('tenant');
          if (urlTenant) activeTenant = urlTenant;
        }

        // 2. Perfil da Sessão Ativa do usuário logado (sessionStorage)
        if (!activeTenant && typeof window !== 'undefined') {
          try {
            const profStr = sessionStorage.getItem('active_session_profile');
            if (profStr) {
              const prof = JSON.parse(profStr);
              if (prof.tenantId) activeTenant = prof.tenantId;
            }
          } catch (e) {}
        }

        // 3. Última licença logada salva no dispositivo (localStorage)
        if (!activeTenant && typeof window !== 'undefined') {
          const storedTenant = localStorage.getItem('last_logged_tenantId');
          if (storedTenant) activeTenant = storedTenant;
        }

        // 4. Hostname / Subdomínio customizado da licença
        if (!activeTenant && typeof window !== 'undefined') {
          const host = window.location.hostname;
          if (!host.includes('sistemafinanceiropessoal.vercel.app') && host !== 'localhost' && host !== '127.0.0.1') {
            try {
              const { getTenantByHostname } = await import('@/lib/saas/tenantManager');
              const t = await getTenantByHostname(host);
              if (t?.id) activeTenant = t.id;
            } catch (e) {}
          }
        }

        // 5. Identifica usuário no Firebase Auth
        const auth = getFirebaseAuth();
        const currentUid = auth?.currentUser?.uid || 'app';
        if (isMounted) setUid(currentUid);

        if (!activeTenant && auth?.currentUser) {
          try {
            const p = await getUserProfile(auth.currentUser.uid);
            if (p?.tenantId) activeTenant = p.tenantId;
          } catch (e) {}
        }

        // Se ainda não detectou, verifica o que está no storage
        if (!activeTenant) {
          const existing = getTenantId();
          if (existing && existing !== 'master') activeTenant = existing;
        }

        // Se absolutamente nada foi detectado, fallback seguro
        const finalTenantId = activeTenant || 'master';
        if (isMounted) setTenantId(finalTenantId);

        // ISOLA O STORAGE COM O TENANT CORRETO
        setStorageTenantId(finalTenantId);
        if (typeof window !== 'undefined' && finalTenantId !== 'master') {
          localStorage.setItem('last_logged_tenantId', finalTenantId);
        }

        // 6. Carrega os dados da licença
        let tenantConfig: any = null;

        // Se for um tenant cliente (ex: autocred-promotora-de-credito), busca na licença oficial
        if (finalTenantId !== 'master') {
          try {
            const licDoc = await getDoc(doc(getDb(), 'admin_master_licencas', finalTenantId));
            if (licDoc.exists()) {
              const licData = licDoc.data();
              tenantConfig = {
                nomeSistema: licData.nomeFantasia || licData.razaoSocial || 'AUTOCRED',
                corPrimaria: licData.configuracoes?.corPrincipal || '#10b981',
                fotoPerfil: licData.configuracoes?.logoUrl || '',
              };
            }
          } catch (e) {
            console.warn('[useConfiguracao] Falha ao carregar admin_master_licencas:', e);
          }
        }

        // Busca configurações adicionais salvas
        try {
          const saved = await getConfiguracoes(currentUid);
          if (saved) {
            tenantConfig = {
              ...tenantConfig,
              ...saved,
              nomeSistema: (finalTenantId !== 'master' && tenantConfig?.nomeSistema)
                ? tenantConfig.nomeSistema
                : (saved.nomeSistema || tenantConfig?.nomeSistema || 'Sistema Financeiro'),
              corPrimaria: (finalTenantId !== 'master' && tenantConfig?.corPrimaria)
                ? tenantConfig.corPrimaria
                : (saved.corPrimaria || tenantConfig?.corPrimaria || '#2563eb'),
              fotoPerfil: (finalTenantId !== 'master' && tenantConfig?.fotoPerfil)
                ? tenantConfig.fotoPerfil
                : (saved.fotoPerfil || tenantConfig?.fotoPerfil || ''),
            };
          }
        } catch (e) {}

        if (isMounted && tenantConfig) {
          setCfg((prev: any) => ({
            ...prev,
            ...tenantConfig,
          }));
        }
      } catch (err) {
        console.error('[useConfiguracao] erro ao resolver tenant:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();

    return () => { isMounted = false; };
  }, []);

  return { cfg, tenantId, uid, loading };
}
