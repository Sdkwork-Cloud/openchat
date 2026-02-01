/**
 * Service Worker
 *
 * 职责：提供离线缓存、资源预加载、后台同步
 */

const CACHE_NAME = 'openchat-v1';
const STATIC_CACHE = 'openchat-static-v1';
const DYNAMIC_CACHE = 'openchat-dynamic-v1';
const IMAGE_CACHE = 'openchat-images-v1';

// 预缓存资源
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/assets/index.css',
  '/assets/vendor-react.js',
  '/assets/vendor-state.js',
];

// 安装事件 - 预缓存核心资源
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');

  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Pre-caching assets');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        console.log('[SW] Skip waiting');
        return self.skipWaiting();
      })
      .catch((err) => {
        console.error('[SW] Pre-cache failed:', err);
      })
  );
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              return (
                name.startsWith('openchat-') &&
                name !== STATIC_CACHE &&
                name !== DYNAMIC_CACHE &&
                name !== IMAGE_CACHE
              );
            })
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Claiming clients');
        return self.clients.claim();
      })
  );
});

// 获取事件 - 缓存策略
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 跳过非 GET 请求
  if (request.method !== 'GET') {
    return;
  }

  // 跳过 Chrome 扩展请求
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // API 请求 - 网络优先，失败时返回缓存
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // 图片资源 - 缓存优先，带过期
  if (request.destination === 'image') {
    event.respondWith(cacheFirstWithExpiration(request, IMAGE_CACHE, 7 * 24 * 60 * 60 * 1000));
    return;
  }

  // JS/CSS 资源 - 缓存优先
  if (request.destination === 'script' || request.destination === 'style') {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // 字体资源 - 缓存优先
  if (request.destination === 'font') {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // 其他资源 - 网络优先
  event.respondWith(networkFirst(request));
});

// 后台同步事件
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages());
  }
});

// 推送事件
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);

  const options = {
    body: event.data?.text() || 'New message',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: 'openchat-message',
    requireInteraction: true,
    actions: [
      {
        action: 'open',
        title: 'Open',
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
      },
    ],
  };

  event.waitUntil(self.registration.showNotification('OpenChat', options));
});

// 通知点击事件
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click:', event.action);

  event.notification.close();

  if (event.action === 'open' || event.action === '') {
    event.waitUntil(
      self.clients
        .matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          if (clientList.length > 0) {
            const client = clientList[0];
            return client.focus();
          }
          return self.clients.openWindow('/');
        })
    );
  }
});

// ==================== 缓存策略 ====================

/**
 * 网络优先策略
 */
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // 更新缓存
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, falling back to cache:', request.url);

    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // 返回离线页面
    if (request.mode === 'navigate') {
      return caches.match('/offline.html');
    }

    throw error;
  }
}

/**
 * 缓存优先策略
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
  } catch (error) {
    console.error('[SW] Cache and network failed:', request.url);
    throw error;
  }
}

/**
 * 带过期时间的缓存优先策略
 */
async function cacheFirstWithExpiration(request, cacheName, maxAge) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    // 检查是否过期
    const dateHeader = cachedResponse.headers.get('sw-cache-date');
    if (dateHeader) {
      const cachedTime = parseInt(dateHeader, 10);
      const now = Date.now();

      if (now - cachedTime < maxAge) {
        return cachedResponse;
      }
    } else {
      return cachedResponse;
    }
  }

  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // 添加缓存时间戳
      const headers = new Headers(networkResponse.headers);
      headers.set('sw-cache-date', Date.now().toString());

      const responseWithDate = new Response(networkResponse.body, {
        status: networkResponse.status,
        statusText: networkResponse.statusText,
        headers,
      });

      const cache = await caches.open(cacheName);
      cache.put(request, responseWithDate);

      return responseWithDate;
    }

    // 网络失败但缓存存在（即使过期）
    if (cachedResponse) {
      return cachedResponse;
    }

    return networkResponse;
  } catch (error) {
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// ==================== 后台同步 ====================

/**
 * 同步消息
 */
async function syncMessages() {
  // 从 IndexedDB 获取待发送消息
  // 这里需要与主应用配合实现
  console.log('[SW] Syncing messages...');

  // 通知所有客户端
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach((client) => {
    client.postMessage({
      type: 'SYNC_MESSAGES',
    });
  });
}

// ==================== 消息处理 ====================

self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  switch (event.data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'GET_VERSION':
      event.ports[0].postMessage({ version: CACHE_NAME });
      break;

    case 'CLEAR_CACHE':
      event.waitUntil(
        caches.keys().then((cacheNames) => {
          return Promise.all(cacheNames.map((name) => caches.delete(name)));
        })
      );
      break;

    default:
      break;
  }
});
