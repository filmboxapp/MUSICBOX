const CACHE_NAME = 'pwa-music-v1';
const RUNTIME_CACHE = 'pwa-music-runtime';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/styles.css',
    '/app.js',
    '/player.js',
    '/youtube.js',
    '/manifest.json'
];

// Instalación - cachear archivos estáticos
self.addEventListener('install', (event) => {
    console.log('🔧 Service Worker instalándose...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('📦 Cacheando archivos estáticos');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => self.skipWaiting())
            .catch(err => console.error('Error durante install:', err))
    );
});

// Activación
self.addEventListener('activate', (event) => {
    console.log('🚀 Service Worker activándose...');
    
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter(name => name !== CACHE_NAME && name !== RUNTIME_CACHE)
                    .map(name => {
                        console.log('🗑️ Eliminando caché antiguo:', name);
                        return caches.delete(name);
                    })
            );
        }).then(() => self.clients.claim())
    );
});

// Estrategia: Cache First, Fall Back to Network
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Solo cachear GET requests
    if (request.method !== 'GET') {
        return;
    }

    // No cachear llamadas a YouTube API
    if (url.hostname === 'www.youtube.com' || url.hostname === 'www.googleapis.com') {
        event.respondWith(
            fetch(request)
                .catch(() => new Response('No hay conexión', { status: 503 }))
        );
        return;
    }

    // Assets estáticos - Cache First
    if (isStaticAsset(url)) {
        event.respondWith(
            caches.match(request)
                .then(response => response || fetch(request))
                .catch(() => new Response('Recurso no disponible', { status: 404 }))
        );
        return;
    }

    // API y contenido dinámico - Network First
    event.respondWith(
        fetch(request)
            .then(response => {
                if (response.ok) {
                    const cache = caches.open(RUNTIME_CACHE);
                    cache.then(c => c.put(request, response.clone()));
                }
                return response;
            })
            .catch(() => 
                caches.match(request)
                    .then(response => response || new Response('No hay conexión', { status: 503 }))
            )
    );
});

// Verificar si es un asset estático
function isStaticAsset(url) {
    const staticExtensions = ['.js', '.css', '.svg', '.png', '.jpg', '.gif', '.woff', '.woff2'];
    const pathname = url.pathname;
    return staticExtensions.some(ext => pathname.endsWith(ext));
}

// Background Sync (futuro)
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-favorites') {
        event.waitUntil(syncFavorites());
    }
});

async function syncFavorites() {
    try {
        console.log('Sincronizando favoritos...');
        // Implementar sincronización cuando haya conexión
    } catch (error) {
        console.error('Error en sincronización:', error);
        throw error;
    }
}

// Push Notifications (futuro)
self.addEventListener('push', (event) => {
    const data = event.data.json();
    const options = {
        body: data.body,
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        tag: 'music-notification'
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

console.log('✅ Service Worker cargado correctamente');