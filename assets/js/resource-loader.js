/**
 * 资源加载器 - 处理外部文件加载失败的容错机制
 * 提供本地和远程资源的自动切换
 */
class ResourceLoader {
    constructor() {
        this.cache = new Map();
        this.retryCount = 3;
        this.timeout = 5000; // 5秒超时
    }

    /**
     * 加载CSS文件
     * @param {string} href CSS文件路径
     * @param {string} fallback 备用CSS路径
     * @returns {Promise}
     */
    async loadCSS(href, fallback = null) {
        try {
            // 检查缓存
            if (this.cache.has(href)) {
                return this.cache.get(href);
            }

            return new Promise((resolve, reject) => {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = href;
                
                const timeout = setTimeout(() => {
                    reject(new Error(`CSS加载超时: ${href}`));
                }, this.timeout);

                link.onload = () => {
                    clearTimeout(timeout);
                    this.cache.set(href, true);
                    console.log(`✅ CSS加载成功: ${href}`);
                    resolve(true);
                };

                link.onerror = () => {
                    clearTimeout(timeout);
                    console.warn(`❌ CSS加载失败: ${href}`);
                    
                    if (fallback) {
                        console.log(`🔄 尝试加载备用CSS: ${fallback}`);
                        this.loadCSS(fallback).then(resolve).catch(reject);
                    } else {
                        reject(new Error(`CSS加载失败: ${href}`));
                    }
                };

                document.head.appendChild(link);
            });
        } catch (error) {
            console.error('CSS加载错误:', error);
            throw error;
        }
    }

    /**
     * 加载JavaScript文件
     * @param {string} src JS文件路径
     * @param {object} options 加载选项
     * @returns {Promise}
     */
    async loadJS(src, options = {}) {
        try {
            // 检查缓存
            if (this.cache.has(src)) {
                return this.cache.get(src);
            }

            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = src;
                
                if (options.defer) script.defer = true;
                if (options.async) script.async = true;
                if (options.type) script.type = options.type;

                const timeout = setTimeout(() => {
                    reject(new Error(`JS加载超时: ${src}`));
                }, this.timeout);

                script.onload = () => {
                    clearTimeout(timeout);
                    this.cache.set(src, true);
                    console.log(`✅ JS加载成功: ${src}`);
                    resolve(true);
                };

                script.onerror = () => {
                    clearTimeout(timeout);
                    console.warn(`❌ JS加载失败: ${src}`);
                    
                    if (options.fallback) {
                        console.log(`🔄 尝试加载备用JS: ${options.fallback}`);
                        this.loadJS(options.fallback, { ...options, fallback: null })
                            .then(resolve).catch(reject);
                    } else {
                        reject(new Error(`JS加载失败: ${src}`));
                    }
                };

                document.head.appendChild(script);
            });
        } catch (error) {
            console.error('JS加载错误:', error);
            throw error;
        }
    }

    /**
     * 加载JSON数据 - 增强版，支持多种加载方式
     * @param {string} url JSON文件路径
     * @param {string} fallback 备用数据
     * @param {object} options 加载选项
     * @returns {Promise}
     */
    async loadJSON(url, fallback = null, options = {}) {
        try {
            // 检查缓存
            if (this.cache.has(url)) {
                return this.cache.get(url);
            }

            // 策略1: 尝试使用JavaScript数据文件
            if (options.useJSFallback !== false) {
                const jsDataKey = this.getJSDataKey(url);
                if (window[jsDataKey]) {
                    console.log(`✅ 使用JavaScript数据: ${jsDataKey}`);
                    this.cache.set(url, window[jsDataKey]);
                    return window[jsDataKey];
                }
            }

            // 策略2: 检测是否为本地文件访问
            const isLocalFile = window.location.protocol === 'file:';
            if (isLocalFile && fallback) {
                console.log(`🔄 检测到本地文件访问，直接使用备用数据`);
                this.cache.set(url, fallback);
                return fallback;
            }

            // 策略3: 尝试网络请求
            for (let i = 0; i < this.retryCount; i++) {
                try {
                    console.log(`📡 尝试加载JSON: ${url} (第${i + 1}次)`);
                    
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
                    
                    const response = await fetch(url, {
                        signal: controller.signal,
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        cache: 'default' // 使用浏览器缓存
                    });
                    
                    clearTimeout(timeoutId);
                    
                    if (!response.ok) {
                        throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
                    }
                    
                    const data = await response.json();
                    this.cache.set(url, data);
                    console.log(`✅ JSON加载成功: ${url}`);
                    return data;
                    
                } catch (error) {
                    console.warn(`⚠️ JSON加载失败 (第${i + 1}次): ${url}`, error.message);
                    
                    // 如果是CORS错误，直接使用备用数据
                    if (error.message.includes('CORS') || error.name === 'TypeError') {
                        console.log(`🔄 检测到CORS问题，使用备用数据`);
                        break;
                    }
                    
                    if (i === this.retryCount - 1) {
                        break;
                    }
                    
                    // 重试前等待
                    await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
                }
            }

            // 策略4: 使用备用数据
            if (fallback) {
                console.log(`🔄 使用备用数据: ${url}`);
                this.cache.set(url, fallback);
                return fallback;
            }

            throw new Error(`所有加载策略均失败: ${url}`);
            
        } catch (error) {
            console.error('JSON加载错误:', error);
            
            // 最后的备用策略
            if (fallback) {
                console.log(`🆘 使用最终备用数据: ${url}`);
                return fallback;
            }
            
            throw error;
        }
    }

    /**
     * 根据URL获取对应的JavaScript数据变量名
     * @param {string} url 
     * @returns {string}
     */
    getJSDataKey(url) {
        const filename = url.split('/').pop().split('.')[0];
        const keyMap = {
            'bilibilicatgorybydifficulty': 'courseDataMain',
            'couser': 'courseDataBackup',
            'practice': 'practiceData'
        };
        return keyMap[filename] || 'fallbackCourseData';
    }

    /**
     * 预加载资源
     * @param {Array} resources 资源列表
     */
    async preloadResources(resources) {
        console.log('🚀 开始预加载资源...');
        const promises = resources.map(resource => {
            switch (resource.type) {
                case 'css':
                    return this.loadCSS(resource.url, resource.fallback);
                case 'js':
                    return this.loadJS(resource.url, resource.options || {});
                case 'json':
                    return this.loadJSON(resource.url, resource.fallback);
                default:
                    return Promise.resolve();
            }
        });

        try {
            await Promise.allSettled(promises);
            console.log('✅ 资源预加载完成');
        } catch (error) {
            console.warn('⚠️ 部分资源预加载失败:', error);
        }
    }

    /**
     * 检查网络连接状态
     */
    checkNetworkStatus() {
        if (!navigator.onLine) {
            console.warn('⚠️ 网络连接不可用，将使用离线模式');
            this.showOfflineMessage();
            return false;
        }
        return true;
    }

    /**
     * 显示离线提示
     */
    showOfflineMessage() {
        const offlineDiv = document.createElement('div');
        offlineDiv.id = 'offline-message';
        offlineDiv.className = 'fixed top-0 left-0 right-0 bg-yellow-500 text-white text-center py-2 z-50';
        offlineDiv.innerHTML = '⚠️ 网络连接不可用，部分功能可能受限';
        document.body.insertBefore(offlineDiv, document.body.firstChild);

        // 监听网络恢复
        window.addEventListener('online', () => {
            const msg = document.getElementById('offline-message');
            if (msg) {
                msg.remove();
            }
            location.reload(); // 网络恢复后刷新页面
        });
    }

    /**
     * 创建资源加载状态显示
     */
    createLoadingIndicator() {
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'resource-loading';
        loadingDiv.className = 'fixed top-0 left-0 right-0 bg-indigo-600 text-white text-center py-1 z-50 text-sm';
        loadingDiv.innerHTML = '📡 正在加载资源...';
        document.body.insertBefore(loadingDiv, document.body.firstChild);

        return {
            update: (message) => {
                loadingDiv.innerHTML = message;
            },
            remove: () => {
                loadingDiv.remove();
            }
        };
    }
}

// 全局资源加载器实例
window.resourceLoader = new ResourceLoader();

// 页面加载完成后检查网络状态
document.addEventListener('DOMContentLoaded', () => {
    window.resourceLoader.checkNetworkStatus();
});

// 监听网络状态变化
window.addEventListener('offline', () => {
    window.resourceLoader.showOfflineMessage();
});

window.addEventListener('online', () => {
    const msg = document.getElementById('offline-message');
    if (msg) {
        msg.remove();
    }
});