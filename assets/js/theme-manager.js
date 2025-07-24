/**
 * 统一主题管理器
 * 负责管理整个应用的深色/浅色模式切换
 */

class ThemeManager {
    constructor() {
        this.currentTheme = 'light';
        this.observers = [];
        this.storageKey = 'app-theme';
        this.init();
    }

    /**
     * 初始化主题管理器
     */
    init() {
        this.loadTheme();
        this.createToggleButton();
        this.setupSystemThemeListener();
        this.applyTheme();
        
        // 确保在页面完全加载后应用主题
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.applyTheme();
            });
        }
    }

    /**
     * 从本地存储加载主题设置
     */
    loadTheme() {
        const savedTheme = localStorage.getItem(this.storageKey);
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        if (savedTheme && ['light', 'dark'].includes(savedTheme)) {
            this.currentTheme = savedTheme;
        } else {
            this.currentTheme = systemPrefersDark ? 'dark' : 'light';
            this.saveTheme();
        }
    }

    /**
     * 保存主题设置到本地存储
     */
    saveTheme() {
        localStorage.setItem(this.storageKey, this.currentTheme);
    }

    /**
     * 应用主题到DOM
     */
    applyTheme() {
        const html = document.documentElement;
        const body = document.body;
        
        if (this.currentTheme === 'dark') {
            html.classList.add('dark');
            body.classList.add('dark');
        } else {
            html.classList.remove('dark');
            body.classList.remove('dark');
        }
        
        // 通知观察者主题已更改
        this.notifyObservers('themeChanged', this.currentTheme);
        
        // 更新切换按钮
        this.updateToggleButton();
        
        // 更新meta主题色
        this.updateMetaThemeColor();
    }

    /**
     * 切换主题
     */
    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.saveTheme();
        this.applyTheme();
        
        // 显示切换通知
        this.showThemeNotification();
    }

    /**
     * 设置特定主题
     * @param {string} theme - 'light' 或 'dark'
     */
    setTheme(theme) {
        if (['light', 'dark'].includes(theme) && theme !== this.currentTheme) {
            this.currentTheme = theme;
            this.saveTheme();
            this.applyTheme();
        }
    }

    /**
     * 获取当前主题
     * @returns {string} 当前主题
     */
    getCurrentTheme() {
        return this.currentTheme;
    }

    /**
     * 检查是否为深色模式
     * @returns {boolean} 是否为深色模式
     */
    isDark() {
        return this.currentTheme === 'dark';
    }

    /**
     * 创建主题切换按钮
     */
    createToggleButton() {
        // 检查是否已存在切换按钮
        if (document.getElementById('theme-toggle-btn')) {
            return;
        }

        const button = document.createElement('button');
        button.id = 'theme-toggle-btn';
        button.className = 'theme-toggle';
        button.setAttribute('aria-label', '切换深色/浅色模式');
        button.innerHTML = `
            <span class="material-symbols-rounded" id="theme-icon">
                ${this.currentTheme === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
        `;
        
        button.addEventListener('click', () => {
            this.toggleTheme();
        });
        
        // 添加键盘支持
        button.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.toggleTheme();
            }
        });
        
        document.body.appendChild(button);
    }

    /**
     * 更新切换按钮
     */
    updateToggleButton() {
        const button = document.getElementById('theme-toggle-btn');
        const icon = document.getElementById('theme-icon');
        
        if (button && icon) {
            icon.textContent = this.currentTheme === 'dark' ? 'light_mode' : 'dark_mode';
            button.setAttribute('aria-label', 
                this.currentTheme === 'dark' ? '切换到浅色模式' : '切换到深色模式'
            );
            button.title = this.currentTheme === 'dark' ? '切换到浅色模式' : '切换到深色模式';
        }
    }

    /**
     * 设置系统主题变化监听器
     */
    setupSystemThemeListener() {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        mediaQuery.addEventListener('change', (e) => {
            // 只有在用户没有手动设置过主题时才跟随系统
            const hasUserPreference = localStorage.getItem('user-theme-preference');
            if (!hasUserPreference) {
                this.currentTheme = e.matches ? 'dark' : 'light';
                this.saveTheme();
                this.applyTheme();
            }
        });
    }

    /**
     * 更新meta主题色
     */
    updateMetaThemeColor() {
        let metaThemeColor = document.querySelector('meta[name="theme-color"]');
        
        if (!metaThemeColor) {
            metaThemeColor = document.createElement('meta');
            metaThemeColor.name = 'theme-color';
            document.head.appendChild(metaThemeColor);
        }
        
        const themeColor = this.currentTheme === 'dark' ? '#1e293b' : '#ffffff';
        metaThemeColor.content = themeColor;
    }

    /**
     * 显示主题切换通知
     */
    showThemeNotification() {
        const message = this.currentTheme === 'dark' ? '🌙 已切换到深色模式' : '☀️ 已切换到浅色模式';
        this.showNotification(message, 'info');
    }

    /**
     * 显示通知
     * @param {string} message - 通知消息
     * @param {string} type - 通知类型
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `theme-notification theme-status-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 4rem;
            right: 1.5rem;
            padding: 0.75rem 1rem;
            border-radius: 8px;
            font-size: 0.875rem;
            font-weight: 500;
            z-index: 10000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            box-shadow: var(--shadow-lg);
            max-width: 250px;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // 触发动画
        requestAnimationFrame(() => {
            notification.style.transform = 'translateX(0)';
        });
        
        // 自动移除
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    /**
     * 添加主题变化观察者
     * @param {Function} callback - 回调函数
     */
    addObserver(callback) {
        if (typeof callback === 'function') {
            this.observers.push(callback);
        }
    }

    /**
     * 移除主题变化观察者
     * @param {Function} callback - 回调函数
     */
    removeObserver(callback) {
        const index = this.observers.indexOf(callback);
        if (index > -1) {
            this.observers.splice(index, 1);
        }
    }

    /**
     * 通知所有观察者
     * @param {string} event - 事件类型
     * @param {*} data - 事件数据
     */
    notifyObservers(event, data) {
        this.observers.forEach(callback => {
            try {
                callback(event, data);
            } catch (error) {
                console.error('主题观察者回调错误:', error);
            }
        });
    }

    /**
     * 获取当前主题的CSS变量值
     * @param {string} variable - CSS变量名（不含--前缀）
     * @returns {string} CSS变量值
     */
    getCSSVariable(variable) {
        return getComputedStyle(document.documentElement)
            .getPropertyValue(`--${variable}`)
            .trim();
    }

    /**
     * 检查浏览器是否支持CSS自定义属性
     * @returns {boolean} 是否支持
     */
    supportsCSSVariables() {
        return window.CSS && window.CSS.supports && window.CSS.supports('color', 'var(--test)');
    }

    /**
     * 为旧浏览器提供降级支持
     */
    provideFallback() {
        if (!this.supportsCSSVariables()) {
            console.warn('浏览器不支持CSS自定义属性，主题功能可能受限');
            // 可以在这里添加针对旧浏览器的样式处理
        }
    }

    /**
     * 导出主题设置
     * @returns {Object} 主题配置对象
     */
    exportSettings() {
        return {
            theme: this.currentTheme,
            userPreference: localStorage.getItem('user-theme-preference'),
            timestamp: Date.now()
        };
    }

    /**
     * 导入主题设置
     * @param {Object} settings - 主题配置对象
     */
    importSettings(settings) {
        if (settings && settings.theme && ['light', 'dark'].includes(settings.theme)) {
            this.setTheme(settings.theme);
            if (settings.userPreference) {
                localStorage.setItem('user-theme-preference', settings.userPreference);
            }
        }
    }

    /**
     * 重置主题设置
     */
    reset() {
        localStorage.removeItem(this.storageKey);
        localStorage.removeItem('user-theme-preference');
        this.loadTheme();
        this.applyTheme();
        this.showNotification('主题设置已重置', 'info');
    }
}

// 创建全局主题管理器实例
window.themeManager = new ThemeManager();

// 为兼容现有代码，保留一些全局函数
window.toggleTheme = () => window.themeManager.toggleTheme();
window.setTheme = (theme) => window.themeManager.setTheme(theme);
window.getCurrentTheme = () => window.themeManager.getCurrentTheme();

// 在页面加载完成后确保主题正确应用
document.addEventListener('DOMContentLoaded', () => {
    window.themeManager.applyTheme();
});

// 导出模块（如果支持ES6模块）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeManager;
}