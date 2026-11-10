'use client';
import React, { useEffect, useState } from 'react';
import { useConfiguracao } from '@/hooks/useConfiguracao';
import Link from 'next/link';

/**
 * Gerenciamento de Notificações Push com isolamento estrito por Licença (Tenant).
 * Segue rigorosamente a regra White Label SaaS:
 * - Exibe nomeSistema, fotoPerfil e cores da paleta primária do Tenant ativo.
 */
const NotificationsPage: React.FC = () => {
  const { cfg, uid, tenantId, loading: configLoading } = useConfiguracao();
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permissionState, setPermissionState] = useState<NotificationPermission>('default');
  const [loading, setLoading] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionState(Notification.permission);
    }

    (async () => {
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          const sub = await registration.pushManager.getSubscription();
          if (sub) {
            setIsSubscribed(true);
            setSubscription(sub);
          }
        } catch (e) {
          console.warn('[SW check]', e);
        }
      }
    })();
  }, []);

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const registerServiceWorker = async () => {
    setError(null);
    setLoading(true);
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        throw new Error('Notificações push não são suportadas neste navegador.');
      }

      const perm = await Notification.requestPermission();
      setPermissionState(perm);
      if (perm !== 'granted') {
        throw new Error('Permissão para notificações não foi concedida pelo usuário.');
      }

      const registration = await navigator.serviceWorker.register('/service-worker.js');
      await navigator.serviceWorker.ready;

      const publicKeyResponse = await fetch('/api/notifications/publicKey');
      if (!publicKeyResponse.ok) {
        throw new Error('Falha ao obter chave pública VAPID.');
      }
      const { publicKey } = await publicKeyResponse.json();

      let sub = await registration.pushManager.getSubscription();
      if (!sub) {
        sub = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey)
        });
      }

      // Salva no banco de dados Firestore vinculado ao usuário e tenant
      const subJson = sub.toJSON ? sub.toJSON() : sub;
      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: uid || 'user-default',
          tenantId: tenantId || 'master',
          subscription: subJson
        })
      });

      setSubscription(sub);
      setIsSubscribed(true);
      setTestStatus('✅ Inscrição realizada com sucesso! Você já pode disparar testes.');
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Erro ao registrar notificações');
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async () => {
    setLoading(true);
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        const sub = await registration.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
        }
      }
      setIsSubscribed(false);
      setSubscription(null);
      setTestStatus('Inscrição cancelada.');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const dispararTeste = async () => {
    setLoading(true);
    setTestStatus('Enviando alerta de teste...');
    setError(null);
    try {
      // 1. Dispara notificação local se permissão concedida
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(cfg?.nomeSistema ? `🔔 ${cfg.nomeSistema}` : '🔔 Alerta de Teste', {
            body: 'Notificação local instantânea enviada com sucesso!',
            icon: cfg?.fotoPerfil || '/icon.png',
          });
        } catch (localErr) {
          console.warn('[Local Notification warning]', localErr);
        }
      }

      // 2. Dispara pelo backend Web-Push
      const subPayload = subscription ? (subscription.toJSON ? subscription.toJSON() : subscription) : null;
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `🔔 Teste de Notificação - ${cfg?.nomeSistema || 'Sistema'}`,
          body: 'Notificação Push em tempo real enviada com sucesso pelo servidor!',
          tenantId: tenantId || 'master',
          subscription: subPayload,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setTestStatus('🚀 Notificação disparada com sucesso! Verifique a tela do seu dispositivo.');
      } else {
        throw new Error(data.error || 'Erro no servidor ao enviar notificação de teste');
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Erro ao disparar teste de notificação');
    } finally {
      setLoading(false);
    }
  };

  const primaryColor = cfg?.corPrimaria || '#10b981';
  const nomeSistema = cfg?.nomeSistema || 'AUTOCRED Promotora';
  const fotoPerfil = cfg?.fotoPerfil;
  const tenantQueryParam = tenantId ? `?tenant=${encodeURIComponent(tenantId)}` : '';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-6 flex items-center justify-center">
      <div className="w-full max-w-xl bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8">
        
        {/* Cabeçalho White Label */}
        <div className="flex items-center gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
          {fotoPerfil ? (
            <img src={fotoPerfil} alt={nomeSistema} className="w-12 h-12 rounded-full object-cover border" />
          ) : (
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white text-lg shadow-sm"
              style={{ backgroundColor: primaryColor }}
            >
              🔔
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold" style={{ color: primaryColor }}>
              {nomeSistema}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Gerenciamento de Alertas e Notificações Push
            </p>
          </div>
        </div>

        {/* Status de Permissão */}
        <div className="mb-6 bg-slate-100 dark:bg-slate-700/50 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Status do Navegador</span>
            <span className="text-sm font-medium">
              Permissão: <strong className={permissionState === 'granted' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
                {permissionState === 'granted' ? 'Permitido ✅' : permissionState === 'denied' ? 'Bloqueado ❌' : 'Pendente ⏳'}
              </strong>
            </span>
          </div>
          <div>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              isSubscribed ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' : 'bg-slate-200 text-slate-600 dark:bg-slate-600 dark:text-slate-300'
            }`}>
              {isSubscribed ? 'Inscrito' : 'Não Inscrito'}
            </span>
          </div>
        </div>

        {/* Mensagens de Sucesso ou Erro */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg text-sm">
            ⚠️ {error}
          </div>
        )}
        {testStatus && (
          <div className="mb-4 p-3 bg-emerald-100 dark:bg-emerald-900/40 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 rounded-lg text-sm">
            {testStatus}
          </div>
        )}

        {/* Botões de Ação */}
        <div className="space-y-3">
          {!isSubscribed ? (
            <button
              onClick={registerServiceWorker}
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl font-medium text-white shadow-md transition hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ backgroundColor: primaryColor }}
            >
              {loading ? 'Ativando...' : '🔔 Ativar e Permitir Notificações Push'}
            </button>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={unsubscribe}
                disabled={loading}
                className="flex-1 py-3 px-4 rounded-xl font-medium bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-300 transition text-sm"
              >
                Desativar Notificações
              </button>
            </div>
          )}

          {/* Botão de Teste Imediato */}
          <button
            onClick={dispararTeste}
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl font-medium border-2 transition hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center gap-2 text-sm"
            style={{ borderColor: primaryColor, color: primaryColor }}
          >
            {loading ? 'Disparando...' : '🚀 Enviar Notificação de Teste Agora'}
          </button>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs text-slate-500">
          <Link href={`/central${tenantQueryParam}`} className="underline hover:text-slate-800 dark:hover:text-slate-200">
            ← Voltar para Central de Alertas
          </Link>
          <Link href={`/${tenantQueryParam}`} className="underline hover:text-slate-800 dark:hover:text-slate-200">
            Ir para Início
          </Link>
        </div>
      </div>
    </div>
  );
};

export const dynamic = 'force-dynamic';
export default NotificationsPage;
