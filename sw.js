/**
 * ============================================================================
 * CyberForge Service Worker - 100% Offline Cache Strategy
 * ============================================================================
 */

const CACHE_NAME = 'cyberforge-v2.5';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/tokens.css',
  './css/cockpit.css',
  './css/netlab.css',
  './css/terminal.css',
  './css/wireshark.css',
  './js/sound.js',
  './js/p2pSync.js',
  './js/commandPalette.js',
  './js/app.js',
  './js/netlab/NetworkGraph.js',
  './js/netlab/PacketEngine.js',
  './js/netlab/PacketInspector.js',
  './js/netlab/CliParser.js',
  './js/netlab/TopologyCanvas.js',
  './js/netlab/ScenarioEngine.js',
  './js/netlab/rcaGenerator.js',
  './js/netlab/scenarios.js',
  './js/showcases/skillsRadar.js',
  './js/showcases/malwareShowcase.js',
  './js/showcases/dispatchForm.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Cache first, fallback to network
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).catch(() => {
        // Offline fallback
        return caches.match('./index.html');
      });
    })
  );
});

