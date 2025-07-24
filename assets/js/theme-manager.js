/**
 * 现代化主题管理系统
 * v2.0 - 更简洁、高性能的深色模式切换
 */

class ModernThemeManager {
    constructor() {
        this.theme = 'light';
        this.observers = new Set();
        this.storageKey = 'modern-theme';
        this.prefersDarkQuery = window.matchMedia('(prefers-color-scheme: dark)');
        this.isTransitioning = false;
        
        this.init();
    }

    /**
     * 初始化现代主题管理器
     */
    init() {
        this.loadTheme();
        this.setupSystemListener();
        this.applyTheme(false); // 初始化时不需要动画
        this.setupKeyboardShortcuts();
        
        // 延迟创建按钮，确保DOM已准备好
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => this.createToggleButton(), 100);
            });
        } else {
            setTimeout(() => this.createToggleButton(), 100);
        }
        
        console.log('🎨 现代主题管理器初始化完成');
    }

    /**
     * 智能加载主题设置
     */
    loadTheme() {
        const saved = localStorage.getItem(this.storageKey);
        const systemDark = this.prefersDarkQuery.matches;
        
        this.theme = (saved && ['light', 'dark'].includes(saved)) 
            ? saved 
            : (systemDark ? 'dark' : 'light');
        
        this.saveTheme();
    }

    /**
     * 保存主题设置
     */
    saveTheme() {
        localStorage.setItem(this.storageKey, this.theme);
    }

    /**
     * 高性能主题应用
     */
    applyTheme(animate = true) {
        if (this.isTransitioning) return;
        
        const isDark = this.theme === 'dark';
        const root = document.documentElement;
        
        // 防止闪烁的过渡处理
        if (animate) {
            this.isTransitioning = true;
            root.style.transition = 'color-scheme 0.3s ease, background-color 0.3s ease';
        }
        
        // 应用主题类
        root.classList.toggle('dark', isDark);
        document.body.classList.toggle('dark', isDark);
        
        // 更新color-scheme属性（改善表单控件样式）
        root.style.colorScheme = isDark ? 'dark' : 'light';
        
        // 更新meta标签
        this.updateMetaTheme();
        
        // 更新按钮
        this.updateToggleButton();
        
        // 通知观察者
        this.notifyObservers('themeChanged', this.theme);
        
        // 显示切换反馈
        if (animate) {
            this.showFeedback();
            setTimeout(() => {
                this.isTransitioning = false;
                root.style.transition = '';
            }, 300);
        }
    }

    /**
     * 切换主题（带动画）
     */
    toggle() {
        this.theme = this.theme === 'light' ? 'dark' : 'light';
        localStorage.setItem('user-theme-set', 'true'); // 标记用户手动设置
        this.saveTheme();
        this.applyTheme(true);
    }

    /**
     * 设置特定主题
     */
    setTheme(theme, animate = false) {
        if (['light', 'dark'].includes(theme) && theme !== this.theme) {
            this.theme = theme;
            this.saveTheme();
            this.applyTheme(animate);
        }
    }

    /**
     * 获取当前主题
     */
    getCurrentTheme() {
        return this.theme;
    }

    /**
     * 检查是否为深色模式
     */
    isDark() {
        return this.theme === 'dark';
    }

    /**
     * 创建现代化切换按钮
     */
    createToggleButton() {
        if (document.getElementById('modern-theme-toggle')) {
            console.log('🎨 现代主题切换按钮已存在，跳过创建');
            return;
        }
        
        // 确保 document.body 存在
        if (!document.body) {
            console.warn('⚠️ document.body 不存在，延迟创建按钮');
            setTimeout(() => this.createToggleButton(), 200);
            return;
        }
        
        // 先隐藏临时按钮，避免双按钮问题
        const oldButton = document.getElementById('manual-theme-toggle');
        if (oldButton) {
            oldButton.style.display = 'none';
            console.log('🎨 隐藏临时主题按钮');
        }
        
        try {
            const button = this.createElement('button', {
                id: 'modern-theme-toggle',
                className: 'modern-theme-toggle',
                ariaLabel: '切换深浅色主题',
                innerHTML: `
                    <div class="toggle-icon">
                        <svg class="sun-icon" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 18.5C15.59 18.5 18.5 15.59 18.5 12C18.5 8.41 15.59 5.5 12 5.5C8.41 5.5 5.5 8.41 5.5 12C5.5 15.59 8.41 18.5 12 18.5ZM12 2L14.39 5.42C13.65 5.15 12.84 5 12 5C11.16 5 10.35 5.15 9.61 5.42L12 2ZM3.34 7L6.76 4.61C6.49 5.35 6.34 6.16 6.34 7C6.34 7.84 6.49 8.65 6.76 9.39L3.34 7ZM3.34 17L6.76 19.39C6.49 18.65 6.34 17.84 6.34 17C6.34 16.16 6.49 15.35 6.76 14.61L3.34 17ZM20.66 17L17.24 14.61C17.51 15.35 17.66 16.16 17.66 17C17.66 17.84 17.51 18.65 17.24 19.39L20.66 17ZM20.66 7L17.24 9.39C17.51 8.65 17.66 7.84 17.66 7C17.66 6.16 17.51 5.35 17.24 4.61L20.66 7ZM12 22L9.61 18.58C10.35 18.85 11.16 19 12 19C12.84 19 13.65 18.85 14.39 18.58L12 22Z"/>
                        </svg>
                        <svg class="moon-icon" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.75,4.09L15.22,6.03L16.13,9.09L13.5,7.28L10.87,9.09L11.78,6.03L9.25,4.09L12.44,4L13.5,1L14.56,4L17.75,4.09M21.25,11L19.61,12.25L20.2,14.23L18.5,13.06L16.8,14.23L17.39,12.25L15.75,11L17.81,10.95L18.5,9L19.19,10.95L21.25,11M18.97,15.95C19.8,15.87 20.69,17.05 20.16,17.8C19.84,18.25 19.5,18.67 19.08,19.07C15.17,23 8.84,23 4.94,19.07C1.03,15.17 1.03,8.83 4.94,4.93C5.34,4.53 5.76,4.17 6.21,3.85C6.96,3.32 8.14,4.21 8.06,5.04C7.79,7.9 8.75,10.87 10.95,13.06C13.14,15.26 16.1,16.22 18.97,15.95M17.33,17.97C14.5,17.81 11.7,16.64 9.53,14.5C7.36,12.31 6.2,9.5 6.04,6.68C3.23,9.82 3.34,14.4 6.35,17.41C9.37,20.43 14,20.54 17.33,17.97Z"/>
                        </svg>
                    </div>
                    <span class="toggle-text">主题</span>
                `
            });
            
            // 添加样式
            button.style.cssText = `
                position: fixed;
                top: 1rem;
                right: 1rem;
                width: auto;
                height: 2.5rem;
                padding: 0 0.75rem;
                display: flex;
                align-items: center;
                gap: 0.5rem;
                background: var(--surface-primary, #ffffff);
                border: 1px solid var(--border-secondary, #e5e7eb);
                border-radius: 1.25rem;
                color: var(--text-primary, #1f2937);
                font-size: 0.875rem;
                font-weight: 500;
                cursor: pointer;
                z-index: 9999;
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
                backdrop-filter: blur(8px);
            `;
            
            // 确保只添加一次样式表
            if (!document.getElementById('modern-theme-style')) {
                const style = document.createElement('style');
                style.id = 'modern-theme-style';
                style.textContent = `
                    .modern-theme-toggle .toggle-icon {
                        position: relative;
                        width: 1.25rem;
                        height: 1.25rem;
                    }
                    .modern-theme-toggle svg {
                        position: absolute;
                        width: 100%;
                        height: 100%;
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    }
                    .modern-theme-toggle .sun-icon {
                        opacity: var(--sun-opacity, 1);
                        transform: rotate(var(--sun-rotate, 0deg)) scale(var(--sun-scale, 1));
                    }
                    .modern-theme-toggle .moon-icon {
                        opacity: var(--moon-opacity, 0);
                        transform: rotate(var(--moon-rotate, 180deg)) scale(var(--moon-scale, 0.8));
                    }
                    .dark .modern-theme-toggle .sun-icon {
                        --sun-opacity: 0;
                        --sun-rotate: 180deg;
                        --sun-scale: 0.8;
                    }
                    .dark .modern-theme-toggle .moon-icon {
                        --moon-opacity: 1;
                        --moon-rotate: 0deg;
                        --moon-scale: 1;
                    }
                    .modern-theme-toggle:hover {
                        transform: translateY(-1px);
                        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    }
                    .modern-theme-toggle:active {
                        transform: translateY(0);
                    }
                `;
                document.head.appendChild(style);
            }
            
            // 添加事件监听
            button.addEventListener('click', () => this.toggle());
            button.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.toggle();
                }
            });
            
            document.body.appendChild(button);
            
            // 隐藏旧按钮
            const oldButton = document.getElementById('manual-theme-toggle');
            if (oldButton) {
                oldButton.style.display = 'none';
                console.log('🎨 已隐藏临时主题按钮');
            }
            
            // 初始化按钮状态
            this.updateToggleButton();
            
            console.log('🎨 现代主题切换按钮已创建');
            
        } catch (error) {
            console.error('❌ 创建主题切换按钮失败:', error);
            
            // 如果创建失败，确保显示临时按钮
            const manualButton = document.getElementById('manual-theme-toggle');
            if (manualButton) {
                manualButton.style.display = 'flex';
                // 更新临时按钮图标
                if (window.updateManualButtonIcon) {
                    window.updateManualButtonIcon();
                }
                console.log('⚠️ 使用临时主题按钮作为备选方案');
            }
        }
    }

    /**
     * 创建DOM元素的辅助方法
     */
    createElement(tag, attrs = {}) {
        const element = document.createElement(tag);
        Object.entries(attrs).forEach(([key, value]) => {
            if (key === 'innerHTML') {
                element.innerHTML = value;
            } else if (key === 'className') {
                element.className = value;
            } else if (key === 'ariaLabel') {
                element.setAttribute('aria-label', value);
            } else {
                element.setAttribute(key, value);
            }
        });
        return element;
    }

    /**
     * 更新切换按钮状态
     */
    updateToggleButton() {
        const button = document.getElementById('modern-theme-toggle');
        if (button) {
            const label = this.isDark() ? '切换到浅色模式' : '切换到深色模式';
            button.setAttribute('aria-label', label);
            button.title = label;
        }
    }

    /**
     * 设置系统主题监听
     */
    setupSystemListener() {
        this.systemListener = (e) => {
            // 如果没有用户手动设置，跟随系统
            const userSet = localStorage.getItem('user-theme-set');
            if (!userSet) {
                this.theme = e.matches ? 'dark' : 'light';
                this.saveTheme();
                this.applyTheme(false);
            }
        };
        
        this.prefersDarkQuery.addEventListener('change', this.systemListener);
    }

    /**
     * 更新meta标签
     */
    updateMetaTheme() {
        const updateOrCreate = (name, content) => {
            let meta = document.querySelector(`meta[name="${name}"]`);
            if (!meta) {
                meta = document.createElement('meta');
                meta.name = name;
                document.head.appendChild(meta);
            }
            meta.content = content;
        };
        
        const isDark = this.isDark();
        updateOrCreate('theme-color', isDark ? '#0f172a' : '#ffffff');
        updateOrCreate('msapplication-navbutton-color', isDark ? '#0f172a' : '#ffffff');
        updateOrCreate('apple-mobile-web-app-status-bar-style', isDark ? 'black-translucent' : 'default');
    }

    /**
     * 显示切换反馈
     */
    showFeedback() {
        const message = this.isDark() ? '🌙 深色模式' : '☀️ 浅色模式';
        this.createToast(message);
    }

    /**
     * 创建简洁的反馈提示
     */
    createToast(message) {
        const toast = this.createElement('div', {
            className: 'theme-toast',
            innerHTML: message
        });
        
        toast.style.cssText = `
            position: fixed;
            top: 4rem;
            right: 1rem;
            padding: 0.5rem 1rem;
            background: var(--surface-primary);
            border: 1px solid var(--border-secondary);
            border-radius: 0.5rem;
            font-size: 0.875rem;
            font-weight: 500;
            color: var(--text-primary);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 10001;
            transform: translateX(calc(100% + 1rem));
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            backdrop-filter: blur(8px);
        `;
        
        document.body.appendChild(toast);
        
        requestAnimationFrame(() => {
            toast.style.transform = 'translateX(0)';
        });
        
        setTimeout(() => {
            toast.style.transform = 'translateX(calc(100% + 1rem))';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }

    /**
     * 添加主题变化观察者
     */
    addObserver(callback) {
        if (typeof callback === 'function') {
            this.observers.add(callback);
        }
    }

    /**
     * 移除主题变化观察者
     */
    removeObserver(callback) {
        this.observers.delete(callback);
    }

    /**
     * 通知所有观察者
     */
    notifyObservers(event, data) {
        this.observers.forEach(callback => {
            try {
                callback(event, data);
            } catch (error) {
                console.error('主题观察者错误:', error);
            }
        });
    }

    /**
     * 设置键盘快捷键
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Shift + D 切换主题
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
                e.preventDefault();
                this.toggle();
            }
        });
    }

    /**
     * 获取CSS变量值
     */
    getCSSVariable(variable) {
        return getComputedStyle(document.documentElement)
            .getPropertyValue(`--${variable}`)
            .trim();
    }

    /**
     * 检查CSS变量支持
     */
    supportsCSSVariables() {
        return window.CSS?.supports?.('color', 'var(--test)') ?? false;
    }

    /**
     * 导出主题设置
     */
    exportSettings() {
        return {
            theme: this.theme,
            userSet: localStorage.getItem('user-theme-set'),
            timestamp: Date.now(),
            version: '2.0'
        };
    }

    /**
     * 导入主题设置
     */
    importSettings(settings) {
        if (settings?.theme && ['light', 'dark'].includes(settings.theme)) {
            this.setTheme(settings.theme, false);
            if (settings.userSet) {
                localStorage.setItem('user-theme-set', settings.userSet);
            }
        }
    }

    /**
     * 重置主题设置
     */
    reset() {
        localStorage.removeItem(this.storageKey);
        localStorage.removeItem('user-theme-set');
        this.loadTheme();
        this.applyTheme(false);
        this.createToast('🔄 主题设置已重置');
    }
    
    /**
     * 销毁管理器（清理资源）
     */
    destroy() {
        this.prefersDarkQuery.removeEventListener('change', this.systemListener);
        const button = document.getElementById('modern-theme-toggle');
        if (button) button.remove();
        this.observers.clear();
    }
}

// 创建全局实例
let modernThemeManager = null;

function initModernTheme() {
    if (!modernThemeManager) {
        modernThemeManager = new ModernThemeManager();
        window.themeManager = modernThemeManager;
        
        // 向后兼容的全局函数
        window.toggleTheme = () => modernThemeManager.toggle();
        window.setTheme = (theme) => modernThemeManager.setTheme(theme, true);
        window.getCurrentTheme = () => modernThemeManager.getCurrentTheme();
        
        // 调试和测试函数
        window.debugTheme = () => {
            console.log('=== 主题系统调试信息 ===');
            console.log('当前主题:', modernThemeManager.getCurrentTheme());
            console.log('是否为深色模式:', modernThemeManager.isDark());
            console.log('现代按钮是否存在:', document.getElementById('modern-theme-toggle') ? '是' : '否');
            console.log('临时按钮是否存在:', document.getElementById('manual-theme-toggle') ? '是' : '否');
            console.log('DOM状态:', document.readyState);
            console.log('Body是否存在:', document.body ? '是' : '否');
            console.log('主题管理器实例:', modernThemeManager ? '已创建' : '未创建');
            
            // 强制显示按钮
            modernThemeManager.createToggleButton();
            return modernThemeManager.exportSettings();
        };
        
        window.showThemeButton = () => {
            console.log('强制创建主题切换按钮...');
            modernThemeManager.createToggleButton();
        };
        
        console.log('🎨 现代主题系统已激活');
    }
    return modernThemeManager;
}

// 智能初始化 - 确保只初始化一次，并更好地处理DOM就绪状态
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // 确保DOM完全加载后再初始化
        setTimeout(initModernTheme, 10);
    });
} else {
    // DOM已准备好，但可能body还没有完全加载，稍微延迟
    setTimeout(initModernTheme, 50);
}

// ES6模块导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModernThemeManager;
}