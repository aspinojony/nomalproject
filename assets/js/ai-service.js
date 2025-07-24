class AIService {
    constructor() {
        this.currentService = 'spark';
        this.apiKeys = {
            spark: {
                appId: '',
                apiSecret: '',
                apiKey: ''
            },
            kimi: {
                apiKey: ''
            },
            doubao: {
                apiKey: ''
            }
        };
        this.endpoints = {
            spark: 'wss://spark-api.xf-yun.com/v3.5/chat',
            kimi: 'https://api.moonshot.cn/v1/chat/completions',
            doubao: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions'
        };
        this.models = {
            spark: 'generalv3.5',
            kimi: 'moonshot-v1-32k',
            doubao: 'doubao-lite-4k'
        };
        this.tokenUsage = {
            current: 0,
            limit: 50000,
            reset: null
        };
        
        // 🆕 对话历史管理
        this.conversationStorage = null;
        this.currentConversationId = null;
        this.currentConversation = {
            messages: [],
            title: '',
            createdAt: null
        };
        this.autoSaveEnabled = true;
        this.autoSaveThreshold = 2; // 每2条消息自动保存一次
        
        // 初始化历史存储
        this.initConversationStorage();
    }

    setApiKeys(service, keys) {
        this.apiKeys[service] = { ...this.apiKeys[service], ...keys };
        this.saveConfig();
    }

    switchService(service) {
        if (this.endpoints[service]) {
            this.currentService = service;
            this.saveConfig();
            return true;
        }
        return false;
    }

    async sendMessage(messages, options = {}) {
        try {
            const service = options.service || this.currentService;
            
            switch (service) {
                case 'spark':
                    return await this.sendSparkMessage(messages, options);
                case 'kimi':
                    return await this.sendKimiMessage(messages, options);
                case 'doubao':
                    return await this.sendDoubaoMessage(messages, options);
                default:
                    throw new Error(`不支持的AI服务: ${service}`);
            }
        } catch (error) {
            console.error('AI服务调用失败:', error);
            throw error;
        }
    }

    async sendSparkMessage(messages, options = {}) {
        return new Promise((resolve, reject) => {
            if (!this.apiKeys.spark.appId || !this.apiKeys.spark.apiSecret || !this.apiKeys.spark.apiKey) {
                reject(new Error('请先配置讯飞星火API密钥'));
                return;
            }

            const url = this.generateSparkUrl();
            const ws = new WebSocket(url);
            let responseText = '';

            ws.onopen = () => {
                const params = {
                    header: {
                        app_id: this.apiKeys.spark.appId,
                        uid: 'kaoyan-user'
                    },
                    parameter: {
                        chat: {
                            domain: 'generalv3.5',
                            temperature: options.temperature || 0.7,
                            max_tokens: options.maxTokens || 2048
                        }
                    },
                    payload: {
                        message: {
                            text: messages.map(msg => ({
                                role: msg.role,
                                content: msg.content
                            }))
                        }
                    }
                };
                ws.send(JSON.stringify(params));
            };

            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.header.code === 0) {
                    const choices = data.payload.choices;
                    if (choices && choices.text && choices.text.length > 0) {
                        responseText += choices.text[0].content;
                        if (options.onStream) {
                            options.onStream(responseText);
                        }
                    }
                    if (data.header.status === 2) {
                        this.updateTokenUsage(data.payload.usage);
                        resolve({
                            content: responseText,
                            usage: data.payload.usage
                        });
                        ws.close();
                    }
                } else {
                    reject(new Error(data.header.message || '讯飞星火API调用失败'));
                    ws.close();
                }
            };

            ws.onerror = (error) => {
                reject(new Error('WebSocket连接失败'));
            };

            ws.onclose = (event) => {
                if (event.code !== 1000) {
                    reject(new Error('WebSocket连接异常关闭'));
                }
            };
        });
    }

    async sendKimiMessage(messages, options = {}) {
        if (!this.apiKeys.kimi.apiKey) {
            throw new Error('请先配置Kimi API密钥');
        }

        const response = await fetch(this.endpoints.kimi, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKeys.kimi.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: this.models.kimi,
                messages: messages,
                temperature: options.temperature || 0.7,
                max_tokens: options.maxTokens || 2048,
                stream: options.stream || false
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Kimi API调用失败');
        }

        const data = await response.json();
        this.updateTokenUsage(data.usage);
        
        return {
            content: data.choices[0].message.content,
            usage: data.usage
        };
    }

    async sendDoubaoMessage(messages, options = {}) {
        if (!this.apiKeys.doubao.apiKey) {
            throw new Error('请先配置豆包API密钥');
        }

        const response = await fetch(this.endpoints.doubao, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKeys.doubao.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: this.models.doubao,
                messages: messages,
                temperature: options.temperature || 0.7,
                max_tokens: options.maxTokens || 2048,
                stream: options.stream || false
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || '豆包API调用失败');
        }

        const data = await response.json();
        this.updateTokenUsage(data.usage);
        
        return {
            content: data.choices[0].message.content,
            usage: data.usage
        };
    }

    generateSparkUrl() {
        const host = 'spark-api.xf-yun.com';
        const path = '/v3.5/chat';
        const date = new Date().toUTCString();
        
        const signatureOrigin = `host: ${host}\ndate: ${date}\nGET ${path} HTTP/1.1`;
        const signature = CryptoJS.HmacSHA256(signatureOrigin, this.apiKeys.spark.apiSecret).toString(CryptoJS.enc.Base64);
        
        const authorizationOrigin = `api_key="${this.apiKeys.spark.apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
        const authorization = btoa(authorizationOrigin);
        
        return `wss://${host}${path}?authorization=${authorization}&date=${encodeURIComponent(date)}&host=${host}`;
    }

    updateTokenUsage(usage) {
        if (usage) {
            this.tokenUsage.current += (usage.prompt_tokens || 0) + (usage.completion_tokens || 0);
            this.saveConfig();
        }
    }

    getTokenUsagePercentage() {
        return Math.min(100, (this.tokenUsage.current / this.tokenUsage.limit) * 100);
    }

    resetTokenUsage() {
        this.tokenUsage.current = 0;
        this.tokenUsage.reset = new Date();
        this.saveConfig();
    }

    saveConfig() {
        const config = {
            currentService: this.currentService,
            tokenUsage: this.tokenUsage
        };
        localStorage.setItem('ai_service_config', JSON.stringify(config));
    }

    loadConfig() {
        try {
            const config = JSON.parse(localStorage.getItem('ai_service_config') || '{}');
            this.currentService = config.currentService || 'spark';
            this.tokenUsage = { ...this.tokenUsage, ...config.tokenUsage };
        } catch (error) {
            console.error('加载AI服务配置失败:', error);
        }
    }

    async testConnection(service) {
        try {
            const testMessages = [
                { role: 'user', content: '你好，请简单回复确认连接正常' }
            ];
            
            const result = await this.sendMessage(testMessages, { service });
            return {
                success: true,
                response: result.content
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    getServiceStatus() {
        return {
            current: this.currentService,
            services: {
                spark: {
                    name: '讯飞星火',
                    configured: !!(this.apiKeys.spark.appId && this.apiKeys.spark.apiSecret && this.apiKeys.spark.apiKey),
                    features: ['免费额度', '中文优化', 'WebSocket连接']
                },
                kimi: {
                    name: 'Kimi AI',
                    configured: !!this.apiKeys.kimi.apiKey,
                    features: ['长文本', 'OpenAI兼容', 'HTTP接口']
                },
                doubao: {
                    name: '豆包AI',
                    configured: !!this.apiKeys.doubao.apiKey,
                    features: ['快速响应', '前端友好', 'Tailwind支持']
                }
            },
            tokenUsage: this.tokenUsage
        };
    }

    formatError(error) {
        const errorMappings = {
            'network': '网络连接失败，请检查网络设置',
            'auth': 'API密钥验证失败，请检查配置',
            'quota': 'API调用额度不足，请升级套餐或等待重置',
            'rate_limit': '调用频率过高，请稍后再试',
            'invalid_request': '请求参数无效，请检查输入内容'
        };

        for (const [key, message] of Object.entries(errorMappings)) {
            if (error.message.toLowerCase().includes(key)) {
                return message;
            }
        }

        return error.message || '未知错误';
    }

    // ===== 🆕 对话历史管理方法 =====

    /**
     * 初始化对话存储
     */
    async initConversationStorage() {
        try {
            // 确保存储模块已加载
            if (typeof window.aiConversationStorage === 'undefined') {
                console.warn('⚠️ AI对话存储模块未加载，历史记录功能将被禁用');
                return;
            }
            
            this.conversationStorage = window.aiConversationStorage;
            await this.conversationStorage.init();
            console.log('✅ AI对话历史存储初始化成功');
        } catch (error) {
            console.error('❌ AI对话历史存储初始化失败:', error);
            this.conversationStorage = null;
        }
    }

    /**
     * 开始新对话
     */
    async startNewConversation(title = null) {
        if (!this.conversationStorage) {
            console.warn('⚠️ 对话存储未初始化，无法创建新对话');
            this.currentConversationId = `temp_${Date.now()}`;
            this.currentConversation = {
                messages: [],
                title: title || '新对话',
                createdAt: new Date()
            };
            return this.currentConversationId;
        }

        try {
            // 如果当前有对话且有消息，先保存
            if (this.currentConversation.messages.length > 0) {
                await this.saveCurrentConversation();
            }

            // 创建新对话
            const conversationTitle = title || this.generateConversationTitle();
            this.currentConversationId = await this.conversationStorage.createConversation(
                conversationTitle,
                {
                    aiProvider: this.currentService,
                    model: this.models[this.currentService]
                }
            );

            // 重置当前对话状态
            this.currentConversation = {
                messages: [],
                title: conversationTitle,
                createdAt: new Date()
            };

            console.log(`✅ 创建新对话: ${conversationTitle} (ID: ${this.currentConversationId})`);
            return this.currentConversationId;
        } catch (error) {
            console.error('❌ 创建新对话失败:', error);
            // 降级为临时对话
            this.currentConversationId = `temp_${Date.now()}`;
            this.currentConversation = {
                messages: [],
                title: title || '新对话',
                createdAt: new Date()
            };
            return this.currentConversationId;
        }
    }

    /**
     * 发送消息（增强版，包含历史记录）
     */
    async sendMessageWithHistory(content, options = {}) {
        const startTime = Date.now();
        
        try {
            // 如果没有当前对话，创建一个
            if (!this.currentConversationId) {
                await this.startNewConversation();
            }

            // 添加用户消息到当前对话
            const userMessage = {
                role: 'user',
                content: content,
                timestamp: new Date()
            };
            
            this.currentConversation.messages.push(userMessage);

            // 保存用户消息到存储
            if (this.conversationStorage) {
                await this.conversationStorage.addMessage(
                    this.currentConversationId,
                    'user',
                    content,
                    {
                        model: this.models[this.currentService],
                        service: this.currentService
                    }
                );
            }

            // 准备发送给AI的消息历史（包含上下文）
            const contextMessages = this.buildContextMessages(options.maxHistory || 10);
            
            // 发送到AI服务
            const response = await this.sendMessage(contextMessages, options);
            const processingTime = Date.now() - startTime;

            // 添加AI回复到当前对话
            const assistantMessage = {
                role: 'assistant',
                content: response.content || response,
                timestamp: new Date(),
                processingTime: processingTime
            };
            
            this.currentConversation.messages.push(assistantMessage);

            // 保存AI回复到存储
            if (this.conversationStorage) {
                await this.conversationStorage.addMessage(
                    this.currentConversationId,
                    'assistant',
                    response.content || response,
                    {
                        model: this.models[this.currentService],
                        service: this.currentService,
                        processingTime: processingTime,
                        tokenCount: response.usage?.total_tokens || 0
                    }
                );

                // 自动保存检查
                if (this.autoSaveEnabled && 
                    this.currentConversation.messages.length % this.autoSaveThreshold === 0) {
                    await this.autoUpdateConversationTitle();
                }
            }

            // 更新token使用统计
            this.updateTokenUsage(response.usage);

            return {
                content: response.content || response,
                conversationId: this.currentConversationId,
                messageCount: this.currentConversation.messages.length,
                processingTime: processingTime,
                usage: response.usage
            };
            
        } catch (error) {
            console.error('❌ 发送消息失败:', error);
            
            // 记录错误消息
            if (this.conversationStorage && this.currentConversationId) {
                await this.conversationStorage.addMessage(
                    this.currentConversationId,
                    'system',
                    `错误: ${this.formatError(error)}`,
                    {
                        error: true,
                        errorType: error.name,
                        service: this.currentService
                    }
                );
            }
            
            throw error;
        }
    }

    /**
     * 构建上下文消息（用于发送给AI）
     */
    buildContextMessages(maxHistory = 10) {
        if (this.currentConversation.messages.length === 0) {
            return [];
        }

        // 获取最近的消息作为上下文
        const recentMessages = this.currentConversation.messages
            .slice(-maxHistory)
            .filter(msg => msg.role !== 'system' || !msg.metadata?.error)
            .map(msg => ({
                role: msg.role,
                content: msg.content
            }));

        return recentMessages;
    }

    /**
     * 自动更新对话标题
     */
    async autoUpdateConversationTitle() {
        if (!this.conversationStorage || !this.currentConversationId) return;

        try {
            // 获取对话的前几条消息来生成标题
            const title = this.generateConversationTitleFromMessages(
                this.currentConversation.messages.slice(0, 4)
            );

            if (title && title !== this.currentConversation.title) {
                await this.conversationStorage.updateConversationTitle(
                    this.currentConversationId,
                    title
                );
                this.currentConversation.title = title;
                console.log(`✅ 自动更新对话标题: ${title}`);
            }
        } catch (error) {
            console.error('❌ 自动更新对话标题失败:', error);
        }
    }

    /**
     * 生成对话标题
     */
    generateConversationTitle() {
        const topics = ['学习讨论', '问题咨询', '知识探索', '技术交流', '答疑解惑'];
        const randomTopic = topics[Math.floor(Math.random() * topics.length)];
        const timestamp = new Date().toLocaleTimeString('zh-CN', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        return `${randomTopic} ${timestamp}`;
    }

    /**
     * 从消息内容生成对话标题
     */
    generateConversationTitleFromMessages(messages) {
        if (!messages || messages.length === 0) return null;

        const userMessages = messages.filter(msg => msg.role === 'user');
        if (userMessages.length === 0) return null;

        const firstUserMessage = userMessages[0].content;
        
        // 简单的标题提取逻辑
        let title = firstUserMessage.substring(0, 20);
        
        // 移除常见的问候语
        title = title.replace(/^(你好|请问|帮我|能否|可以)/g, '');
        
        // 添加省略号（如果被截断）
        if (firstUserMessage.length > 20) {
            title += '...';
        }
        
        return title.trim() || '新对话';
    }

    /**
     * 加载历史对话
     */
    async loadConversation(conversationId) {
        if (!this.conversationStorage) {
            console.warn('⚠️ 对话存储未初始化，无法加载对话');
            return null;
        }

        try {
            const messages = await this.conversationStorage.getConversationMessages(conversationId);
            
            this.currentConversationId = conversationId;
            this.currentConversation = {
                messages: messages.map(msg => ({
                    role: msg.type,
                    content: msg.content,
                    timestamp: msg.timestamp,
                    metadata: msg.metadata
                })),
                title: '', // 标题将在UI层获取
                createdAt: messages[0]?.timestamp || new Date()
            };

            console.log(`✅ 加载对话 ${conversationId}: ${messages.length} 条消息`);
            return this.currentConversation;
        } catch (error) {
            console.error('❌ 加载对话失败:', error);
            return null;
        }
    }

    /**
     * 获取对话历史列表
     */
    async getConversationHistory(page = 0, pageSize = 20) {
        if (!this.conversationStorage) {
            return { conversations: [], totalCount: 0, hasMore: false };
        }

        try {
            return await this.conversationStorage.getConversations({
                page,
                pageSize,
                sortBy: 'updatedAt',
                sortOrder: 'desc'
            });
        } catch (error) {
            console.error('❌ 获取对话历史失败:', error);
            return { conversations: [], totalCount: 0, hasMore: false };
        }
    }

    /**
     * 搜索对话历史
     */
    async searchConversations(query, options = {}) {
        if (!this.conversationStorage) {
            return [];
        }

        try {
            return await this.conversationStorage.searchConversations(query, options);
        } catch (error) {
            console.error('❌ 搜索对话失败:', error);
            return [];
        }
    }

    /**
     * 删除对话
     */
    async deleteConversation(conversationId) {
        if (!this.conversationStorage) {
            console.warn('⚠️ 对话存储未初始化，无法删除对话');
            return false;
        }

        try {
            await this.conversationStorage.deleteConversation(conversationId);
            
            // 如果删除的是当前对话，重置状态
            if (this.currentConversationId === conversationId) {
                this.currentConversationId = null;
                this.currentConversation = {
                    messages: [],
                    title: '',
                    createdAt: null
                };
            }

            console.log(`✅ 删除对话 ${conversationId}`);
            return true;
        } catch (error) {
            console.error('❌ 删除对话失败:', error);
            return false;
        }
    }

    /**
     * 保存当前对话
     */
    async saveCurrentConversation() {
        if (!this.conversationStorage || 
            !this.currentConversationId || 
            this.currentConversation.messages.length === 0) {
            return;
        }

        try {
            // 确保对话标题是最新的
            if (!this.currentConversation.title || this.currentConversation.title === '新对话') {
                const newTitle = this.generateConversationTitleFromMessages(
                    this.currentConversation.messages.slice(0, 2)
                );
                if (newTitle) {
                    await this.conversationStorage.updateConversationTitle(
                        this.currentConversationId,
                        newTitle
                    );
                }
            }

            console.log(`✅ 当前对话已保存: ${this.currentConversation.title}`);
        } catch (error) {
            console.error('❌ 保存当前对话失败:', error);
        }
    }

    /**
     * 获取存储统计信息
     */
    async getStorageStats() {
        if (!this.conversationStorage) {
            return {
                conversationCount: 0,
                messageCount: 0,
                totalSize: 0,
                available: false
            };
        }

        try {
            const stats = await this.conversationStorage.getStorageStats();
            return {
                ...stats,
                available: true
            };
        } catch (error) {
            console.error('❌ 获取存储统计失败:', error);
            return {
                conversationCount: 0,
                messageCount: 0,
                totalSize: 0,
                available: false,
                error: error.message
            };
        }
    }

    /**
     * 导出对话历史
     */
    async exportConversationHistory() {
        if (!this.conversationStorage) {
            throw new Error('对话存储未初始化');
        }

        try {
            const data = await this.conversationStorage.exportAllData();
            
            // 创建下载链接
            const blob = new Blob([JSON.stringify(data, null, 2)], {
                type: 'application/json'
            });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ai_conversations_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            console.log('✅ 对话历史导出成功');
            return true;
        } catch (error) {
            console.error('❌ 导出对话历史失败:', error);
            throw error;
        }
    }

    /**
     * 清理旧对话
     */
    async cleanupOldConversations(daysToKeep = 30) {
        if (!this.conversationStorage) {
            throw new Error('对话存储未初始化');
        }

        try {
            await this.conversationStorage.cleanupOldData(daysToKeep);
            console.log(`✅ 清理完成: 保留最近 ${daysToKeep} 天的对话`);
            return true;
        } catch (error) {
            console.error('❌ 清理旧对话失败:', error);
            throw error;
        }
    }

    /**
     * 设置自动保存选项
     */
    setAutoSaveOptions(enabled = true, threshold = 2) {
        this.autoSaveEnabled = enabled;
        this.autoSaveThreshold = threshold;
        console.log(`✅ 自动保存设置已更新: ${enabled ? '启用' : '禁用'}, 阈值: ${threshold}`);
    }

    /**
     * 获取当前对话信息
     */
    getCurrentConversationInfo() {
        return {
            id: this.currentConversationId,
            title: this.currentConversation.title,
            messageCount: this.currentConversation.messages.length,
            createdAt: this.currentConversation.createdAt,
            hasStorage: !!this.conversationStorage
        };
    }
}

window.AIService = AIService;