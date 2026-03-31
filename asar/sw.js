'use strict';

let entries = {};

function loadASARDir(e, d, o, p) {
  let n = 0;
  for (const [k, { files, offset, size }] of Object.entries(o)) {
    const j = p + k.toLowerCase();
    if (files)
      n += loadASARDir(e, d, files, j + '/');
    else
      n += 1, e[j] = d.subarray(parseInt(offset)).subarray(0, size);
  }
  return n;
}

function fixConfigTJS() {
  const name = '/data/system/config.tjs';
  const data = entries[name];
  if (!data) return;
  const text = new TextDecoder('utf-8', { fatal: true }).decode(data, { stream: false });
  entries[name] = text.replace('configSave=file', 'configSave=webstorage_compressed');
  return true;
}

function loadASAR(ev, data) {
  try {
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const [v0, v4, v8, vC] = [0, 4, 8, 12].map(i => view.getUint32(i, true));
    if (!(v0 == 4 && v4 == v8 + 4 && vC + 4 <= v8))
      return ev.source.postMessage('maybe not an ASAR file');
    const dataArea = data.subarray(8 + v4);
    const jsonBytes = data.subarray(16, 16 + vC);
    const jsonString = new TextDecoder('utf-8', { fatal: true }).decode(jsonBytes);
    const jsonObject = JSON.parse(jsonString);
    const newEntries = {};
    const newCount = loadASARDir(newEntries, dataArea, jsonObject.files, '/');
    Object.assign(entries, newEntries);
    ev.source.postMessage(`added ${newCount} entries`);
    if (fixConfigTJS()) ev.source.postMessage('fixed config.tjs');
  } catch (e) {
    ev.source.postMessage(`loadASAR error: ${e}`);
  }
}

function clearFiles(ev) {
  entries = {};
  ev.source.postMessage('cleared');
}

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('active', e => e.waitUntil(self.clients.claim()));

self.addEventListener('message', ev => {
  let t;
  (t = ev.data.file) && loadASAR(ev, t);
  (t = ev.data.clear) && clearFiles(ev);
  (t = ev.data.ping) && ev.source.postMessage(`pong: ${Date()}`);
});

self.addEventListener('fetch', e => {
  if (e.request.method != 'GET') return;
  const url = decodeURI(new URL(e.request.url).pathname).toLowerCase();
  if (url in entries) return e.respondWith(new Response(entries[url]));
});
