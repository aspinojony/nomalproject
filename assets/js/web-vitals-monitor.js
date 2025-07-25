/**
 * Web Vitals 和性能监控
 * 监控 Core Web Vitals 指标和自定义性能指标
 */
class WebVitalsMonitor {
    constructor() {
        this.metrics = {};
        this.observers = [];
        this.reportEndpoint = '/api/analytics/performance'; // 可配置的上报端点
        this.reportThreshold = 5; // 批量上报阈值
        this.pendingMetrics = [];
        
        this.init();
    }

    init() {
        this.setupCoreWebVitals();
        this.setupCustomMetrics();
        this.setupUserInteractionMetrics();
        this.startReporting();
        
        console.log('📊 性能监控系统已启动');
    }

    /**
     * 设置 Core Web Vitals 监控
     */
    setupCoreWebVitals() {
        // Largest Contentful Paint (LCP)
        this.observeLCP();
        
        // First Input Delay (FID)
        this.observeFID();
        
        // Cumulative Layout Shift (CLS)
        this.observeCLS();
        
        // First Contentful Paint (FCP)
        this.observeFCP();
        
        // Time to First Byte (TTFB)
        this.observeTTFB();
    }

    /**
     * 观察 Largest Contentful Paint
     */
    observeLCP() {
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                const lcpEntry = entries[entries.length - 1]; // 最后一个就是LCP
                
                this.recordMetric('LCP', {
                    value: lcpEntry.startTime,
                    element: lcpEntry.element?.tagName || 'unknown',
                    url: lcpEntry.url || '',
                    timestamp: Date.now(),
                    rating: this.rateLCP(lcpEntry.startTime)
                });
            });
            
            observer.observe({ entryTypes: ['largest-contentful-paint'] });
            this.observers.push(observer);
        }
    }

    /**
     * 观察 First Input Delay
     */
    observeFID() {
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                entries.forEach(entry => {
                    this.recordMetric('FID', {
                        value: entry.processingStart - entry.startTime,
                        eventType: entry.name,
                        timestamp: Date.now(),
                        rating: this.rateFID(entry.processingStart - entry.startTime)
                    });
                });
            });
            
            observer.observe({ entryTypes: ['first-input'] });
            this.observers.push(observer);
        }
    }

    /**
     * 观察 Cumulative Layout Shift
     */
    observeCLS() {
        if ('PerformanceObserver' in window) {
            let clsValue = 0;
            let sessionValue = 0;
            let sessionEntries = [];
            
            const observer = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                
                for (const entry of entries) {
                    // 只计算没有用户输入的布局偏移
                    if (!entry.hadRecentInput) {
                        const firstSessionEntry = sessionEntries[0];
                        const lastSessionEntry = sessionEntries[sessionEntries.length - 1];
                        
                        // 如果条目与会话中的第一个条目相隔超过 1 秒，或者
                        // 与会话中的最后一个条目相隔超过 5 秒，开始新会话
                        if (sessionValue && 
                            (entry.startTime - lastSessionEntry.startTime > 5000 ||
                             entry.startTime - firstSessionEntry.startTime > 1000)) {
                            
                            this.recordMetric('CLS', {
                                value: sessionValue,
                                entries: sessionEntries.length,
                                timestamp: Date.now(),
                                rating: this.rateCLS(sessionValue)
                            });
                            
                            sessionValue = 0;
                            sessionEntries = [];
                        }
                        
                        sessionValue += entry.value;
                        sessionEntries.push(entry);
                    }
                }
            });
            
            observer.observe({ entryTypes: ['layout-shift'] });
            this.observers.push(observer);
        }
    }

    /**
     * 观察 First Contentful Paint
     */
    observeFCP() {
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                entries.forEach(entry => {
                    if (entry.name === 'first-contentful-paint') {
                        this.recordMetric('FCP', {
                            value: entry.startTime,
                            timestamp: Date.now(),
                            rating: this.rateFCP(entry.startTime)
                        });
                    }
                });
            });
            
            observer.observe({ entryTypes: ['paint'] });
            this.observers.push(observer);
        }
    }

    /**
     * 观察 Time to First Byte
     */
    observeTTFB() {
        // 使用 Navigation Timing API
        window.addEventListener('load', () => {
            if ('performance' in window && 'timing' in window.performance) {
                const timing = window.performance.timing;
                const ttfb = timing.responseStart - timing.navigationStart;
                
                this.recordMetric('TTFB', {
                    value: ttfb,
                    timestamp: Date.now(),
                    rating: this.rateTTFB(ttfb)
                });
            }
        });
    }

    /**
     * 设置自定义性能指标
     */
    setupCustomMetrics() {
        // 首屏渲染时间
        this.measureFirstScreenRender();
        
        // 关键资源加载时间
        this.measureCriticalResourceTiming();
        
        // JavaScript 执行时间
        this.measureJavaScriptTiming();
        
        // 内存使用情况
        this.measureMemoryUsage();
    }

    /**
     * 测量首屏渲染时间
     */
    measureFirstScreenRender() {
        const startTime = window.PERFORMANCE_START || performance.now();
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && entry.target.classList.contains('above-fold')) {
                    const renderTime = performance.now() - startTime;
                    
                    this.recordMetric('FirstScreenRender', {
                        value: renderTime,
                        element: entry.target.tagName,
                        timestamp: Date.now()
                    });
                    
                    observer.unobserve(entry.target);
                }
            });
        });

        // 观察首屏内容
        document.querySelectorAll('.above-fold').forEach(el => {
            observer.observe(el);
        });
    }

    /**
     * 测量关键资源加载时间
     */
    measureCriticalResourceTiming() {
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                entries.forEach(entry => {
                    // 只关注关键资源
                    if (this.isCriticalResource(entry.name)) {
                        this.recordMetric('ResourceTiming', {
                            name: entry.name,
                            duration: entry.duration,
                            transferSize: entry.transferSize || 0,
                            timestamp: Date.now(),
                            type: this.getResourceType(entry.name)
                        });
                    }
                });
            });
            
            observer.observe({ entryTypes: ['resource'] });
            this.observers.push(observer);
        }
    }

    /**
     * 测量 JavaScript 执行时间
     */
    measureJavaScriptTiming() {
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                entries.forEach(entry => {
                    if (entry.duration > 50) { // 只记录耗时超过50ms的任务
                        this.recordMetric('LongTask', {
                            duration: entry.duration,
                            startTime: entry.startTime,
                            timestamp: Date.now()
                        });
                    }
                });
            });
            
            observer.observe({ entryTypes: ['longtask'] });
            this.observers.push(observer);
        }
    }

    /**
     * 测量内存使用情况
     */
    measureMemoryUsage() {
        if ('memory' in performance) {
            setInterval(() => {
                const memory = performance.memory;
                this.recordMetric('MemoryUsage', {
                    usedJSHeapSize: memory.usedJSHeapSize,
                    totalJSHeapSize: memory.totalJSHeapSize,
                    jsHeapSizeLimit: memory.jsHeapSizeLimit,
                    timestamp: Date.now()
                });
            }, 30000); // 每30秒记录一次
        }
    }

    /**
     * 设置用户交互指标
     */
    setupUserInteractionMetrics() {
        // 点击响应时间
        this.measureClickResponseTime();
        
        // 页面停留时间
        this.measurePageEngagement();
        
        // 滚动性能
        this.measureScrollPerformance();
    }

    /**
     * 测量点击响应时间
     */
    measureClickResponseTime() {
        let clickStartTime = 0;
        
        document.addEventListener('mousedown', () => {
            clickStartTime = performance.now();
        });
        
        document.addEventListener('click', () => {
            if (clickStartTime) {
                const responseTime = performance.now() - clickStartTime;
                this.recordMetric('ClickResponse', {
                    value: responseTime,
                    timestamp: Date.now()
                });
                clickStartTime = 0;
            }
        });
    }

    /**
     * 测量页面停留时间
     */
    measurePageEngagement() {
        const startTime = Date.now();
        let lastActiveTime = startTime;
        
        const updateActiveTime = () => {
            lastActiveTime = Date.now();
        };
        
        ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'].forEach(event => {
            document.addEventListener(event, updateActiveTime);
        });
        
        window.addEventListener('beforeunload', () => {
            const engagementTime = lastActiveTime - startTime;
            this.recordMetric('PageEngagement', {
                value: engagementTime,
                totalTime: Date.now() - startTime,
                timestamp: Date.now()
            });
        });
    }

    /**
     * 测量滚动性能
     */
    measureScrollPerformance() {
        let scrollStartTime = 0;
        let frameCount = 0;
        
        const measureScrollFrame = () => {
            frameCount++;
            requestAnimationFrame(measureScrollFrame);
        };
        
        document.addEventListener('scroll', () => {
            if (!scrollStartTime) {
                scrollStartTime = performance.now();
                frameCount = 0;
                measureScrollFrame();
                
                setTimeout(() => {
                    if (scrollStartTime) {
                        const duration = performance.now() - scrollStartTime;
                        const fps = frameCount / (duration / 1000);
                        
                        this.recordMetric('ScrollPerformance', {
                            fps: fps,
                            duration: duration,
                            frames: frameCount,
                            timestamp: Date.now()
                        });
                        
                        scrollStartTime = 0;
                    }
                }, 1000);
            }
        });
    }

    /**
     * 记录指标
     */
    recordMetric(name, data) {
        this.metrics[name] = data;
        this.pendingMetrics.push({
            name,
            data,
            timestamp: Date.now()
        });
        
        console.log(`📈 性能指标 ${name}:`, data);
        
        // 触发自定义事件
        window.dispatchEvent(new CustomEvent('performanceMetric', {
            detail: { name, data }
        }));
    }

    /**
     * 评级函数
     */
    rateLCP(value) {
        if (value <= 2500) return 'good';
        if (value <= 4000) return 'needs-improvement';
        return 'poor';
    }

    rateFID(value) {
        if (value <= 100) return 'good';
        if (value <= 300) return 'needs-improvement';
        return 'poor';
    }

    rateCLS(value) {
        if (value <= 0.1) return 'good';
        if (value <= 0.25) return 'needs-improvement';
        return 'poor';
    }

    rateFCP(value) {
        if (value <= 1800) return 'good';
        if (value <= 3000) return 'needs-improvement';
        return 'poor';
    }

    rateTTFB(value) {
        if (value <= 800) return 'good';
        if (value <= 1800) return 'needs-improvement';
        return 'poor';
    }

    /**
     * 工具函数
     */
    isCriticalResource(url) {
        const criticalPatterns = [
            '/assets/css/critical.css',
            '/assets/js/performance-loader.js',
            '/assets/js/theme-manager.js',
            '/assets/css/theme-manager.css'
        ];
        
        return criticalPatterns.some(pattern => url.includes(pattern));
    }

    getResourceType(url) {
        if (url.endsWith('.css')) return 'stylesheet';
        if (url.endsWith('.js')) return 'script';
        if (url.match(/\.(jpg|jpeg|png|gif|webp|avif|svg)$/)) return 'image';
        return 'other';
    }

    /**
     * 开始性能数据上报
     */
    startReporting() {
        // 页面卸载时上报所有数据
        window.addEventListener('beforeunload', () => {
            this.sendMetrics(true);
        });
        
        // 定期上报数据
        setInterval(() => {
            if (this.pendingMetrics.length >= this.reportThreshold) {
                this.sendMetrics();
            }
        }, 10000); // 每10秒检查一次
    }

    /**
     * 发送性能数据
     */
    async sendMetrics(isBeacon = false) {
        if (this.pendingMetrics.length === 0) return;
        
        const metricsToSend = [...this.pendingMetrics];
        this.pendingMetrics = [];
        
        const payload = {
            url: window.location.href,
            userAgent: navigator.userAgent,
            timestamp: Date.now(),
            metrics: metricsToSend,
            sessionId: this.getSessionId(),
            userId: this.getUserId()
        };
        
        try {
            if (isBeacon && navigator.sendBeacon) {
                // 使用 sendBeacon 确保在页面卸载时也能发送数据
                navigator.sendBeacon(this.reportEndpoint, JSON.stringify(payload));
            } else {
                // 普通的 fetch 请求
                await fetch(this.reportEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });
            }
            
            console.log('📤 性能数据已上报:', metricsToSend.length, '条指标');
            
        } catch (error) {
            console.warn('❌ 性能数据上报失败:', error);
            // 失败时重新加入队列
            this.pendingMetrics.unshift(...metricsToSend);
        }
    }

    /**
     * 获取会话ID
     */
    getSessionId() {
        let sessionId = sessionStorage.getItem('performanceSessionId');
        if (!sessionId) {
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('performanceSessionId', sessionId);
        }
        return sessionId;
    }

    /**
     * 获取用户ID
     */
    getUserId() {
        // 从认证系统获取用户ID，或使用匿名ID
        const user = JSON.parse(localStorage.getItem('auth_user') || 'null');
        return user?.id || 'anonymous_' + this.getSessionId();
    }

    /**
     * 获取性能摘要
     */
    getPerformanceSummary() {
        return {
            coreWebVitals: {
                LCP: this.metrics.LCP,
                FID: this.metrics.FID,
                CLS: this.metrics.CLS,
                FCP: this.metrics.FCP,
                TTFB: this.metrics.TTFB
            },
            customMetrics: {
                FirstScreenRender: this.metrics.FirstScreenRender,
                MemoryUsage: this.metrics.MemoryUsage,
                PageEngagement: this.metrics.PageEngagement
            },
            recommendations: this.getPerformanceRecommendations()
        };
    }

    /**
     * 获取性能建议
     */
    getPerformanceRecommendations() {
        const recommendations = [];
        
        if (this.metrics.LCP?.value > 2500) {
            recommendations.push('LCP过慢，建议优化首屏内容加载');
        }
        
        if (this.metrics.FID?.value > 100) {
            recommendations.push('FID过高，建议减少JavaScript执行时间');
        }
        
        if (this.metrics.CLS?.value > 0.1) {
            recommendations.push('CLS过高，建议减少布局偏移');
        }
        
        return recommendations;
    }

    /**
     * 清理资源
     */
    destroy() {
        this.observers.forEach(observer => observer.disconnect());
        this.observers = [];
        
        // 发送剩余数据
        if (this.pendingMetrics.length > 0) {
            this.sendMetrics(true);
        }
    }
}

// 全局实例
if (typeof window !== 'undefined') {
    window.webVitalsMonitor = new WebVitalsMonitor();
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WebVitalsMonitor;
}