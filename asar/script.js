'use strict';

async function registerWorker() {
  navigator.serviceWorker.register('/asar_sw.js', { scope: '/' });
  return (await navigator.serviceWorker.ready).active;
}

registerWorker().then(worker => {
  clearFiles.addEventListener('click', ev =>
    worker.postMessage({ clear: true }));
  browseFile.addEventListener('change', ev =>
    ev.target.files[0]?.bytes()
      .then(b => worker.postMessage({ file: b }, { transfer: [b.buffer] })));
  setInterval(() => void worker.postMessage({ ping: true }), 5000);
  navigator.serviceWorker.addEventListener('message', ev => {
    console.log('Worker:', ev.data), output.append(ev.data, '\n');
    output.scroll(0, output.scrollHeight);
  });
});