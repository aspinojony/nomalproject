/**
 * 高性能资源加载器
 * 实现关键资源预加载、懒加载和智能缓存
 */
class PerformanceLoader {
    constructor() {
        this.loadedResources = new Set();
        this.preloadQueue = [];
        this.lazyQueue = [];
        this.criticalResources = [];
        
        // 性能监控
        this.performanceMetrics = {
            startTime: performance.now(),
            firstPaint: null,
            firstContentfulPaint: null,
            domContentLoaded: null,
            loadComplete: null
        };
        
        this.init();
    }

    init() {
        this.setupPerformanceObserver();
        this.setupIntersectionObserver();
        this.preloadCriticalResources();
        
        // DOM加载完成后开始懒加载
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.startLazyLoading());
        } else {
            this.startLazyLoading();
        }
        
        console.log('🚀 性能加载器已初始化');
    }

    /**
     * 设置性能监控
     */
    setupPerformanceObserver() {
        // 监控关键性能指标
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.entryType === 'paint') {
                        if (entry.name === 'first-paint') {
                            this.performanceMetrics.firstPaint = entry.startTime;
                        } else if (entry.name === 'first-contentful-paint') {
                            this.performanceMetrics.firstContentfulPaint = entry.startTime;
                        }
                    }
                }
            });
            
            observer.observe({entryTypes: ['paint']});
        }

        // 监控DOM加载时间
        document.addEventListener('DOMContentLoaded', () => {
            this.performanceMetrics.domContentLoaded = performance.now() - this.performanceMetrics.startTime;
        });

        // 监控完全加载时间
        window.addEventListener('load', () => {
            this.performanceMetrics.loadComplete = performance.now() - this.performanceMetrics.startTime;
            this.logPerformanceMetrics();
        });
    }

    /**
     * 设置交叉观察器用于懒加载
     */
    setupIntersectionObserver() {
        if ('IntersectionObserver' in window) {
            this.intersectionObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const element = entry.target;
                        this.loadLazyResource(element);
                        this.intersectionObserver.unobserve(element);
                    }
                });
            }, {
                rootMargin: '50px 0px',
                threshold: 0.1
            });
        }
    }

    /**
     * 预加载关键资源
     */
    preloadCriticalResources() {
        this.criticalResources = [
            // 关键CSS
            { url: 'assets/css/theme-manager.css', type: 'style', priority: 'high' },
            { url: 'assets/css/common.css', type: 'style', priority: 'high' },
            
            // 关键JavaScript
            { url: 'assets/js/theme-manager.js', type: 'script', priority: 'high' },
            { url: 'assets/js/utils.js', type: 'script', priority: 'high' },
            { url: 'assets/js/core/module-system.js', type: 'script', priority: 'medium' },
            
            // 用户系统（条件加载）
            { url: 'assets/js/auth-manager.js', type: 'script', priority: 'medium', condition: () => this.needsAuth() },
            { url: 'assets/js/user-data-manager.js', type: 'script', priority: 'medium', condition: () => this.needsAuth() }
        ];

        this.criticalResources.forEach(resource => {
            if (!resource.condition || resource.condition()) {
                this.preloadResource(resource);
            }
        });
    }

    /**
     * 预加载单个资源
     */
    preloadResource(resource) {
        return new Promise((resolve, reject) => {
            if (this.loadedResources.has(resource.url)) {
                resolve();
                return;
            }

            const link = document.createElement('link');
            link.rel = 'preload';
            link.href = resource.url;
            link.as = resource.type;
            
            if (resource.priority) {
                link.setAttribute('importance', resource.priority);
            }

            link.onload = () => {
                this.loadedResources.add(resource.url);
                resolve();
            };
            
            link.onerror = reject;
            document.head.appendChild(link);
        });
    }

    /**
     * 智能加载脚本（根据优先级和依赖）
     */
    async loadScriptsInOrder() {
        const scriptGroups = [
            // 第一组：核心系统
            [
                'assets/js/theme-manager.js',
                'assets/js/utils.js'
            ],
            // 第二组：模块系统
            [
                'assets/js/core/module-system.js',
                'assets/js/core/state-manager.js'
            ],
            // 第三组：用户系统（条件加载）
            this.needsAuth() ? [
                'assets/js/auth-manager.js',
                'assets/js/user-data-manager.js',
                'assets/js/progress-db.js'
            ] : [],
            // 第四组：功能模块（懒加载）
            [
                'assets/js/user-auth-controllers.js',
                'assets/js/resource-loader.js'
            ]
        ];

        for (let i = 0; i < scriptGroups.length; i++) {
            const group = scriptGroups[i];
            if (group.length === 0) continue;

            if (i < 2) {
                // 关键脚本立即加载
                await this.loadScriptGroup(group);
            } else {
                // 非关键脚本延迟加载
                requestIdleCallback(() => this.loadScriptGroup(group));
            }
        }
    }

    /**
     * 加载脚本组
     */
    async loadScriptGroup(scripts) {
        const promises = scripts.map(url => this.loadScript(url));
        return Promise.all(promises);
    }

    /**
     * 加载单个脚本
     */
    loadScript(url) {
        return new Promise((resolve, reject) => {
            if (this.loadedResources.has(url)) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = url;
            script.defer = true;
            
            script.onload = () => {
                this.loadedResources.add(url);
                resolve();
            };
            
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * 开始懒加载
     */
    startLazyLoading() {
        // 懒加载非关键资源
        const lazyResources = [
            'assets/js/ai-assistant-loader.js',
            'assets/js/course-data.js',
            'assets/js/fallback-data.js',
            'assets/js/data-backup-manager.js',
            'assets/js/realtime-sync-manager.js'
        ];

        // 延迟1秒后开始加载非关键资源
        setTimeout(() => {
            lazyResources.forEach(url => {
                this.loadScript(url);
            });
        }, 1000);

        // 设置懒加载图片和其他媒体
        this.setupLazyImages();
    }

    /**
     * 设置图片懒加载
     */
    setupLazyImages() {
        const lazyImages = document.querySelectorAll('img[data-src], iframe[data-src]');
        
        lazyImages.forEach(img => {
            if (this.intersectionObserver) {
                this.intersectionObserver.observe(img);
            } else {
                // 降级方案：立即加载
                this.loadLazyResource(img);
            }
        });
    }

    /**
     * 加载懒加载资源
     */
    loadLazyResource(element) {
        if (element.dataset.src) {
            element.src = element.dataset.src;
            element.removeAttribute('data-src');
            
            if (element.dataset.srcset) {
                element.srcset = element.dataset.srcset;
                element.removeAttribute('data-srcset');
            }
        }
    }

    /**
     * 检查是否需要认证功能
     */
    needsAuth() {
        // 检查是否有存储的用户数据或在认证相关页面
        return localStorage.getItem('auth_user') || 
               localStorage.getItem('currentUser') ||
               window.location.href.includes('profile') ||
               window.location.href.includes('dashboard');
    }

    /**
     * 预取下一页面资源
     */
    prefetchNextPageResources() {
        const links = document.querySelectorAll('a[href]');
        const prefetchUrls = new Set();

        links.forEach(link => {
            const href = link.getAttribute('href');
            if (href && href.startsWith('/') && !href.includes('#') && prefetchUrls.size < 3) {
                prefetchUrls.add(href);
            }
        });

        // 使用空闲时间预取
        requestIdleCallback(() => {
            prefetchUrls.forEach(url => {
                const link = document.createElement('link');
                link.rel = 'prefetch';
                link.href = url;
                document.head.appendChild(link);
            });
        });
    }

    /**
     * 记录性能指标
     */
    logPerformanceMetrics() {
        console.log('📊 性能指标:', {
            '首次绘制': this.performanceMetrics.firstPaint ? `${this.performanceMetrics.firstPaint.toFixed(2)}ms` : 'N/A',
            '首次内容绘制': this.performanceMetrics.firstContentfulPaint ? `${this.performanceMetrics.firstContentfulPaint.toFixed(2)}ms` : 'N/A',
            'DOM加载完成': `${this.performanceMetrics.domContentLoaded.toFixed(2)}ms`,
            '页面完全加载': `${this.performanceMetrics.loadComplete.toFixed(2)}ms`,
            '已加载资源数': this.loadedResources.size
        });

        // 发送性能数据到分析服务（如果需要）
        this.sendPerformanceData();
    }

    /**
     * 发送性能数据
     */
    sendPerformanceData() {
        // 可以发送到Google Analytics、自定义分析服务等
        if (window.gtag) {
            window.gtag('event', 'page_load_timing', {
                custom_parameter: {
                    dom_content_loaded: this.performanceMetrics.domContentLoaded,
                    load_complete: this.performanceMetrics.loadComplete
                }
            });
        }
    }

    /**
     * 获取性能建议
     */
    getPerformanceRecommendations() {
        const recommendations = [];
        
        if (this.performanceMetrics.domContentLoaded > 1500) {
            recommendations.push('DOM加载时间较长，建议减少同步脚本');
        }
        
        if (this.performanceMetrics.loadComplete > 3000) {
            recommendations.push('页面加载时间较长，建议使用更多懒加载');
        }
        
        if (this.loadedResources.size > 50) {
            recommendations.push('加载的资源过多，建议合并或延迟加载');
        }
        
        return recommendations;
    }
}

// 立即初始化性能加载器
if (typeof window !== 'undefined') {
    window.performanceLoader = new PerformanceLoader();
}

// 导出供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PerformanceLoader;
}