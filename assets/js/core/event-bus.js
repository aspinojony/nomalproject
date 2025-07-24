/**
 * 事件总线系统
 * 提供组件间通信和事件管理
 */
class EventBus {
    constructor() {
        this.events = new Map();
        this.onceEvents = new Map();
        this.middleware = [];
    }

    /**
     * 订阅事件
     * @param {string} eventName 事件名称
     * @param {Function} callback 回调函数
     * @returns {Function} 取消订阅函数
     */
    on(eventName, callback) {
        if (!this.events.has(eventName)) {
            this.events.set(eventName, new Set());
        }
        
        this.events.get(eventName).add(callback);

        return () => this.off(eventName, callback);
    }

    /**
     * 一次性订阅事件
     * @param {string} eventName 事件名称
     * @param {Function} callback 回调函数
     */
    once(eventName, callback) {
        const wrappedCallback = (...args) => {
            callback(...args);
            this.off(eventName, wrappedCallback);
        };
        
        this.on(eventName, wrappedCallback);
    }

    /**
     * 取消订阅
     * @param {string} eventName 事件名称
     * @param {Function} callback 回调函数
     */
    off(eventName, callback) {
        const eventCallbacks = this.events.get(eventName);
        if (eventCallbacks) {
            eventCallbacks.delete(callback);
            if (eventCallbacks.size === 0) {
                this.events.delete(eventName);
            }
        }
    }

    /**
     * 发布事件
     * @param {string} eventName 事件名称
     * @param {...any} args 事件参数
     */
    emit(eventName, ...args) {
        // 应用中间件
        const event = { name: eventName, args, timestamp: Date.now() };
        const processedEvent = this.applyMiddleware(event);
        
        if (processedEvent === null) return;

        // 触发事件监听器
        const eventCallbacks = this.events.get(eventName);
        if (eventCallbacks) {
            eventCallbacks.forEach(callback => {
                try {
                    callback(...processedEvent.args);
                } catch (error) {
                    console.error(`事件 "${eventName}" 处理器执行错误:`, error);
                }
            });
        }
    }

    /**
     * 添加中间件
     * @param {Function} middleware 中间件函数
     */
    use(middleware) {
        this.middleware.push(middleware);
    }

    /**
     * 应用中间件
     * @param {Object} event 事件对象
     * @returns {Object|null} 处理后的事件或null
     */
    applyMiddleware(event) {
        let currentEvent = event;
        
        for (const middleware of this.middleware) {
            currentEvent = middleware(currentEvent);
            if (currentEvent === null) break;
        }
        
        return currentEvent;
    }

    /**
     * 清空所有事件监听器
     */
    clear() {
        this.events.clear();
        this.onceEvents.clear();
    }

    /**
     * 获取事件统计信息
     * @returns {Object} 统计信息
     */
    getStats() {
        const stats = {};
        for (const [eventName, callbacks] of this.events) {
            stats[eventName] = callbacks.size;
        }
        return stats;
    }
}

// 创建全局事件总线实例
window.eventBus = new EventBus();

// 注册事件总线模块
moduleSystem.register('eventBus', eventBus);