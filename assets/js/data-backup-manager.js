/**
 * 自动数据备份和恢复管理器
 * 提供用户数据的自动备份、恢复、导入导出功能
 * 支持多种数据类型和存储策略
 */
class DataBackupManager {
    constructor() {
        // 备份配置
        this.config = {
            autoBackupInterval: 30 * 60 * 1000, // 30分钟自动备份
            maxLocalBackups: 10, // 最大本地备份数
            maxCloudBackups: 50, // 最大云端备份数
            compressionEnabled: true,
            encryptionEnabled: false, // 可选加密
            backupFormats: ['json', 'encrypted'], // 支持的备份格式
            dataTypes: [
                'progress', 'statistics', 'notes', 'conversations', 
                'settings', 'preferences', 'themes'
            ]
        };

        // 备份状态
        this.backupState = {
            lastBackupTime: null,
            lastRestoreTime: null,
            backupInProgress: false,
            restoreInProgress: false,
            autoBackupEnabled: true,
            totalBackups: 0,
            backupSize: 0,
            errors: []
        };

        // 数据适配器映射
        this.dataAdapters = new Map();

        // 事件监听器
        this.eventListeners = new Map();

        // 自动备份定时器
        this.autoBackupTimer = null;

        // 初始化
        this.initialize();
    }

    /**
     * 初始化备份管理器
     */
    async initialize() {
        console.log('💾 初始化数据备份管理器...');

        // 注册数据适配器
        this.registerDataAdapters();

        // 恢复备份状态
        await this.restoreBackupState();

        // 设置自动备份
        if (this.backupState.autoBackupEnabled) {
            this.startAutoBackup();
        }

        // 监听数据变化
        this.setupDataChangeListeners();

        // 监听页面关闭事件，进行最后备份
        this.setupBeforeUnloadListener();

        console.log('✅ 数据备份管理器初始化完成');
    }

    /**
     * 注册数据适配器
     */
    registerDataAdapters() {
        // 学习进度适配器
        this.dataAdapters.set('progress', {
            async extract() {
                const progressData = await window.progressDB?.getAllProgress() || [];
                const subjectProgress = JSON.parse(localStorage.getItem('study_progress') || '{}');
                return {
                    courseProgress: progressData,
                    subjectProgress: subjectProgress,
                    timestamp: new Date().toISOString()
                };
            },
            async restore(data) {
                if (data.courseProgress && window.progressDB) {
                    for (const progress of data.courseProgress) {
                        await window.progressDB.updateProgress(progress);
                    }
                }
                if (data.subjectProgress) {
                    localStorage.setItem('study_progress', JSON.stringify(data.subjectProgress));
                }
            },
            size: (data) => JSON.stringify(data).length
        });

        // 学习统计适配器
        this.dataAdapters.set('statistics', {
            async extract() {
                const statsData = JSON.parse(localStorage.getItem('study_statistics') || '{}');
                return {
                    ...statsData,
                    timestamp: new Date().toISOString()
                };
            },
            async restore(data) {
                const { timestamp, ...stats } = data;
                localStorage.setItem('study_statistics', JSON.stringify(stats));
                
                // 通知统计管理器更新
                if (window.studyStatsManager) {
                    window.studyStatsManager.loadStats();
                }
            },
            size: (data) => JSON.stringify(data).length
        });

        // 学习笔记适配器
        this.dataAdapters.set('notes', {
            async extract() {
                const notesData = JSON.parse(localStorage.getItem('study_notes') || '{}');
                return {
                    ...notesData,
                    timestamp: new Date().toISOString()
                };
            },
            async restore(data) {
                const { timestamp, ...notes } = data;
                localStorage.setItem('study_notes', JSON.stringify(notes));
                
                // 通知笔记管理器更新
                if (window.notesManager) {
                    window.notesManager.loadNotes();
                }
            },
            size: (data) => JSON.stringify(data).length
        });

        // AI对话适配器
        this.dataAdapters.set('conversations', {
            async extract() {
                if (!window.aiConversationStorage) return {};
                
                const conversations = await window.aiConversationStorage.getAllConversations();
                const conversationData = {};
                
                for (const conv of conversations) {
                    const messages = await window.aiConversationStorage.getMessages(conv.id);
                    conversationData[conv.id] = {
                        conversation: conv,
                        messages: messages
                    };
                }
                
                return {
                    conversations: conversationData,
                    timestamp: new Date().toISOString()
                };
            },
            async restore(data) {
                if (!window.aiConversationStorage || !data.conversations) return;
                
                for (const [convId, convData] of Object.entries(data.conversations)) {
                    // 恢复对话
                    const newConvId = await window.aiConversationStorage.createConversation(
                        convData.conversation.title,
                        convData.conversation.metadata || {}
                    );
                    
                    // 恢复消息
                    for (const message of convData.messages) {
                        await window.aiConversationStorage.addMessage(
                            newConvId,
                            message.type,
                            message.content,
                            message.metadata || {}
                        );
                    }
                }
            },
            size: (data) => JSON.stringify(data).length
        });

        // 用户设置适配器
        this.dataAdapters.set('settings', {
            async extract() {
                const settings = {};
                
                // 主题设置
                settings.theme = localStorage.getItem('modern-theme');
                settings.userThemeSet = localStorage.getItem('user-theme-set');
                
                // 其他设置
                const settingsKeys = Object.keys(localStorage).filter(key => 
                    key.startsWith('setting_') || key.startsWith('preference_')
                );
                
                for (const key of settingsKeys) {
                    settings[key] = localStorage.getItem(key);
                }
                
                return {
                    settings,
                    timestamp: new Date().toISOString()
                };
            },
            async restore(data) {
                if (!data.settings) return;
                
                for (const [key, value] of Object.entries(data.settings)) {
                    if (value !== null) {
                        localStorage.setItem(key, value);
                    }
                }
                
                // 触发主题更新
                if (window.themeManager) {
                    window.themeManager.applyTheme();
                }
            },
            size: (data) => JSON.stringify(data).length
        });

        // 应用状态适配器
        this.dataAdapters.set('state', {
            async extract() {
                if (!window.stateManager) return {};
                
                const state = window.stateManager.getState();
                return {
                    state,
                    timestamp: new Date().toISOString()
                };
            },
            async restore(data) {
                if (!window.stateManager || !data.state) return;
                
                // 合并状态而不是完全替换
                for (const [path, value] of Object.entries(data.state)) {
                    window.stateManager.setState(path, value);
                }
            },
            size: (data) => JSON.stringify(data).length
        });
    }

    /**
     * 恢复备份状态
     */
    async restoreBackupState() {
        try {
            const stateStr = localStorage.getItem('backup_manager_state');
            if (stateStr) {
                const savedState = JSON.parse(stateStr);
                this.backupState = { ...this.backupState, ...savedState };
                
                if (this.backupState.lastBackupTime) {
                    this.backupState.lastBackupTime = new Date(this.backupState.lastBackupTime);
                }
                if (this.backupState.lastRestoreTime) {
                    this.backupState.lastRestoreTime = new Date(this.backupState.lastRestoreTime);
                }
            }
        } catch (error) {
            console.error('❌ 恢复备份状态失败:', error);
        }
    }

    /**
     * 保存备份状态
     */
    async saveBackupState() {
        try {
            localStorage.setItem('backup_manager_state', JSON.stringify(this.backupState));
        } catch (error) {
            console.error('❌ 保存备份状态失败:', error);
        }
    }

    /**
     * 创建完整备份
     */
    async createFullBackup(options = {}) {
        if (this.backupState.backupInProgress) {
            throw new Error('备份正在进行中');
        }

        this.backupState.backupInProgress = true;
        const backupId = `backup_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
        
        try {
            console.log('💾 开始创建完整备份...');
            
            const backup = {
                id: backupId,
                type: 'full',
                version: '1.0',
                createdAt: new Date().toISOString(),
                deviceId: localStorage.getItem('device_id'),
                data: {},
                metadata: {
                    userAgent: navigator.userAgent,
                    platform: navigator.platform,
                    url: window.location.href,
                    ...options.metadata
                }
            };

            let totalSize = 0;

            // 提取所有数据类型
            for (const dataType of this.config.dataTypes) {
                if (options.excludeTypes && options.excludeTypes.includes(dataType)) {
                    continue;
                }

                const adapter = this.dataAdapters.get(dataType);
                if (adapter) {
                    try {
                        console.log(`📊 提取 ${dataType} 数据...`);
                        const data = await adapter.extract();
                        backup.data[dataType] = data;
                        totalSize += adapter.size(data);
                    } catch (error) {
                        console.error(`❌ 提取 ${dataType} 数据失败:`, error);
                        this.backupState.errors.push({
                            type: 'extract_error',
                            dataType,
                            message: error.message,
                            timestamp: new Date().toISOString()
                        });
                    }
                }
            }

            // 压缩备份数据
            if (this.config.compressionEnabled) {
                backup.compressed = true;
                backup.originalSize = totalSize;
                // 这里可以添加实际的压缩逻辑
            }

            // 加密备份数据
            if (this.config.encryptionEnabled && options.encrypt) {
                backup.encrypted = true;
                // 这里可以添加加密逻辑
            }

            backup.size = JSON.stringify(backup).length;

            // 保存到本地存储
            await this.saveBackup(backup);

            // 上传到云端（如果已登录）
            if (window.authManager?.isAuthenticated() && options.uploadToCloud !== false) {
                await this.uploadBackupToCloud(backup);
            }

            // 更新备份状态
            this.backupState.lastBackupTime = new Date();
            this.backupState.totalBackups++;
            this.backupState.backupSize = backup.size;
            await this.saveBackupState();

            // 清理旧备份
            await this.cleanupOldBackups();

            // 触发备份完成事件
            this.emit('backupCreated', {
                backupId,
                size: backup.size,
                dataTypes: Object.keys(backup.data),
                timestamp: backup.createdAt
            });

            console.log(`✅ 完整备份创建完成: ${backupId} (${this.formatSize(backup.size)})`);
            return { success: true, backupId, size: backup.size };

        } catch (error) {
            console.error('❌ 创建备份失败:', error);
            this.backupState.errors.push({
                type: 'backup_error',
                message: error.message,
                timestamp: new Date().toISOString()
            });
            throw error;
        } finally {
            this.backupState.backupInProgress = false;
        }
    }

    /**
     * 恢复备份
     */
    async restoreBackup(backupId, options = {}) {
        if (this.backupState.restoreInProgress) {
            throw new Error('恢复正在进行中');
        }

        this.backupState.restoreInProgress = true;

        try {
            console.log(`🔄 开始恢复备份: ${backupId}...`);

            // 获取备份数据
            let backup = await this.getBackup(backupId);
            
            if (!backup) {
                // 尝试从云端获取
                if (window.authManager?.isAuthenticated()) {
                    backup = await this.downloadBackupFromCloud(backupId);
                }
            }

            if (!backup) {
                throw new Error(`备份不存在: ${backupId}`);
            }

            // 验证备份数据
            if (!this.validateBackup(backup)) {
                throw new Error('备份数据格式不正确或已损坏');
            }

            // 创建恢复前的备份
            if (options.createRestorePoint !== false) {
                await this.createFullBackup({
                    metadata: { 
                        type: 'restore_point',
                        beforeRestore: backupId 
                    }
                });
            }

            // 解密备份数据
            if (backup.encrypted) {
                // 这里添加解密逻辑
            }

            // 解压备份数据
            if (backup.compressed) {
                // 这里添加解压逻辑
            }

            let restoredTypes = [];
            let failedTypes = [];

            // 恢复各种数据类型
            for (const [dataType, data] of Object.entries(backup.data)) {
                if (options.excludeTypes && options.excludeTypes.includes(dataType)) {
                    continue;
                }

                const adapter = this.dataAdapters.get(dataType);
                if (adapter) {
                    try {
                        console.log(`🔄 恢复 ${dataType} 数据...`);
                        await adapter.restore(data);
                        restoredTypes.push(dataType);
                    } catch (error) {
                        console.error(`❌ 恢复 ${dataType} 数据失败:`, error);
                        failedTypes.push({ dataType, error: error.message });
                        this.backupState.errors.push({
                            type: 'restore_error',
                            dataType,
                            message: error.message,
                            timestamp: new Date().toISOString()
                        });
                    }
                }
            }

            // 更新恢复状态
            this.backupState.lastRestoreTime = new Date();
            await this.saveBackupState();

            // 触发页面刷新以应用恢复的数据
            if (options.autoRefresh !== false) {
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            }

            // 触发恢复完成事件
            this.emit('backupRestored', {
                backupId,
                restoredTypes,
                failedTypes,
                timestamp: new Date().toISOString()
            });

            console.log(`✅ 备份恢复完成: ${restoredTypes.length}个数据类型恢复成功`);
            if (failedTypes.length > 0) {
                console.warn(`⚠️ ${failedTypes.length}个数据类型恢复失败:`, failedTypes);
            }

            return { 
                success: true, 
                restoredTypes, 
                failedTypes,
                message: failedTypes.length > 0 ? '部分数据恢复失败' : '所有数据恢复成功'
            };

        } catch (error) {
            console.error('❌ 恢复备份失败:', error);
            throw error;
        } finally {
            this.backupState.restoreInProgress = false;
        }
    }

    /**
     * 保存备份到本地存储
     */
    async saveBackup(backup) {
        try {
            // 使用IndexedDB存储大备份文件
            if (window.indexedDB) {
                await this.saveBackupToIndexedDB(backup);
            } else {
                // 降级到localStorage（有大小限制）
                const backupsStr = localStorage.getItem('local_backups') || '[]';
                const backups = JSON.parse(backupsStr);
                backups.push({
                    id: backup.id,
                    createdAt: backup.createdAt,
                    size: backup.size,
                    type: backup.type
                });
                localStorage.setItem('local_backups', JSON.stringify(backups));
                localStorage.setItem(`backup_${backup.id}`, JSON.stringify(backup));
            }
        } catch (error) {
            console.error('❌ 保存备份失败:', error);
            throw error;
        }
    }

    /**
     * 保存备份到IndexedDB
     */
    async saveBackupToIndexedDB(backup) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('BackupStorage', 1);

            request.onerror = () => reject(request.error);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('backups')) {
                    db.createObjectStore('backups', { keyPath: 'id' });
                }
            };

            request.onsuccess = (event) => {
                const db = event.target.result;
                const transaction = db.transaction(['backups'], 'readwrite');
                const store = transaction.objectStore('backups');
                
                const addRequest = store.add(backup);
                addRequest.onsuccess = () => resolve();
                addRequest.onerror = () => reject(addRequest.error);
            };
        });
    }

    /**
     * 获取本地备份
     */
    async getBackup(backupId) {
        try {
            // 先尝试从IndexedDB获取
            if (window.indexedDB) {
                const backup = await this.getBackupFromIndexedDB(backupId);
                if (backup) return backup;
            }

            // 降级到localStorage
            const backupStr = localStorage.getItem(`backup_${backupId}`);
            return backupStr ? JSON.parse(backupStr) : null;
        } catch (error) {
            console.error('❌ 获取备份失败:', error);
            return null;
        }
    }

    /**
     * 从IndexedDB获取备份
     */
    async getBackupFromIndexedDB(backupId) {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('BackupStorage', 1);

            request.onerror = () => resolve(null);

            request.onsuccess = (event) => {
                const db = event.target.result;
                const transaction = db.transaction(['backups'], 'readonly');
                const store = transaction.objectStore('backups');
                
                const getRequest = store.get(backupId);
                getRequest.onsuccess = () => resolve(getRequest.result || null);
                getRequest.onerror = () => resolve(null);
            };
        });
    }

    /**
     * 获取所有本地备份列表
     */
    async getBackupList() {
        const backups = [];

        try {
            // 从IndexedDB获取
            if (window.indexedDB) {
                const indexedDBBackups = await this.getBackupsFromIndexedDB();
                backups.push(...indexedDBBackups);
            }

            // 从localStorage获取
            const backupsStr = localStorage.getItem('local_backups') || '[]';
            const localBackups = JSON.parse(backupsStr);
            backups.push(...localBackups);

        } catch (error) {
            console.error('❌ 获取备份列表失败:', error);
        }

        // 按创建时间排序
        return backups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    /**
     * 从IndexedDB获取所有备份
     */
    async getBackupsFromIndexedDB() {
        return new Promise((resolve) => {
            const request = indexedDB.open('BackupStorage', 1);

            request.onerror = () => resolve([]);

            request.onsuccess = (event) => {
                const db = event.target.result;
                const transaction = db.transaction(['backups'], 'readonly');
                const store = transaction.objectStore('backups');
                
                const getAllRequest = store.getAll();
                getAllRequest.onsuccess = () => {
                    const backups = getAllRequest.result.map(backup => ({
                        id: backup.id,
                        createdAt: backup.createdAt,
                        size: backup.size,
                        type: backup.type
                    }));
                    resolve(backups);
                };
                getAllRequest.onerror = () => resolve([]);
            };
        });
    }

    /**
     * 验证备份数据
     */
    validateBackup(backup) {
        if (!backup || typeof backup !== 'object') {
            return false;
        }

        const requiredFields = ['id', 'type', 'version', 'createdAt', 'data'];
        for (const field of requiredFields) {
            if (!(field in backup)) {
                return false;
            }
        }

        if (typeof backup.data !== 'object') {
            return false;
        }

        return true;
    }

    /**
     * 清理旧备份
     */
    async cleanupOldBackups() {
        try {
            const backups = await this.getBackupList();
            
            if (backups.length > this.config.maxLocalBackups) {
                const backupsToDelete = backups.slice(this.config.maxLocalBackups);
                
                for (const backup of backupsToDelete) {
                    await this.deleteBackup(backup.id);
                }
                
                console.log(`🗑️ 清理了 ${backupsToDelete.length} 个旧备份`);
            }
        } catch (error) {
            console.error('❌ 清理备份失败:', error);
        }
    }

    /**
     * 删除备份
     */
    async deleteBackup(backupId) {
        try {
            // 从IndexedDB删除
            if (window.indexedDB) {
                await this.deleteBackupFromIndexedDB(backupId);
            }

            // 从localStorage删除
            localStorage.removeItem(`backup_${backupId}`);
            
            const backupsStr = localStorage.getItem('local_backups') || '[]';
            const backups = JSON.parse(backupsStr);
            const filteredBackups = backups.filter(b => b.id !== backupId);
            localStorage.setItem('local_backups', JSON.stringify(filteredBackups));

        } catch (error) {
            console.error('❌ 删除备份失败:', error);
        }
    }

    /**
     * 从IndexedDB删除备份
     */
    async deleteBackupFromIndexedDB(backupId) {
        return new Promise((resolve) => {
            const request = indexedDB.open('BackupStorage', 1);

            request.onerror = () => resolve();

            request.onsuccess = (event) => {
                const db = event.target.result;
                const transaction = db.transaction(['backups'], 'readwrite');
                const store = transaction.objectStore('backups');
                
                const deleteRequest = store.delete(backupId);
                deleteRequest.onsuccess = () => resolve();
                deleteRequest.onerror = () => resolve();
            };
        });
    }

    /**
     * 导出备份文件
     */
    async exportBackup(backupId, format = 'json') {
        try {
            const backup = await this.getBackup(backupId);
            if (!backup) {
                throw new Error(`备份不存在: ${backupId}`);
            }

            let content, filename, mimeType;

            switch (format) {
                case 'json':
                    content = JSON.stringify(backup, null, 2);
                    filename = `backup_${backupId}.json`;
                    mimeType = 'application/json';
                    break;
                    
                case 'compressed':
                    // 这里可以添加压缩导出逻辑
                    content = JSON.stringify(backup);
                    filename = `backup_${backupId}.json.gz`;
                    mimeType = 'application/gzip';
                    break;
                    
                default:
                    throw new Error(`不支持的导出格式: ${format}`);
            }

            // 创建下载链接
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.style.display = 'none';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            URL.revokeObjectURL(url);

            console.log(`✅ 备份导出完成: ${filename}`);
            return { success: true, filename };

        } catch (error) {
            console.error('❌ 导出备份失败:', error);
            throw error;
        }
    }

    /**
     * 导入备份文件
     */
    async importBackup(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = async (event) => {
                try {
                    const content = event.target.result;
                    const backup = JSON.parse(content);

                    if (!this.validateBackup(backup)) {
                        throw new Error('无效的备份文件格式');
                    }

                    // 生成新的备份ID以避免冲突
                    const originalId = backup.id;
                    backup.id = `imported_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
                    backup.imported = true;
                    backup.originalId = originalId;
                    backup.importedAt = new Date().toISOString();

                    // 保存导入的备份
                    await this.saveBackup(backup);

                    console.log(`✅ 备份导入完成: ${backup.id}`);
                    resolve({ success: true, backupId: backup.id });

                } catch (error) {
                    console.error('❌ 导入备份失败:', error);
                    reject(error);
                }
            };

            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsText(file);
        });
    }

    /**
     * 上传备份到云端
     */
    async uploadBackupToCloud(backup) {
        if (!window.authManager?.isAuthenticated()) {
            return false;
        }

        try {
            // 这里添加云端上传逻辑
            // 可以与现有的云同步系统集成
            console.log(`☁️ 上传备份到云端: ${backup.id}`);
            return true;
        } catch (error) {
            console.error('❌ 上传备份到云端失败:', error);
            return false;
        }
    }

    /**
     * 从云端下载备份
     */
    async downloadBackupFromCloud(backupId) {
        if (!window.authManager?.isAuthenticated()) {
            return null;
        }

        try {
            // 这里添加云端下载逻辑
            console.log(`☁️ 从云端下载备份: ${backupId}`);
            return null;
        } catch (error) {
            console.error('❌ 从云端下载备份失败:', error);
            return null;
        }
    }

    /**
     * 启动自动备份
     */
    startAutoBackup() {
        if (this.autoBackupTimer) {
            clearInterval(this.autoBackupTimer);
        }

        this.autoBackupTimer = setInterval(async () => {
            if (this.backupState.autoBackupEnabled && !this.backupState.backupInProgress) {
                try {
                    await this.createFullBackup({
                        metadata: { type: 'auto_backup' }
                    });
                } catch (error) {
                    console.error('❌ 自动备份失败:', error);
                }
            }
        }, this.config.autoBackupInterval);

        console.log(`⏰ 自动备份已启动，间隔: ${this.config.autoBackupInterval / 60000}分钟`);
    }

    /**
     * 停止自动备份
     */
    stopAutoBackup() {
        if (this.autoBackupTimer) {
            clearInterval(this.autoBackupTimer);
            this.autoBackupTimer = null;
        }
        this.backupState.autoBackupEnabled = false;
        this.saveBackupState();
        console.log('⏸️ 自动备份已停止');
    }

    /**
     * 设置数据变化监听器
     */
    setupDataChangeListeners() {
        // 监听本地存储变化
        window.addEventListener('storage', (event) => {
            // 数据变化时重置备份时间间隔
            if (this.isImportantDataKey(event.key)) {
                this.scheduleNextBackup();
            }
        });

        // 监听状态管理器变化
        if (window.stateManager) {
            window.stateManager.subscribe('*', () => {
                this.scheduleNextBackup();
            });
        }
    }

    /**
     * 检查是否为重要数据键
     */
    isImportantDataKey(key) {
        const importantKeys = [
            'study_progress', 'study_statistics', 'study_notes',
            'modern-theme', 'user-theme-set'
        ];
        
        return importantKeys.includes(key) || 
               key.startsWith('setting_') || 
               key.startsWith('preference_');
    }

    /**
     * 安排下次备份
     */
    scheduleNextBackup() {
        // 防抖：频繁变化时不要太频繁备份
        if (this.nextBackupTimeout) {
            clearTimeout(this.nextBackupTimeout);
        }

        this.nextBackupTimeout = setTimeout(() => {
            if (this.backupState.autoBackupEnabled && !this.backupState.backupInProgress) {
                this.createFullBackup({
                    metadata: { type: 'change_triggered' }
                }).catch(error => {
                    console.error('❌ 变化触发的备份失败:', error);
                });
            }
        }, 30000); // 30秒延迟
    }

    /**
     * 设置页面关闭前备份
     */
    setupBeforeUnloadListener() {
        window.addEventListener('beforeunload', async () => {
            if (this.backupState.autoBackupEnabled && !this.backupState.backupInProgress) {
                // 快速创建一个小备份
                try {
                    await this.createFullBackup({
                        metadata: { type: 'before_unload' },
                        uploadToCloud: false
                    });
                } catch (error) {
                    console.error('❌ 页面关闭前备份失败:', error);
                }
            }
        });
    }

    /**
     * 获取备份状态
     */
    getBackupState() {
        return {
            ...this.backupState,
            nextAutoBackup: this.autoBackupTimer ? 
                new Date(Date.now() + this.config.autoBackupInterval) : null
        };
    }

    /**
     * 格式化文件大小
     */
    formatSize(bytes) {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;

        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }

        return `${size.toFixed(2)} ${units[unitIndex]}`;
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
                    console.error(`❌ 备份事件处理器错误 (${event}):`, error);
                }
            });
        }
    }

    /**
     * 销毁备份管理器
     */
    destroy() {
        if (this.autoBackupTimer) {
            clearInterval(this.autoBackupTimer);
        }
        if (this.nextBackupTimeout) {
            clearTimeout(this.nextBackupTimeout);
        }
        this.eventListeners.clear();
        console.log('💾 数据备份管理器已销毁');
    }
}

// 创建全局实例
window.dataBackupManager = new DataBackupManager();

console.log('✅ 自动数据备份和恢复管理器加载完成');