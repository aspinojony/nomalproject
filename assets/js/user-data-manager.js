/**
 * 用户数据管理器
 * 为每个用户独立存储和管理学习数据
 * 支持用户切换时的数据隔离和加载
 */
class UserDataManager {
    constructor() {
        this.currentUserId = null;
        this.userData = new Map(); // 内存中的用户数据缓存
        this.storagePrefix = 'user_data_';
        this.globalStorageKey = 'current_user_id';
        
        // 支持的数据类型
        this.dataTypes = [
            'progress',        // 学习进度
            'statistics',      // 统计数据
            'notes',          // 笔记
            'preferences',    // 用户偏好
            'bookmarks',      // 书签
            'achievements',   // 成就
            'streaks',        // 连续学习天数
            'custom_settings' // 自定义设置
        ];
        
        // 事件监听器
        this.eventListeners = new Map();
        
        // 初始化当前用户数据
        this.initialize();
        
        console.log('👤 用户数据管理器初始化完成');
    }

    /**
     * 初始化用户数据管理器
     */
    async initialize() {
        try {
            // 恢复当前用户ID
            const savedUserId = localStorage.getItem(this.globalStorageKey);
            if (savedUserId) {
                await this.switchUser(savedUserId);
            }
            
            // 监听认证状态变化
            this.setupAuthListeners();
            
        } catch (error) {
            console.error('❌ 用户数据管理器初始化失败:', error);
        }
    }

    /**
     * 设置认证状态监听器
     */
    setupAuthListeners() {
        // 监听用户登录事件
        document.addEventListener('userLoggedIn', (event) => {
            const user = event.detail.user;
            if (user && user.id) {
                this.switchUser(user.id);
            }
        });

        // 监听用户登出事件
        document.addEventListener('userLoggedOut', () => {
            this.switchUser(null);
        });

        // 如果已有认证管理器，也监听其事件
        if (window.authManager) {
            window.authManager.on('userLoggedIn', (data) => {
                if (data.user && data.user.id) {
                    this.switchUser(data.user.id);
                }
            });

            window.authManager.on('logout', () => {
                this.switchUser(null);
            });
        }

        // 设置实时同步监听器
        this.setupRealtimeSyncListeners();
    }

    /**
     * 设置实时同步监听器
     */
    setupRealtimeSyncListeners() {
        // 等待实时同步管理器加载
        const waitForSyncManager = () => {
            if (window.realtimeSyncManager) {
                const syncManager = window.realtimeSyncManager;
                
                // 监听远程数据更新
                syncManager.on('remoteDataReceived', (data) => {
                    if (data.userId) {
                        this.handleRemoteDataUpdate(data.userId, data.dataType, data.data);
                    }
                });

                // 监听批量数据更新
                syncManager.on('batchUpdateReceived', (data) => {
                    if (data.updates) {
                        data.updates.forEach(update => {
                            if (update.userId) {
                                this.handleRemoteDataUpdate(update.userId, update.dataType, update.data);
                            }
                        });
                    }
                });

                // 监听同步连接状态变化
                syncManager.on('connectionStateChanged', (state) => {
                    if (state.isConnected && this.currentUserId) {
                        // 连接成功后，同步当前用户数据
                        console.log('🔄 同步连接已建立，开始同步用户数据...');
                        this.syncAllDataToRemote();
                    }
                });

                console.log('✅ 实时同步监听器已设置');
            } else {
                // 如果还没加载，稍后再试
                setTimeout(waitForSyncManager, 1000);
            }
        };

        waitForSyncManager();
    }

    /**
     * 同步所有用户数据到远程
     */
    async syncAllDataToRemote() {
        if (!this.currentUserId) return;

        try {
            // 收集最新数据
            await this.collectSystemData();
            
            const userData = this.userData.get(this.currentUserId);
            if (userData) {
                // 同步各种类型的数据
                for (const dataType of this.dataTypes) {
                    if (userData[dataType]) {
                        this.syncDataToRemote(dataType, userData[dataType]);
                    }
                }
                console.log('📤 所有用户数据已同步到远程服务器');
            }
        } catch (error) {
            console.error('❌ 同步所有数据失败:', error);
        }
    }

    /**
     * 切换用户
     * @param {string|null} userId - 用户ID，null表示退出登录
     */
    async switchUser(userId) {
        try {
            // 保存当前用户数据
            if (this.currentUserId) {
                await this.saveCurrentUserData();
            }

            // 切换到新用户
            this.currentUserId = userId;
            
            if (userId) {
                // 保存当前用户ID
                localStorage.setItem(this.globalStorageKey, userId);
                
                // 加载新用户数据
                await this.loadUserData(userId);
                
                // 应用用户数据到系统
                await this.applyUserDataToSystem();
                
                console.log(`👤 已切换到用户: ${userId}`);
            } else {
                // 清除当前用户ID
                localStorage.removeItem(this.globalStorageKey);
                
                // 清空用户数据
                this.userData.clear();
                
                // 重置系统为默认状态
                await this.resetSystemToDefault();
                
                console.log('👤 已退出用户，重置为默认状态');
            }

            // 触发用户切换事件
            this.emit('userSwitched', {
                previousUserId: this.currentUserId,
                currentUserId: userId,
                timestamp: new Date()
            });

        } catch (error) {
            console.error('❌ 用户切换失败:', error);
        }
    }

    /**
     * 加载用户数据
     * @param {string} userId - 用户ID
     */
    async loadUserData(userId) {
        try {
            const userDataKey = this.getUserStorageKey(userId);
            const savedData = localStorage.getItem(userDataKey);
            
            if (savedData) {
                const parsedData = JSON.parse(savedData);
                this.userData.set(userId, parsedData);
                console.log(`📥 已加载用户 ${userId} 的数据`);
            } else {
                // 初始化新用户的默认数据
                const defaultData = this.getDefaultUserData();
                this.userData.set(userId, defaultData);
                console.log(`🆕 为用户 ${userId} 创建默认数据`);
            }
        } catch (error) {
            console.error(`❌ 加载用户数据失败 (${userId}):`, error);
            // 创建默认数据作为备用
            this.userData.set(userId, this.getDefaultUserData());
        }
    }

    /**
     * 保存当前用户数据
     */
    async saveCurrentUserData() {
        if (!this.currentUserId) return;

        try {
            // 从系统中收集最新数据
            await this.collectSystemData();
            
            // 保存到localStorage
            const userDataKey = this.getUserStorageKey(this.currentUserId);
            const userData = this.userData.get(this.currentUserId);
            
            if (userData) {
                userData.lastSaved = new Date().toISOString();
                localStorage.setItem(userDataKey, JSON.stringify(userData));
                console.log(`💾 已保存用户 ${this.currentUserId} 的数据`);
            }
        } catch (error) {
            console.error(`❌ 保存用户数据失败 (${this.currentUserId}):`, error);
        }
    }

    /**
     * 从系统中收集用户数据
     */
    async collectSystemData() {
        if (!this.currentUserId) return;

        const userData = this.userData.get(this.currentUserId) || this.getDefaultUserData();

        // 收集学习进度数据
        if (window.StudyStatsManager) {
            const statsManager = window.studyStatsManager || new StudyStatsManager();
            userData.statistics = statsManager.stats;
        }

        // 收集IndexedDB中的进度数据
        try {
            if (typeof loadAllProgressFromDB === 'function') {
                userData.progress = await loadAllProgressFromDB();
            }
        } catch (error) {
            console.warn('⚠️ 收集进度数据时出错:', error);
        }

        // 收集主题设置
        if (window.themeManager) {
            userData.preferences.theme = window.themeManager.currentTheme;
        }

        // 收集其他用户设置
        const userSettings = localStorage.getItem('user_settings');
        if (userSettings) {
            try {
                userData.custom_settings = JSON.parse(userSettings);
            } catch (error) {
                console.warn('⚠️ 解析用户设置时出错:', error);
            }
        }

        this.userData.set(this.currentUserId, userData);
        
        // 触发实时同步
        this.syncDataToRemote('all', userData);
    }

    /**
     * 将用户数据应用到系统
     */
    async applyUserDataToSystem() {
        if (!this.currentUserId) return;

        const userData = this.userData.get(this.currentUserId);
        if (!userData) return;

        try {
            // 应用学习统计数据
            if (userData.statistics && window.studyStatsManager) {
                window.studyStatsManager.stats = userData.statistics;
                window.studyStatsManager.notifyObservers();
            }

            // 应用进度数据到IndexedDB
            if (userData.progress) {
                await this.restoreProgressData(userData.progress);
            }

            // 应用主题设置
            if (userData.preferences && userData.preferences.theme && window.themeManager) {
                window.themeManager.setTheme(userData.preferences.theme);
            }

            // 应用其他用户设置
            if (userData.custom_settings) {
                localStorage.setItem('user_settings', JSON.stringify(userData.custom_settings));
            }

            console.log(`✅ 已应用用户 ${this.currentUserId} 的数据到系统`);

        } catch (error) {
            console.error('❌ 应用用户数据到系统失败:', error);
        }
    }

    /**
     * 恢复进度数据到IndexedDB
     */
    async restoreProgressData(progressData) {
        if (!progressData || typeof restoreProgressToDB !== 'function') return;

        try {
            await restoreProgressToDB(progressData);
            console.log('✅ 进度数据已恢复到IndexedDB');
        } catch (error) {
            console.error('❌ 恢复进度数据失败:', error);
        }
    }

    /**
     * 重置系统为默认状态
     */
    async resetSystemToDefault() {
        try {
            // 重置学习统计
            if (window.studyStatsManager) {
                window.studyStatsManager.stats = window.studyStatsManager.getDefaultStats();
                window.studyStatsManager.notifyObservers();
            }

            // 清除IndexedDB中的进度数据
            if (typeof clearAllProgressFromDB === 'function') {
                await clearAllProgressFromDB();
            }

            // 重置主题为默认
            if (window.themeManager) {
                window.themeManager.setTheme('light');
            }

            // 清除用户设置
            localStorage.removeItem('user_settings');

            console.log('✅ 系统已重置为默认状态');

        } catch (error) {
            console.error('❌ 重置系统失败:', error);
        }
    }

    /**
     * 获取默认用户数据结构
     */
    getDefaultUserData() {
        const defaultStats = window.studyStatsManager ? 
            window.studyStatsManager.getDefaultStats() : {};

        return {
            progress: {},
            statistics: defaultStats,
            notes: {},
            preferences: {
                theme: 'light',
                language: 'zh-CN',
                notifications: true
            },
            bookmarks: [],
            achievements: [],
            streaks: {
                current: 0,
                longest: 0,
                lastStudyDate: null
            },
            custom_settings: {},
            createdAt: new Date().toISOString(),
            lastSaved: new Date().toISOString()
        };
    }

    /**
     * 获取用户存储键
     */
    getUserStorageKey(userId) {
        return `${this.storagePrefix}${userId}`;
    }

    /**
     * 获取当前用户数据
     */
    getCurrentUserData(dataType = null) {
        if (!this.currentUserId) return null;

        const userData = this.userData.get(this.currentUserId);
        if (!userData) return null;

        return dataType ? userData[dataType] : userData;
    }

    /**
     * 更新当前用户数据
     */
    updateCurrentUserData(dataType, data, syncToRemote = true) {
        if (!this.currentUserId) return false;

        const userData = this.userData.get(this.currentUserId) || this.getDefaultUserData();
        userData[dataType] = data;
        userData.lastSaved = new Date().toISOString();
        
        this.userData.set(this.currentUserId, userData);
        
        // 立即保存到localStorage
        this.saveCurrentUserData();
        
        // 触发实时同步
        if (syncToRemote) {
            this.syncDataToRemote(dataType, data);
        }
        
        return true;
    }

    /**
     * 同步数据到远程服务器
     */
    syncDataToRemote(dataType, data) {
        if (!window.realtimeSyncManager || !this.currentUserId) return;

        try {
            const syncManager = window.realtimeSyncManager;
            
            // 检查同步管理器是否已连接
            if (syncManager.isConnected()) {
                const changeData = {
                    operationId: this.generateOperationId(),
                    dataType: dataType,
                    operation: 'update',
                    data: data,
                    userId: this.currentUserId,
                    timestamp: new Date().toISOString(),
                    deviceId: syncManager.syncState?.deviceId
                };

                syncManager.sendDataChanges(dataType, [changeData]);
                console.log(`📤 已发送 ${dataType} 数据到远程服务器`);
            } else {
                console.log(`⏸️ 同步服务未连接，数据将在连接后同步`);
            }
        } catch (error) {
            console.warn('⚠️ 同步数据到远程失败:', error);
        }
    }

    /**
     * 处理远程数据更新
     */
    async handleRemoteDataUpdate(userId, dataType, data) {
        if (userId !== this.currentUserId) return;

        try {
            console.log(`📥 收到远程数据更新: ${dataType} (用户: ${userId})`);
            
            // 更新本地数据（不触发新的同步）
            this.updateCurrentUserData(dataType, data, false);
            
            // 应用数据到系统
            await this.applyUserDataToSystem();
            
            // 触发数据更新事件
            this.emit('remoteDataUpdated', {
                userId,
                dataType,
                data,
                timestamp: new Date()
            });

        } catch (error) {
            console.error('❌ 处理远程数据更新失败:', error);
        }
    }

    /**
     * 生成操作ID
     */
    generateOperationId() {
        return `${this.currentUserId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 获取所有用户列表
     */
    getAllUsers() {
        const users = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.storagePrefix)) {
                const userId = key.replace(this.storagePrefix, '');
                try {
                    const userData = JSON.parse(localStorage.getItem(key));
                    users.push({
                        id: userId,
                        createdAt: userData.createdAt,
                        lastSaved: userData.lastSaved
                    });
                } catch (error) {
                    console.warn(`⚠️ 解析用户数据失败: ${userId}`, error);
                }
            }
        }
        return users;
    }

    /**
     * 删除用户数据
     */
    deleteUser(userId) {
        const userDataKey = this.getUserStorageKey(userId);
        localStorage.removeItem(userDataKey);
        this.userData.delete(userId);
        
        if (this.currentUserId === userId) {
            this.switchUser(null);
        }
        
        console.log(`🗑️ 已删除用户 ${userId} 的数据`);
    }

    /**
     * 事件发射器
     */
    emit(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`❌ 用户数据管理器事件处理器错误 (${event}):`, error);
                }
            });
        }
    }

    /**
     * 事件监听器
     */
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    /**
     * 销毁管理器
     */
    destroy() {
        // 保存当前用户数据
        if (this.currentUserId) {
            this.saveCurrentUserData();
        }
        
        // 清空缓存
        this.userData.clear();
        this.eventListeners.clear();
        
        console.log('👤 用户数据管理器已销毁');
    }
}

// 创建全局实例
window.userDataManager = new UserDataManager();

// 页面卸载时保存数据
window.addEventListener('beforeunload', () => {
    if (window.userDataManager) {
        window.userDataManager.saveCurrentUserData();
    }
});

console.log('👤 用户数据管理器已加载');