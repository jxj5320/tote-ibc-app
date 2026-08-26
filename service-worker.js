// 전산 날리기 — offline cache for the static app shell.
// IMPORTANT lesson carried over from the tote-ibc-app project:
// a fetch handler that intercepts POST requests (or any non-GET request)
// can swallow real errors from API calls behind a meaningless
// "Failed to fetch". This app makes no network calls at all, but we
// still guard on method as a defensive habit.
var CACHE_NAME = "jeonsan-nalligi-v2";
var ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(ASSETS);
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE_NAME; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

// Network-first, cache as offline fallback only. A cache-first strategy
// here would keep serving whatever index.html was cached on the visitor's
// very first visit forever, even after a newer file is uploaded to the
// repo -- exactly the staleness bug this project hit once already.
self.addEventListener("fetch", function(event){
  var req = event.request;
  if (req.method !== "GET") return; // never intercept non-GET requests
  event.respondWith(
    fetch(req).then(function(res){
      var copy = res.clone();
      caches.open(CACHE_NAME).then(function(cache){ cache.put(req, copy); });
      return res;
    }).catch(function(){
      return caches.match(req);
    })
  );
});
