/**
 * Service Worker pour PlaneWise
 * Cache intelligent pour améliorer les performances
 */

const CACHE_NAME = "planewise-v1";
const STATIC_CACHE = "planewise-static-v1";
const DYNAMIC_CACHE = "planewise-dynamic-v1";

// Assets à mettre en cache statique
const STATIC_ASSETS = ["/", "/manifest.json", "/favicon.ico"];

// Routes API à mettre en cache dynamique
const API_ROUTES = [
  "/api/aircraft/",
  "/api/airport/",
  "/api/flights/",
  "/api/images/",
];

// Installation du Service Worker
self.addEventListener("install", (event) => {
  console.log("[SW] Installing...");

  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        console.log("[SW] Caching static assets");
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activation du Service Worker
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating...");

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log("[SW] Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Interception des requêtes
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes non-HTTP
  if (!request.url.startsWith("http")) {
    return;
  }

  // Ignorer les images externes (Wikimedia, etc.) - laisser passer directement
  if (
    url.hostname.includes("wikimedia.org") ||
    url.hostname.includes("upload.wikimedia.org") ||
    url.hostname.includes("commons.wikimedia.org") ||
    url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)
  ) {
    return; // Laisser passer sans interception
  }

  // Ignorer les requêtes Stripe - laisser passer directement pour éviter les problèmes de CSP
  if (
    url.hostname.includes("stripe.com") ||
    url.hostname.includes("js.stripe.com") ||
    url.hostname.includes("api.stripe.com") ||
    url.hostname.includes("hooks.stripe.com")
  ) {
    return; // Laisser passer sans interception
  }

  // Stratégie Cache First pour les assets statiques
  if (STATIC_ASSETS.some((asset) => url.pathname === asset)) {
    event.respondWith(
      caches.match(request).then((response) => {
        return response || fetch(request);
      })
    );
    return;
  }

  // Stratégie Network First pour les API routes
  if (API_ROUTES.some((route) => url.pathname.startsWith(route))) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Mettre en cache seulement les réponses réussies ET les requêtes GET
          // Le Cache API ne supporte pas les méthodes POST, PUT, DELETE, etc.
          if (response.ok && request.method === "GET") {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback vers le cache si le réseau échoue
          return caches.match(request).then((response) => {
            if (response) {
              return response;
            }

            // Retourner une réponse d'erreur personnalisée
            return new Response(
              JSON.stringify({
                error: "Offline",
                message:
                  "Vous êtes hors ligne. Veuillez vérifier votre connexion.",
              }),
              {
                status: 503,
                statusText: "Service Unavailable",
                headers: { "Content-Type": "application/json" },
              }
            );
          });
        })
    );
    return;
  }

  // Stratégie Stale While Revalidate pour les autres requêtes
  // Ne mettre en cache que les requêtes GET (le Cache API ne supporte pas POST, PUT, DELETE, etc.)
  if (request.method !== "GET") {
    // Pour les requêtes non-GET, passer directement au réseau sans cache
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse.ok) {
          const responseClone = networkResponse.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      });

      // Retourner le cache immédiatement, puis mettre à jour en arrière-plan
      return cachedResponse || fetchPromise;
    })
  );
});

// Gestion des messages du client
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Nettoyage périodique du cache
self.addEventListener("sync", (event) => {
  if (event.tag === "cache-cleanup") {
    event.waitUntil(cleanupCache());
  }
});

async function cleanupCache() {
  const cache = await caches.open(DYNAMIC_CACHE);
  const requests = await cache.keys();

  // Supprimer les entrées plus anciennes que 24h
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

  for (const request of requests) {
    const response = await cache.match(request);
    const dateHeader = response.headers.get("date");

    if (dateHeader && new Date(dateHeader).getTime() < oneDayAgo) {
      await cache.delete(request);
    }
  }
}
