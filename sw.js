/**
 * Service Worker for Voxel RPG PWA
 *
 * Per 2D_GAME_IMPLEMENTATION_PLAN.md v1.2 - PWA Configuration:
 * - Cache all game assets for offline play
 * - Background sync for cloud saves (future)
 * - Update notification when new version available
 */

const CACHE_NAME = 'voxel-rpg-v1';
const OFFLINE_URL = '/voxel-rpg-game/offline.html';

// Assets to cache immediately on install
const PRECACHE_ASSETS = [
  '/voxel-rpg-game/',
  '/voxel-rpg-game/index.html',
  '/voxel-rpg-game/manifest.json',
  '/voxel-rpg-game/offline.html',
];

// Asset patterns to cache on first request (runtime caching)
const RUNTIME_CACHE_PATTERNS = [
  /\/assets\//,
  /\.js$/,
  /\.css$/,
  /\.png$/,
  /\.jpg$/,
  /\.webp$/,
  /\.woff2?$/,
];

// Install event - precache essential assets
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Precaching assets');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        // Skip waiting to activate immediately
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('[ServiceWorker] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        // Take control of all pages immediately
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Skip API requests (they need fresh data)
  if (url.pathname.includes('/api/')) {
    return;
  }

  // Navigation requests - network first, cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache, then offline page
          return caches.match(request)
            .then((cached) => {
              if (cached) return cached;
              return caches.match(OFFLINE_URL);
            });
        })
    );
    return;
  }

  // Asset requests - cache first, network fallback
  const shouldCache = RUNTIME_CACHE_PATTERNS.some((pattern) => pattern.test(url.pathname));

  if (shouldCache) {
    event.respondWith(
      caches.match(request)
        .then((cached) => {
          if (cached) {
            // Return cached version, but update cache in background
            fetch(request)
              .then((response) => {
                if (response.ok) {
                  caches.open(CACHE_NAME).then((cache) => {
                    cache.put(request, response);
                  });
                }
              })
              .catch(() => { /* Ignore network errors */ });

            return cached;
          }

          // Not in cache, fetch and cache
          return fetch(request)
            .then((response) => {
              if (response.ok) {
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(request, responseClone);
                });
              }
              return response;
            });
        })
    );
    return;
  }

  // Default: network only
  event.respondWith(fetch(request));
});

// Message event - handle commands from the app
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }

  if (event.data === 'clearCache') {
    caches.delete(CACHE_NAME).then(() => {
      console.log('[ServiceWorker] Cache cleared');
    });
  }

  if (event.data.type === 'CACHE_SAVE') {
    // Future: Store save data in cache for offline sync
    console.log('[ServiceWorker] Save data received for offline sync');
  }
});

// Background sync event (for future cloud save sync)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-saves') {
    console.log('[ServiceWorker] Background sync for saves');
    // Future: Sync local saves to cloud
  }
});

// Push notification event (for future notifications)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();

    event.waitUntil(
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: '/voxel-rpg-game/icons/icon-192x192.png',
        badge: '/voxel-rpg-game/icons/icon-72x72.png',
        data: data.data,
      })
    );
  }
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.openWindow('/voxel-rpg-game/')
  );
});
