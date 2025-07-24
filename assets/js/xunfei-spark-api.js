/**
 * 讯飞星火API配置和鉴权管理模块
 * 支持WebSocket连接和身份验证
 */
class XunfeiSparkAPI {
    constructor(config = {}) {
        // API配置信息（需要用户在讯飞开放平台获取）
      this.config = {
    appId: 'a4724c72',
    apiKey: '99ab6bc275204dcf325a42e84ec25ada',
    apiSecret: 'YjE5MzE4ZTI3MWM3NTQ2MDRkYWRiM2Y0',
    hostUrl: 'wss://spark-api.xf-yun.com/v4.0/chat',  // ✅ 更新为正式接口
    model: '4.0Ultra'
};


        // WebSocket连接
        this.socket = null;
        this.isConnected = false;
        this.messageCallbacks = [];
        this.errorCallbacks = [];

        // 会话上下文管理
        this.conversation = [];
        this.maxContextLength = 4000; // 最大上下文长度
    }

    /**
     * 生成鉴权URL
     * 基于讯飞星火API的签名算法
     */
    async generateAuthUrl() {
        try {
            const { appId, apiKey, apiSecret, hostUrl } = this.config;
            
            if (!appId || !apiKey || !apiSecret) {
                throw new Error('请先配置API密钥信息');
            }

            // 解析URL
            const url = new URL(hostUrl);
            const host = url.host;
            const path = url.pathname;
            
            // 生成RFC1123格式的时间戳
            const date = new Date().toUTCString();
            
            // 构造签名字符串
            const signatureOrigin = `host: ${host}\ndate: ${date}\nGET ${path} HTTP/1.1`;
            
            // 使用HMAC-SHA256生成签名
            const signatureBase64 = await this.hmacSha256(signatureOrigin, apiSecret);
            
            // 构造authorization字符串
            const authorization = `api_key="${apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signatureBase64}"`;
            
            // Base64编码
            const authorizationBase64 = btoa(authorization);
            
            // 构造最终的WebSocket URL
            const wsUrl = `${hostUrl}?authorization=${encodeURIComponent(authorizationBase64)}&date=${encodeURIComponent(date)}&host=${encodeURIComponent(host)}`;
            
            return wsUrl;
        } catch (error) {
            console.error('生成鉴权URL失败:', error);
            throw error;
        }
    }

    /**
     * HMAC-SHA256签名生成
     * 优先使用CryptoJS，其次使用Web Crypto API
     */
    async hmacSha256(message, secret) {
        try {
            // 方式1: 使用CryptoJS库 (优先推荐，兼容性最好)
            if (window.CryptoJS) {
                const signature = window.CryptoJS.HmacSHA256(message, secret);
                return signature.toString(window.CryptoJS.enc.Base64);
            }
            
            // 方式2: 使用Web Crypto API (现代浏览器支持)
            if (window.crypto && window.crypto.subtle) {
                const encoder = new TextEncoder();
                const keyData = encoder.encode(secret);
                const messageData = encoder.encode(message);
                
                const cryptoKey = await crypto.subtle.importKey(
                    'raw',
                    keyData,
                    { name: 'HMAC', hash: 'SHA-256' },
                    false,
                    ['sign']
                );
                
                const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
                
                // 转换为Base64
                const bytes = new Uint8Array(signature);
                let binary = '';
                bytes.forEach(byte => binary += String.fromCharCode(byte));
                return btoa(binary);
            }
            
            // 如果以上都不可用，抛出错误
            throw new Error('无法生成HMAC签名：请确保运行在HTTPS环境或包含CryptoJS库');
            
        } catch (error) {
            console.error('HMAC-SHA256签名生成失败:', error);
            throw new Error('签名生成失败: ' + error.message);
        }
    }

    /**
     * 建立WebSocket连接
     */
    async connect() {
        try {
            if (this.isConnected && this.socket) {
                return Promise.resolve();
            }

            // 检查配置
            if (!this.isConfigured()) {
                throw new Error('API配置不完整，请设置appId、apiKey和apiSecret');
            }

            const wsUrl = await this.generateAuthUrl();
            
            return new Promise((resolve, reject) => {
                try {
                    this.socket = new WebSocket(wsUrl);
                    
                    this.socket.onopen = () => {
                        console.log('✅ 讯飞星火WebSocket连接成功');
                        this.isConnected = true;
                        resolve();
                    };
                    
                    this.socket.onmessage = (event) => {
                        this.handleMessage(event.data);
                    };
                    
                    this.socket.onerror = (error) => {
                        console.error('❌ WebSocket连接错误:', error);
                        this.isConnected = false;
                        this.notifyError('连接失败', error);
                        reject(error);
                    };
                    
                    this.socket.onclose = (event) => {
                        console.log('🔌 WebSocket连接关闭:', event.code, event.reason);
                        this.isConnected = false;
                        
                        // 如果是非正常关闭，尝试重连
                        if (event.code !== 1000) {
                            this.scheduleReconnect();
                        }
                    };
                } catch (error) {
                    console.error('创建WebSocket连接失败:', error);
                    reject(error);
                }
            });
        } catch (error) {
            console.error('连接初始化失败:', error);
            throw error;
        }
    }

    /**
     * 发送消息到星火API
     */
    async sendMessage(message, options = {}) {
        try {
            if (!this.isConnected || !this.socket) {
                await this.connect();
            }

            // 添加用户消息到上下文
            this.addToConversation('user', message);

            // 构造请求参数
            const requestData = {
                header: {
                    app_id: this.config.appId,
                    uid: options.userId || 'default_user'
                },
                parameter: {
                    chat: {
                        domain: this.config.model,
                        temperature: options.temperature || 0.8,
                        max_tokens: options.max_tokens || 2048
                    }
                },
                payload: {
                    message: {
                        text: this.conversation.slice(-10) // 保留最近10轮对话
                    }
                }
            };

            // 发送消息
            this.socket.send(JSON.stringify(requestData));
            
            return Promise.resolve();
        } catch (error) {
            console.error('发送消息失败:', error);
            this.notifyError('发送失败', error);
            throw error;
        }
    }

    /**
     * 处理接收到的消息
     */
    handleMessage(data) {
        try {
            const response = JSON.parse(data);
            
            if (response.header && response.header.code !== 0) {
                const error = new Error(response.header.message || '星火API返回错误');
                error.code = response.header.code;
                this.notifyError('API错误', error);
                return;
            }

            if (response.payload && response.payload.choices) {
                const choices = response.payload.choices;
                if (choices.text && choices.text.length > 0) {
                    const content = choices.text[0].content;
                    const status = choices.status;
                    
                    // 通知消息接收回调
                    this.notifyMessage(content, status === 2); // status=2表示结束
                    
                    // 如果是完整响应，添加到上下文
                    if (status === 2) {
                        this.addToConversation('assistant', content);
                    }
                }
            }
        } catch (error) {
            console.error('解析响应消息失败:', error);
            this.notifyError('响应解析失败', error);
        }
    }

    /**
     * 添加消息到对话上下文
     */
    addToConversation(role, content) {
        this.conversation.push({ role, content });
        
        // 限制上下文长度
        if (this.conversation.length > 20) {
            this.conversation = this.conversation.slice(-16); // 保留最近16条
        }
    }

    /**
     * 通知消息回调
     */
    notifyMessage(content, isComplete) {
        this.messageCallbacks.forEach(callback => {
            try {
                callback(content, isComplete);
            } catch (error) {
                console.error('消息回调执行失败:', error);
            }
        });
    }

    /**
     * 通知错误回调
     */
    notifyError(type, error) {
        this.errorCallbacks.forEach(callback => {
            try {
                callback(type, error);
            } catch (e) {
                console.error('错误回调执行失败:', e);
            }
        });
    }

    /**
     * 安排重连
     */
    scheduleReconnect(delay = 3000) {
        setTimeout(() => {
            console.log('🔄 尝试重新连接讯飞星火...');
            this.connect().catch(error => {
                console.error('重连失败:', error);
                // 递增延迟重试
                this.scheduleReconnect(Math.min(delay * 2, 30000));
            });
        }, delay);
    }

    /**
     * 检查配置是否完整
     */
    isConfigured() {
        return !!(this.config.appId && this.config.apiKey && this.config.apiSecret);
    }

    /**
     * 设置API配置
     */
    setConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }

    /**
     * 获取配置状态
     */
    getConfigStatus() {
        return {
            hasAppId: !!this.config.appId,
            hasApiKey: !!this.config.apiKey,
            hasApiSecret: !!this.config.apiSecret,
            isConfigured: this.isConfigured()
        };
    }

    /**
     * 添加消息接收回调
     */
    onMessage(callback) {
        this.messageCallbacks.push(callback);
    }

    /**
     * 添加错误回调
     */
    onError(callback) {
        this.errorCallbacks.push(callback);
    }

    /**
     * 清理对话上下文
     */
    clearConversation() {
        this.conversation = [];
    }

    /**
     * 断开连接
     */
    disconnect() {
        if (this.socket) {
            this.socket.close(1000, '主动断开');
            this.socket = null;
        }
        this.isConnected = false;
    }

    /**
     * 销毁实例
     */
    destroy() {
        this.disconnect();
        this.messageCallbacks = [];
        this.errorCallbacks = [];
        this.conversation = [];
    }
}

// 全局实例
window.XunfeiSparkAPI = XunfeiSparkAPI;