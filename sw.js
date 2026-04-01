'use strict';

function waitTime(t) {
  return new Promise(resolve => setTimeout(resolve, t));
}

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('active', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  if (e.request.method != 'GET') return;
  e.respondWith((async () => {
    const client = await self.clients.get(e.clientId);
    if (!client) return fetch(e.request);
    const uuid = crypto.randomUUID();
    const url = decodeURI(new URL(e.request.url).pathname).toLowerCase();
    const { promise, resolve } = Promise.withResolvers();
    function handleMsg(ev) { if (ev.data.uuid == uuid) resolve(ev.data.reply); }
    self.addEventListener('message', handleMsg);
    try {
      client.postMessage({ uuid, url });
      const res = await Promise.race([promise, waitTime(250)]);
      return res ? new Response(res) : fetch(e.request);
    } catch (e) {
      return fetch(e.request);
    } finally {
      self.removeEventListener('message', handleMsg);
    }
  })());
});