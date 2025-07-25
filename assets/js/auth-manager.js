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
                'http://localhost:5000' : 'http://142.171.194.104:5000',
            apiVersion: 'v1',
            tokenRefreshThreshold: 5 * 60 * 1000, // 5分钟前刷新token
            retryAttempts: 3,
            retryDelay: 2000,
            localOnlyMode: false // 是否启用本地模式
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
                this.emit('userLoggedIn', {
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
            
            // 检查是否是网络连接问题
            if (error.message.includes('Failed to fetch') || error.message.includes('ERR_NAME_NOT_RESOLVED')) {
                console.log('🔄 服务器不可用，尝试本地登录');
                
                // 启用本地模式
                this.config.localOnlyMode = true;
                
                // 在本地模式下处理登录
                return this.handleLocalLogin(identifier, password, rememberMe);
            }
            
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
            
            // 检查是否是网络连接问题
            if (error.message.includes('无法连接到服务器') ||
                error.message.includes('Failed to fetch') ||
                error.message.includes('CORS') ||
                error.name === 'TypeError') {
                
                console.log('🔄 服务器不可用，注册功能需要网络连接');
                
                this.emit('registerError', {
                    message: '注册功能需要连接到服务器，请检查网络连接后重试',
                    code: 'NETWORK_ERROR'
                });
                
                return {
                    success: false,
                    message: '注册功能需要连接到服务器，请检查网络连接后重试'
                };
            }
            
            this.emit('registerError', {
                message: error.message || '注册失败，请重试',
                error: error.message
            });
            
            return { 
                success: false, 
                message: error.message || '注册失败，请重试'
            };
        }
    }

    /**
     * 本地模式注册处理
     */
    async handleLocalRegistration(userData) {
        const { username, email, password, displayName } = userData;
        
        try {
            // 检查用户是否已存在
            const existingUsers = JSON.parse(localStorage.getItem('localUsers') || '[]');
            
            if (existingUsers.find(user => user.username === username || user.email === email)) {
                return { 
                    success: false, 
                    message: '用户名或邮箱已存在' 
                };
            }
            
            // 创建新用户
            const newUser = {
                id: 'local_' + Date.now(),
                username,
                email,
                displayName: displayName || username,
                avatar: null,
                createdAt: new Date().toISOString(),
                passwordHash: await this.hashPassword(password) // 简单哈希
            };
            
            // 保存到本地存储
            existingUsers.push(newUser);
            localStorage.setItem('localUsers', JSON.stringify(existingUsers));
            
            console.log('✅ 本地注册成功');
            
            // 发射注册成功事件
            this.emit('registerSuccess', { user: { ...newUser, passwordHash: undefined } });
            
            return { 
                success: true, 
                message: '注册成功！请使用您的用户名和密码登录。',
                user: { ...newUser, passwordHash: undefined }
            };
            
        } catch (error) {
            console.error('❌ 本地注册失败:', error);
            return { 
                success: false, 
                message: '注册失败，请重试' 
            };
        }
    }

    /**
     * 简单密码哈希（仅用于演示，生产环境应使用更安全的方法）
     */
    async hashPassword(password) {
        try {
            // 检查crypto API是否可用
            if (window.crypto && window.crypto.subtle) {
                // 使用浏览器内置的crypto API进行简单哈希
                const encoder = new TextEncoder();
                const data = encoder.encode(password + 'local_salt'); // 添加盐值
                const hashBuffer = await crypto.subtle.digest('SHA-256', data);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            } else {
                // 降级方案：简单字符串哈希
                console.warn('⚠️ crypto.subtle API不可用，使用降级哈希方案');
                return this.simpleHash(password + 'local_salt');
            }
        } catch (error) {
            console.warn('⚠️ 哈希过程出错，使用降级方案:', error);
            return this.simpleHash(password + 'local_salt');
        }
    }

    /**
     * 简单字符串哈希降级方案
     */
    simpleHash(str) {
        let hash = 0;
        if (str.length === 0) return hash.toString(16);
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 转换为32位整数
        }
        return Math.abs(hash).toString(16);
    }

    /**
     * 本地模式登录处理
     */
    async handleLocalLogin(identifier, password, rememberMe = true) {
        try {
            // 获取本地用户数据
            const existingUsers = JSON.parse(localStorage.getItem('localUsers') || '[]');
            
            // 查找用户
            const user = existingUsers.find(u => 
                u.username === identifier || u.email === identifier
            );
            
            if (!user) {
                return { 
                    success: false, 
                    message: '用户不存在' 
                };
            }
            
            // 验证密码
            const passwordHash = await this.hashPassword(password);
            if (user.passwordHash !== passwordHash) {
                return { 
                    success: false, 
                    message: '密码错误' 
                };
            }
            
            // 创建本地会话
            const sessionUser = {
                id: user.id,
                username: user.username,
                email: user.email,
                displayName: user.displayName,
                avatar: user.avatar
            };
            
            // 更新认证状态
            this.authState.isAuthenticated = true;
            this.authState.user = sessionUser;
            this.authState.accessToken = 'local_token_' + Date.now(); // 模拟token
            this.authState.refreshToken = null;
            this.authState.loginTime = new Date();
            this.authState.lastActivity = new Date();
            this.authState.tokenExpiry = null; // 本地模式无需过期时间
            
            // 保存到本地存储
            if (rememberMe) {
                await this.saveAuthState();
            }
            
            console.log('✅ 本地登录成功');
            
            // 触发登录成功事件
            this.emit('userLoggedIn', {
                user: sessionUser,
                timestamp: this.authState.loginTime
            });
            
            return { 
                success: true, 
                message: '登录成功',
                user: sessionUser
            };
            
        } catch (error) {
            console.error('❌ 本地登录失败:', error);
            return { 
                success: false, 
                message: '登录失败，请重试' 
            };
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
            // 安全保存令牌
            if (this.authState.accessToken) {
                localStorage.setItem('auth_access_token', this.authState.accessToken);
            }
            if (this.authState.refreshToken) {
                localStorage.setItem('auth_refresh_token', this.authState.refreshToken);
            }
            
            // 保存用户信息
            if (this.authState.user) {
                localStorage.setItem('auth_user', JSON.stringify(this.authState.user));
            }
            
            // 安全保存日期，确保日期有效
            if (this.authState.loginTime && this.authState.loginTime instanceof Date && !isNaN(this.authState.loginTime)) {
                localStorage.setItem('auth_login_time', this.authState.loginTime.toISOString());
            } else if (this.authState.loginTime) {
                // 如果不是有效日期，使用当前时间
                localStorage.setItem('auth_login_time', new Date().toISOString());
            }
            
            if (this.authState.tokenExpiry && this.authState.tokenExpiry instanceof Date && !isNaN(this.authState.tokenExpiry)) {
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
                
                let data;
                // 先获取响应文本，然后尝试解析为JSON
                const responseText = await response.text();
                
                try {
                    data = JSON.parse(responseText);
                } catch (jsonError) {
                    // 如果不是JSON响应，使用文本内容
                    data = {
                        success: false,
                        message: responseText || `HTTP ${response.status}: ${response.statusText}`,
                        code: 'INVALID_RESPONSE'
                    };
                }

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
                    // 对于429错误，提供更友好的提示
                    if (response.status === 429) {
                        throw new Error(data.message || '请求过于频繁，请稍后再试');
                    }
                    throw new Error(data.message || `HTTP ${response.status}`);
                }

                return data;
            } catch (error) {
                console.warn(`API调用失败 (${attempt + 1}/${this.config.retryAttempts}):`, error.message);
                
                // 检查是否为CORS或网络连接错误
                if (error.name === 'TypeError' && error.message.includes('fetch')) {
                    console.warn('检测到网络连接错误，可能是服务器未启动或CORS问题');
                    
                    // 如果是第一次尝试失败，记录详细信息
                    if (attempt === 0) {
                        console.error(`网络请求失败: ${url}`, {
                            error: error.message,
                            endpoint,
                            options: finalOptions
                        });
                    }
                }
                
                attempt++;
                if (attempt >= this.config.retryAttempts) {
                    // 最后一次尝试失败，提供更友好的错误信息
                    if (error.name === 'TypeError' && error.message.includes('fetch')) {
                        throw new Error('无法连接到服务器，请检查网络连接或联系管理员');
                    }
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
        // 内部事件系统
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`❌ 事件处理器错误 (${event}):`, error);
                }
            });
        }
        
        // 同时触发DOM事件，供页面级别的监听器使用
        try {
            const customEvent = new CustomEvent(event, { 
                detail: data,
                bubbles: true 
            });
            document.dispatchEvent(customEvent);
        } catch (error) {
            console.error(`❌ DOM事件触发错误 (${event}):`, error);
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