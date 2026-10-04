// const CACHE_NAME = "app-v1";

// self.addEventListener("install", (event) => {
//   self.skipWaiting();
// });

// self.addEventListener("activate", (event) => {
//   event.waitUntil(
//     caches
//       .keys()
//       .then((keys) =>
//         Promise.all(keys.map((k) => k !== CACHE_NAME && caches.delete(k))),
//       ),
//   );
// });

// self.addEventListener("fetch", (event) => {
//   event.respondWith(
//     fetch(event.request).catch(() => caches.match(event.request)),
//   );
// });
