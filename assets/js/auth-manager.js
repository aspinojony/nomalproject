/**
 * 统一用户认证管理器
 * 提供用户登录、注册、认证状态管理等功能
 * 集成现有的云同步认证系统
 */
class AuthManager {
    constructor() {
        // 认证配置
        this.config = {
            serverUrl: window.location.hostname === 'localhost' ? 
                'http://localhost:5000' : 'https://your-server-domain.com',
            apiVersion: 'v1',
            tokenRefreshThreshold: 5 * 60 * 1000, // 5分钟前刷新token
            retryAttempts: 3,
            retryDelay: 2000
        };

        // 认证状态
        this.authState = {
            isAuthenticated: false,
            user: null,
            accessToken: null,
            refreshToken: null,
            tokenExpiry: null,
            loginTime: null,
            lastActivity: null,
            deviceId: this.getOrCreateDeviceId()
        };

        // 事件监听器列表
        this.eventListeners = new Map();

        // 自动刷新token的定时器
        this.refreshTimer = null;

        // 初始化
        this.initialize();
    }

    /**
     * 初始化认证管理器
     */
    async initialize() {
        console.log('🔐 初始化认证管理器...');

        // 从本地存储恢复认证状态
        await this.restoreAuthState();

        // 验证当前认证状态
        if (this.authState.accessToken) {
            await this.verifyAuthState();
        }

        // 设置自动token刷新
        this.setupTokenRefresh();

        // 监听页面活动
        this.setupActivityListeners();

        console.log('✅ 认证管理器初始化完成');
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
     * 从本地存储恢复认证状态
     */
    async restoreAuthState() {
        try {
            const accessToken = localStorage.getItem('auth_access_token');
            const refreshToken = localStorage.getItem('auth_refresh_token');
            const userStr = localStorage.getItem('auth_user');
            const loginTime = localStorage.getItem('auth_login_time');
            const tokenExpiry = localStorage.getItem('auth_token_expiry');

            if (accessToken && refreshToken && userStr) {
                this.authState.accessToken = accessToken;
                this.authState.refreshToken = refreshToken;
                this.authState.user = JSON.parse(userStr);
                this.authState.loginTime = loginTime ? new Date(loginTime) : null;
                this.authState.tokenExpiry = tokenExpiry ? new Date(tokenExpiry) : null;
                this.authState.lastActivity = new Date();

                console.log(`🔐 恢复用户认证状态: ${this.authState.user.username}`);
            }
        } catch (error) {
            console.error('❌ 恢复认证状态失败:', error);
            await this.clearAuthState();
        }
    }

    /**
     * 验证当前认证状态
     */
    async verifyAuthState() {
        if (!this.authState.accessToken) {
            return false;
        }

        try {
            const response = await this.apiCall('/api/auth/profile', {
                method: 'GET'
            });

            if (response.success) {
                this.authState.user = response.data.user;
                this.authState.isAuthenticated = true;
                this.authState.lastActivity = new Date();
                
                // 触发认证状态变更事件
                this.emit('authStateChanged', {
                    isAuthenticated: true,
                    user: this.authState.user
                });

                return true;
            } else {
                // token无效，尝试刷新
                return await this.refreshAccessToken();
            }
        } catch (error) {
            console.error('❌ 认证状态验证失败:', error);
            await this.clearAuthState();
            return false;
        }
    }

    /**
     * 用户登录
     */
    async login(identifier, password, rememberMe = true) {
        try {
            const response = await this.apiCall('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({
                    identifier,
                    password,
                    deviceId: this.authState.deviceId,
                    deviceInfo: {
                        userAgent: navigator.userAgent,
                        platform: navigator.platform,
                        timestamp: new Date().toISOString()
                    }
                })
            });

            if (response.success) {
                const { user, accessToken, refreshToken, expiresIn } = response.data;
                
                // 更新认证状态
                this.authState.isAuthenticated = true;
                this.authState.user = user;
                this.authState.accessToken = accessToken;
                this.authState.refreshToken = refreshToken;
                this.authState.loginTime = new Date();
                this.authState.lastActivity = new Date();
                this.authState.tokenExpiry = new Date(Date.now() + (expiresIn * 1000));

                // 保存到本地存储
                if (rememberMe) {
                    await this.saveAuthState();
                }

                // 设置自动token刷新
                this.setupTokenRefresh();

                // 触发登录成功事件
                this.emit('loginSuccess', {
                    user: this.authState.user,
                    timestamp: this.authState.loginTime
                });

                console.log(`✅ 用户登录成功: ${user.username}`);
                return { success: true, user };
            } else {
                this.emit('loginError', {
                    message: response.message,
                    code: response.code
                });
                return { success: false, message: response.message };
            }
        } catch (error) {
            console.error('❌ 登录失败:', error);
            this.emit('loginError', {
                message: '登录失败，请检查网络连接',
                error: error.message
            });
            return { success: false, message: '登录失败，请检查网络连接' };
        }
    }

    /**
     * 用户注册
     */
    async register(userData) {
        const { username, email, password, displayName, acceptTerms } = userData;
        
        try {
            const response = await this.apiCall('/api/auth/register', {
                method: 'POST',
                body: JSON.stringify({
                    username,
                    email,
                    password,
                    displayName,
                    acceptTerms,
                    deviceId: this.authState.deviceId,
                    deviceInfo: {
                        userAgent: navigator.userAgent,
                        platform: navigator.platform,
                        timestamp: new Date().toISOString()
                    }
                })
            });

            if (response.success) {
                const { user, accessToken, refreshToken, expiresIn } = response.data;
                
                // 更新认证状态
                this.authState.isAuthenticated = true;
                this.authState.user = user;
                this.authState.accessToken = accessToken;
                this.authState.refreshToken = refreshToken;
                this.authState.loginTime = new Date();
                this.authState.lastActivity = new Date();
                this.authState.tokenExpiry = new Date(Date.now() + (expiresIn * 1000));

                // 保存到本地存储
                await this.saveAuthState();

                // 设置自动token刷新
                this.setupTokenRefresh();

                // 触发注册成功事件
                this.emit('registerSuccess', {
                    user: this.authState.user,
                    timestamp: this.authState.loginTime
                });

                console.log(`✅ 用户注册成功: ${user.username}`);
                return { success: true, user };
            } else {
                this.emit('registerError', {
                    message: response.message,
                    errors: response.errors
                });
                return { 
                    success: false, 
                    message: response.message, 
                    errors: response.errors 
                };
            }
        } catch (error) {
            console.error('❌ 注册失败:', error);
            this.emit('registerError', {
                message: '注册失败，请检查网络连接',
                error: error.message
            });
            return { success: false, message: '注册失败，请检查网络连接' };
        }
    }

    /**
     * 用户登出
     */
    async logout(clearAllDevices = false) {
        try {
            // 通知服务器登出
            if (this.authState.accessToken) {
                await this.apiCall('/api/auth/logout', {
                    method: 'POST',
                    body: JSON.stringify({
                        clearAllDevices,
                        deviceId: this.authState.deviceId
                    })
                });
            }
        } catch (error) {
            console.warn('⚠️ 服务器登出请求失败:', error);
        }

        // 清除本地认证状态
        await this.clearAuthState();

        // 清除token刷新定时器
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = null;
        }

        // 触发登出事件
        this.emit('logout', {
            timestamp: new Date(),
            clearAllDevices
        });

        console.log('✅ 用户已登出');
        return { success: true };
    }

    /**
     * 刷新访问token
     */
    async refreshAccessToken() {
        if (!this.authState.refreshToken) {
            await this.clearAuthState();
            return false;
        }

        try {
            const response = await this.apiCall('/api/auth/refresh', {
                method: 'POST',
                body: JSON.stringify({
                    refreshToken: this.authState.refreshToken,
                    deviceId: this.authState.deviceId
                }),
                skipAuth: true
            });

            if (response.success) {
                const { accessToken, refreshToken, expiresIn } = response.data;
                
                this.authState.accessToken = accessToken;
                this.authState.refreshToken = refreshToken;
                this.authState.tokenExpiry = new Date(Date.now() + (expiresIn * 1000));
                this.authState.lastActivity = new Date();

                // 更新本地存储
                await this.saveAuthState();

                // 重新设置token刷新定时器
                this.setupTokenRefresh();

                // 触发token刷新事件
                this.emit('tokenRefreshed', {
                    timestamp: new Date()
                });

                console.log('✅ Token刷新成功');
                return true;
            } else {
                console.error('❌ Token刷新失败:', response.message);
                await this.clearAuthState();
                return false;
            }
        } catch (error) {
            console.error('❌ Token刷新错误:', error);
            await this.clearAuthState();
            return false;
        }
    }

    /**
     * 保存认证状态到本地存储
     */
    async saveAuthState() {
        try {
            localStorage.setItem('auth_access_token', this.authState.accessToken);
            localStorage.setItem('auth_refresh_token', this.authState.refreshToken);
            localStorage.setItem('auth_user', JSON.stringify(this.authState.user));
            localStorage.setItem('auth_login_time', this.authState.loginTime.toISOString());
            
            if (this.authState.tokenExpiry) {
                localStorage.setItem('auth_token_expiry', this.authState.tokenExpiry.toISOString());
            }
        } catch (error) {
            console.error('❌ 保存认证状态失败:', error);
        }
    }

    /**
     * 清除认证状态
     */
    async clearAuthState() {
        this.authState = {
            isAuthenticated: false,
            user: null,
            accessToken: null,
            refreshToken: null,
            tokenExpiry: null,
            loginTime: null,
            lastActivity: null,
            deviceId: this.authState.deviceId // 保留设备ID
        };

        // 清除本地存储
        localStorage.removeItem('auth_access_token');
        localStorage.removeItem('auth_refresh_token');
        localStorage.removeItem('auth_user');
        localStorage.removeItem('auth_login_time');
        localStorage.removeItem('auth_token_expiry');

        // 触发认证状态变更事件
        this.emit('authStateChanged', {
            isAuthenticated: false,
            user: null
        });
    }

    /**
     * 设置自动token刷新
     */
    setupTokenRefresh() {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
        }

        if (!this.authState.tokenExpiry) {
            return;
        }

        const timeUntilRefresh = this.authState.tokenExpiry.getTime() - Date.now() - this.config.tokenRefreshThreshold;
        
        if (timeUntilRefresh > 0) {
            this.refreshTimer = setTimeout(async () => {
                await this.refreshAccessToken();
            }, timeUntilRefresh);

            console.log(`⏰ Token将在 ${Math.round(timeUntilRefresh / 1000)}秒 后自动刷新`);
        } else {
            // token即将过期，立即刷新
            setTimeout(() => this.refreshAccessToken(), 1000);
        }
    }

    /**
     * 设置用户活动监听器
     */
    setupActivityListeners() {
        const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        
        const updateActivity = () => {
            if (this.authState.isAuthenticated) {
                this.authState.lastActivity = new Date();
            }
        };

        activityEvents.forEach(event => {
            document.addEventListener(event, updateActivity, { passive: true });
        });

        // 页面可见性变化监听
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.authState.isAuthenticated) {
                this.authState.lastActivity = new Date();
                
                // 页面重新激活时验证认证状态
                this.verifyAuthState();
            }
        });
    }

    /**
     * API调用封装
     */
    async apiCall(endpoint, options = {}) {
        const url = `${this.config.serverUrl}${endpoint}`;
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': `KaoyanPlatform/1.0 (${this.authState.deviceId})`
            }
        };

        // 添加认证头
        if (this.authState.accessToken && !options.skipAuth) {
            defaultOptions.headers.Authorization = `Bearer ${this.authState.accessToken}`;
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
        while (attempt < this.config.retryAttempts) {
            try {
                const response = await fetch(url, finalOptions);
                const data = await response.json();

                if (response.status === 401 && !options.skipAuth) {
                    // 尝试刷新token
                    if (await this.refreshAccessToken()) {
                        // 重新设置认证头
                        finalOptions.headers.Authorization = `Bearer ${this.authState.accessToken}`;
                        continue; // 重试
                    } else {
                        // 刷新失败，需要重新登录
                        this.emit('authRequired', {
                            reason: 'token_expired',
                            message: '认证已过期，请重新登录'
                        });
                        throw new Error('认证失败，请重新登录');
                    }
                }

                if (!response.ok) {
                    throw new Error(data.message || `HTTP ${response.status}`);
                }

                return data;
            } catch (error) {
                attempt++;
                if (attempt >= this.config.retryAttempts) {
                    throw error;
                }
                
                // 等待后重试
                await new Promise(resolve => 
                    setTimeout(resolve, this.config.retryDelay * attempt)
                );
            }
        }
    }

    /**
     * 获取当前认证状态
     */
    getAuthState() {
        return {
            isAuthenticated: this.authState.isAuthenticated,
            user: this.authState.user,
            loginTime: this.authState.loginTime,
            lastActivity: this.authState.lastActivity,
            deviceId: this.authState.deviceId,
            tokenExpiry: this.authState.tokenExpiry
        };
    }

    /**
     * 检查是否已认证
     */
    isAuthenticated() {
        return this.authState.isAuthenticated;
    }

    /**
     * 获取当前用户信息
     */
    getCurrentUser() {
        return this.authState.user;
    }

    /**
     * 获取认证token
     */
    getAccessToken() {
        return this.authState.accessToken;
    }

    /**
     * 检查token是否即将过期
     */
    isTokenExpiringSoon(threshold = 5 * 60 * 1000) {
        if (!this.authState.tokenExpiry) {
            return false;
        }
        return (this.authState.tokenExpiry.getTime() - Date.now()) < threshold;
    }

    /**
     * 事件监听器管理
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
                    console.error(`❌ 事件处理器错误 (${event}):`, error);
                }
            });
        }
    }

    /**
     * 更新用户信息
     */
    async updateProfile(updates) {
        try {
            const response = await this.apiCall('/api/auth/profile', {
                method: 'PATCH',
                body: JSON.stringify(updates)
            });

            if (response.success) {
                this.authState.user = { ...this.authState.user, ...response.data.user };
                await this.saveAuthState();
                
                this.emit('profileUpdated', {
                    user: this.authState.user,
                    changes: updates
                });

                return { success: true, user: this.authState.user };
            } else {
                return { success: false, message: response.message };
            }
        } catch (error) {
            console.error('❌ 更新用户信息失败:', error);
            return { success: false, message: '更新失败，请检查网络连接' };
        }
    }

    /**
     * 修改密码
     */
    async changePassword(currentPassword, newPassword) {
        try {
            const response = await this.apiCall('/api/auth/change-password', {
                method: 'POST',
                body: JSON.stringify({
                    currentPassword,
                    newPassword
                })
            });

            if (response.success) {
                this.emit('passwordChanged', {
                    timestamp: new Date()
                });
                return { success: true };
            } else {
                return { success: false, message: response.message };
            }
        } catch (error) {
            console.error('❌ 修改密码失败:', error);
            return { success: false, message: '修改失败，请检查网络连接' };
        }
    }

    /**
     * 销毁认证管理器
     */
    destroy() {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = null;
        }
        
        this.eventListeners.clear();
        console.log('🔐 认证管理器已销毁');
    }
}

// 创建全局实例
window.authManager = new AuthManager();

// 与现有云同步系统集成
if (window.aiConversationStorage && window.aiConversationStorage.auth) {
    // 同步认证状态到云同步存储
    window.authManager.on('authStateChanged', (data) => {
        if (window.aiConversationStorage) {
            window.aiConversationStorage.auth.isLoggedIn = data.isAuthenticated;
            window.aiConversationStorage.auth.user = data.user;
        }
    });

    // 从云同步存储获取现有认证状态
    const cloudAuth = window.aiConversationStorage.auth;
    if (cloudAuth.isLoggedIn && cloudAuth.user) {
        console.log('🔄 从云同步存储同步认证状态');
    }
}

console.log('✅ 统一认证管理器加载完成');