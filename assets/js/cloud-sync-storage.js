/**
 * 云同步AI对话存储管理器
 * 在本地存储基础上添加云同步功能
 */
class CloudSyncConversationStorage extends AIConversationStorage {
    constructor() {
        super();
        
        // 云同步相关配置
        this.cloudConfig = {
            serverUrl: window.location.hostname === 'localhost' ? 
                'http://localhost:5000' : 'https://your-server-domain.com',
            apiVersion: 'v1',
            syncInterval: 5 * 60 * 1000, // 5分钟自动同步
            retryAttempts: 3,
            retryDelay: 2000
        };
        
        // 同步状态
        this.syncStatus = {
            isOnline: navigator.onLine,
            lastSyncAt: null,
            syncVersion: 0,
            pendingChanges: [],
            conflictsCount: 0,
            syncInProgress: false
        };
        
        // 用户认证
        this.auth = {
            accessToken: localStorage.getItem('auth_access_token'),
            refreshToken: localStorage.getItem('auth_refresh_token'),
            user: JSON.parse(localStorage.getItem('auth_user') || 'null'),
            isLoggedIn: false
        };
        
        // WebSocket连接
        this.socket = null;
        
        // 设备ID（用于识别不同设备）
        this.deviceId = this.getOrCreateDeviceId();
        
        // 事件监听器
        this.setupEventListeners();
        
        // 初始化
        this.initializeCloudSync();
    }

    /**
     * 获取或创建设备ID
     */
    getOrCreateDeviceId() {
        let deviceId = localStorage.getItem('device_id');
        if (!deviceId) {
            deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('device_id', deviceId);
        }
        return deviceId;
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 网络状态监听
        window.addEventListener('online', () => {
            this.syncStatus.isOnline = true;
            console.log('🌐 网络已连接，准备同步');
            if (this.auth.isLoggedIn) {
                this.attemptSync();
            }
        });

        window.addEventListener('offline', () => {
            this.syncStatus.isOnline = false;
            console.log('📡 网络已断开，切换到离线模式');
        });

        // 页面关闭前同步
        window.addEventListener('beforeunload', () => {
            if (this.syncStatus.pendingChanges.length > 0) {
                this.syncPendingChanges();
            }
        });

        // 页面可见性变化时同步
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.auth.isLoggedIn && this.syncStatus.isOnline) {
                this.attemptSync();
            }
        });
    }

    /**
     * 初始化云同步
     */
    async initializeCloudSync() {
        await this.init(); // 先初始化本地存储
        
        // 检查登录状态
        if (this.auth.accessToken) {
            try {
                await this.verifyToken();
                if (this.auth.isLoggedIn) {
                    await this.connectWebSocket();
                    await this.startAutoSync();
                    console.log('✅ 云同步初始化完成');
                }
            } catch (error) {
                console.error('❌ 云同步初始化失败:', error);
                await this.logout(); // 清除无效认证信息
            }
        }
    }

    /**
     * 用户登录
     */
    async login(identifier, password) {
        try {
            const response = await this.apiCall('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({
                    identifier,
                    password
                })
            });

            if (response.success) {
                const { user, accessToken, refreshToken } = response.data;
                
                this.auth.user = user;
                this.auth.accessToken = accessToken;
                this.auth.refreshToken = refreshToken;
                this.auth.isLoggedIn = true;

                // 保存到本地存储
                localStorage.setItem('auth_access_token', accessToken);
                localStorage.setItem('auth_refresh_token', refreshToken);
                localStorage.setItem('auth_user', JSON.stringify(user));

                console.log(`✅ 用户登录成功: ${user.username}`);

                // 连接WebSocket
                await this.connectWebSocket();
                
                // 开始同步
                await this.startAutoSync();
                await this.performFullSync();

                return { success: true, user };
            } else {
                return { success: false, message: response.message };
            }
        } catch (error) {
            console.error('❌ 登录失败:', error);
            return { success: false, message: '登录失败，请检查网络连接' };
        }
    }

    /**
     * 用户注册
     */
    async register(username, email, password, displayName) {
        try {
            const response = await this.apiCall('/api/auth/register', {
                method: 'POST',
                body: JSON.stringify({
                    username,
                    email,
                    password,
                    displayName
                })
            });

            if (response.success) {
                const { user, accessToken, refreshToken } = response.data;
                
                this.auth.user = user;
                this.auth.accessToken = accessToken;
                this.auth.refreshToken = refreshToken;
                this.auth.isLoggedIn = true;

                // 保存到本地存储
                localStorage.setItem('auth_access_token', accessToken);
                localStorage.setItem('auth_refresh_token', refreshToken);
                localStorage.setItem('auth_user', JSON.stringify(user));

                console.log(`✅ 用户注册成功: ${user.username}`);

                // 连接WebSocket并开始同步
                await this.connectWebSocket();
                await this.startAutoSync();

                return { success: true, user };
            } else {
                return { success: false, message: response.message, errors: response.errors };
            }
        } catch (error) {
            console.error('❌ 注册失败:', error);
            return { success: false, message: '注册失败，请检查网络连接' };
        }
    }

    /**
     * 用户登出
     */
    async logout() {
        // 清除认证信息
        this.auth = {
            accessToken: null,
            refreshToken: null,
            user: null,
            isLoggedIn: false
        };

        localStorage.removeItem('auth_access_token');
        localStorage.removeItem('auth_refresh_token');
        localStorage.removeItem('auth_user');

        // 断开WebSocket
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }

        // 停止自动同步
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }

        // 重置同步状态
        this.syncStatus.lastSyncAt = null;
        this.syncStatus.syncVersion = 0;
        this.syncStatus.pendingChanges = [];

        console.log('✅ 用户已登出');
        return { success: true };
    }

    /**
     * 验证token有效性
     */
    async verifyToken() {
        if (!this.auth.accessToken) {
            return false;
        }

        try {
            const response = await this.apiCall('/api/auth/profile', {
                method: 'GET'
            });

            if (response.success) {
                this.auth.user = response.data.user;
                this.auth.isLoggedIn = true;
                return true;
            } else {
                // token无效，尝试刷新
                return await this.refreshToken();
            }
        } catch (error) {
            console.error('❌ token验证失败:', error);
            return false;
        }
    }

    /**
     * 刷新token
     */
    async refreshToken() {
        if (!this.auth.refreshToken) {
            return false;
        }

        try {
            const response = await this.apiCall('/api/auth/refresh', {
                method: 'POST',
                body: JSON.stringify({
                    refreshToken: this.auth.refreshToken
                }),
                skipAuth: true // 不使用accessToken
            });

            if (response.success) {
                const { accessToken, refreshToken } = response.data;
                
                this.auth.accessToken = accessToken;
                this.auth.refreshToken = refreshToken;

                localStorage.setItem('auth_access_token', accessToken);
                localStorage.setItem('auth_refresh_token', refreshToken);

                console.log('✅ Token刷新成功');
                return true;
            } else {
                console.error('❌ Token刷新失败:', response.message);
                return false;
            }
        } catch (error) {
            console.error('❌ Token刷新错误:', error);
            return false;
        }
    }

    /**
     * API调用封装
     */
    async apiCall(endpoint, options = {}) {
        const url = `${this.cloudConfig.serverUrl}${endpoint}`;
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': `KaoyanPlatform/1.0 (${this.deviceId})`
            }
        };

        // 添加认证头
        if (this.auth.accessToken && !options.skipAuth) {
            defaultOptions.headers.Authorization = `Bearer ${this.auth.accessToken}`;
        }

        const finalOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        };

        let attempt = 0;
        while (attempt < this.cloudConfig.retryAttempts) {
            try {
                const response = await fetch(url, finalOptions);
                const data = await response.json();

                if (response.status === 401 && !options.skipAuth) {
                    // 尝试刷新token
                    if (await this.refreshToken()) {
                        // 重新设置认证头
                        finalOptions.headers.Authorization = `Bearer ${this.auth.accessToken}`;
                        continue; // 重试
                    } else {
                        // 刷新失败，需要重新登录
                        await this.logout();
                        throw new Error('认证失败，请重新登录');
                    }
                }

                if (!response.ok) {
                    throw new Error(data.message || `HTTP ${response.status}`);
                }

                return data;
            } catch (error) {
                attempt++;
                if (attempt >= this.cloudConfig.retryAttempts) {
                    throw error;
                }
                
                // 等待后重试
                await new Promise(resolve => 
                    setTimeout(resolve, this.cloudConfig.retryDelay * attempt)
                );
            }
        }
    }

    /**
     * 连接WebSocket
     */
    async connectWebSocket() {
        if (!this.auth.accessToken || this.socket) {
            return;
        }

        try {
            // 动态加载socket.io客户端
            if (!window.io) {
                await this.loadSocketIO();
            }

            this.socket = window.io(this.cloudConfig.serverUrl, {
                auth: {
                    token: this.auth.accessToken
                },
                transports: ['websocket', 'polling']
            });

            this.socket.on('connect', () => {
                console.log('✅ WebSocket连接已建立');
                this.socket.emit('device_info', {
                    deviceId: this.deviceId,
                    userAgent: navigator.userAgent,
                    timestamp: new Date().toISOString()
                });
            });

            this.socket.on('disconnect', (reason) => {
                console.log('❌ WebSocket连接断开:', reason);
            });

            // 注册同步事件监听器
            this.setupSyncEventListeners();

        } catch (error) {
            console.error('❌ WebSocket连接失败:', error);
        }
    }

    /**
     * 加载Socket.IO客户端库
     */
    async loadSocketIO() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.socket.io/4.7.2/socket.io.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * 设置同步事件监听器
     */
    setupSyncEventListeners() {
        if (!this.socket) return;

        // 接收服务器同步数据
        this.socket.on('sync_data', async (data) => {
            console.log('📥 收到服务器同步数据');
            await this.processSyncData(data);
        });

        // 处理同步冲突
        this.socket.on('sync_conflicts', async (data) => {
            console.log('⚠️ 检测到同步冲突');
            await this.handleSyncConflicts(data);
        });

        // 接收远程变更
        this.socket.on('remote_change', async (data) => {
            console.log('🔄 收到远程设备变更');
            await this.processRemoteChange(data);
        });

        // 同步错误处理
        this.socket.on('sync_error', (data) => {
            console.error('❌ 同步错误:', data.message);
            this.handleSyncError(data);
        });
    }

    /**
     * 重写创建对话方法，添加云同步支持
     */
    async createConversation(title = '新对话', metadata = {}) {
        // 先在本地创建
        const localId = await super.createConversation(title, metadata);
        
        // 如果已登录且在线，添加到待同步列表
        if (this.auth.isLoggedIn && this.syncStatus.isOnline) {
            const clientId = this.generateClientId();
            const change = {
                type: 'conversation_create',
                clientId: clientId,
                localId: localId,
                data: {
                    title,
                    ...metadata,
                    createdAt: new Date().toISOString()
                },
                timestamp: new Date().toISOString(),
                deviceId: this.deviceId
            };
            
            this.syncStatus.pendingChanges.push(change);
            this.debouncedSync();
        }

        return localId;
    }

    /**
     * 重写添加消息方法，添加云同步支持
     */
    async addMessage(conversationId, type, content, metadata = {}) {
        // 先在本地添加
        const messageId = await super.addMessage(conversationId, type, content, metadata);
        
        // 如果已登录且在线，添加到待同步列表
        if (this.auth.isLoggedIn && this.syncStatus.isOnline) {
            const change = {
                type: 'message_add',
                clientId: await this.getConversationClientId(conversationId),
                data: {
                    type,
                    content,
                    metadata,
                    timestamp: new Date().toISOString()
                },
                timestamp: new Date().toISOString(),
                deviceId: this.deviceId
            };
            
            this.syncStatus.pendingChanges.push(change);
            this.debouncedSync();
        }

        return messageId;
    }

    /**
     * 生成客户端ID
     */
    generateClientId() {
        return `${this.deviceId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 获取对话的客户端ID
     */
    async getConversationClientId(conversationId) {
        // 这里需要在本地存储中维护 localId -> clientId 的映射
        // 暂时使用简单的映射方式
        return `conv_${conversationId}`;
    }

    /**
     * 防抖同步
     */
    debouncedSync() {
        if (this.syncTimeout) {
            clearTimeout(this.syncTimeout);
        }
        
        this.syncTimeout = setTimeout(() => {
            this.syncPendingChanges();
        }, 1000); // 1秒防抖
    }

    /**
     * 同步待处理的变更
     */
    async syncPendingChanges() {
        if (!this.auth.isLoggedIn || !this.syncStatus.isOnline || 
            this.syncStatus.syncInProgress || this.syncStatus.pendingChanges.length === 0) {
            return;
        }

        console.log(`📤 开始同步 ${this.syncStatus.pendingChanges.length} 个变更`);

        this.syncStatus.syncInProgress = true;

        try {
            if (this.socket && this.socket.connected) {
                // 使用WebSocket实时同步
                this.socket.emit('push_changes', {
                    changes: this.syncStatus.pendingChanges,
                    deviceId: this.deviceId,
                    clientSyncVersion: this.syncStatus.syncVersion
                });

                // 等待同步结果
                await new Promise((resolve) => {
                    const timeout = setTimeout(() => resolve(), 10000); // 10秒超时
                    
                    this.socket.once('push_result', (data) => {
                        clearTimeout(timeout);
                        this.handleSyncResult(data);
                        resolve();
                    });
                });
            } else {
                // 使用HTTP API同步
                await this.httpSync();
            }

        } catch (error) {
            console.error('❌ 同步失败:', error);
            this.handleSyncError({ message: error.message });
        } finally {
            this.syncStatus.syncInProgress = false;
        }
    }

    /**
     * 处理同步结果
     */
    handleSyncResult(data) {
        const { results, conflicts, syncVersion } = data;
        
        // 更新同步版本
        this.syncStatus.syncVersion = syncVersion;
        this.syncStatus.lastSyncAt = new Date();
        
        // 处理成功的同步
        const successfulChanges = results.filter(r => r.success);
        console.log(`✅ ${successfulChanges.length} 个变更同步成功`);
        
        // 从待同步列表中移除成功的变更
        this.syncStatus.pendingChanges = this.syncStatus.pendingChanges.filter(
            change => !successfulChanges.some(result => 
                result.clientId === change.clientId && result.type === change.type
            )
        );
        
        // 处理冲突
        if (conflicts && conflicts.length > 0) {
            this.syncStatus.conflictsCount = conflicts.length;
            this.handleSyncConflicts({ conflicts });
        }
        
        // 触发同步完成事件
        window.dispatchEvent(new CustomEvent('syncCompleted', {
            detail: {
                successCount: successfulChanges.length,
                conflictCount: conflicts ? conflicts.length : 0,
                pendingCount: this.syncStatus.pendingChanges.length
            }
        }));
    }

    /**
     * 处理同步冲突
     */
    async handleSyncConflicts(data) {
        const { conflicts } = data;
        
        console.log(`⚠️ 发现 ${conflicts.length} 个同步冲突`);
        
        // 触发冲突事件，让UI组件处理
        window.dispatchEvent(new CustomEvent('syncConflicts', {
            detail: { conflicts }
        }));
    }

    /**
     * 解决冲突
     */
    async resolveConflict(conflictId, resolution, resolvedData) {
        if (!this.socket || !this.socket.connected) {
            throw new Error('WebSocket连接不可用');
        }

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('冲突解决超时'));
            }, 10000);

            this.socket.emit('resolve_conflict', {
                conflictId,
                resolution,
                resolvedData
            });

            this.socket.once('conflict_resolved', (data) => {
                clearTimeout(timeout);
                console.log('✅ 冲突解决成功');
                resolve(data);
            });

            this.socket.once('conflict_error', (data) => {
                clearTimeout(timeout);
                reject(new Error(data.message));
            });
        });
    }

    /**
     * 开始自动同步
     */
    async startAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }

        this.syncInterval = setInterval(() => {
            if (this.auth.isLoggedIn && this.syncStatus.isOnline && 
                !this.syncStatus.syncInProgress) {
                this.attemptSync();
            }
        }, this.cloudConfig.syncInterval);

        console.log(`🔄 自动同步已启动，间隔: ${this.cloudConfig.syncInterval / 1000}秒`);
    }

    /**
     * 尝试同步
     */
    async attemptSync() {
        try {
            // 先同步待处理的变更
            if (this.syncStatus.pendingChanges.length > 0) {
                await this.syncPendingChanges();
            }

            // 然后请求服务器更新
            await this.requestServerUpdates();
        } catch (error) {
            console.error('❌ 同步尝试失败:', error);
        }
    }

    /**
     * 请求服务器更新
     */
    async requestServerUpdates() {
        if (!this.socket || !this.socket.connected) {
            return;
        }

        this.socket.emit('request_sync', {
            lastSyncVersion: this.syncStatus.syncVersion,
            deviceId: this.deviceId
        });
    }

    /**
     * 获取同步状态
     */
    getSyncStatus() {
        return {
            ...this.syncStatus,
            isLoggedIn: this.auth.isLoggedIn,
            username: this.auth.user?.username,
            cloudEnabled: true,
            socketConnected: this.socket?.connected || false
        };
    }

    /**
     * 手动触发同步
     */
    async manualSync() {
        if (!this.auth.isLoggedIn) {
            throw new Error('请先登录');
        }

        if (!this.syncStatus.isOnline) {
            throw new Error('网络连接不可用');
        }

        await this.performFullSync();
    }

    /**
     * 执行完全同步
     */
    async performFullSync() {
        console.log('🔄 开始完全同步...');
        
        this.syncStatus.syncInProgress = true;

        try {
            // 1. 同步本地变更到服务器
            if (this.syncStatus.pendingChanges.length > 0) {
                await this.syncPendingChanges();
            }

            // 2. 从服务器拉取更新
            await this.requestServerUpdates();

            console.log('✅ 完全同步完成');
        } catch (error) {
            console.error('❌ 完全同步失败:', error);
            throw error;
        } finally {
            this.syncStatus.syncInProgress = false;
        }
    }
}

// 替换全局实例
if (window.aiConversationStorage) {
    // 保留现有数据，升级到云同步版本
    const oldStorage = window.aiConversationStorage;
    window.aiConversationStorage = new CloudSyncConversationStorage();
    
    // 如果需要，可以在这里迁移数据
    console.log('✅ AI对话存储已升级为云同步版本');
} else {
    window.aiConversationStorage = new CloudSyncConversationStorage();
}

console.log('✅ 云同步AI对话存储模块加载完成');