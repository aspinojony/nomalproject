// Alpine.js 用户认证控制器

// 认证模态框控制器
function authModalController() {
    return {
        currentMode: 'login', // 'login' 或 'register'
        showPassword: false,
        
        // 登录表单数据
        loginForm: {
            identifier: '',
            password: '',
            rememberMe: false
        },
        
        // 注册表单数据
        registerForm: {
            username: '',
            displayName: '',
            email: '',
            password: '',
            confirmPassword: '',
            acceptTerms: false
        },
        
        // 加载状态
        loginLoading: false,
        registerLoading: false,
        
        // 错误信息
        loginError: '',
        registerError: '',
        
        // 初始化
        init() {
            console.log('🔐 认证模态框控制器初始化');
        },
        
        // 切换模式
        switchMode(mode) {
            this.currentMode = mode;
            this.clearErrors();
            this.resetForms();
        },
        
        // 清除错误
        clearErrors() {
            this.loginError = '';
            this.registerError = '';
        },
        
        // 重置表单
        resetForms() {
            this.loginForm = {
                identifier: '',
                password: '',
                rememberMe: false
            };
            this.registerForm = {
                username: '',
                displayName: '',
                email: '',
                password: '',
                confirmPassword: '',
                acceptTerms: false
            };
        },
        
        // 关闭模态框
        closeModal() {
            const modal = document.getElementById('authModal');
            if (modal) {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            }
            this.resetForms();
            this.clearErrors();
        },
        
        // 打开模态框
        openModal(mode = 'login') {
            this.currentMode = mode;
            const modal = document.getElementById('authModal');
            if (modal) {
                modal.classList.remove('hidden');
                modal.classList.add('flex');
            }
        },
        
        // 处理登录
        async handleLogin() {
            if (this.loginLoading) return;
            
            this.loginLoading = true;
            this.loginError = '';
            
            try {
                // 验证表单
                if (!this.loginForm.identifier || !this.loginForm.password) {
                    throw new Error('请填写完整的登录信息');
                }
                
                // 检查认证管理器是否可用
                if (window.authManager) {
                    const result = await window.authManager.login(
                        this.loginForm.identifier,
                        this.loginForm.password,
                        this.loginForm.rememberMe
                    );
                    
                    if (result.success) {
                        console.log('✅ 登录成功');
                        this.closeModal();
                        // 不需要刷新页面，依赖事件系统自动更新UI
                    } else {
                        this.loginError = result.message || '登录失败';
                    }
                } else {
                    // 模拟登录（当没有后端时）
                    console.log('🔄 模拟登录模式');
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    // 模拟成功登录并保存认证状态
                    const mockUser = {
                        id: 'mock_user_' + Date.now(),
                        username: this.loginForm.identifier,
                        displayName: this.loginForm.identifier,
                        email: this.loginForm.identifier.includes('@') ? this.loginForm.identifier : `${this.loginForm.identifier}@example.com`
                    };
                    
                    // 保存模拟认证状态到localStorage
                    const mockAuthState = {
                        accessToken: 'mock_token_' + Date.now(),
                        refreshToken: 'mock_refresh_' + Date.now(),
                        user: mockUser,
                        loginTime: new Date(),
                        tokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24小时后过期
                    };
                    
                    // 统一保存认证状态到localStorage
                    localStorage.setItem('auth_access_token', mockAuthState.accessToken);
                    localStorage.setItem('auth_refresh_token', mockAuthState.refreshToken);
                    localStorage.setItem('auth_user', JSON.stringify(mockAuthState.user));
                    localStorage.setItem('auth_login_time', mockAuthState.loginTime.toISOString());
                    localStorage.setItem('auth_token_expiry', mockAuthState.tokenExpiry.toISOString());
                    // 为了兼容性，也保存到currentUser
                    localStorage.setItem('currentUser', JSON.stringify(mockAuthState.user));
                    localStorage.setItem('authToken', mockAuthState.accessToken);
                    
                    // 如果有authManager，也更新其状态
                    if (window.authManager) {
                        window.authManager.authState = mockAuthState;
                    }
                    
                    // 触发用户登录事件，更新导航栏UI
                    const loginEvent = new CustomEvent('userLoggedIn', {
                        detail: { user: mockUser },
                        bubbles: true
                    });
                    document.dispatchEvent(loginEvent);
                    
                    this.closeModal();
                    console.log('✅ 模拟登录成功，状态已保存');
                }
            } catch (error) {
                console.error('❌ 登录错误:', error);
                this.loginError = error.message || '登录失败，请重试';
            } finally {
                this.loginLoading = false;
            }
        },
        
        // 处理注册
        async handleRegister() {
            if (this.registerLoading) return;
            
            this.registerLoading = true;
            this.registerError = '';
            
            try {
                // 验证表单
                if (!this.registerForm.username || !this.registerForm.email || !this.registerForm.password) {
                    throw new Error('请填写完整的注册信息');
                }
                
                if (this.registerForm.password !== this.registerForm.confirmPassword) {
                    throw new Error('两次输入的密码不一致');
                }
                
                if (!this.registerForm.acceptTerms) {
                    throw new Error('请同意服务条款');
                }
                
                // 检查认证管理器是否可用
                if (window.authManager) {
                    const result = await window.authManager.register({
                        username: this.registerForm.username,
                        displayName: this.registerForm.displayName || this.registerForm.username,
                        email: this.registerForm.email,
                        password: this.registerForm.password
                    });
                    
                    if (result.success) {
                        console.log('✅ 注册成功');
                        this.switchMode('login');
                        this.loginError = '';
                        alert('注册成功！请登录您的账户。');
                    } else {
                        this.registerError = result.message || '注册失败';
                    }
                } else {
                    // 模拟注册（当没有后端时）
                    console.log('🔄 模拟注册模式');
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    // 模拟成功注册
                    this.switchMode('login');
                    alert('注册成功！请登录您的账户。');
                    console.log('✅ 模拟注册成功');
                }
            } catch (error) {
                console.error('❌ 注册错误:', error);
                this.registerError = error.message || '注册失败，请重试';
            } finally {
                this.registerLoading = false;
            }
        }
    };
}

// 用户菜单控制器
function userMenuController() {
    return {
        isAuthenticated: false,
        user: null,
        showDropdown: false,
        
        // 初始化
        init() {
            console.log('👤 用户菜单控制器初始化');
            this.checkAuthStatus();
            
            // 监听认证状态变化
            if (window.authManager) {
                // 如果有认证管理器，监听其状态变化
                this.setupAuthListener();
            }
        },
        
        // 检查认证状态
        checkAuthStatus() {
            if (window.authManager) {
                this.isAuthenticated = window.authManager.isAuthenticated();
                this.user = window.authManager.getCurrentUser();
            } else {
                // 检查本地存储的登录状态
                const storedUser = localStorage.getItem('auth_user') || localStorage.getItem('currentUser');
                const accessToken = localStorage.getItem('auth_access_token') || localStorage.getItem('authToken');
                const tokenExpiry = localStorage.getItem('auth_token_expiry');
                
                if (storedUser && accessToken) {
                    try {
                        this.user = JSON.parse(storedUser);
                        
                        // 检查token是否过期
                        if (tokenExpiry) {
                            const expiryDate = new Date(tokenExpiry);
                            if (expiryDate > new Date()) {
                                this.isAuthenticated = true;
                                console.log('✅ 从localStorage恢复用户登录状态:', this.user.username);
                            } else {
                                console.log('⚠️ 认证token已过期，清除登录状态');
                                this.clearAuthState();
                            }
                        } else {
                            // 没有过期时间，假设仍然有效
                            this.isAuthenticated = true;
                            console.log('✅ 从localStorage恢复用户登录状态:', this.user.username);
                        }
                    } catch (e) {
                        console.warn('解析用户数据失败:', e);
                        this.clearAuthState();
                    }
                } else {
                    this.clearAuthState();
                }
            }
        },
        
        // 清除认证状态
        clearAuthState() {
            this.isAuthenticated = false;
            this.user = null;
            
            // 清除所有相关的localStorage项
            localStorage.removeItem('auth_access_token');
            localStorage.removeItem('auth_refresh_token');
            localStorage.removeItem('auth_user');
            localStorage.removeItem('auth_login_time');
            localStorage.removeItem('auth_token_expiry');
            localStorage.removeItem('currentUser');
            localStorage.removeItem('authToken');
        },
        
        // 设置认证监听器
        setupAuthListener() {
            // 每5秒检查一次认证状态
            setInterval(() => {
                this.checkAuthStatus();
            }, 5000);
        },
        
        // 切换下拉菜单
        toggleDropdown() {
            this.showDropdown = !this.showDropdown;
        },
        
        // 打开登录模态框
        openLogin() {
            const authController = window.authModalController || this.getAuthModalController();
            if (authController) {
                authController.openModal('login');
            } else {
                // 回退方案：直接操作DOM
                const modal = document.getElementById('authModal');
                if (modal) {
                    modal.classList.remove('hidden');
                    modal.classList.add('flex');
                }
            }
        },
        
        // 打开注册模态框
        openRegister() {
            const authController = window.authModalController || this.getAuthModalController();
            if (authController) {
                authController.openModal('register');
            } else {
                // 回退方案：直接操作DOM
                const modal = document.getElementById('authModal');
                if (modal) {
                    modal.classList.remove('hidden');
                    modal.classList.add('flex');
                }
            }
        },
        
        // 获取认证模态框控制器
        getAuthModalController() {
            const authModal = document.getElementById('authModal');
            if (authModal && authModal._x_dataStack) {
                return authModal._x_dataStack[0];
            }
            return null;
        },
        
        // 获取用户头像URL或生成默认头像
        getUserAvatar() {
            if (this.user?.avatar) {
                return this.user.avatar;
            }
            // 返回 data URL 格式的默认头像 (简单的圆形图标)
            return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTYiIGZpbGw9IiM2MzY2RjEiLz4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxMiIgcj0iNSIgZmlsbD0id2hpdGUiLz4KPHBhdGggZD0iTTYgMjYuNUM2IDIxLjgwNTYgMTAuMDI5NCAxOCAxNSAxOEMxOS45NzA2IDE4IDI0IDIxLjgwNTYgMjQgMjYuNVY2MC41QzI0IDI3LjYwNDYgMjMuMTUxNSAyOC41IDIyLjMzMzMgMjguNUg5LjY2NjY3QzguODQ4NDggMjguNSA4IDI3LjYwNDYgOCAyNi41VjI2LjVaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K';
        },
        
        // 登出
        async logout() {
            try {
                if (window.authManager) {
                    await window.authManager.logout();
                } else {
                    // 清除本地存储
                    this.clearAuthState();
                }
                
                this.showDropdown = false;
                
                // 触发用户登出事件
                const logoutEvent = new CustomEvent('userLoggedOut', {
                    bubbles: true
                });
                document.dispatchEvent(logoutEvent);
                
                console.log('✅ 用户已登出');
                
                // 刷新页面
                window.location.reload();
            } catch (error) {
                console.error('❌ 登出错误:', error);
                alert('登出失败，请重试');
            }
        },
        
        // 打开用户设置
        openSettings() {
            this.showDropdown = false;
            // TODO: 实现用户设置页面
            alert('用户设置功能开发中...');
        },
        
        // 打开用户资料
        openProfile() {
            this.showDropdown = false;
            // TODO: 实现用户资料页面  
            alert('用户资料功能开发中...');
        }
    };
}

// 全局函数，供HTML使用
window.authModalController = authModalController;
window.userMenuController = userMenuController;

// 全局打开登录/注册的函数
window.openUserLogin = function() {
    const authModal = document.getElementById('authModal');
    if (authModal && authModal._x_dataStack && authModal._x_dataStack[0]) {
        authModal._x_dataStack[0].openModal('login');
    } else {
        console.warn('Auth modal controller not available');
        // 直接操作DOM作为回退
        if (authModal) {
            authModal.classList.remove('hidden');
            authModal.classList.add('flex');
        }
    }
};

window.openUserRegister = function() {
    const authModal = document.getElementById('authModal');
    if (authModal && authModal._x_dataStack && authModal._x_dataStack[0]) {
        authModal._x_dataStack[0].openModal('register');
    } else {
        console.warn('Auth modal controller not available');
        // 直接操作DOM作为回退
        if (authModal) {
            authModal.classList.remove('hidden');
            authModal.classList.add('flex');
        }
    }
};

console.log('🔐 用户认证控制器已加载');