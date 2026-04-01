'use strict';

function waitTime(t) {
  return new Promise(resolve => setTimeout(resolve, t));
}

const msgHandlers = {};
self.addEventListener('message', ev => Object.values(msgHandlers).forEach(f => f(ev)));
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('active', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  if (e.request.method != 'GET') return;
  e.respondWith((async () => {
    const client = await self.clients.get(e.clientId);
    if (!client) return fetch(e.request);
    const uuid = crypto.randomUUID(), mUUID = crypto.randomUUID();
    const url = decodeURI(new URL(e.request.url).pathname).toLowerCase();
    const { promise, resolve } = Promise.withResolvers();
    function handleMsg(ev) { if (ev.data.uuid == uuid) resolve(ev.data.reply); }
    try {
      msgHandlers[mUUID] = handleMsg;
      client.postMessage({ uuid, url });
      const res = await Promise.race([promise, waitTime(5000)]);
      return res ? new Response(res) : fetch(e.request);
    } catch (e) {
      return fetch(e.request);
    } finally {
      delete msgHandlers[mUUID];
    }
  })());
});