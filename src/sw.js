import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';

// Это обязательная часть для vite-plugin-pwa injectManifest
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// Позволяет Service Worker моментально взять контроль над страницей
self.skipWaiting();
clientsClaim();

// Обработка входящего Push-уведомления (если бэкенд шлёт реальные Web Push)
self.addEventListener('push', (event) => {
    if (!event.data) return;

    try {
        const data = event.data.json();

        const options = {
            body: data.message || 'Новое уведомление',
            icon: '/pwa-192x192.png',
            badge: '/mask-icon.svg',
            vibrate: [100, 50, 100],
            data: {
                url: data.url || '/'
            }
        };

        event.waitUntil(
            self.registration.showNotification(data.title || 'БИРГЕ', options)
        );
    } catch (e) {
        console.error('Ошибка при обработке push-уведомления:', e);
    }
});

// Обработка клика по уведомлению
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const targetUrl = event.notification.data.url || '/';

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Ищем открытую вкладку
            for (const client of clientList) {
                if (client.url === targetUrl && 'focus' in client) {
                    return client.focus();
                }
            }
            // Если вкладка не найдена, открываем новую
            if (self.clients.openWindow) {
                return self.clients.openWindow(targetUrl);
            }
        })
    );
});
