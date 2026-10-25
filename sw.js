'use strict';
const VERSION='v5';
const SHELL=`trackie-shell-${VERSION}`,LIBS='trackie-libs';
// Every file is cached on its own, so one missing file (an icon, or the optional local Excel library)
// no longer makes the whole install fail.
const PRECACHE=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./icon-maskable-512.png','./apple-touch-icon.png','./xlsx.full.min.js'];
const LIB_HOSTS=['cdn.sheetjs.com','cdnjs.cloudflare.com','fonts.googleapis.com','fonts.gstatic.com'];

self.addEventListener('install',e=>{e.waitUntil(caches.open(SHELL).then(c=>Promise.all(PRECACHE.map(u=>c.add(u).catch(()=>{})))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('trackie-shell-')&&k!==SHELL).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});

self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  // App pages: network first (so updates arrive), cached copy when offline.
  if(req.mode==='navigate'){
    e.respondWith(fetch(req).then(res=>{if(res.ok){const copy=res.clone();caches.open(SHELL).then(c=>c.put('./index.html',copy))}return res}).catch(()=>caches.match('./index.html')));
    return;
  }
  // Same-origin static files: cache first.
  if(url.origin===self.location.origin){
    e.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(res=>{if(res.ok){const copy=res.clone();caches.open(SHELL).then(c=>c.put(req,copy))}return res})));
    return;
  }
  // Excel library + fonts: serve from cache, refresh in the background.
  if(LIB_HOSTS.includes(url.hostname)){
    e.respondWith(caches.open(LIBS).then(c=>c.match(req).then(hit=>{
      const net=fetch(req).then(res=>{if(res.ok||res.type==='opaque')c.put(req,res.clone());return res}).catch(()=>hit);
      return hit||net;
    })));
  }
});
