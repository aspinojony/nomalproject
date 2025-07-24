/**
 * 模块化系统核心
 * 提供模块注册、依赖管理和异步加载功能
 */
class ModuleSystem {
    constructor() {
        this.modules = new Map();
        this.dependencies = new Map();
        this.loadedModules = new Set();
        this.loadingPromises = new Map();
    }

    /**
     * 注册模块
     * @param {string} name 模块名称
     * @param {Function|Object} factory 模块工厂函数或对象
     * @param {Array} dependencies 依赖列表
     */
    register(name, factory, dependencies = []) {
        this.modules.set(name, { factory, dependencies });
        this.dependencies.set(name, dependencies);
    }

    /**
     * 异步加载模块
     * @param {string} name 模块名称
     * @returns {Promise} 模块实例
     */
    async load(name) {
        if (this.loadedModules.has(name)) {
            return this.modules.get(name)?.instance;
        }

        if (this.loadingPromises.has(name)) {
            return this.loadingPromises.get(name);
        }

        const loadPromise = this._loadModule(name);
        this.loadingPromises.set(name, loadPromise);
        
        return loadPromise;
    }

    /**
     * 内部加载模块逻辑
     */
    async _loadModule(name) {
        const moduleInfo = this.modules.get(name);
        if (!moduleInfo) {
            throw new Error(`模块 "${name}" 未注册`);
        }

        // 递归加载依赖
        const dependencies = await this._loadDependencies(moduleInfo.dependencies);

        // 创建模块实例
        let instance;
        if (typeof moduleInfo.factory === 'function') {
            instance = new moduleInfo.factory(...dependencies);
        } else {
            instance = moduleInfo.factory;
        }

        // 缓存实例
        moduleInfo.instance = instance;
        this.loadedModules.add(name);
        this.loadingPromises.delete(name);

        return instance;
    }

    /**
     * 加载依赖模块
     */
    async _loadDependencies(dependencies) {
        if (!dependencies || dependencies.length === 0) {
            return [];
        }

        const loadPromises = dependencies.map(dep => this.load(dep));
        return Promise.all(loadPromises);
    }

    /**
     * 批量加载模块
     * @param {Array} names 模块名称数组
     * @returns {Promise<Array>} 模块实例数组
     */
    async loadMultiple(names) {
        const loadPromises = names.map(name => this.load(name));
        return Promise.all(loadPromises);
    }

    /**
     * 检查模块是否已加载
     * @param {string} name 模块名称
     * @returns {boolean}
     */
    isLoaded(name) {
        return this.loadedModules.has(name);
    }

    /**
     * 获取已加载的模块实例
     * @param {string} name 模块名称
     * @returns {any|null}
     */
    getInstance(name) {
        return this.modules.get(name)?.instance || null;
    }

    /**
     * 卸载模块
     * @param {string} name 模块名称
     */
    unload(name) {
        const moduleInfo = this.modules.get(name);
        if (moduleInfo?.instance && typeof moduleInfo.instance.destroy === 'function') {
            moduleInfo.instance.destroy();
        }
        
        moduleInfo.instance = null;
        this.loadedModules.delete(name);
        this.loadingPromises.delete(name);
    }

    /**
     * 获取模块依赖图
     * @returns {Object} 依赖关系映射
     */
    getDependencyGraph() {
        const graph = {};
        for (const [name, deps] of this.dependencies) {
            graph[name] = deps;
        }
        return graph;
    }
}

/**
 * 组件基类
 * 提供标准的组件生命周期和接口
 */
class BaseComponent {
    constructor(container, options = {}) {
        this.container = container;
        this.options = { ...this.getDefaultOptions(), ...options };
        this.state = {};
        this.eventListeners = [];
    }

    /**
     * 获取默认配置
     * @returns {Object}
     */
    getDefaultOptions() {
        return {};
    }

    /**
     * 初始化组件
     */
    async init() {
        await this.beforeRender();
        this.render();
        this.bindEvents();
        await this.afterRender();
    }

    /**
     * 渲染前钩子
     */
    async beforeRender() {
        // 子类可重写
    }

    /**
     * 渲染组件
     */
    render() {
        // 子类必须实现
        throw new Error('render() 方法必须被子类实现');
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // 子类可重写
    }

    /**
     * 渲染后钩子
     */
    async afterRender() {
        // 子类可重写
    }

    /**
     * 更新组件
     * @param {Object} newOptions 新配置
     */
    update(newOptions = {}) {
        this.options = { ...this.options, ...newOptions };
        this.render();
    }

    /**
     * 添加事件监听器
     * @param {Element} element 目标元素
     * @param {string} event 事件类型
     * @param {Function} handler 事件处理器
     */
    addEventListener(element, event, handler) {
        element.addEventListener(event, handler);
        this.eventListeners.push({ element, event, handler });
    }

    /**
     * 销毁组件
     */
    destroy() {
        // 移除所有事件监听器
        this.eventListeners.forEach(({ element, event, handler }) => {
            element.removeEventListener(event, handler);
        });
        this.eventListeners = [];

        // 清空容器
        if (this.container) {
            this.container.innerHTML = '';
        }

        // 清理状态
        this.state = {};
    }

    /**
     * 设置状态
     * @param {Object} newState 新状态
     */
    setState(newState) {
        const prevState = { ...this.state };
        this.state = { ...this.state, ...newState };
        this.onStateChange(this.state, prevState);
    }

    /**
     * 状态变化回调
     * @param {Object} currentState 当前状态
     * @param {Object} prevState 前一状态
     */
    onStateChange(currentState, prevState) {
        // 子类可重写
    }
}

// 创建全局模块系统实例
window.moduleSystem = new ModuleSystem();
window.BaseComponent = BaseComponent;

// 注册核心模块
moduleSystem.register('utils', Utils);