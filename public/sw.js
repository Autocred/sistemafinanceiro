const CACHE_NAME = 'pwa-cache-v6';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Remove todos os caches antigos para forçar atualização imediata
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => clients.claim())
  );
});

// Listener para mensagens vindas do cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  // Notificação com privilégio de SO disparada pelo cliente
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    self.registration.showNotification(title || 'Sistema Financeiro', {
      body: options?.body || '',
      icon: options?.icon || '/icon-192.png',
      badge: options?.badge || '/icon-192.png',
      vibrate: options?.vibrate || [200, 100, 200, 100, 200],
      tag: options?.tag || 'alerta-contas-pendentes-30min',
      data: options?.data || { url: '/' }
    });
  }
});

self.addEventListener('fetch', (event) => {
  // Passa tudo para a rede sem cachear (network-only)
  // Garante que sempre carregue a versão mais nova
  event.respondWith(fetch(event.request).catch(() => Response.error()));
});

self.addEventListener('push', function (event) {
  if (event.data) {
    try {
      const data = event.data.json();
      const options = {
        body: data.body || 'Você tem uma nova notificação do Sistema.',
        icon: data.icon || '/icon-192.png',
        badge: '/icon-192.png',
        vibrate: [200, 100, 200, 100, 200, 100, 200],
        data: {
          url: data.url || '/'
        }
      };

      event.waitUntil(
        self.registration.showNotification(data.title || 'Sistema', options)
      );
    } catch (e) {
      const options = {
        body: event.data.text(),
        icon: '/icon-192.png'
      };
      event.waitUntil(
        self.registration.showNotification('Sistema', options)
      );
    }
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
