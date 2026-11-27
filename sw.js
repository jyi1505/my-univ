/* 나의 대학은? — 오프라인 지원 서비스워커 */
const CACHE = 'univ-app-v1';
const RT = 'univ-rt-v1';
const CANON = new URL('index.html', self.registration.scope).href;
const EXTRA = ['manifest.webmanifest', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.add(new Request(CANON, { cache: 'reload' }));
    await Promise.allSettled(EXTRA.map((u) => c.add(new URL(u, self.registration.scope).href)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE && k !== RT).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

const OFFLINE_HTML = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>로딩중</title>
<style>html,body{margin:0;height:100%;background:#070b1a;color:#fff;font-family:-apple-system,'Noto Sans KR',sans-serif}
body{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2.2vmin;background:linear-gradient(104deg,#0a1f7a 0 38%,#0a6a4a 38% 62%,#7d0f38 62% 100%)}
.r{width:18vmin;height:18vmin;border-radius:50%;border:1vmin solid rgba(255,255,255,.25);border-top-color:#fff;animation:s 1.1s linear infinite}
@keyframes s{to{transform:rotate(360deg)}}h1{margin:0;font-size:6vmin;letter-spacing:.14em}p{margin:0;font-size:2.6vmin;opacity:.85;text-align:center;line-height:1.6}</style></head>
<body><div class="r"></div><h1>로딩중...</h1><p>인터넷 연결을 기다리는 중이에요<br>연결되면 자동으로 시작해요</p>
<script>function t(){fetch(location.href,{cache:'no-store'}).then(function(r){if(r.ok&&r.headers.get('x-offline')!=='1')location.reload()}).catch(function(){})}
addEventListener('online',t);setInterval(t,3000);</script></body></html>`;

async function navigate(req) {
  const cache = await caches.open(CACHE);
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 4500);
    const res = await fetch(req, { signal: ctrl.signal, cache: 'no-store' });
    clearTimeout(to);
    if (res && res.ok) { cache.put(CANON, res.clone()); return res; }
    throw new Error('bad');
  } catch (err) {
    const hit = await cache.match(CANON);
    if (hit) return hit;
    return new Response(OFFLINE_HTML, { status: 200, headers: { 'content-type': 'text/html;charset=utf-8', 'x-offline': '1' } });
  }
}

async function swr(req) {
  const cache = await caches.open(RT);
  const hit = await cache.match(req);
  const net = fetch(req).then((res) => { if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone()); return res; }).catch(() => null);
  return hit || (await net) || Response.error();
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (req.mode === 'navigate') { e.respondWith(navigate(req)); return; }
  if (url.origin === self.location.origin || /(fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr\.net)$/.test(url.hostname)) {
    e.respondWith(swr(req));
  }
});
