import fs from 'fs';
const code = `
// PWA Installability requirements
const CACHE_NAME = 'pwa-cache-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Required by Chrome for install prompt
  event.respondWith(fetch(event.request).catch(() => {
    return new Response('Voce esta offline. Verifique sua conexao.', {
      headers: { 'Content-Type': 'text/plain' }
    });
  }));
});
`;
fs.appendFileSync('public/sw.js', code);
console.log('Appended to sw.js');
