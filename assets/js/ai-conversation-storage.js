/**
 * AI 对话历史存储管理器
 * 提供完整的对话历史记录、检索、管理功能
 */
class AIConversationStorage {
    constructor() {
        this.dbName = 'AIConversationDB';
        this.version = 1;
        this.stores = {
            conversations: 'conversations',
            messages: 'messages',
            tags: 'tags'
        };
        this.db = null;
        this.currentConversationId = null;
        this.initialized = false;
    }

    /**
     * 初始化数据库
     */
    async init() {
        if (this.initialized) return;
        
        try {
            this.db = await this.openDatabase();
            this.initialized = true;
            console.log('✅ AI对话历史数据库初始化成功');
        } catch (error) {
            console.error('❌ AI对话历史数据库初始化失败:', error);
            // 降级到localStorage
            this.useLocalStorageFallback = true;
        }
    }

    /**
     * 打开IndexedDB数据库
     */
    openDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // 对话存储表
                if (!db.objectStoreNames.contains(this.stores.conversations)) {
                    const conversationStore = db.createObjectStore(this.stores.conversations, {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    
                    // 创建索引
                    conversationStore.createIndex('createdAt', 'createdAt');
                    conversationStore.createIndex('updatedAt', 'updatedAt');
                    conversationStore.createIndex('title', 'title');
                    conversationStore.createIndex('aiProvider', 'aiProvider');
                    conversationStore.createIndex('archived', 'archived');
                }
                
                // 消息存储表
                if (!db.objectStoreNames.contains(this.stores.messages)) {
                    const messageStore = db.createObjectStore(this.stores.messages, {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    
                    // 创建索引
                    messageStore.createIndex('conversationId', 'conversationId');
                    messageStore.createIndex('timestamp', 'timestamp');
                    messageStore.createIndex('type', 'type'); // user/assistant/system
                    messageStore.createIndex('content', 'content'); // 用于全文搜索
                }
                
                // 标签存储表
                if (!db.objectStoreNames.contains(this.stores.tags)) {
                    const tagStore = db.createObjectStore(this.stores.tags, {
                        keyPath: 'name'
                    });
                    
                    tagStore.createIndex('usage', 'usage');
                    tagStore.createIndex('createdAt', 'createdAt');
                }
                
                console.log('✅ AI对话历史数据库结构创建完成');
            };
        });
    }

    /**
     * 创建新对话
     */
    async createConversation(title = '新对话', metadata = {}) {
        await this.init();
        
        const conversation = {
            title: title,
            aiProvider: metadata.aiProvider || 'unknown',
            model: metadata.model || '',
            createdAt: new Date(),
            updatedAt: new Date(),
            messageCount: 0,
            totalTokens: 0,
            tags: metadata.tags || [],
            archived: false,
            pinned: false,
            metadata: metadata
        };

        if (this.useLocalStorageFallback) {
            return this.createConversationLS(conversation);
        }

        try {
            const transaction = this.db.transaction([this.stores.conversations], 'readwrite');
            const store = transaction.objectStore(this.stores.conversations);
            const request = store.add(conversation);
            
            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    const conversationId = request.result;
                    this.currentConversationId = conversationId;
                    console.log(`✅ 创建新对话 ID: ${conversationId}, 标题: ${title}`);
                    resolve(conversationId);
                };
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('❌ 创建对话失败:', error);
            throw error;
        }
    }

    /**
     * 添加消息到对话
     */
    async addMessage(conversationId, type, content, metadata = {}) {
        await this.init();
        
        const message = {
            conversationId: conversationId,
            type: type, // 'user' | 'assistant' | 'system'
            content: content,
            timestamp: new Date(),
            tokenCount: metadata.tokenCount || 0,
            model: metadata.model || '',
            processingTime: metadata.processingTime || 0,
            metadata: metadata
        };

        if (this.useLocalStorageFallback) {
            return this.addMessageLS(message);
        }

        try {
            const transaction = this.db.transaction([this.stores.messages, this.stores.conversations], 'readwrite');
            
            // 添加消息
            const messageStore = transaction.objectStore(this.stores.messages);
            const messageRequest = messageStore.add(message);
            
            // 更新对话统计
            const conversationStore = transaction.objectStore(this.stores.conversations);
            const conversationRequest = conversationStore.get(conversationId);
            
            return new Promise((resolve, reject) => {
                transaction.oncomplete = () => {
                    console.log(`✅ 添加消息到对话 ${conversationId}: ${type} - ${content.substring(0, 50)}...`);
                    resolve(messageRequest.result);
                };
                
                transaction.onerror = () => reject(transaction.error);
                
                conversationRequest.onsuccess = () => {
                    const conversation = conversationRequest.result;
                    if (conversation) {
                        conversation.updatedAt = new Date();
                        conversation.messageCount = (conversation.messageCount || 0) + 1;
                        conversation.totalTokens = (conversation.totalTokens || 0) + (metadata.tokenCount || 0);
                        conversationStore.put(conversation);
                    }
                };
            });
        } catch (error) {
            console.error('❌ 添加消息失败:', error);
            throw error;
        }
    }

    /**
     * 获取对话列表
     */
    async getConversations(options = {}) {
        await this.init();
        
        const {
            page = 0,
            pageSize = 20,
            archived = false,
            sortBy = 'updatedAt',
            sortOrder = 'desc'
        } = options;

        if (this.useLocalStorageFallback) {
            return this.getConversationsLS(options);
        }

        try {
            const transaction = this.db.transaction([this.stores.conversations], 'readonly');
            const store = transaction.objectStore(this.stores.conversations);
            const index = store.index(sortBy);
            
            return new Promise((resolve) => {
                const conversations = [];
                const direction = sortOrder === 'desc' ? 'prev' : 'next';
                const request = index.openCursor(null, direction);
                
                let count = 0;
                let skipped = 0;
                
                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    
                    if (!cursor) {
                        resolve({
                            conversations,
                            totalCount: conversations.length,
                            hasMore: count === pageSize,
                            currentPage: page
                        });
                        return;
                    }
                    
                    const conversation = cursor.value;
                    
                    // 过滤归档状态
                    if (conversation.archived !== archived) {
                        cursor.continue();
                        return;
                    }
                    
                    // 分页跳过
                    if (skipped < page * pageSize) {
                        skipped++;
                        cursor.continue();
                        return;
                    }
                    
                    // 添加到结果
                    if (count < pageSize) {
                        conversations.push(conversation);
                        count++;
                        cursor.continue();
                    } else {
                        resolve({
                            conversations,
                            totalCount: conversations.length,
                            hasMore: true,
                            currentPage: page
                        });
                    }
                };
            });
        } catch (error) {
            console.error('❌ 获取对话列表失败:', error);
            return { conversations: [], totalCount: 0, hasMore: false, currentPage: 0 };
        }
    }

    /**
     * 获取对话的所有消息
     */
    async getConversationMessages(conversationId) {
        await this.init();

        if (this.useLocalStorageFallback) {
            return this.getConversationMessagesLS(conversationId);
        }

        try {
            const transaction = this.db.transaction([this.stores.messages], 'readonly');
            const store = transaction.objectStore(this.stores.messages);
            const index = store.index('conversationId');
            
            return new Promise((resolve) => {
                const request = index.getAll(conversationId);
                
                request.onsuccess = () => {
                    const messages = request.result.sort((a, b) => 
                        new Date(a.timestamp) - new Date(b.timestamp)
                    );
                    
                    console.log(`✅ 加载对话 ${conversationId} 的 ${messages.length} 条消息`);
                    resolve(messages);
                };
                
                request.onerror = () => {
                    console.error('❌ 加载对话消息失败:', request.error);
                    resolve([]);
                };
            });
        } catch (error) {
            console.error('❌ 获取对话消息失败:', error);
            return [];
        }
    }

    /**
     * 搜索对话
     */
    async searchConversations(query, options = {}) {
        await this.init();
        
        const {
            searchInContent = true,
            searchInTitle = true,
            limit = 50
        } = options;

        if (this.useLocalStorageFallback) {
            return this.searchConversationsLS(query, options);
        }

        try {
            const results = [];
            const queryLower = query.toLowerCase();
            
            // 搜索对话标题
            if (searchInTitle) {
                const conversationTransaction = this.db.transaction([this.stores.conversations], 'readonly');
                const conversationStore = conversationTransaction.objectStore(this.stores.conversations);
                
                const conversationResults = await new Promise((resolve) => {
                    const titleResults = [];
                    const request = conversationStore.openCursor();
                    
                    request.onsuccess = (event) => {
                        const cursor = event.target.result;
                        if (!cursor) {
                            resolve(titleResults);
                            return;
                        }
                        
                        const conversation = cursor.value;
                        if (conversation.title.toLowerCase().includes(queryLower)) {
                            titleResults.push({
                                type: 'conversation',
                                conversation: conversation,
                                matchType: 'title',
                                score: this.calculateRelevanceScore(conversation.title, query)
                            });
                        }
                        
                        cursor.continue();
                    };
                });
                
                results.push(...conversationResults);
            }
            
            // 搜索消息内容
            if (searchInContent) {
                const messageTransaction = this.db.transaction([this.stores.messages], 'readonly');
                const messageStore = messageTransaction.objectStore(this.stores.messages);
                
                const messageResults = await new Promise((resolve) => {
                    const contentResults = [];
                    const request = messageStore.openCursor();
                    
                    request.onsuccess = (event) => {
                        const cursor = event.target.result;
                        if (!cursor) {
                            resolve(contentResults);
                            return;
                        }
                        
                        const message = cursor.value;
                        if (message.content.toLowerCase().includes(queryLower)) {
                            contentResults.push({
                                type: 'message',
                                message: message,
                                matchType: 'content',
                                score: this.calculateRelevanceScore(message.content, query)
                            });
                        }
                        
                        cursor.continue();
                    };
                });
                
                results.push(...messageResults);
            }
            
            // 按相关性排序并限制数量
            const sortedResults = results
                .sort((a, b) => b.score - a.score)
                .slice(0, limit);
            
            console.log(`✅ 搜索"${query}"找到 ${sortedResults.length} 个结果`);
            return sortedResults;
            
        } catch (error) {
            console.error('❌ 搜索对话失败:', error);
            return [];
        }
    }

    /**
     * 计算搜索相关性得分
     */
    calculateRelevanceScore(text, query) {
        const textLower = text.toLowerCase();
        const queryLower = query.toLowerCase();
        
        // 完全匹配得分最高
        if (textLower === queryLower) return 100;
        
        // 包含完整查询的得分
        if (textLower.includes(queryLower)) {
            const position = textLower.indexOf(queryLower);
            const score = 50 + (1 - position / textLower.length) * 30;
            return score;
        }
        
        // 单词匹配得分
        const queryWords = queryLower.split(' ');
        const textWords = textLower.split(' ');
        const matchedWords = queryWords.filter(word => 
            textWords.some(textWord => textWord.includes(word))
        );
        
        return (matchedWords.length / queryWords.length) * 30;
    }

    /**
     * 更新对话标题
     */
    async updateConversationTitle(conversationId, newTitle) {
        await this.init();

        if (this.useLocalStorageFallback) {
            return this.updateConversationTitleLS(conversationId, newTitle);
        }

        try {
            const transaction = this.db.transaction([this.stores.conversations], 'readwrite');
            const store = transaction.objectStore(this.stores.conversations);
            
            return new Promise((resolve, reject) => {
                const getRequest = store.get(conversationId);
                
                getRequest.onsuccess = () => {
                    const conversation = getRequest.result;
                    if (conversation) {
                        conversation.title = newTitle;
                        conversation.updatedAt = new Date();
                        
                        const updateRequest = store.put(conversation);
                        updateRequest.onsuccess = () => {
                            console.log(`✅ 更新对话标题: ${conversationId} -> ${newTitle}`);
                            resolve(true);
                        };
                        updateRequest.onerror = () => reject(updateRequest.error);
                    } else {
                        reject(new Error('对话不存在'));
                    }
                };
                
                getRequest.onerror = () => reject(getRequest.error);
            });
        } catch (error) {
            console.error('❌ 更新对话标题失败:', error);
            throw error;
        }
    }

    /**
     * 删除对话
     */
    async deleteConversation(conversationId) {
        await this.init();

        if (this.useLocalStorageFallback) {
            return this.deleteConversationLS(conversationId);
        }

        try {
            const transaction = this.db.transaction([this.stores.conversations, this.stores.messages], 'readwrite');
            
            // 删除对话记录
            const conversationStore = transaction.objectStore(this.stores.conversations);
            conversationStore.delete(conversationId);
            
            // 删除对话的所有消息
            const messageStore = transaction.objectStore(this.stores.messages);
            const messageIndex = messageStore.index('conversationId');
            const messageRequest = messageIndex.openCursor(conversationId);
            
            return new Promise((resolve, reject) => {
                let deletedMessages = 0;
                
                messageRequest.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        cursor.delete();
                        deletedMessages++;
                        cursor.continue();
                    }
                };
                
                transaction.oncomplete = () => {
                    console.log(`✅ 删除对话 ${conversationId} 及其 ${deletedMessages} 条消息`);
                    resolve(true);
                };
                
                transaction.onerror = () => reject(transaction.error);
            });
        } catch (error) {
            console.error('❌ 删除对话失败:', error);
            throw error;
        }
    }

    /**
     * 获取存储统计信息
     */
    async getStorageStats() {
        await this.init();

        if (this.useLocalStorageFallback) {
            return this.getStorageStatsLS();
        }

        try {
            const [conversationCount, messageCount, totalSize] = await Promise.all([
                this.countRecords(this.stores.conversations),
                this.countRecords(this.stores.messages),
                this.estimateStorageSize()
            ]);

            return {
                conversationCount,
                messageCount,
                totalSize,
                database: this.dbName,
                version: this.version,
                lastUpdate: new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ 获取存储统计失败:', error);
            return {
                conversationCount: 0,
                messageCount: 0,
                totalSize: 0,
                error: error.message
            };
        }
    }

    /**
     * 计算存储中记录数量
     */
    async countRecords(storeName) {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        
        return new Promise((resolve) => {
            const request = store.count();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => resolve(0);
        });
    }

    /**
     * 估算存储大小
     */
    async estimateStorageSize() {
        try {
            const estimate = await navigator.storage.estimate();
            return estimate.usage || 0;
        } catch {
            return 0;
        }
    }

    /**
     * 清理旧数据
     */
    async cleanupOldData(daysToKeep = 30) {
        await this.init();
        
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
        
        console.log(`🧹 开始清理 ${daysToKeep} 天前的对话数据...`);
        
        try {
            let deletedConversations = 0;
            let deletedMessages = 0;
            
            const transaction = this.db.transaction([this.stores.conversations, this.stores.messages], 'readwrite');
            const conversationStore = transaction.objectStore(this.stores.conversations);
            const messageStore = transaction.objectStore(this.stores.messages);
            
            // 找到并删除旧对话
            const conversationIndex = conversationStore.index('updatedAt');
            const range = IDBKeyRange.upperBound(cutoffDate);
            
            const conversationRequest = conversationIndex.openCursor(range);
            const oldConversationIds = [];
            
            conversationRequest.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    const conversation = cursor.value;
                    // 保留重要对话（置顶或有特殊标记）
                    if (!conversation.pinned && !conversation.important) {
                        oldConversationIds.push(conversation.id);
                        cursor.delete();
                        deletedConversations++;
                    }
                    cursor.continue();
                }
            };
            
            transaction.oncomplete = async () => {
                // 删除对应的消息
                if (oldConversationIds.length > 0) {
                    const messageTransaction = this.db.transaction([this.stores.messages], 'readwrite');
                    const messageStore = messageTransaction.objectStore(this.stores.messages);
                    const messageIndex = messageStore.index('conversationId');
                    
                    for (const conversationId of oldConversationIds) {
                        const messageRequest = messageIndex.openCursor(conversationId);
                        messageRequest.onsuccess = (event) => {
                            const cursor = event.target.result;
                            if (cursor) {
                                cursor.delete();
                                deletedMessages++;
                                cursor.continue();
                            }
                        };
                    }
                }
                
                console.log(`✅ 清理完成: 删除了 ${deletedConversations} 个对话和 ${deletedMessages} 条消息`);
            };
        } catch (error) {
            console.error('❌ 清理旧数据失败:', error);
            throw error;
        }
    }

    /**
     * 导出所有数据
     */
    async exportAllData() {
        await this.init();
        
        console.log('📤 开始导出AI对话历史数据...');
        
        try {
            const conversations = await this.getConversations({ pageSize: 1000 });
            const exportData = {
                version: '1.0',
                exportDate: new Date().toISOString(),
                totalConversations: conversations.conversations.length,
                conversations: []
            };
            
            // 为每个对话加载完整消息
            for (const conversation of conversations.conversations) {
                const messages = await this.getConversationMessages(conversation.id);
                exportData.conversations.push({
                    ...conversation,
                    messages: messages
                });
            }
            
            console.log(`✅ 数据导出完成: ${exportData.conversations.length} 个对话`);
            return exportData;
        } catch (error) {
            console.error('❌ 导出数据失败:', error);
            throw error;
        }
    }

    // ===== localStorage 降级方案 =====
    
    createConversationLS(conversation) {
        const conversations = JSON.parse(localStorage.getItem('ai_conversations') || '[]');
        conversation.id = Date.now();
        conversations.push(conversation);
        localStorage.setItem('ai_conversations', JSON.stringify(conversations));
        return conversation.id;
    }

    addMessageLS(message) {
        const messages = JSON.parse(localStorage.getItem('ai_messages') || '[]');
        message.id = Date.now();
        messages.push(message);
        localStorage.setItem('ai_messages', JSON.stringify(messages));
        
        // 更新对话统计
        const conversations = JSON.parse(localStorage.getItem('ai_conversations') || '[]');
        const conversation = conversations.find(c => c.id === message.conversationId);
        if (conversation) {
            conversation.updatedAt = new Date();
            conversation.messageCount = (conversation.messageCount || 0) + 1;
            localStorage.setItem('ai_conversations', JSON.stringify(conversations));
        }
        
        return message.id;
    }

    getConversationsLS(options = {}) {
        const conversations = JSON.parse(localStorage.getItem('ai_conversations') || '[]');
        return {
            conversations: conversations.slice(0, options.pageSize || 20),
            totalCount: conversations.length,
            hasMore: false,
            currentPage: 0
        };
    }

    getConversationMessagesLS(conversationId) {
        const messages = JSON.parse(localStorage.getItem('ai_messages') || '[]');
        return messages.filter(m => m.conversationId === conversationId);
    }

    getStorageStatsLS() {
        const conversations = JSON.parse(localStorage.getItem('ai_conversations') || '[]');
        const messages = JSON.parse(localStorage.getItem('ai_messages') || '[]');
        
        return {
            conversationCount: conversations.length,
            messageCount: messages.length,
            totalSize: 0,
            fallbackMode: true
        };
    }
}

// 全局实例
window.aiConversationStorage = new AIConversationStorage();

console.log('✅ AI对话历史存储模块加载完成');