/* global clients */
/**
 * Service Worker for Steel ERP PWA - v20
 *
 * Strategies:
 * - Hashed assets (JS/CSS with hash): Cache First (immutable)
 * - Non-hashed static assets: Stale While Revalidate
 * - API calls: Network First with cache fallback + offline JSON
 * - Images: Cache First with size limits
 * - HTML pages: Network First with SPA fallback
 *
 * Features:
 * - Dynamic caching of JS/CSS bundles on first load
 * - App Shell caching on activate (via clients.matchAll)
 * - Cache size limits with automatic eviction
 * - Offline fallback (SPA for pages, JSON for APIs)
 * - Push notification support
 */

const CACHE_NAME = 'steel-erp-v20';
const STATIC_CACHE = 'steel-static-v20';
const API_CACHE = 'steel-api-v20';
const IMAGE_CACHE = 'steel-images-v20';

const ALL_CACHES = [CACHE_NAME, STATIC_CACHE, API_CACHE, IMAGE_CACHE];

// Cache size limits
const CACHE_LIMITS = {
  [API_CACHE]: { maxEntries: 100, maxAgeMs: 24 * 60 * 60 * 1000 },       // 24 hours
  [IMAGE_CACHE]: { maxEntries: 50, maxAgeMs: 7 * 24 * 60 * 60 * 1000 },  // 7 days
};

// Assets to precache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Regex to detect hashed asset filenames (e.g. index-abc123.js, vendor-D4f9a2.css)
const HASHED_ASSET_RE = /[.-][a-f0-9]{6,20}\.(js|css)(\?|$)/i;

/**
 * Check if a URL points to a hashed (immutable) asset
 */
function isHashedAsset(url) {
  return HASHED_ASSET_RE.test(url);
}

// ─── INSTALL ────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  console.log('[SW] Installing v20...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// ─── ACTIVATE ───────────────────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating v20...');
  event.waitUntil(
    Promise.all([
      // 1. Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => !ALL_CACHES.includes(name))
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      }),

      // 2. App Shell strategy: cache resources from all open windows
      cacheAppShell(),
    ])
    .then(() => self.clients.claim())
  );
});

/**
 * App Shell: discover and cache JS/CSS resources from all open client windows.
 * This ensures bundles are cached even on first activation.
 */
async function cacheAppShell() {
  try {
    const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (allClients.length === 0) {
      console.log('[SW] No open windows found for app shell caching');
      return;
    }

    const cache = await caches.open(STATIC_CACHE);
    const urlsToCache = new Set();

    for (const client of allClients) {
      // Cache the page HTML itself
      urlsToCache.add(client.url);
    }

    // Fetch each client page to discover linked resources
    const discoveredResources = [];
    for (const clientUrl of urlsToCache) {
      try {
        const response = await fetch(clientUrl);
        if (response.ok) {
          const html = await response.text();
          // Extract JS and CSS references from the HTML
          const resourceUrls = extractResourceUrls(html, clientUrl);
          discoveredResources.push(...resourceUrls);
          // Cache the HTML page
          await cache.put(clientUrl, new Response(html, {
            headers: response.headers,
          }));
        }
      } catch (err) {
        console.log('[SW] Failed to fetch client page for app shell:', clientUrl, err);
      }
    }

    // Cache all discovered JS/CSS resources
    const uniqueResources = [...new Set(discoveredResources)];
    console.log('[SW] App shell: caching', uniqueResources.length, 'resources');

    await Promise.all(
      uniqueResources.map(async (url) => {
        try {
          // Skip if already cached
          const existing = await cache.match(url);
          if (existing) return;

          const response = await fetch(url);
          if (response.ok) {
            await cache.put(url, response);
          }
        } catch (err) {
          console.log('[SW] App shell: failed to cache', url, err);
        }
      })
    );

    console.log('[SW] App shell caching complete');
  } catch (err) {
    console.log('[SW] App shell caching error:', err);
  }
}

/**
 * Extract JS and CSS resource URLs from an HTML string.
 */
function extractResourceUrls(html, baseUrl) {
  const urls = [];
  // Match <script src="...">
  const scriptRe = /<script[^>]+src=["']([^"']+)["']/gi;
  let match;
  while ((match = scriptRe.exec(html)) !== null) {
    urls.push(new URL(match[1], baseUrl).href);
  }
  // Match <link rel="stylesheet" href="...">
  const linkRe = /<link[^>]+href=["']([^"']+)["'][^>]*>/gi;
  while ((match = linkRe.exec(html)) !== null) {
    if (/rel=["']stylesheet["']/.test(match[0]) || /\.css/.test(match[1])) {
      urls.push(new URL(match[1], baseUrl).href);
    }
  }
  // Match modulepreload links
  const preloadRe = /<link[^>]+rel=["']modulepreload["'][^>]+href=["']([^"']+)["']/gi;
  while ((match = preloadRe.exec(html)) !== null) {
    urls.push(new URL(match[1], baseUrl).href);
  }
  return urls;
}

// ─── FETCH ──────────────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Block insecure requests when on HTTPS (prevent Mixed Content)
  if (location.protocol === 'https:' && url.protocol === 'http:') {
    return;
  }

  // Skip cross-origin requests (except for fonts/CDN)
  if (url.origin !== location.origin && !url.hostname.includes('fonts.')) {
    return;
  }

  // API requests - Network First with offline JSON fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstApi(request));
    return;
  }

  // Static assets (JS, CSS) - strategy depends on whether they have a hash
  if (request.destination === 'script' || request.destination === 'style' ||
      /\.(js|css)(\?|$)/.test(url.pathname)) {
    if (isHashedAsset(url.pathname)) {
      // Hashed assets are immutable -> Cache First
      event.respondWith(cacheFirst(request, STATIC_CACHE));
    } else {
      // Non-hashed assets -> Stale While Revalidate
      event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
    }
    return;
  }

  // Images - Cache First with size limits
  if (request.destination === 'image') {
    event.respondWith(cacheFirstWithLimits(request, IMAGE_CACHE));
    return;
  }

  // HTML pages - Network First with SPA fallback
  if (request.destination === 'document') {
    event.respondWith(networkFirstDocument(request));
    return;
  }

  // Default - Network First
  event.respondWith(networkFirst(request, CACHE_NAME));
});

// ─── CACHING STRATEGIES ─────────────────────────────────────────────────────

/**
 * Cache First Strategy
 * Good for immutable hashed assets that never change
 */
async function cacheFirst(request, cacheName) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    console.log('[SW] Cache-first: network failed, no cache for:', request.url);
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

/**
 * Stale While Revalidate Strategy
 * Serve from cache immediately, update cache in background
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => {
    console.log('[SW] SWR: network failed for:', request.url);
    return null;
  });

  // Return cached version immediately, or wait for network
  if (cachedResponse) {
    return cachedResponse;
  }

  const networkResponse = await fetchPromise;
  if (networkResponse) {
    return networkResponse;
  }

  return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
}

/**
 * Network First Strategy (generic)
 */
async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    console.log('[SW] Network-first: network failed, trying cache:', request.url);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

/**
 * Network First for API requests
 * Falls back to cache, then to offline JSON response
 */
async function networkFirstApi(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, networkResponse.clone());
      // Enforce cache size limits after storing
      enforceCacheLimits(API_CACHE);
    }
    return networkResponse;
  } catch {
    console.log('[SW] API network failed, trying cache:', request.url);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Offline JSON fallback for API requests
    return new Response(
      JSON.stringify({ offline: true, message: 'Bạn đang offline' }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Network First for HTML document requests
 * Falls back to cached SPA index.html for client-side routing
 */
async function networkFirstDocument(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    console.log('[SW] Document network failed, trying cache:', request.url);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // SPA fallback: serve cached index.html for any page route
    console.log('[SW] Serving SPA fallback for:', request.url);
    const fallback = await caches.match('/index.html');
    if (fallback) {
      return fallback;
    }

    // Last resort: try the root
    const rootFallback = await caches.match('/');
    if (rootFallback) {
      return rootFallback;
    }

    return new Response('Offline - app not cached', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/html' },
    });
  }
}

/**
 * Cache First with size limits (for images)
 */
async function cacheFirstWithLimits(request, cacheName) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
      // Enforce cache size limits after storing
      enforceCacheLimits(cacheName);
    }
    return networkResponse;
  } catch {
    console.log('[SW] Image cache-first: network failed for:', request.url);
    return new Response('', { status: 503, statusText: 'Service Unavailable' });
  }
}

// ─── CACHE MANAGEMENT ───────────────────────────────────────────────────────

/**
 * Enforce cache size limits: max entries and max age.
 * Evicts oldest entries when limits are exceeded.
 */
async function enforceCacheLimits(cacheName) {
  const limits = CACHE_LIMITS[cacheName];
  if (!limits) return;

  try {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();

    // Evict entries older than maxAge
    if (limits.maxAgeMs) {
      const now = Date.now();
      for (const request of requests) {
        const response = await cache.match(request);
        if (response) {
          const dateHeader = response.headers.get('date') || response.headers.get('sw-cached-at');
          if (dateHeader) {
            const cachedTime = new Date(dateHeader).getTime();
            if (now - cachedTime > limits.maxAgeMs) {
              await cache.delete(request);
            }
          }
        }
      }
    }

    // Evict oldest entries if over maxEntries
    if (limits.maxEntries) {
      const currentRequests = await cache.keys();
      if (currentRequests.length > limits.maxEntries) {
        const toDelete = currentRequests.length - limits.maxEntries;
        // Delete from the front (oldest entries)
        for (let i = 0; i < toDelete; i++) {
          await cache.delete(currentRequests[i]);
        }
        console.log('[SW] Evicted', toDelete, 'entries from', cacheName);
      }
    }
  } catch (err) {
    console.log('[SW] Cache limit enforcement error:', err);
  }
}

// ─── PUSH NOTIFICATIONS ─────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/dashboard'
      }
    };
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});

console.log('[SW] Service Worker v19 loaded');
