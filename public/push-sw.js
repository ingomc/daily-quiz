// Loaded by the generated service worker via importScripts.

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    // Not JSON: fall back to the default text.
  }
  const title = typeof data.title === 'string' ? data.title : 'Daily Quiz';
  const body = typeof data.body === 'string' ? data.body : 'Dein Quiz für heute wartet noch.';
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: 'pwa-192x192.png',
      badge: 'pwa-64x64.png',
      tag: 'daily-quiz-reminder',
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  // Always open the app itself, never an address taken from the message.
  const scope = self.registration.scope;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of windows) {
        if (client.url.startsWith(scope) && 'focus' in client) return client.focus();
      }
      return self.clients.openWindow(scope);
    })(),
  );
});
