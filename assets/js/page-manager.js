// 组件加载器
class ComponentLoader {
    constructor() {
        this.loadedComponents = new Set();
        this.componentCache = new Map();
    }

    // 加载组件
    async loadComponent(componentPath) {
        if (this.loadedComponents.has(componentPath)) {
            return true;
        }

        try {
            const response = await fetch(`assets/components/${componentPath}.html`);
            if (!response.ok) {
                throw new Error(`Failed to load component: ${componentPath}`);
            }

            const html = await response.text();
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html;

            // 提取并插入模板
            const templates = tempDiv.querySelectorAll('template');
            templates.forEach(template => {
                document.head.appendChild(template);
            });

            // 提取并执行脚本
            const scripts = tempDiv.querySelectorAll('script');
            scripts.forEach(script => {
                const newScript = document.createElement('script');
                if (script.src) {
                    newScript.src = script.src;
                } else {
                    newScript.textContent = script.textContent;
                }
                document.head.appendChild(newScript);
            });

            this.loadedComponents.add(componentPath);
            this.componentCache.set(componentPath, html);
            return true;
        } catch (error) {
            console.error(`Error loading component ${componentPath}:`, error);
            return false;
        }
    }

    // 批量加载组件
    async loadComponents(componentPaths) {
        const promises = componentPaths.map(path => this.loadComponent(path));
        const results = await Promise.all(promises);
        return results.every(result => result === true);
    }

    // 获取已加载的组件列表
    getLoadedComponents() {
        return Array.from(this.loadedComponents);
    }

    // 检查组件是否已加载
    isComponentLoaded(componentPath) {
        return this.loadedComponents.has(componentPath);
    }

    // 清除缓存
    clearCache() {
        this.loadedComponents.clear();
        this.componentCache.clear();
    }
}

// 页面管理器
class PageManager {
    constructor() {
        this.componentLoader = new ComponentLoader();
        this.currentPage = null;
        this.navbar = null;
        this.footer = null;
    }

    // 初始化页面
    async initializePage(pageConfig) {
        this.currentPage = pageConfig.name;

        // 加载必需的组件
        const requiredComponents = ['navbar', 'footer', ...(pageConfig.components || [])];
        const loaded = await this.componentLoader.loadComponents(requiredComponents);
        
        if (!loaded) {
            console.error('Failed to load required components');
            return false;
        }

        // 初始化导航栏
        await this.initializeNavbar(pageConfig.navbar);
        
        // 初始化页脚
        await this.initializeFooter(pageConfig.footer);

        // 执行页面特定的初始化
        if (pageConfig.onInit) {
            await pageConfig.onInit();
        }

        return true;
    }

    // 初始化导航栏
    async initializeNavbar(navbarConfig = {}) {
        const navbarContainer = document.getElementById('navbar-container');
        if (navbarContainer && window.NavbarComponent) {
            this.navbar = new NavbarComponent(navbarContainer, {
                currentPage: this.currentPage,
                ...navbarConfig
            });
        }
    }

    // 初始化页脚
    async initializeFooter(footerConfig = {}) {
        const footerContainer = document.getElementById('footer-container');
        if (footerContainer && window.FooterComponent) {
            this.footer = new FooterComponent(footerContainer, footerConfig);
        }
    }

    // 更新导航栏统计
    updateNavbarStats(statsData) {
        if (this.navbar) {
            this.navbar.updateStats(statsData);
        }
    }

    // 显示加载状态
    showLoading(message = '加载中...') {
        Utils.showToast(message, 'info', 1000);
    }

    // 隐藏加载状态
    hideLoading() {
        // 可以在这里实现隐藏加载动画的逻辑
    }
}

// 创建全局页面管理器实例
window.pageManager = new PageManager();
window.ComponentLoader = ComponentLoader;