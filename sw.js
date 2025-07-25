/**
 * Service Worker - 高级缓存和离线策略
 * 实现智能缓存、资源预取和离线访问
 */

const CACHE_NAME = 'exam-platform-v1.2.0';
const STATIC_CACHE = 'static-v1.2.0';
const DYNAMIC_CACHE = 'dynamic-v1.2.0';
const IMAGE_CACHE = 'images-v1.2.0';

// 需要立即缓存的关键资源
const CRITICAL_ASSETS = [
    '/',
    '/index.html',
    '/assets/css/theme-manager.css',
    '/assets/css/common.css',
    '/assets/css/critical.css',
    '/assets/js/performance-loader.js',
    '/assets/js/theme-manager.js',
    '/assets/js/utils.js',
    '/assets/js/core/module-system.js'
];

// 需要网络优先的资源
const NETWORK_FIRST = [
    '/api/',
    '/auth/',
    '/sync/',
    'bilibilicatgorybydifficulty.json'
];

// 需要缓存优先的资源
const CACHE_FIRST = [
    '/assets/css/',
    '/assets/js/',
    '/assets/images/',
    '/assets/components/'
];

// 图片资源匹配
const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp|avif|svg)$/i;

self.addEventListener('install', event => {
    console.log('🔧 Service Worker 安装中...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('📦 缓存关键资源...');
                return cache.addAll(CRITICAL_ASSETS);
            })
            .then(() => {
                console.log('✅ Service Worker 安装完成');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('❌ Service Worker 安装失败:', error);
            })
    );
});

self.addEventListener('activate', event => {
    console.log('🚀 Service Worker 激活中...');
    
    event.waitUntil(
        Promise.all([
            // 清理旧缓存
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames
                        .filter(cacheName => {
                            return cacheName !== STATIC_CACHE && 
                                   cacheName !== DYNAMIC_CACHE && 
                                   cacheName !== IMAGE_CACHE;
                        })
                        .map(cacheName => {
                            console.log('🗑️ 删除旧缓存:', cacheName);
                            return caches.delete(cacheName);
                        })
                );
            }),
            // 接管所有客户端
            self.clients.claim()
        ]).then(() => {
            console.log('✅ Service Worker 激活完成');
        })
    );
});

self.addEventListener('fetch', event => {
    const request = event.request;
    const url = new URL(request.url);
    
    // 只处理GET请求
    if (request.method !== 'GET') {
        return;
    }
    
    // 跳过chrome扩展和非http(s)请求
    if (!url.protocol.startsWith('http')) {
        return;
    }

    event.respondWith(handleRequest(request));
});

/**
 * 请求处理策略路由
 */
async function handleRequest(request) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    
    try {
        // HTML文档 - Stale While Revalidate
        if (request.destination === 'document') {
            return await staleWhileRevalidate(request, STATIC_CACHE);
        }
        
        // 图片资源 - Cache First with WebP optimization
        if (request.destination === 'image' || IMAGE_EXTENSIONS.test(pathname)) {
            return await handleImageRequest(request);
        }
        
        // API请求 - Network First
        if (NETWORK_FIRST.some(pattern => pathname.startsWith(pattern))) {
            return await networkFirst(request, DYNAMIC_CACHE);
        }
        
        // 静态资源 - Cache First
        if (CACHE_FIRST.some(pattern => pathname.startsWith(pattern))) {
            return await cacheFirst(request, STATIC_CACHE);
        }
        
        // 外部CDN资源 - Stale While Revalidate
        if (url.origin !== self.location.origin) {
            return await staleWhileRevalidate(request, DYNAMIC_CACHE);
        }
        
        // 默认策略 - Network First
        return await networkFirst(request, DYNAMIC_CACHE);
        
    } catch (error) {
        console.error('请求处理失败:', error);
        return await handleRequestError(request, error);
    }
}

/**
 * 缓存优先策略
 */
async function cacheFirst(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
        // 后台更新缓存
        updateCacheInBackground(request, cache);
        return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
}

/**
 * 网络优先策略
 */
async function networkFirst(request, cacheName) {
    const cache = await caches.open(cacheName);
    
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
        
    } catch (error) {
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            console.log('🔄 使用缓存响应 (网络失败):', request.url);
            return cachedResponse;
        }
        
        throw error;
    }
}

/**
 * Stale While Revalidate策略
 */
async function staleWhileRevalidate(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    // 后台获取最新版本
    const fetchPromise = fetch(request).then(networkResponse => {
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    }).catch(error => {
        console.warn('后台更新失败:', error);
    });
    
    // 如果有缓存，立即返回；否则等待网络请求
    return cachedResponse || await fetchPromise;
}

/**
 * 处理图片请求（支持格式优化）
 */
async function handleImageRequest(request) {
    const cache = await caches.open(IMAGE_CACHE);
    const url = new URL(request.url);
    
    // 尝试从缓存获取
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }
    
    // 尝试获取WebP版本（如果支持）
    const supportsWebP = request.headers.get('Accept')?.includes('image/webp');
    if (supportsWebP && !url.pathname.includes('.webp')) {
        const webpUrl = url.pathname.replace(/\.(jpg|jpeg|png)$/i, '.webp');
        const webpRequest = new Request(url.origin + webpUrl, {
            headers: request.headers
        });
        
        try {
            const webpResponse = await fetch(webpRequest);
            if (webpResponse.ok) {
                cache.put(request, webpResponse.clone());
                return webpResponse;
            }
        } catch (error) {
            console.log('WebP版本不可用，使用原始格式:', url.pathname);
        }
    }
    
    // 获取原始图片
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        // 返回占位符图片
        return createPlaceholderResponse();
    }
}

/**
 * 后台更新缓存
 */
function updateCacheInBackground(request, cache) {
    fetch(request).then(response => {
        if (response.ok) {
            cache.put(request, response);
        }
    }).catch(error => {
        console.warn('后台缓存更新失败:', error);
    });
}

/**
 * 处理请求错误
 */
async function handleRequestError(request, error) {
    console.error('请求失败:', request.url, error);
    
    // 尝试从任何缓存中获取响应
    const cacheNames = [STATIC_CACHE, DYNAMIC_CACHE, IMAGE_CACHE];
    
    for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
    }
    
    // 如果是HTML请求，返回离线页面
    if (request.destination === 'document') {
        return createOfflineResponse();
    }
    
    // 如果是图片请求，返回占位符
    if (request.destination === 'image') {
        return createPlaceholderResponse();
    }
    
    throw error;
}

/**
 * 创建离线响应
 */
function createOfflineResponse() {
    const offlineHTML = `
        <!DOCTYPE html>
        <html lang="zh-CN">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>离线模式 - 计算机考研学习平台</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    margin: 0;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                }
                .offline-container {
                    text-align: center;
                    padding: 2rem;
                    background: rgba(255,255,255,0.1);
                    border-radius: 1rem;
                    backdrop-filter: blur(10px);
                }
                .icon {
                    font-size: 4rem;
                    margin-bottom: 1rem;
                }
                h1 { margin: 0 0 1rem 0; }
                p { margin: 0.5rem 0; opacity: 0.9; }
                .retry-btn {
                    margin-top: 2rem;
                    padding: 0.75rem 2rem;
                    background: rgba(255,255,255,0.2);
                    border: 1px solid rgba(255,255,255,0.3);
                    border-radius: 0.5rem;
                    color: white;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }
                .retry-btn:hover {
                    background: rgba(255,255,255,0.3);
                }
            </style>
        </head>
        <body>
            <div class="offline-container">
                <div class="icon">📚</div>
                <h1>离线模式</h1>
                <p>当前无法连接到网络</p>
                <p>缓存的内容仍然可用</p>
                <button class="retry-btn" onclick="window.location.reload()">
                    重新尝试
                </button>
            </div>
        </body>
        </html>
    `;
    
    return new Response(offlineHTML, {
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-cache'
        }
    });
}

/**
 * 创建图片占位符响应
 */
function createPlaceholderResponse() {
    const svg = `
        <svg width="300" height="200" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#f3f4f6"/>
            <rect x="20%" y="40%" width="60%" height="20%" fill="#e5e7eb" rx="4"/>
            <circle cx="30%" cy="25%" r="8%" fill="#d1d5db"/>
            <text x="50%" y="75%" text-anchor="middle" fill="#9ca3af" font-family="Arial" font-size="14">图片加载失败</text>
        </svg>
    `;
    
    return new Response(svg, {
        headers: {
            'Content-Type': 'image/svg+xml',
            'Cache-Control': 'no-cache'
        }
    });
}

// 背景同步
self.addEventListener('sync', event => {
    if (event.tag === 'background-sync') {
        event.waitUntil(doBackgroundSync());
    }
});

async function doBackgroundSync() {
    // 处理离线时产生的数据
    console.log('🔄 执行后台同步...');
    
    try {
        // 同步用户数据、学习进度等
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'BACKGROUND_SYNC',
                data: { timestamp: Date.now() }
            });
        });
    } catch (error) {
        console.error('后台同步失败:', error);
    }
}

// 推送通知
self.addEventListener('push', event => {
    if (event.data) {
        const data = event.data.json();
        
        const options = {
            body: data.body || '您有新的学习提醒',
            icon: '/assets/images/icon-192x192.png',
            badge: '/assets/images/badge-72x72.png',
            vibrate: [100, 50, 100],
            data: data.data || {},
            actions: [
                {
                    action: 'open',
                    title: '查看详情'
                },
                {
                    action: 'close',
                    title: '关闭'
                }
            ]
        };
        
        event.waitUntil(
            self.registration.showNotification(data.title || '学习提醒', options)
        );
    }
});

// 通知点击处理
self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    if (event.action === 'open') {
        event.waitUntil(
            clients.openWindow(event.notification.data.url || '/')
        );
    }
});

console.log('🌟 Service Worker 已加载');