'use strict';

function waitTime(t) {
  return new Promise(resolve => setTimeout(resolve, t));
}

const msgHandlers = {}, knownClients = {};
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('active', ev => ev.waitUntil(self.clients.claim()));
self.addEventListener('message', ev => Object.values(msgHandlers).forEach(f => f(ev)));
self.addEventListener('message', ev => { if (ev.data.imASAR) knownClients[ev.source.id] = true; });
self.addEventListener('fetch', ev => {
  console.log(ev);
  if (ev.request.method != 'GET') return;
  ev.respondWith(async function () {
    const client = await self.clients.get(ev.clientId);
    if (!client) return fetch(ev.request);
    if (!knownClients[ev.clientId]) { client.postMessage({ ruASAR: true }); await waitTime(500); }
    if (!knownClients[ev.clientId]) return fetch(ev.request);
    const uuid = crypto.randomUUID(), mUUID = crypto.randomUUID();
    const { promise, resolve } = Promise.withResolvers();
    msgHandlers[mUUID] = e => { if (e.data.uuid === uuid) resolve(e.data.reply); };
    client.postMessage({ uuid, url: decodeURI(new URL(ev.request.url).pathname).toLowerCase() });
    const res = await Promise.race([promise, waitTime(5000)]);
    delete msgHandlers[mUUID];
    return res ? new Response(res) : fetch(ev.request);
  }());
});