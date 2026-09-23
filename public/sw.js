self.addEventListener('push', function (event) {
  if (event.data) {
    try {
      const data = event.data.json();
      const options = {
        body: data.body || 'Você tem uma nova notificação do Sistema ERP Pro.',
        icon: data.icon || '/icon.png',
        badge: '/icon.png',
        vibrate: [200, 100, 200, 100, 200, 100, 200],
        data: {
          url: data.url || '/'
        }
      };

      event.waitUntil(
        self.registration.showNotification(data.title || 'Sistema ERP Pro', options)
      );
    } catch (e) {
      // Fallback
      const options = {
        body: event.data.text(),
        icon: '/icon.png'
      };
      event.waitUntil(
        self.registration.showNotification('Sistema ERP Pro', options)
      );
    }
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(windowClients => {
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if (client.url === event.notification.data.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});
