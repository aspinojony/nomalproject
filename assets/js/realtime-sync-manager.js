/**
 * 实时数据同步管理器
 * 提供跨设备的实时数据同步功能
 * 支持多种数据类型的实时更新和冲突解决
 */
class RealtimeSyncManager {
    constructor() {
        // 同步配置
        this.config = {
            serverUrl: window.location.hostname === 'localhost' ? 
                'http://localhost:5000' : 'https://your-server-domain.com',
            reconnectInterval: 5000, // 重连间隔
            heartbeatInterval: 30000, // 心跳间隔
            maxReconnectAttempts: 10,
            syncDebounceTime: 1000, // 同步防抖时间
            conflictRetryAttempts: 3,
            batchSyncDelay: 2000, // 批量同步延迟
            supportedDataTypes: [
                'progress', 'statistics', 'notes', 'conversations', 
                'settings', 'preferences', 'state'
            ]
        };

        // 同步状态
        this.syncState = {
            isConnected: false,
            isAuthenticated: false,
            lastHeartbeat: null,
            reconnectAttempts: 0,
            syncVersion: 0,
            pendingOperations: new Map(), // 待同步操作
            activeOperations: new Map(), // 进行中的操作
            conflicts: new Map(), // 冲突数据
            deviceId: this.getDeviceId(),
            sessionId: this.generateSessionId()
        };

        // WebSocket连接
        this.socket = null;
        this.reconnectTimer = null;
        this.heartbeatTimer = null;

        // 数据观察器
        this.dataObservers = new Map();
        this.changeQueue = [];
        this.syncTimers = new Map();

        // 事件监听器
        this.eventListeners = new Map();

        // 冲突解决器
        this.conflictResolver = new ConflictResolver();

        // 初始化
        this.initialize();
    }

    /**
     * 初始化实时同步管理器
     */
    async initialize() {
        console.log('🔄 初始化实时数据同步管理器...');

        // 恢复同步状态
        await this.restoreSyncState();

        // 设置数据观察器
        this.setupDataObservers();

        // 监听认证状态变化
        this.setupAuthenticationListener();

        // 监听网络状态变化
        this.setupNetworkListeners();

        // 如果已登录，立即连接
        if (window.authManager?.isAuthenticated()) {
            await this.connect();
        }

        console.log('✅ 实时数据同步管理器初始化完成');
    }

    /**
     * 获取设备ID
     */
    getDeviceId() {
        return localStorage.getItem('device_id') || 
               `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 生成会话ID
     */
    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 恢复同步状态
     */
    async restoreSyncState() {
        try {
            const stateStr = localStorage.getItem('realtime_sync_state');
            if (stateStr) {
                const savedState = JSON.parse(stateStr);
                this.syncState.syncVersion = savedState.syncVersion || 0;
                this.syncState.lastHeartbeat = savedState.lastHeartbeat ? 
                    new Date(savedState.lastHeartbeat) : null;
            }
        } catch (error) {
            console.error('❌ 恢复同步状态失败:', error);
        }
    }

    /**
     * 保存同步状态
     */
    async saveSyncState() {
        try {
            const stateToSave = {
                syncVersion: this.syncState.syncVersion,
                lastHeartbeat: this.syncState.lastHeartbeat?.toISOString()
            };
            localStorage.setItem('realtime_sync_state', JSON.stringify(stateToSave));
        } catch (error) {
            console.error('❌ 保存同步状态失败:', error);
        }
    }

    /**
     * 连接到实时同步服务器
     */
    async connect() {
        if (this.socket?.connected) {
            return true;
        }

        if (!window.authManager?.isAuthenticated()) {
            console.warn('⚠️ 未登录，无法建立实时同步连接');
            return false;
        }

        try {
            console.log('🔌 正在连接实时同步服务器...');

            // 动态加载socket.io客户端
            if (!window.io) {
                await this.loadSocketIO();
            }

            // 创建WebSocket连接
            this.socket = window.io(this.config.serverUrl, {
                auth: {
                    token: window.authManager.getAccessToken(),
                    deviceId: this.syncState.deviceId,
                    sessionId: this.syncState.sessionId
                },
                transports: ['websocket', 'polling'],
                timeout: 10000,
                reconnection: false // 我们自己处理重连
            });

            // 设置连接事件监听器
            this.setupSocketEventListeners();

            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('连接超时'));
                }, 10000);

                this.socket.on('connect', () => {
                    clearTimeout(timeout);
                    console.log('✅ 实时同步连接已建立');
                    this.onConnected();
                    resolve(true);
                });

                this.socket.on('connect_error', (error) => {
                    clearTimeout(timeout);
                    console.error('❌ 实时同步连接失败:', error);
                    this.onConnectionError(error);
                    reject(error);
                });
            });

        } catch (error) {
            console.error('❌ 连接实时同步服务器失败:', error);
            return false;
        }
    }

    /**
     * 加载Socket.IO客户端库
     */
    async loadSocketIO() {
        return new Promise((resolve, reject) => {
            if (window.io) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdn.socket.io/4.7.2/socket.io.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * 设置Socket事件监听器
     */
    setupSocketEventListeners() {
        if (!this.socket) return;

        // 连接成功
        this.socket.on('connect', () => {
            this.onConnected();
        });

        // 连接断开
        this.socket.on('disconnect', (reason) => {
            this.onDisconnected(reason);
        });

        // 连接错误
        this.socket.on('connect_error', (error) => {
            this.onConnectionError(error);
        });

        // 认证成功
        this.socket.on('authenticated', (data) => {
            console.log('🔐 实时同步认证成功');
            this.syncState.isAuthenticated = true;
            this.syncState.syncVersion = data.syncVersion || 0;
            this.startHeartbeat();
            this.processPendingOperations();
        });

        // 认证失败
        this.socket.on('authentication_failed', (data) => {
            console.error('❌ 实时同步认证失败:', data.message);
            this.syncState.isAuthenticated = false;
            this.disconnect();
        });

        // 接收实时数据更新
        this.socket.on('data_update', (data) => {
            this.handleRemoteDataUpdate(data);
        });

        // 接收批量数据更新
        this.socket.on('batch_update', (data) => {
            this.handleBatchDataUpdate(data);
        });

        // 同步冲突
        this.socket.on('sync_conflict', (data) => {
            this.handleSyncConflict(data);
        });

        // 操作确认
        this.socket.on('operation_confirmed', (data) => {
            this.handleOperationConfirmation(data);
        });

        // 操作失败
        this.socket.on('operation_failed', (data) => {
            this.handleOperationFailure(data);
        });

        // 服务器心跳响应
        this.socket.on('pong', () => {
            this.syncState.lastHeartbeat = new Date();
        });

        // 强制同步请求
        this.socket.on('force_sync', (data) => {
            this.handleForceSyncRequest(data);
        });

        // 设备状态更新
        this.socket.on('device_status', (data) => {
            this.handleDeviceStatusUpdate(data);
        });
    }

    /**
     * 连接成功处理
     */
    onConnected() {
        this.syncState.isConnected = true;
        this.syncState.reconnectAttempts = 0;
        
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        this.emit('connected', {
            deviceId: this.syncState.deviceId,
            sessionId: this.syncState.sessionId
        });

        // 发送设备信息
        this.socket.emit('device_info', {
            deviceId: this.syncState.deviceId,
            sessionId: this.syncState.sessionId,
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            timestamp: new Date().toISOString(),
            supportedDataTypes: this.config.supportedDataTypes
        });
    }

    /**
     * 连接断开处理
     */
    onDisconnected(reason) {
        console.log(`❌ 实时同步连接断开: ${reason}`);
        
        this.syncState.isConnected = false;
        this.syncState.isAuthenticated = false;

        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }

        this.emit('disconnected', { reason });

        // 自动重连
        if (reason !== 'io client disconnect') {
            this.scheduleReconnect();
        }
    }

    /**
     * 连接错误处理
     */
    onConnectionError(error) {
        console.error('❌ 实时同步连接错误:', error);
        this.syncState.isConnected = false;
        this.syncState.isAuthenticated = false;
        
        this.emit('connectionError', { error: error.message });
        
        // 安排重连
        this.scheduleReconnect();
    }

    /**
     * 安排重连
     */
    scheduleReconnect() {
        if (this.syncState.reconnectAttempts >= this.config.maxReconnectAttempts) {
            console.error('❌ 达到最大重连次数，停止重连');
            this.emit('maxReconnectAttemptsReached', {
                attempts: this.syncState.reconnectAttempts
            });
            return;
        }

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }

        const delay = Math.min(
            this.config.reconnectInterval * Math.pow(2, this.syncState.reconnectAttempts),
            30000 // 最大30秒
        );

        this.reconnectTimer = setTimeout(async () => {
            this.syncState.reconnectAttempts++;
            console.log(`🔄 尝试重连 (${this.syncState.reconnectAttempts}/${this.config.maxReconnectAttempts})...`);
            
            try {
                await this.connect();
            } catch (error) {
                console.error('❌ 重连失败:', error);
            }
        }, delay);

        console.log(`⏰ 将在 ${delay}ms 后尝试重连`);
    }

    /**
     * 断开连接
     */
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }

        this.syncState.isConnected = false;
        this.syncState.isAuthenticated = false;

        console.log('✅ 实时同步连接已断开');
    }

    /**
     * 开始心跳
     */
    startHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
        }

        this.heartbeatTimer = setInterval(() => {
            if (this.socket?.connected) {
                this.socket.emit('ping');
                
                // 检查心跳超时
                const now = new Date();
                if (this.syncState.lastHeartbeat) {
                    const timeSinceLastHeartbeat = now - this.syncState.lastHeartbeat;
                    if (timeSinceLastHeartbeat > this.config.heartbeatInterval * 2) {
                        console.warn('⚠️ 心跳超时，尝试重连');
                        this.socket.disconnect();
                    }
                }
            }
        }, this.config.heartbeatInterval);
    }

    /**
     * 设置数据观察器
     */
    setupDataObservers() {
        // 观察localStorage变化
        this.observeLocalStorage();

        // 观察IndexedDB变化（通过包装现有方法）
        this.observeIndexedDB();

        // 观察状态管理器变化
        this.observeStateManager();

        // 观察特定组件的数据变化
        this.observeComponentData();
    }

    /**
     * 观察localStorage变化
     */
    observeLocalStorage() {
        window.addEventListener('storage', (event) => {
            if (this.isTrackedStorageKey(event.key)) {
                this.queueDataChange({
                    type: 'localStorage',
                    key: event.key,
                    oldValue: event.oldValue,
                    newValue: event.newValue,
                    timestamp: new Date().toISOString()
                });
            }
        });

        // 包装localStorage方法以捕获同窗口的变化
        const originalSetItem = localStorage.setItem.bind(localStorage);
        const originalRemoveItem = localStorage.removeItem.bind(localStorage);

        localStorage.setItem = (key, value) => {
            const oldValue = localStorage.getItem(key);
            originalSetItem(key, value);
            
            if (this.isTrackedStorageKey(key)) {
                this.queueDataChange({
                    type: 'localStorage',
                    key,
                    oldValue,
                    newValue: value,
                    timestamp: new Date().toISOString()
                });
            }
        };

        localStorage.removeItem = (key) => {
            const oldValue = localStorage.getItem(key);
            originalRemoveItem(key);
            
            if (this.isTrackedStorageKey(key)) {
                this.queueDataChange({
                    type: 'localStorage',
                    key,
                    oldValue,
                    newValue: null,
                    timestamp: new Date().toISOString()
                });
            }
        };
    }

    /**
     * 观察IndexedDB变化
     */
    observeIndexedDB() {
        // 包装进度数据库的方法
        if (window.progressDB) {
            const originalUpdateProgress = window.progressDB.updateProgress.bind(window.progressDB);
            
            window.progressDB.updateProgress = async (progress) => {
                const result = await originalUpdateProgress(progress);
                
                this.queueDataChange({
                    type: 'progress',
                    action: 'update',
                    data: progress,
                    timestamp: new Date().toISOString()
                });
                
                return result;
            };
        }

        // 包装AI对话存储的方法
        if (window.aiConversationStorage) {
            const originalAddMessage = window.aiConversationStorage.addMessage.bind(window.aiConversationStorage);
            const originalCreateConversation = window.aiConversationStorage.createConversation.bind(window.aiConversationStorage);
            
            window.aiConversationStorage.addMessage = async (conversationId, type, content, metadata) => {
                const result = await originalAddMessage(conversationId, type, content, metadata);
                
                this.queueDataChange({
                    type: 'conversation',
                    action: 'add_message',
                    data: { conversationId, type, content, metadata },
                    timestamp: new Date().toISOString()
                });
                
                return result;
            };

            window.aiConversationStorage.createConversation = async (title, metadata) => {
                const result = await originalCreateConversation(title, metadata);
                
                this.queueDataChange({
                    type: 'conversation',
                    action: 'create',
                    data: { id: result, title, metadata },
                    timestamp: new Date().toISOString()
                });
                
                return result;
            };
        }
    }

    /**
     * 观察状态管理器变化
     */
    observeStateManager() {
        if (window.stateManager) {
            window.stateManager.subscribe('*', (path, newValue, oldValue) => {
                this.queueDataChange({
                    type: 'state',
                    path,
                    oldValue,
                    newValue,
                    timestamp: new Date().toISOString()
                });
            });
        }
    }

    /**
     * 观察组件数据变化
     */
    observeComponentData() {
        // 监听统计管理器变化
        if (window.studyStatsManager) {
            const originalUpdateStats = window.studyStatsManager.updateStats?.bind(window.studyStatsManager);
            if (originalUpdateStats) {
                window.studyStatsManager.updateStats = (...args) => {
                    const result = originalUpdateStats(...args);
                    
                    this.queueDataChange({
                        type: 'statistics',
                        action: 'update',
                        data: args,
                        timestamp: new Date().toISOString()
                    });
                    
                    return result;
                };
            }
        }

        // 监听笔记管理器变化
        if (window.notesManager) {
            const originalSaveNote = window.notesManager.saveNote?.bind(window.notesManager);
            if (originalSaveNote) {
                window.notesManager.saveNote = (...args) => {
                    const result = originalSaveNote(...args);
                    
                    this.queueDataChange({
                        type: 'notes',
                        action: 'save',
                        data: args,
                        timestamp: new Date().toISOString()
                    });
                    
                    return result;
                };
            }
        }
    }

    /**
     * 检查是否为被跟踪的存储键
     */
    isTrackedStorageKey(key) {
        const trackedKeys = [
            'study_progress', 'study_statistics', 'study_notes',
            'modern-theme', 'user-theme-set'
        ];
        
        return trackedKeys.includes(key) || 
               key.startsWith('setting_') || 
               key.startsWith('preference_');
    }

    /**
     * 将数据变化加入队列
     */
    queueDataChange(change) {
        // 添加操作ID
        change.operationId = `op_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
        change.deviceId = this.syncState.deviceId;
        change.sessionId = this.syncState.sessionId;

        this.changeQueue.push(change);
        
        // 防抖处理，避免频繁的同步请求
        this.debouncedSync(change.type);
        
        console.log(`📊 数据变化已加入队列: ${change.type} (${change.operationId})`);
    }

    /**
     * 防抖同步
     */
    debouncedSync(dataType) {
        if (this.syncTimers.has(dataType)) {
            clearTimeout(this.syncTimers.get(dataType));
        }

        const timer = setTimeout(() => {
            this.processPendingChanges(dataType);
            this.syncTimers.delete(dataType);
        }, this.config.syncDebounceTime);

        this.syncTimers.set(dataType, timer);
    }

    /**
     * 处理待同步的变化
     */
    async processPendingChanges(dataType) {
        if (!this.isReadyForSync()) {
            return;
        }

        const relevantChanges = this.changeQueue.filter(change => 
            !dataType || change.type === dataType
        );

        if (relevantChanges.length === 0) {
            return;
        }

        try {
            // 按数据类型分组
            const changesByType = new Map();
            for (const change of relevantChanges) {
                if (!changesByType.has(change.type)) {
                    changesByType.set(change.type, []);
                }
                changesByType.get(change.type).push(change);
            }

            // 发送到服务器
            for (const [type, changes] of changesByType) {
                await this.sendDataChanges(type, changes);
            }

            // 从队列中移除已处理的变化
            this.changeQueue = this.changeQueue.filter(change => 
                !relevantChanges.includes(change)
            );

        } catch (error) {
            console.error('❌ 处理待同步变化失败:', error);
        }
    }

    /**
     * 发送数据变化到服务器
     */
    async sendDataChanges(dataType, changes) {
        if (!this.socket?.connected || !this.syncState.isAuthenticated) {
            // 保存到待处理操作中
            for (const change of changes) {
                this.syncState.pendingOperations.set(change.operationId, change);
            }
            return;
        }

        try {
            console.log(`📤 发送 ${dataType} 数据变化: ${changes.length} 个操作`);

            const syncData = {
                dataType,
                changes,
                syncVersion: this.syncState.syncVersion,
                deviceId: this.syncState.deviceId,
                sessionId: this.syncState.sessionId,
                timestamp: new Date().toISOString()
            };

            // 标记为活动操作
            for (const change of changes) {
                this.syncState.activeOperations.set(change.operationId, {
                    ...change,
                    sentAt: new Date(),
                    attempts: 1
                });
            }

            // 发送到服务器
            this.socket.emit('sync_data', syncData);

            // 设置超时处理
            this.setOperationTimeout(changes);

        } catch (error) {
            console.error(`❌ 发送 ${dataType} 数据变化失败:`, error);
            
            // 将操作移回待处理队列
            for (const change of changes) {
                this.syncState.activeOperations.delete(change.operationId);
                this.syncState.pendingOperations.set(change.operationId, change);
            }
        }
    }

    /**
     * 设置操作超时
     */
    setOperationTimeout(changes) {
        setTimeout(() => {
            for (const change of changes) {
                if (this.syncState.activeOperations.has(change.operationId)) {
                    console.warn(`⏰ 操作超时: ${change.operationId}`);
                    
                    const operation = this.syncState.activeOperations.get(change.operationId);
                    this.syncState.activeOperations.delete(change.operationId);
                    
                    // 重试或移到待处理队列
                    if (operation.attempts < this.config.conflictRetryAttempts) {
                        operation.attempts++;
                        this.syncState.pendingOperations.set(change.operationId, operation);
                    } else {
                        console.error(`❌ 操作最终失败: ${change.operationId}`);
                        this.emit('operationFailed', {
                            operationId: change.operationId,
                            reason: 'timeout',
                            operation
                        });
                    }
                }
            }
        }, 10000); // 10秒超时
    }

    /**
     * 处理远程数据更新
     */
    async handleRemoteDataUpdate(data) {
        const { dataType, operation, deviceId, sessionId, syncVersion } = data;
        
        // 忽略来自当前设备的更新
        if (deviceId === this.syncState.deviceId && sessionId === this.syncState.sessionId) {
            return;
        }

        console.log(`📥 收到远程数据更新: ${dataType} (来自 ${deviceId})`);

        try {
            // 更新同步版本
            if (syncVersion > this.syncState.syncVersion) {
                this.syncState.syncVersion = syncVersion;
                this.saveSyncState();
            }

            // 应用远程变更
            await this.applyRemoteChange(dataType, operation);

            // 触发远程更新事件
            this.emit('remoteUpdate', {
                dataType,
                operation,
                deviceId,
                timestamp: operation.timestamp
            });

        } catch (error) {
            console.error('❌ 处理远程数据更新失败:', error);
            
            // 请求完整同步
            this.requestFullSync(dataType);
        }
    }

    /**
     * 处理批量数据更新
     */
    async handleBatchDataUpdate(data) {
        const { updates, syncVersion } = data;
        
        console.log(`📥 收到批量数据更新: ${updates.length} 个更新`);

        try {
            // 更新同步版本
            if (syncVersion > this.syncState.syncVersion) {
                this.syncState.syncVersion = syncVersion;
                this.saveSyncState();
            }

            // 应用所有更新
            for (const update of updates) {
                await this.applyRemoteChange(update.dataType, update.operation);
            }

            this.emit('batchUpdateReceived', {
                updateCount: updates.length,
                syncVersion
            });

        } catch (error) {
            console.error('❌ 处理批量数据更新失败:', error);
            this.requestFullSync();
        }
    }

    /**
     * 应用远程变更
     */
    async applyRemoteChange(dataType, operation) {
        switch (dataType) {
            case 'localStorage':
                this.applyLocalStorageChange(operation);
                break;
            case 'progress':
                await this.applyProgressChange(operation);
                break;
            case 'conversation':
                await this.applyConversationChange(operation);
                break;
            case 'state':
                this.applyStateChange(operation);
                break;
            case 'statistics':
                this.applyStatisticsChange(operation);
                break;
            case 'notes':
                this.applyNotesChange(operation);
                break;
            default:
                console.warn(`⚠️ 未知的数据类型: ${dataType}`);
        }
    }

    /**
     * 应用localStorage变更
     */
    applyLocalStorageChange(operation) {
        const { key, newValue } = operation;
        
        // 暂时禁用观察器以避免循环
        const originalSetItem = localStorage.setItem;
        const originalRemoveItem = localStorage.removeItem;
        
        try {
            if (newValue === null) {
                localStorage.removeItem(key);
            } else {
                localStorage.setItem(key, newValue);
            }
            
            console.log(`✅ 应用localStorage变更: ${key}`);
        } finally {
            // 恢复观察器
            setTimeout(() => {
                localStorage.setItem = originalSetItem;
                localStorage.removeItem = originalRemoveItem;
            }, 100);
        }
    }

    /**
     * 应用进度变更
     */
    async applyProgressChange(operation) {
        if (!window.progressDB) return;
        
        try {
            switch (operation.action) {
                case 'update':
                    await window.progressDB.updateProgress(operation.data);
                    break;
                default:
                    console.warn(`⚠️ 未知的进度操作: ${operation.action}`);
            }
            
            console.log(`✅ 应用进度变更: ${operation.action}`);
        } catch (error) {
            console.error('❌ 应用进度变更失败:', error);
        }
    }

    /**
     * 应用对话变更
     */
    async applyConversationChange(operation) {
        if (!window.aiConversationStorage) return;
        
        try {
            switch (operation.action) {
                case 'create':
                    // 创建新对话时需要避免重复
                    const existingConv = await window.aiConversationStorage.getConversation(operation.data.id);
                    if (!existingConv) {
                        await window.aiConversationStorage.createConversation(
                            operation.data.title, 
                            operation.data.metadata
                        );
                    }
                    break;
                    
                case 'add_message':
                    await window.aiConversationStorage.addMessage(
                        operation.data.conversationId,
                        operation.data.type,
                        operation.data.content,
                        operation.data.metadata
                    );
                    break;
                    
                default:
                    console.warn(`⚠️ 未知的对话操作: ${operation.action}`);
            }
            
            console.log(`✅ 应用对话变更: ${operation.action}`);
        } catch (error) {
            console.error('❌ 应用对话变更失败:', error);
        }
    }

    /**
     * 应用状态变更
     */
    applyStateChange(operation) {
        if (!window.stateManager) return;
        
        try {
            window.stateManager.setState(operation.path, operation.newValue);
            console.log(`✅ 应用状态变更: ${operation.path}`);
        } catch (error) {
            console.error('❌ 应用状态变更失败:', error);
        }
    }

    /**
     * 应用统计变更
     */
    applyStatisticsChange(operation) {
        // 这里需要根据具体的统计管理器实现
        console.log(`✅ 应用统计变更: ${operation.action}`);
    }

    /**
     * 应用笔记变更
     */
    applyNotesChange(operation) {
        // 这里需要根据具体的笔记管理器实现
        console.log(`✅ 应用笔记变更: ${operation.action}`);
    }

    /**
     * 处理同步冲突
     */
    async handleSyncConflict(data) {
        const { conflictId, localOperation, remoteOperation, dataType } = data;
        
        console.log(`⚠️ 检测到同步冲突: ${conflictId} (${dataType})`);
        
        // 保存冲突信息
        this.syncState.conflicts.set(conflictId, {
            id: conflictId,
            dataType,
            localOperation,
            remoteOperation,
            timestamp: new Date(),
            resolved: false
        });

        // 触发冲突事件，让UI处理
        this.emit('syncConflict', {
            conflictId,
            dataType,
            localOperation,
            remoteOperation
        });

        // 尝试自动解决冲突
        const resolution = await this.conflictResolver.resolveAutomatically(
            dataType, localOperation, remoteOperation
        );

        if (resolution) {
            await this.resolveConflict(conflictId, resolution.strategy, resolution.data);
        }
    }

    /**
     * 解决冲突
     */
    async resolveConflict(conflictId, strategy, resolvedData) {
        if (!this.socket?.connected) {
            throw new Error('WebSocket连接不可用');
        }

        try {
            console.log(`🔧 解决冲突: ${conflictId} (策略: ${strategy})`);

            // 发送冲突解决方案到服务器
            this.socket.emit('resolve_conflict', {
                conflictId,
                strategy,
                resolvedData,
                deviceId: this.syncState.deviceId,
                timestamp: new Date().toISOString()
            });

            // 等待服务器确认
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('冲突解决超时'));
                }, 10000);

                const handleResolved = (data) => {
                    if (data.conflictId === conflictId) {
                        clearTimeout(timeout);
                        this.socket.off('conflict_resolved', handleResolved);
                        this.socket.off('conflict_resolution_failed', handleFailed);
                        
                        // 标记冲突已解决
                        if (this.syncState.conflicts.has(conflictId)) {
                            const conflict = this.syncState.conflicts.get(conflictId);
                            conflict.resolved = true;
                            conflict.resolution = { strategy, resolvedData };
                        }

                        console.log(`✅ 冲突解决成功: ${conflictId}`);
                        resolve(data);
                    }
                };

                const handleFailed = (data) => {
                    if (data.conflictId === conflictId) {
                        clearTimeout(timeout);
                        this.socket.off('conflict_resolved', handleResolved);
                        this.socket.off('conflict_resolution_failed', handleFailed);
                        reject(new Error(data.message));
                    }
                };

                this.socket.on('conflict_resolved', handleResolved);
                this.socket.on('conflict_resolution_failed', handleFailed);
            });

        } catch (error) {
            console.error(`❌ 解决冲突失败: ${conflictId}`, error);
            throw error;
        }
    }

    /**
     * 处理操作确认
     */
    handleOperationConfirmation(data) {
        const { operationId, syncVersion } = data;
        
        if (this.syncState.activeOperations.has(operationId)) {
            this.syncState.activeOperations.delete(operationId);
            console.log(`✅ 操作确认: ${operationId}`);
        }

        // 更新同步版本
        if (syncVersion > this.syncState.syncVersion) {
            this.syncState.syncVersion = syncVersion;
            this.saveSyncState();
        }
    }

    /**
     * 处理操作失败
     */
    handleOperationFailure(data) {
        const { operationId, reason, retryable } = data;
        
        if (this.syncState.activeOperations.has(operationId)) {
            const operation = this.syncState.activeOperations.get(operationId);
            this.syncState.activeOperations.delete(operationId);
            
            if (retryable && operation.attempts < this.config.conflictRetryAttempts) {
                // 重试操作
                operation.attempts++;
                this.syncState.pendingOperations.set(operationId, operation);
                console.log(`🔄 操作将重试: ${operationId} (尝试 ${operation.attempts})`);
            } else {
                // 操作最终失败
                console.error(`❌ 操作失败: ${operationId} - ${reason}`);
                this.emit('operationFailed', {
                    operationId,
                    reason,
                    operation
                });
            }
        }
    }

    /**
     * 处理强制同步请求
     */
    async handleForceSyncRequest(data) {
        const { dataTypes, reason } = data;
        
        console.log(`🔄 收到强制同步请求: ${dataTypes?.join(', ') || '全部'} (原因: ${reason})`);
        
        try {
            if (dataTypes && dataTypes.length > 0) {
                for (const dataType of dataTypes) {
                    await this.requestFullSync(dataType);
                }
            } else {
                await this.requestFullSync();
            }
        } catch (error) {
            console.error('❌ 强制同步失败:', error);
        }
    }

    /**
     * 处理设备状态更新
     */
    handleDeviceStatusUpdate(data) {
        const { devices, activeDevices } = data;
        
        this.emit('deviceStatusUpdate', {
            devices,
            activeDevices,
            currentDevice: this.syncState.deviceId
        });
    }

    /**
     * 请求完整同步
     */
    async requestFullSync(dataType) {
        if (!this.socket?.connected || !this.syncState.isAuthenticated) {
            return;
        }

        console.log(`🔄 请求完整同步: ${dataType || '全部'}`);

        this.socket.emit('request_full_sync', {
            dataType,
            syncVersion: this.syncState.syncVersion,
            deviceId: this.syncState.deviceId,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * 处理待处理操作
     */
    async processPendingOperations() {
        if (this.syncState.pendingOperations.size === 0) {
            return;
        }

        console.log(`📤 处理 ${this.syncState.pendingOperations.size} 个待处理操作`);

        const pendingArray = Array.from(this.syncState.pendingOperations.values());
        
        // 按数据类型分组
        const groupedOperations = new Map();
        for (const operation of pendingArray) {
            if (!groupedOperations.has(operation.type)) {
                groupedOperations.set(operation.type, []);
            }
            groupedOperations.get(operation.type).push(operation);
        }

        // 发送分组的操作
        for (const [dataType, operations] of groupedOperations) {
            try {
                await this.sendDataChanges(dataType, operations);
                
                // 从待处理队列中移除
                for (const operation of operations) {
                    this.syncState.pendingOperations.delete(operation.operationId);
                }
            } catch (error) {
                console.error(`❌ 处理 ${dataType} 待处理操作失败:`, error);
            }
        }
    }

    /**
     * 设置认证监听器
     */
    setupAuthenticationListener() {
        if (window.authManager) {
            window.authManager.on('loginSuccess', () => {
                this.connect();
            });

            window.authManager.on('logout', () => {
                this.disconnect();
            });

            window.authManager.on('tokenRefreshed', () => {
                if (this.socket && this.syncState.isConnected) {
                    // 更新认证token
                    this.socket.auth.token = window.authManager.getAccessToken();
                }
            });
        }
    }

    /**
     * 设置网络监听器
     */
    setupNetworkListeners() {
        window.addEventListener('online', () => {
            console.log('🌐 网络已连接，尝试重新连接实时同步');
            if (window.authManager?.isAuthenticated() && !this.syncState.isConnected) {
                this.connect();
            }
        });

        window.addEventListener('offline', () => {
            console.log('📡 网络已断开，实时同步将暂停');
        });

        // 页面可见性变化
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && window.authManager?.isAuthenticated()) {
                if (!this.syncState.isConnected) {
                    this.connect();
                } else {
                    // 请求更新
                    this.requestFullSync();
                }
            }
        });
    }

    /**
     * 检查是否准备好同步
     */
    isReadyForSync() {
        return this.syncState.isConnected && 
               this.syncState.isAuthenticated && 
               window.authManager?.isAuthenticated();
    }

    /**
     * 获取同步状态
     */
    getSyncStatus() {
        return {
            isConnected: this.syncState.isConnected,
            isAuthenticated: this.syncState.isAuthenticated,
            syncVersion: this.syncState.syncVersion,
            pendingOperations: this.syncState.pendingOperations.size,
            activeOperations: this.syncState.activeOperations.size,
            conflicts: this.syncState.conflicts.size,
            lastHeartbeat: this.syncState.lastHeartbeat,
            deviceId: this.syncState.deviceId,
            sessionId: this.syncState.sessionId
        };
    }

    /**
     * 获取未解决的冲突
     */
    getUnresolvedConflicts() {
        return Array.from(this.syncState.conflicts.values())
            .filter(conflict => !conflict.resolved);
    }

    /**
     * 手动同步
     */
    async manualSync() {
        if (!this.isReadyForSync()) {
            throw new Error('实时同步未就绪');
        }

        // 处理待处理的操作
        await this.processPendingOperations();
        
        // 请求服务器更新
        await this.requestFullSync();
        
        console.log('✅ 手动同步完成');
    }

    /**
     * 事件管理
     */
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    off(event, callback) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    emit(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`❌ 实时同步事件处理器错误 (${event}):`, error);
                }
            });
        }
    }

    /**
     * 销毁实时同步管理器
     */
    destroy() {
        this.disconnect();
        
        if (this.syncTimers) {
            this.syncTimers.forEach(timer => clearTimeout(timer));
            this.syncTimers.clear();
        }
        
        this.eventListeners.clear();
        console.log('🔄 实时数据同步管理器已销毁');
    }
}

/**
 * 冲突解决器
 */
class ConflictResolver {
    constructor() {
        this.strategies = new Map([
            ['localStorage', this.resolveLocalStorageConflict.bind(this)],
            ['progress', this.resolveProgressConflict.bind(this)],
            ['statistics', this.resolveStatisticsConflict.bind(this)],
            ['conversation', this.resolveConversationConflict.bind(this)],
            ['notes', this.resolveNotesConflict.bind(this)],
            ['state', this.resolveStateConflict.bind(this)]
        ]);
    }

    async resolveAutomatically(dataType, localOperation, remoteOperation) {
        const resolver = this.strategies.get(dataType);
        if (resolver) {
            return await resolver(localOperation, remoteOperation);
        }
        return null;
    }

    async resolveLocalStorageConflict(local, remote) {
        // 使用时间戳策略 - 最新的获胜
        const localTime = new Date(local.timestamp);
        const remoteTime = new Date(remote.timestamp);
        
        return {
            strategy: 'timestamp',
            data: remoteTime > localTime ? remote : local
        };
    }

    async resolveProgressConflict(local, remote) {
        // 进度数据使用最大值策略
        return {
            strategy: 'max_progress',
            data: {
                ...remote.data,
                watchedSeconds: Math.max(
                    local.data.watchedSeconds || 0,
                    remote.data.watchedSeconds || 0
                ),
                completed: local.data.completed || remote.data.completed
            }
        };
    }

    async resolveStatisticsConflict(local, remote) {
        // 统计数据使用累加策略
        return {
            strategy: 'accumulate',
            data: {
                studyTime: (local.data.studyTime || 0) + (remote.data.studyTime || 0),
                questions: (local.data.questions || 0) + (remote.data.questions || 0)
            }
        };
    }

    async resolveConversationConflict(local, remote) {
        // 对话数据需要用户选择
        return null; // 需要用户介入
    }

    async resolveNotesConflict(local, remote) {
        // 笔记数据需要用户选择
        return null; // 需要用户介入
    }

    async resolveStateConflict(local, remote) {
        // 状态数据使用时间戳策略
        const localTime = new Date(local.timestamp);
        const remoteTime = new Date(remote.timestamp);
        
        return {
            strategy: 'timestamp',
            data: remoteTime > localTime ? remote : local
        };
    }
}

// 创建全局实例
window.realtimeSyncManager = new RealtimeSyncManager();

console.log('✅ 实时数据同步管理器加载完成');