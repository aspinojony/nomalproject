/**
 * AI API管理器
 * 支持讯飞星火和其他AI服务的统一管理
 */
class AIAPIManager {
    constructor() {
        this.currentProvider = 'xunfei'; // 默认使用讯飞星火
        this.providers = {};
        this.isInitialized = false;
        
        // 初始化讯飞星火API
        this.initXunfeiSpark();
    }

    /**
     * 初始化讯飞星火API
     */
    initXunfeiSpark() {
        // 从本地存储获取API配置
        const config = this.loadAPIConfig('xunfei');
        
        this.providers.xunfei = new XunfeiSparkAPI(config);
        
        // 设置回调
        this.providers.xunfei.onMessage((content, isComplete) => {
            this.handleMessage('xunfei', content, isComplete);
        });
        
        this.providers.xunfei.onError((type, error) => {
            this.handleError('xunfei', type, error);
        });
    }

    /**
     * 加载API配置
     */
    loadAPIConfig(provider) {
        try {
            const saved = localStorage.getItem(`ai_api_config_${provider}`);
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            console.warn('加载API配置失败:', error);
            return {};
        }
    }

    /**
     * 保存API配置
     */
    saveAPIConfig(provider, config) {
        try {
            // 过滤敏感信息显示
            const safeConfig = { ...config };
            if (safeConfig.apiSecret) {
                safeConfig.apiSecret = safeConfig.apiSecret.replace(/.(?=.{4})/g, '*');
            }
            
            localStorage.setItem(`ai_api_config_${provider}`, JSON.stringify(config));
            console.log('✅ API配置已保存:', provider, safeConfig);
            return true;
        } catch (error) {
            console.error('保存API配置失败:', error);
            return false;
        }
    }

    /**
     * 设置API配置
     */
    async setAPIConfig(provider, config) {
        if (!this.providers[provider]) {
            throw new Error(`不支持的AI服务提供商: ${provider}`);
        }

        // 验证配置
        if (provider === 'xunfei') {
            if (!config.appId || !config.apiKey || !config.apiSecret) {
                throw new Error('讯飞星火API配置不完整，需要appId、apiKey和apiSecret');
            }
        }

        // 更新配置
        this.providers[provider].setConfig(config);
        
        // 保存到本地存储
        this.saveAPIConfig(provider, config);
        
        // 测试连接
        try {
            await this.testConnection(provider);
            return { success: true, message: 'API配置设置成功' };
        } catch (error) {
            return { success: false, message: `配置测试失败: ${error.message}` };
        }
    }

    /**
     * 测试连接
     */
    async testConnection(provider = this.currentProvider) {
        const api = this.providers[provider];
        if (!api) {
            throw new Error(`API提供商不存在: ${provider}`);
        }

        if (provider === 'xunfei') {
            if (!api.isConfigured()) {
                throw new Error('API配置不完整');
            }
            
            // 尝试连接
            await api.connect();
            return true;
        }

        throw new Error(`不支持的提供商: ${provider}`);
    }

    /**
     * 发送消息
     */
    async sendMessage(message, options = {}) {
        const provider = options.provider || this.currentProvider;
        const api = this.providers[provider];
        
        if (!api) {
            throw new Error(`API提供商不存在: ${provider}`);
        }

        // 检查配置
        if (provider === 'xunfei' && !api.isConfigured()) {
            throw new Error('请先配置讯飞星火API密钥');
        }

        return api.sendMessage(message, options);
    }

    /**
     * 获取配置状态
     */
    getConfigStatus(provider = null) {
        if (provider) {
            const api = this.providers[provider];
            return api ? api.getConfigStatus() : { isConfigured: false };
        }

        // 返回所有提供商的状态
        const status = {};
        for (const [name, api] of Object.entries(this.providers)) {
            status[name] = api.getConfigStatus();
        }
        return status;
    }

    /**
     * 切换AI服务提供商
     */
    switchProvider(provider) {
        if (!this.providers[provider]) {
            throw new Error(`不支持的AI服务提供商: ${provider}`);
        }
        
        this.currentProvider = provider;
        console.log(`🔄 已切换到AI服务: ${provider}`);
    }

    /**
     * 获取当前提供商
     */
    getCurrentProvider() {
        return this.currentProvider;
    }

    /**
     * 获取支持的提供商列表
     */
    getSupportedProviders() {
        return Object.keys(this.providers);
    }

    /**
     * 处理消息回调
     */
    handleMessage(provider, content, isComplete) {
        // 广播消息事件
        const event = new CustomEvent('ai-message', {
            detail: { provider, content, isComplete }
        });
        window.dispatchEvent(event);
    }

    /**
     * 处理错误回调
     */
    handleError(provider, type, error) {
        console.error(`AI API错误 [${provider}]:`, type, error);
        
        // 广播错误事件
        const event = new CustomEvent('ai-error', {
            detail: { provider, type, error }
        });
        window.dispatchEvent(event);
    }

    /**
     * 清理所有对话上下文
     */
    clearAllConversations() {
        for (const api of Object.values(this.providers)) {
            if (typeof api.clearConversation === 'function') {
                api.clearConversation();
            }
        }
    }

    /**
     * 断开所有连接
     */
    disconnectAll() {
        for (const api of Object.values(this.providers)) {
            if (typeof api.disconnect === 'function') {
                api.disconnect();
            }
        }
    }

    /**
     * 销毁管理器
     */
    destroy() {
        for (const api of Object.values(this.providers)) {
            if (typeof api.destroy === 'function') {
                api.destroy();
            }
        }
        this.providers = {};
    }
}

// 全局实例
window.aiAPIManager = null;

// 初始化AI API管理器
document.addEventListener('DOMContentLoaded', function() {
    if (!window.aiAPIManager) {
        window.aiAPIManager = new AIAPIManager();
        console.log('✅ AI API管理器初始化完成');
    }
});

// 导出类
window.AIAPIManager = AIAPIManager;