/**
 * 状态管理系统
 * 提供全局状态管理、订阅机制和持久化存储
 */
class StateManager {
    constructor() {
        this.state = {};
        this.subscribers = new Map();
        this.middleware = [];
        this.history = [];
        this.maxHistoryLength = 50;
    }

    /**
     * 获取状态
     * @param {string} path 状态路径，支持点号分隔的嵌套路径
     * @returns {any} 状态值
     */
    getState(path) {
        if (!path) return this.state;
        
        return path.split('.').reduce((obj, key) => {
            return obj && obj[key] !== undefined ? obj[key] : undefined;
        }, this.state);
    }

    /**
     * 设置状态
     * @param {string} path 状态路径
     * @param {any} value 新值
     * @param {boolean} silent 是否静默更新（不触发订阅者）
     */
    setState(path, value, silent = false) {
        const oldState = { ...this.state };
        const oldValue = this.getState(path);

        // 应用中间件
        const action = { type: 'SET_STATE', path, value, oldValue };
        const processedAction = this.applyMiddleware(action);
        
        if (processedAction === null) return; // 中间件阻止了更新

        // 更新状态
        this._updateNestedState(this.state, path.split('.'), processedAction.value);

        // 记录历史
        this.addHistory(oldState, path, oldValue, processedAction.value);

        // 通知订阅者
        if (!silent) {
            this.notifySubscribers(path, processedAction.value, oldValue);
        }
    }

    /**
     * 批量更新状态
     * @param {Object} updates 更新对象，键为路径，值为新值
     */
    batchUpdate(updates) {
        const oldState = { ...this.state };
        const changes = [];

        // 批量应用更新
        for (const [path, value] of Object.entries(updates)) {
            const oldValue = this.getState(path);
            this._updateNestedState(this.state, path.split('.'), value);
            changes.push({ path, value, oldValue });
        }

        // 记录历史
        this.addHistory(oldState, 'batch', null, updates);

        // 批量通知订阅者
        changes.forEach(({ path, value, oldValue }) => {
            this.notifySubscribers(path, value, oldValue);
        });
    }

    /**
     * 订阅状态变化
     * @param {string} path 监听的状态路径
     * @param {Function} callback 回调函数
     * @returns {Function} 取消订阅函数
     */
    subscribe(path, callback) {
        if (!this.subscribers.has(path)) {
            this.subscribers.set(path, new Set());
        }
        
        this.subscribers.get(path).add(callback);

        // 返回取消订阅函数
        return () => {
            const pathSubscribers = this.subscribers.get(path);
            if (pathSubscribers) {
                pathSubscribers.delete(callback);
                if (pathSubscribers.size === 0) {
                    this.subscribers.delete(path);
                }
            }
        };
    }

    /**
     * 添加中间件
     * @param {Function} middleware 中间件函数
     */
    addMiddleware(middleware) {
        this.middleware.push(middleware);
    }

    /**
     * 应用中间件
     * @param {Object} action 动作对象
     * @returns {Object|null} 处理后的动作或null（阻止）
     */
    applyMiddleware(action) {
        let currentAction = action;
        
        for (const middleware of this.middleware) {
            currentAction = middleware(currentAction, this.state);
            if (currentAction === null) break;
        }
        
        return currentAction;
    }

    /**
     * 通知订阅者
     * @param {string} path 状态路径
     * @param {any} newValue 新值
     * @param {any} oldValue 旧值
     */
    notifySubscribers(path, newValue, oldValue) {
        // 通知精确路径的订阅者
        const exactSubscribers = this.subscribers.get(path);
        if (exactSubscribers) {
            exactSubscribers.forEach(callback => {
                try {
                    callback(newValue, oldValue, path);
                } catch (error) {
                    console.error('订阅者回调执行错误:', error);
                }
            });
        }

        // 通知父路径的订阅者
        const pathParts = path.split('.');
        for (let i = pathParts.length - 1; i > 0; i--) {
            const parentPath = pathParts.slice(0, i).join('.');
            const parentSubscribers = this.subscribers.get(parentPath);
            if (parentSubscribers) {
                const parentNewValue = this.getState(parentPath);
                const parentOldValue = this.getState(parentPath); // 简化处理
                parentSubscribers.forEach(callback => {
                    try {
                        callback(parentNewValue, parentOldValue, parentPath);
                    } catch (error) {
                        console.error('父路径订阅者回调执行错误:', error);
                    }
                });
            }
        }
    }

    /**
     * 更新嵌套状态
     * @param {Object} obj 目标对象
     * @param {Array} pathArray 路径数组
     * @param {any} value 新值
     */
    _updateNestedState(obj, pathArray, value) {
        const lastKey = pathArray.pop();
        const target = pathArray.reduce((current, key) => {
            if (!current[key] || typeof current[key] !== 'object') {
                current[key] = {};
            }
            return current[key];
        }, obj);
        
        target[lastKey] = value;
    }

    /**
     * 添加历史记录
     * @param {Object} oldState 旧状态
     * @param {string} path 变更路径
     * @param {any} oldValue 旧值
     * @param {any} newValue 新值
     */
    addHistory(oldState, path, oldValue, newValue) {
        this.history.push({
            timestamp: Date.now(),
            path,
            oldValue,
            newValue,
            oldState: JSON.parse(JSON.stringify(oldState))
        });

        // 限制历史记录长度
        if (this.history.length > this.maxHistoryLength) {
            this.history.shift();
        }
    }

    /**
     * 获取历史记录
     * @param {number} limit 限制数量
     * @returns {Array} 历史记录数组
     */
    getHistory(limit = 10) {
        return this.history.slice(-limit);
    }

    /**
     * 回滚到指定状态
     * @param {number} timestamp 时间戳
     */
    rollback(timestamp) {
        const historyItem = this.history.find(item => item.timestamp === timestamp);
        if (historyItem) {
            this.state = JSON.parse(JSON.stringify(historyItem.oldState));
            this.notifyAllSubscribers();
        }
    }

    /**
     * 通知所有订阅者
     */
    notifyAllSubscribers() {
        for (const [path, subscribers] of this.subscribers) {
            const currentValue = this.getState(path);
            subscribers.forEach(callback => {
                callback(currentValue, undefined, path);
            });
        }
    }

    /**
     * 持久化状态到本地存储
     * @param {string} key 存储键名
     * @param {Array} paths 需要持久化的状态路径
     */
    persist(key, paths = []) {
        const dataToSave = paths.length > 0 
            ? paths.reduce((obj, path) => {
                obj[path] = this.getState(path);
                return obj;
            }, {})
            : this.state;

        Utils.storage.set(key, dataToSave);
    }

    /**
     * 从本地存储恢复状态
     * @param {string} key 存储键名
     * @param {boolean} merge 是否合并到当前状态
     */
    restore(key, merge = true) {
        const savedData = Utils.storage.get(key);
        if (savedData) {
            if (merge) {
                for (const [path, value] of Object.entries(savedData)) {
                    this.setState(path, value, true);
                }
            } else {
                this.state = savedData;
            }
            this.notifyAllSubscribers();
        }
    }

    /**
     * 清空状态
     */
    clear() {
        this.state = {};
        this.history = [];
        this.notifyAllSubscribers();
    }

    /**
     * 重置状态管理器
     */
    reset() {
        this.state = {};
        this.subscribers.clear();
        this.history = [];
        this.middleware = [];
    }
}

// 预定义的中间件

/**
 * 日志中间件
 */
const loggerMiddleware = (action, state) => {
    console.log(`[StateManager] ${action.type}:`, {
        path: action.path,
        oldValue: action.oldValue,
        newValue: action.value,
        timestamp: new Date().toISOString()
    });
    return action;
};

/**
 * 验证中间件
 */
const validationMiddleware = (validators) => (action, state) => {
    const validator = validators[action.path];
    if (validator && !validator(action.value)) {
        console.warn(`[StateManager] 验证失败:`, action);
        return null; // 阻止更新
    }
    return action;
};

/**
 * 只读路径中间件
 */
const readOnlyMiddleware = (readOnlyPaths) => (action, state) => {
    if (readOnlyPaths.includes(action.path)) {
        console.warn(`[StateManager] 尝试修改只读路径: ${action.path}`);
        return null;
    }
    return action;
};

// 创建全局状态管理器实例
window.stateManager = new StateManager();

// 导出中间件
window.StateMiddleware = {
    logger: loggerMiddleware,
    validation: validationMiddleware,
    readOnly: readOnlyMiddleware
};

// 注册状态管理器模块
moduleSystem.register('stateManager', stateManager);