const Conversation = require('../models/Conversation');
const User = require('../models/User');

class SyncManager {
    constructor(io) {
        this.io = io;
        this.conflicts = new Map(); // 存储冲突信息
        this.syncLocks = new Map(); // 防止并发同步
    }

    /**
     * 注册Socket事件处理器
     */
    registerSocketEvents(socket) {
        const userId = socket.userId;

        // 客户端请求同步
        socket.on('request_sync', async (data) => {
            try {
                await this.handleSyncRequest(userId, data, socket);
            } catch (error) {
                console.error('同步请求处理失败:', error);
                socket.emit('sync_error', { 
                    message: '同步失败',
                    error: error.message 
                });
            }
        });

        // 客户端推送数据变更
        socket.on('push_changes', async (data) => {
            try {
                await this.handlePushChanges(userId, data, socket);
            } catch (error) {
                console.error('数据推送处理失败:', error);
                socket.emit('push_error', { 
                    message: '数据推送失败',
                    error: error.message 
                });
            }
        });

        // 冲突解决
        socket.on('resolve_conflict', async (data) => {
            try {
                await this.handleConflictResolution(userId, data, socket);
            } catch (error) {
                console.error('冲突解决失败:', error);
                socket.emit('conflict_error', { 
                    message: '冲突解决失败',
                    error: error.message 
                });
            }
        });
    }

    /**
     * 处理同步请求
     */
    async handleSyncRequest(userId, data, socket) {
        const { lastSyncVersion = 0, deviceId } = data;
        
        console.log(`📡 用户 ${userId} 请求同步，版本: ${lastSyncVersion}`);

        // 检查同步锁
        if (this.syncLocks.has(userId)) {
            socket.emit('sync_busy', { message: '同步进行中，请稍后' });
            return;
        }

        this.syncLocks.set(userId, true);

        try {
            // 获取服务器端更新的对话
            const serverUpdates = await Conversation.findByUserAndVersion(userId, lastSyncVersion);
            
            // 检测冲突
            const conflicts = await this.detectConflicts(userId, serverUpdates);
            
            if (conflicts.length > 0) {
                // 有冲突，先处理冲突
                socket.emit('sync_conflicts', {
                    conflicts: conflicts,
                    serverUpdates: serverUpdates
                });
            } else {
                // 无冲突，直接同步
                socket.emit('sync_data', {
                    updates: serverUpdates,
                    syncVersion: await this.getLatestSyncVersion(userId),
                    timestamp: new Date().toISOString()
                });
            }

        } finally {
            this.syncLocks.delete(userId);
        }
    }

    /**
     * 处理客户端推送的变更
     */
    async handlePushChanges(userId, data, socket) {
        const { changes, deviceId, clientSyncVersion } = data;
        
        console.log(`📤 用户 ${userId} 推送 ${changes.length} 个变更`);

        // 检查同步锁
        if (this.syncLocks.has(userId)) {
            socket.emit('push_busy', { message: '同步进行中，请稍后' });
            return;
        }

        this.syncLocks.set(userId, true);

        try {
            const results = [];
            const conflicts = [];

            for (const change of changes) {
                try {
                    const result = await this.applyChange(userId, change, deviceId);
                    
                    if (result.conflict) {
                        conflicts.push({
                            change: change,
                            serverData: result.serverData,
                            reason: result.reason
                        });
                    } else {
                        results.push(result);
                        
                        // 通知其他设备
                        this.broadcastChange(userId, result, socket.id);
                    }
                } catch (error) {
                    console.error('应用变更失败:', error);
                    results.push({
                        clientId: change.clientId,
                        success: false,
                        error: error.message
                    });
                }
            }

            // 发送结果
            socket.emit('push_result', {
                results: results,
                conflicts: conflicts,
                syncVersion: await this.getLatestSyncVersion(userId)
            });

            if (conflicts.length > 0) {
                socket.emit('sync_conflicts', { conflicts });
            }

        } finally {
            this.syncLocks.delete(userId);
        }
    }

    /**
     * 应用单个变更
     */
    async applyChange(userId, change, deviceId) {
        const { type, clientId, data, version, timestamp } = change;

        switch (type) {
            case 'conversation_create':
                return await this.createConversation(userId, clientId, data, deviceId);
                
            case 'conversation_update':
                return await this.updateConversation(userId, clientId, data, version, deviceId);
                
            case 'conversation_delete':
                return await this.deleteConversation(userId, clientId, deviceId);
                
            case 'message_add':
                return await this.addMessage(userId, clientId, data, deviceId);
                
            case 'message_update':
                return await this.updateMessage(userId, clientId, data.messageId, data, deviceId);
                
            case 'message_delete':
                return await this.deleteMessage(userId, clientId, data.messageId, deviceId);
                
            default:
                throw new Error(`未知的变更类型: ${type}`);
        }
    }

    /**
     * 创建对话
     */
    async createConversation(userId, clientId, data, deviceId) {
        // 检查是否已存在
        const existing = await Conversation.findOne({ userId, clientId });
        if (existing) {
            return {
                type: 'conversation_create',
                clientId,
                success: false,
                conflict: true,
                reason: 'already_exists',
                serverData: existing
            };
        }

        const conversation = new Conversation({
            userId,
            clientId,
            ...data,
            syncStatus: {
                syncVersion: 1,
                lastSyncAt: new Date(),
                deviceId
            }
        });

        await conversation.save();

        return {
            type: 'conversation_create',
            clientId,
            success: true,
            serverId: conversation._id,
            syncVersion: conversation.syncStatus.syncVersion
        };
    }

    /**
     * 更新对话
     */
    async updateConversation(userId, clientId, data, clientVersion, deviceId) {
        const conversation = await Conversation.findOne({ userId, clientId });
        
        if (!conversation) {
            return {
                type: 'conversation_update',
                clientId,
                success: false,
                error: 'conversation_not_found'
            };
        }

        // 检查版本冲突
        if (conversation.syncStatus.syncVersion > clientVersion) {
            return {
                type: 'conversation_update',
                clientId,
                success: false,
                conflict: true,
                reason: 'version_mismatch',
                serverData: conversation,
                serverVersion: conversation.syncStatus.syncVersion,
                clientVersion
            };
        }

        // 应用更新
        Object.keys(data).forEach(key => {
            if (key !== 'messages' && conversation[key] !== undefined) {
                conversation[key] = data[key];
            }
        });

        conversation.syncStatus.syncVersion += 1;
        conversation.syncStatus.lastSyncAt = new Date();
        conversation.syncStatus.deviceId = deviceId;

        await conversation.save();

        return {
            type: 'conversation_update',
            clientId,
            success: true,
            syncVersion: conversation.syncStatus.syncVersion
        };
    }

    /**
     * 添加消息
     */
    async addMessage(userId, clientId, messageData, deviceId) {
        const conversation = await Conversation.findOne({ userId, clientId });
        
        if (!conversation) {
            return {
                type: 'message_add',
                clientId,
                success: false,
                error: 'conversation_not_found'
            };
        }

        const message = conversation.addMessage(messageData);
        conversation.syncStatus.deviceId = deviceId;
        
        await conversation.save();

        return {
            type: 'message_add',
            clientId,
            success: true,
            messageId: message._id,
            syncVersion: conversation.syncStatus.syncVersion
        };
    }

    /**
     * 检测冲突
     */
    async detectConflicts(userId, serverUpdates) {
        // 实现冲突检测逻辑
        const conflicts = [];
        
        // 这里可以添加更复杂的冲突检测逻辑
        // 比如检查时间戳、版本号等
        
        return conflicts;
    }

    /**
     * 获取最新同步版本
     */
    async getLatestSyncVersion(userId) {
        const latestConversation = await Conversation
            .findOne({ userId })
            .sort({ 'syncStatus.syncVersion': -1 })
            .select('syncStatus.syncVersion');
            
        return latestConversation ? latestConversation.syncStatus.syncVersion : 0;
    }

    /**
     * 广播变更到其他设备
     */
    broadcastChange(userId, change, excludeSocketId) {
        this.io.to(`user_${userId}`).except(excludeSocketId).emit('remote_change', {
            change: change,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * 处理冲突解决
     */
    async handleConflictResolution(userId, data, socket) {
        const { conflictId, resolution, resolvedData } = data;
        
        console.log(`🔧 用户 ${userId} 解决冲突: ${conflictId}`);

        try {
            // 应用解决方案
            const result = await this.applyConflictResolution(userId, resolution, resolvedData);
            
            socket.emit('conflict_resolved', {
                conflictId,
                result: result,
                syncVersion: await this.getLatestSyncVersion(userId)
            });

            // 通知其他设备冲突已解决
            this.broadcastChange(userId, {
                type: 'conflict_resolved',
                conflictId,
                result: result
            }, socket.id);

        } catch (error) {
            console.error('冲突解决失败:', error);
            socket.emit('conflict_error', {
                conflictId,
                message: '冲突解决失败',
                error: error.message
            });
        }
    }

    /**
     * 应用冲突解决方案
     */
    async applyConflictResolution(userId, resolution, resolvedData) {
        // 根据解决策略应用更改
        switch (resolution) {
            case 'use_server':
                // 使用服务器端数据，客户端需要更新
                return { action: 'update_client', data: resolvedData };
                
            case 'use_client':
                // 使用客户端数据，更新服务器
                return await this.forceUpdateServer(userId, resolvedData);
                
            case 'merge':
                // 合并数据
                return await this.mergeConflictData(userId, resolvedData);
                
            default:
                throw new Error(`未知的冲突解决策略: ${resolution}`);
        }
    }

    /**
     * 强制更新服务器数据
     */
    async forceUpdateServer(userId, data) {
        const { clientId, conversationData } = data;
        
        const conversation = await Conversation.findOne({ userId, clientId });
        if (conversation) {
            Object.assign(conversation, conversationData);
            conversation.syncStatus.syncVersion += 1;
            conversation.syncStatus.lastSyncAt = new Date();
            conversation.syncStatus.conflictResolved = true;
            
            await conversation.save();
            
            return {
                action: 'server_updated',
                syncVersion: conversation.syncStatus.syncVersion
            };
        }
        
        throw new Error('对话不存在');
    }

    /**
     * 合并冲突数据
     */
    async mergeConflictData(userId, data) {
        // 实现数据合并逻辑
        // 这里可以根据具体需求实现复杂的合并策略
        return { action: 'data_merged' };
    }
}

module.exports = SyncManager;