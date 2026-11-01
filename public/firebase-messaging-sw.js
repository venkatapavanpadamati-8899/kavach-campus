/* eslint-disable no-undef, no-unused-vars */
/* eslint-disable */
// Firebase Cloud Messaging Background Service Worker
// Kavach Campus Safety Platform

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
  if (event.data) {
    try {
      const data = event.data.json();
      const notificationTitle = data.notification?.title || data.data?.title || '🛡️ Kavach Campus Alert';
      const notificationOptions = {
        body: data.notification?.body || data.data?.body || 'Emergency safety alert received.',
        icon: '/icons/kavach-icon.svg',
        badge: '/icons/kavach-icon.svg',
        data: data.data || {},
        vibrate: [200, 100, 200, 100, 400],
        requireInteraction: true,
        tag: data.data?.incidentId || 'kavach-emergency-alert',
      };
      event.waitUntil(self.registration.showNotification(notificationTitle, notificationOptions));
    } catch {
      const rawText = event.data.text();
      event.waitUntil(
        self.registration.showNotification('🛡️ Kavach Campus Alert', {
          body: rawText || 'Emergency alert received.',
          icon: '/icons/kavach-icon.svg',
        })
      );
    }
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
