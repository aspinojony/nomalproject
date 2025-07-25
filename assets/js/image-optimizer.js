/**
 * 图片优化和懒加载管理器
 * 支持WebP格式、响应式图片、懒加载和占位符
 */
class ImageOptimizer {
    constructor() {
        this.observer = null;
        this.loadedImages = new Set();
        this.supportsWebP = false;
        this.supportsAvif = false;
        
        this.init();
    }

    async init() {
        // 检测浏览器支持的图片格式
        await this.detectImageFormats();
        
        // 设置交叉观察器
        this.setupIntersectionObserver();
        
        // 处理现有图片
        this.processExistingImages();
        
        console.log('🖼️ 图片优化器已初始化', {
            webP: this.supportsWebP,
            avif: this.supportsAvif
        });
    }

    /**
     * 检测浏览器支持的图片格式
     */
    async detectImageFormats() {
        // 检测WebP支持
        this.supportsWebP = await this.canUseFormat('data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA');
        
        // 检测AVIF支持
        this.supportsAvif = await this.canUseFormat('data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgABogQEAwgMg8f8D///8WfhwB8+ErK42A=');
    }

    /**
     * 检测是否支持特定图片格式
     */
    canUseFormat(testImageData) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = testImageData;
        });
    }

    /**
     * 设置交叉观察器用于懒加载
     */
    setupIntersectionObserver() {
        if ('IntersectionObserver' in window) {
            this.observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.loadImage(entry.target);
                        this.observer.unobserve(entry.target);
                    }
                });
            }, {
                rootMargin: '50px 0px',
                threshold: 0.1
            });
        }
    }

    /**
     * 处理现有图片
     */
    processExistingImages() {
        // 处理data-src属性的懒加载图片
        const lazyImages = document.querySelectorAll('img[data-src], picture[data-src]');
        lazyImages.forEach(img => this.setupLazyLoading(img));

        // 处理普通图片的优化
        const regularImages = document.querySelectorAll('img:not([data-src])');
        regularImages.forEach(img => this.optimizeExistingImage(img));
    }

    /**
     * 设置懒加载
     */
    setupLazyLoading(element) {
        // 添加占位符
        this.addPlaceholder(element);
        
        if (this.observer) {
            this.observer.observe(element);
        } else {
            // 降级方案：立即加载
            this.loadImage(element);
        }
    }

    /**
     * 添加占位符
     */
    addPlaceholder(element) {
        if (element.tagName === 'IMG' && !element.src) {
            // 创建SVG占位符
            const placeholder = this.createSVGPlaceholder(
                element.dataset.width || 300,
                element.dataset.height || 200
            );
            element.src = placeholder;
            element.classList.add('lazy-loading');
        }
    }

    /**
     * 创建SVG占位符
     */
    createSVGPlaceholder(width, height) {
        const svg = `
            <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
                <rect width="100%" height="100%" fill="#f3f4f6"/>
                <rect x="20%" y="40%" width="60%" height="20%" fill="#e5e7eb" rx="4"/>
                <circle cx="30%" cy="25%" r="8%" fill="#d1d5db"/>
                <text x="50%" y="75%" text-anchor="middle" fill="#9ca3af" font-family="Arial, sans-serif" font-size="14">加载中...</text>
            </svg>
        `;
        return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
    }

    /**
     * 加载图片
     */
    async loadImage(element) {
        if (this.loadedImages.has(element)) return;

        const originalSrc = element.dataset.src || element.src;
        if (!originalSrc) return;

        try {
            // 获取优化后的图片URL
            const optimizedSrc = this.getOptimizedImageUrl(originalSrc);
            
            // 预加载图片
            await this.preloadImage(optimizedSrc);
            
            // 更新图片源
            if (element.tagName === 'IMG') {
                element.src = optimizedSrc;
                element.removeAttribute('data-src');
            } else if (element.tagName === 'PICTURE') {
                this.updatePictureElement(element, optimizedSrc);
            }

            // 添加加载完成的类
            element.classList.remove('lazy-loading');
            element.classList.add('lazy-loaded');
            
            // 添加淡入效果
            element.style.opacity = '0';
            element.style.transition = 'opacity 0.3s ease';
            
            requestAnimationFrame(() => {
                element.style.opacity = '1';
            });

            this.loadedImages.add(element);
            
        } catch (error) {
            console.error('图片加载失败:', originalSrc, error);
            element.classList.add('lazy-error');
        }
    }

    /**
     * 预加载图片
     */
    preloadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = resolve;
            img.onerror = reject;
            img.src = src;
        });
    }

    /**
     * 获取优化后的图片URL
     */
    getOptimizedImageUrl(originalUrl) {
        // 如果是外部URL，直接返回
        if (originalUrl.startsWith('http') && !originalUrl.includes(window.location.hostname)) {
            return originalUrl;
        }

        // 生成不同格式的URL
        const baseName = originalUrl.replace(/\.(jpg|jpeg|png)$/i, '');
        const extension = originalUrl.match(/\.(jpg|jpeg|png)$/i)?.[1]?.toLowerCase();

        if (!extension) return originalUrl;

        // 根据浏览器支持选择最佳格式
        if (this.supportsAvif) {
            return `${baseName}.avif`;
        } else if (this.supportsWebP) {
            return `${baseName}.webp`;
        }

        return originalUrl;
    }

    /**
     * 更新picture元素
     */
    updatePictureElement(pictureElement, optimizedSrc) {
        const img = pictureElement.querySelector('img');
        if (img) {
            img.src = optimizedSrc;
        }

        // 更新source元素
        const sources = pictureElement.querySelectorAll('source');
        sources.forEach(source => {
            const srcset = source.dataset.srcset;
            if (srcset) {
                source.srcset = this.optimizeSrcset(srcset);
                source.removeAttribute('data-srcset');
            }
        });
    }

    /**
     * 优化srcset
     */
    optimizeSrcset(srcset) {
        return srcset.split(',').map(src => {
            const [url, descriptor] = src.trim().split(' ');
            const optimizedUrl = this.getOptimizedImageUrl(url);
            return descriptor ? `${optimizedUrl} ${descriptor}` : optimizedUrl;
        }).join(', ');
    }

    /**
     * 优化现有图片
     */
    optimizeExistingImage(img) {
        if (img.complete && img.naturalWidth > 0) {
            // 图片已加载，添加优化属性
            img.loading = 'lazy';
            img.decoding = 'async';
        } else {
            // 图片未加载，设置懒加载
            const currentSrc = img.src;
            img.removeAttribute('src');
            img.dataset.src = currentSrc;
            this.setupLazyLoading(img);
        }
    }

    /**
     * 创建响应式图片
     */
    createResponsiveImage(config) {
        const {
            src,
            alt = '',
            sizes = '100vw',
            breakpoints = [480, 768, 1024, 1200],
            lazy = true
        } = config;

        const picture = document.createElement('picture');
        
        // 为每个断点创建source
        breakpoints.forEach((width, index) => {
            const source = document.createElement('source');
            const nextWidth = breakpoints[index + 1];
            
            // 生成不同尺寸的图片URL
            const srcset = this.generateSrcset(src, width);
            
            if (lazy) {
                source.dataset.srcset = srcset;
            } else {
                source.srcset = srcset;
            }
            
            // 设置媒体查询
            if (nextWidth) {
                source.media = `(max-width: ${nextWidth}px)`;
            }
            
            // 优先使用现代格式
            if (this.supportsAvif) {
                source.type = 'image/avif';
            } else if (this.supportsWebP) {
                source.type = 'image/webp';
            }
            
            picture.appendChild(source);
        });

        // 添加fallback img
        const img = document.createElement('img');
        img.alt = alt;
        img.sizes = sizes;
        
        if (lazy) {
            img.dataset.src = src;
            img.loading = 'lazy';
        } else {
            img.src = src;
        }
        
        img.decoding = 'async';
        picture.appendChild(img);

        if (lazy) {
            this.setupLazyLoading(picture);
        }

        return picture;
    }

    /**
     * 生成srcset
     */
    generateSrcset(baseSrc, maxWidth) {
        const densities = [1, 1.5, 2];
        const baseName = baseSrc.replace(/\.(jpg|jpeg|png)$/i, '');
        const extension = this.supportsWebP ? 'webp' : 
                         baseSrc.match(/\.(jpg|jpeg|png)$/i)?.[1] || 'jpg';

        return densities.map(density => {
            const width = Math.round(maxWidth * density);
            return `${baseName}_${width}w.${extension} ${density}x`;
        }).join(', ');
    }

    /**
     * 批量处理图片
     */
    processImageBatch(images) {
        const batchSize = 5;
        let currentBatch = 0;

        const processBatch = () => {
            const start = currentBatch * batchSize;
            const end = start + batchSize;
            const batch = images.slice(start, end);

            batch.forEach(img => {
                if (img.dataset.src) {
                    this.setupLazyLoading(img);
                } else {
                    this.optimizeExistingImage(img);
                }
            });

            currentBatch++;
            if (end < images.length) {
                requestIdleCallback(processBatch);
            }
        };

        processBatch();
    }

    /**
     * 清理资源
     */
    destroy() {
        if (this.observer) {
            this.observer.disconnect();
        }
        this.loadedImages.clear();
    }
}

// 全局实例
if (typeof window !== 'undefined') {
    window.imageOptimizer = new ImageOptimizer();
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImageOptimizer;
}