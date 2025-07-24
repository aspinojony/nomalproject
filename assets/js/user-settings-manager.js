/**
 * 用户设置和偏好管理器
 * 提供统一的用户设置管理，支持云同步和本地存储
 * 管理主题、学习偏好、界面设置等
 */
class UserSettingsManager {
    constructor() {
        // 设置配置
        this.config = {
            storageKey: 'user_settings',
            localStoragePrefix: 'setting_',
            preferencePrefix: 'preference_',
            syncEnabled: true,
            autoSave: true,
            validateSettings: true,
            settingsVersion: '1.0'
        };

        // 默认设置
        this.defaultSettings = {
            // 界面设置
            theme: {
                mode: 'light', // light, dark, auto
                primaryColor: '#007bff',
                fontSize: 'medium', // small, medium, large
                fontFamily: 'system',
                compactMode: false,
                animationsEnabled: true
            },

            // 学习偏好
            learning: {
                autoPlay: true,
                playbackSpeed: 1.0,
                autoMarkComplete: true,
                showProgressIndicator: true,
                reminderEnabled: true,
                dailyGoal: 60, // 分钟
                preferredDifficulty: 'medium',
                studyMode: 'focused', // focused, relaxed
                breakReminder: true,
                breakInterval: 25 // 分钟
            },

            // 通知设置
            notifications: {
                enabled: true,
                sound: true,
                desktop: true,
                studyReminders: true,
                goalAchievements: true,
                newContent: true,
                syncUpdates: false,
                quietHours: {
                    enabled: false,
                    start: '22:00',
                    end: '08:00'
                }
            },

            // 隐私设置
            privacy: {
                shareProgress: false,
                anonymousAnalytics: true,
                dataCollection: 'minimal', // minimal, standard, full
                rememberLogin: true,
                autoSync: true,
                localOnly: false
            },

            // 辅助功能
            accessibility: {
                highContrast: false,
                largeText: false,
                reduceMotion: false,
                screenReader: false,
                keyboardNavigation: false,
                focusIndicator: true
            },

            // 高级设置
            advanced: {
                debugMode: false,
                experimentalFeatures: false,
                cacheSize: '100MB',
                autoBackup: true,
                backupFrequency: 'daily', // hourly, daily, weekly
                conflictResolution: 'ask', // ask, local, remote, merge
                syncStrategy: 'auto' // auto, manual, scheduled
            },

            // 语言和区域
            locale: {
                language: 'zh-CN',
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                dateFormat: 'YYYY-MM-DD',
                timeFormat: '24h',
                numberFormat: 'default'
            }
        };

        // 当前设置
        this.settings = {};

        // 设置观察器
        this.observers = new Map();

        // 验证器
        this.validators = new Map();

        // 事件监听器
        this.eventListeners = new Map();

        // 同步状态
        this.syncInProgress = false;
        this.pendingChanges = new Map();

        // 初始化
        this.initialize();
    }

    /**
     * 初始化设置管理器
     */
    async initialize() {
        console.log('⚙️ 初始化用户设置和偏好管理器...');

        // 注册验证器
        this.registerValidators();

        // 加载设置
        await this.loadSettings();

        // 应用设置
        await this.applySettings();

        // 设置观察器
        this.setupObservers();

        // 监听认证状态变化
        this.setupAuthListener();

        // 设置自动保存
        if (this.config.autoSave) {
            this.setupAutoSave();
        }

        console.log('✅ 用户设置和偏好管理器初始化完成');
    }

    /**
     * 注册验证器
     */
    registerValidators() {
        // 主题验证器
        this.validators.set('theme.mode', (value) => {
            return ['light', 'dark', 'auto'].includes(value);
        });

        this.validators.set('theme.fontSize', (value) => {
            return ['small', 'medium', 'large'].includes(value);
        });

        // 学习设置验证器
        this.validators.set('learning.playbackSpeed', (value) => {
            return typeof value === 'number' && value >= 0.5 && value <= 2.0;
        });

        this.validators.set('learning.dailyGoal', (value) => {
            return typeof value === 'number' && value >= 15 && value <= 480;
        });

        // 隐私设置验证器
        this.validators.set('privacy.dataCollection', (value) => {
            return ['minimal', 'standard', 'full'].includes(value);
        });

        // 语言验证器
        this.validators.set('locale.language', (value) => {
            const supportedLanguages = ['zh-CN', 'zh-TW', 'en-US'];
            return supportedLanguages.includes(value);
        });
    }

    /**
     * 加载设置
     */
    async loadSettings() {
        try {
            // 从本地存储加载
            const savedSettings = await this.loadFromLocalStorage();
            
            // 从云端同步（如果已登录）
            let cloudSettings = {};
            if (window.authManager?.isAuthenticated() && this.config.syncEnabled) {
                cloudSettings = await this.loadFromCloud();
            }

            // 合并设置（云端优先）
            this.settings = this.mergeSettings([
                this.defaultSettings,
                savedSettings,
                cloudSettings
            ]);

            // 验证设置
            if (this.config.validateSettings) {
                this.settings = this.validateAllSettings(this.settings);
            }

            // 迁移旧版本设置
            this.settings = this.migrateSettings(this.settings);

            console.log('✅ 用户设置加载完成');

        } catch (error) {
            console.error('❌ 加载用户设置失败:', error);
            this.settings = { ...this.defaultSettings };
        }
    }

    /**
     * 从本地存储加载设置
     */
    async loadFromLocalStorage() {
        try {
            // 加载统一设置
            const settingsStr = localStorage.getItem(this.config.storageKey);
            let settings = settingsStr ? JSON.parse(settingsStr) : {};

            // 加载分散的设置
            const scatteredSettings = this.loadScatteredSettings();
            settings = this.mergeSettings([settings, scatteredSettings]);

            return settings;
        } catch (error) {
            console.error('❌ 从本地存储加载设置失败:', error);
            return {};
        }
    }

    /**
     * 加载分散的设置
     */
    loadScatteredSettings() {
        const settings = {};

        // 从现有的主题设置加载
        const theme = localStorage.getItem('modern-theme');
        const userThemeSet = localStorage.getItem('user-theme-set');
        
        if (theme) {
            if (!settings.theme) settings.theme = {};
            settings.theme.mode = theme;
        }

        // 从localStorage中查找所有设置相关的键
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            
            if (key.startsWith(this.config.localStoragePrefix)) {
                const settingKey = key.substring(this.config.localStoragePrefix.length);
                const value = this.parseStorageValue(localStorage.getItem(key));
                this.setNestedValue(settings, settingKey, value);
            }
            
            if (key.startsWith(this.config.preferencePrefix)) {
                const prefKey = key.substring(this.config.preferencePrefix.length);
                const value = this.parseStorageValue(localStorage.getItem(key));
                this.setNestedValue(settings, prefKey, value);
            }
        }

        return settings;
    }

    /**
     * 从云端加载设置
     */
    async loadFromCloud() {
        if (!window.authManager?.isAuthenticated()) {
            return {};
        }

        try {
            // 这里集成云端API调用
            console.log('☁️ 从云端加载用户设置...');
            
            // 暂时返回空对象，实际应该调用API
            return {};
        } catch (error) {
            console.error('❌ 从云端加载设置失败:', error);
            return {};
        }
    }

    /**
     * 保存设置
     */
    async saveSettings(settings = this.settings) {
        try {
            if (this.syncInProgress) {
                return;
            }

            // 验证设置
            if (this.config.validateSettings) {
                const validatedSettings = this.validateAllSettings(settings);
                if (!validatedSettings) {
                    throw new Error('设置验证失败');
                }
                settings = validatedSettings;
            }

            // 保存到本地存储
            await this.saveToLocalStorage(settings);

            // 同步到云端
            if (window.authManager?.isAuthenticated() && this.config.syncEnabled) {
                await this.syncToCloud(settings);
            }

            // 更新当前设置
            this.settings = settings;

            // 触发设置变更事件
            this.emit('settingsChanged', { settings });

            console.log('✅ 用户设置保存完成');

        } catch (error) {
            console.error('❌ 保存用户设置失败:', error);
            throw error;
        }
    }

    /**
     * 保存到本地存储
     */
    async saveToLocalStorage(settings) {
        try {
            // 保存统一设置
            localStorage.setItem(this.config.storageKey, JSON.stringify({
                ...settings,
                version: this.config.settingsVersion,
                lastUpdated: new Date().toISOString()
            }));

            // 保存分散的设置以兼容现有系统
            this.saveScatteredSettings(settings);

        } catch (error) {
            console.error('❌ 保存到本地存储失败:', error);
            throw error;
        }
    }

    /**
     * 保存分散的设置
     */
    saveScatteredSettings(settings) {
        // 保存主题设置
        if (settings.theme?.mode) {
            localStorage.setItem('modern-theme', settings.theme.mode);
            localStorage.setItem('user-theme-set', 'true');
        }

        // 可以添加其他分散设置的保存逻辑
    }

    /**
     * 同步到云端
     */
    async syncToCloud(settings) {
        if (!window.authManager?.isAuthenticated()) {
            return;
        }

        try {
            console.log('☁️ 同步用户设置到云端...');
            
            // 这里应该集成实际的云端同步逻辑
            if (window.realtimeSyncManager) {
                // 使用实时同步管理器
                window.realtimeSyncManager.queueDataChange({
                    type: 'settings',
                    action: 'update',
                    data: settings,
                    timestamp: new Date().toISOString()
                });
            }

        } catch (error) {
            console.error('❌ 同步设置到云端失败:', error);
        }
    }

    /**
     * 应用设置
     */
    async applySettings(settings = this.settings) {
        try {
            // 应用主题设置
            await this.applyThemeSettings(settings.theme);

            // 应用学习设置
            await this.applyLearningSettings(settings.learning);

            // 应用通知设置
            await this.applyNotificationSettings(settings.notifications);

            // 应用辅助功能设置
            await this.applyAccessibilitySettings(settings.accessibility);

            // 应用语言设置
            await this.applyLocaleSettings(settings.locale);

            console.log('✅ 设置应用完成');

        } catch (error) {
            console.error('❌ 应用设置失败:', error);
        }
    }

    /**
     * 应用主题设置
     */
    async applyThemeSettings(themeSettings) {
        if (!themeSettings) return;

        try {
            // 应用主题模式
            if (themeSettings.mode && window.themeManager) {
                await window.themeManager.setTheme(themeSettings.mode);
            }

            // 应用字体大小
            if (themeSettings.fontSize) {
                document.documentElement.style.setProperty('--font-size-scale', 
                    this.getFontSizeScale(themeSettings.fontSize));
            }

            // 应用主色调
            if (themeSettings.primaryColor) {
                document.documentElement.style.setProperty('--primary-color', 
                    themeSettings.primaryColor);
            }

            // 应用字体族
            if (themeSettings.fontFamily) {
                document.documentElement.style.setProperty('--font-family', 
                    this.getFontFamily(themeSettings.fontFamily));
            }

            // 应用紧凑模式
            if (themeSettings.compactMode !== undefined) {
                document.body.classList.toggle('compact-mode', themeSettings.compactMode);
            }

            // 应用动画设置
            if (themeSettings.animationsEnabled !== undefined) {
                document.body.classList.toggle('no-animations', !themeSettings.animationsEnabled);
            }

        } catch (error) {
            console.error('❌ 应用主题设置失败:', error);
        }
    }

    /**
     * 应用学习设置
     */
    async applyLearningSettings(learningSettings) {
        if (!learningSettings) return;

        // 通知相关组件学习设置变更
        this.emit('learningSettingsChanged', { settings: learningSettings });
    }

    /**
     * 应用通知设置
     */
    async applyNotificationSettings(notificationSettings) {
        if (!notificationSettings) return;

        try {
            // 请求通知权限
            if (notificationSettings.enabled && notificationSettings.desktop) {
                if ('Notification' in window && Notification.permission === 'default') {
                    await Notification.requestPermission();
                }
            }

            // 通知组件设置变更
            this.emit('notificationSettingsChanged', { settings: notificationSettings });

        } catch (error) {
            console.error('❌ 应用通知设置失败:', error);
        }
    }

    /**
     * 应用辅助功能设置
     */
    async applyAccessibilitySettings(accessibilitySettings) {
        if (!accessibilitySettings) return;

        try {
            // 高对比度
            if (accessibilitySettings.highContrast !== undefined) {
                document.body.classList.toggle('high-contrast', accessibilitySettings.highContrast);
            }

            // 大字体
            if (accessibilitySettings.largeText !== undefined) {
                document.body.classList.toggle('large-text', accessibilitySettings.largeText);
            }

            // 减少动画
            if (accessibilitySettings.reduceMotion !== undefined) {
                document.body.classList.toggle('reduce-motion', accessibilitySettings.reduceMotion);
            }

            // 焦点指示器
            if (accessibilitySettings.focusIndicator !== undefined) {
                document.body.classList.toggle('focus-indicator', accessibilitySettings.focusIndicator);
            }

        } catch (error) {
            console.error('❌ 应用辅助功能设置失败:', error);
        }
    }

    /**
     * 应用语言设置
     */
    async applyLocaleSettings(localeSettings) {
        if (!localeSettings) return;

        try {
            // 设置文档语言
            if (localeSettings.language) {
                document.documentElement.lang = localeSettings.language;
            }

            // 通知国际化系统
            this.emit('localeChanged', { locale: localeSettings });

        } catch (error) {
            console.error('❌ 应用语言设置失败:', error);
        }
    }

    /**
     * 获取字体大小缩放比例
     */
    getFontSizeScale(fontSize) {
        const scales = {
            small: '0.875',
            medium: '1',
            large: '1.125'
        };
        return scales[fontSize] || scales.medium;
    }

    /**
     * 获取字体族
     */
    getFontFamily(fontFamily) {
        const families = {
            system: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            serif: 'Georgia, "Times New Roman", serif',
            mono: 'Monaco, Consolas, "Courier New", monospace'
        };
        return families[fontFamily] || families.system;
    }

    /**
     * 获取设置值
     */
    get(path, defaultValue = null) {
        return this.getNestedValue(this.settings, path) ?? defaultValue;
    }

    /**
     * 设置设置值
     */
    async set(path, value, options = {}) {
        try {
            // 验证设置值
            if (this.config.validateSettings && !this.validateSetting(path, value)) {
                throw new Error(`无效的设置值: ${path} = ${value}`);
            }

            // 获取旧值
            const oldValue = this.get(path);

            // 设置新值
            this.setNestedValue(this.settings, path, value);

            // 立即应用设置（如果需要）
            if (options.apply !== false) {
                await this.applySpecificSetting(path, value, oldValue);
            }

            // 保存设置（如果启用自动保存）
            if (this.config.autoSave && options.save !== false) {
                await this.saveSettings();
            }

            // 触发特定设置变更事件
            this.emit('settingChanged', {
                path,
                value,
                oldValue,
                settings: this.settings
            });

            console.log(`✅ 设置更新: ${path} = ${value}`);

        } catch (error) {
            console.error(`❌ 设置更新失败: ${path}`, error);
            throw error;
        }
    }

    /**
     * 批量设置
     */
    async setMultiple(changes, options = {}) {
        try {
            const oldSettings = { ...this.settings };

            // 批量更新设置
            for (const [path, value] of Object.entries(changes)) {
                if (this.config.validateSettings && !this.validateSetting(path, value)) {
                    console.warn(`⚠️ 跳过无效设置: ${path} = ${value}`);
                    continue;
                }
                this.setNestedValue(this.settings, path, value);
            }

            // 应用所有设置
            if (options.apply !== false) {
                await this.applySettings();
            }

            // 保存设置
            if (this.config.autoSave && options.save !== false) {
                await this.saveSettings();
            }

            // 触发批量变更事件
            this.emit('settingsBatchChanged', {
                changes,
                settings: this.settings,
                oldSettings
            });

            console.log(`✅ 批量设置更新完成: ${Object.keys(changes).length} 项`);

        } catch (error) {
            console.error('❌ 批量设置更新失败:', error);
            throw error;
        }
    }

    /**
     * 应用特定设置
     */
    async applySpecificSetting(path, value, oldValue) {
        const [category] = path.split('.');

        try {
            switch (category) {
                case 'theme':
                    await this.applyThemeSettings(this.settings.theme);
                    break;
                case 'learning':
                    await this.applyLearningSettings(this.settings.learning);
                    break;
                case 'notifications':
                    await this.applyNotificationSettings(this.settings.notifications);
                    break;
                case 'accessibility':
                    await this.applyAccessibilitySettings(this.settings.accessibility);
                    break;
                case 'locale':
                    await this.applyLocaleSettings(this.settings.locale);
                    break;
            }
        } catch (error) {
            console.error(`❌ 应用特定设置失败: ${path}`, error);
        }
    }

    /**
     * 重置设置
     */
    async reset(category = null) {
        try {
            if (category) {
                // 重置特定类别
                if (this.defaultSettings[category]) {
                    this.settings[category] = { ...this.defaultSettings[category] };
                    await this.applySpecificSetting(category, this.settings[category]);
                }
            } else {
                // 重置所有设置
                this.settings = { ...this.defaultSettings };
                await this.applySettings();
            }

            // 保存重置后的设置
            await this.saveSettings();

            // 触发重置事件
            this.emit('settingsReset', { category, settings: this.settings });

            console.log(`✅ 设置重置完成: ${category || '全部'}`);

        } catch (error) {
            console.error('❌ 重置设置失败:', error);
            throw error;
        }
    }

    /**
     * 导出设置
     */
    exportSettings(format = 'json') {
        try {
            const exportData = {
                settings: this.settings,
                version: this.config.settingsVersion,
                exportedAt: new Date().toISOString(),
                platform: navigator.platform,
                userAgent: navigator.userAgent
            };

            let content, filename, mimeType;

            switch (format) {
                case 'json':
                    content = JSON.stringify(exportData, null, 2);
                    filename = `user-settings-${new Date().toISOString().split('T')[0]}.json`;
                    mimeType = 'application/json';
                    break;
                default:
                    throw new Error(`不支持的导出格式: ${format}`);
            }

            // 创建下载
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

            console.log(`✅ 设置导出完成: ${filename}`);
            return { success: true, filename };

        } catch (error) {
            console.error('❌ 导出设置失败:', error);
            throw error;
        }
    }

    /**
     * 导入设置
     */
    async importSettings(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = async (event) => {
                try {
                    const content = event.target.result;
                    const importData = JSON.parse(content);

                    if (!importData.settings) {
                        throw new Error('无效的设置文件格式');
                    }

                    // 验证导入的设置
                    const validatedSettings = this.validateAllSettings(importData.settings);
                    if (!validatedSettings) {
                        throw new Error('导入的设置包含无效值');
                    }

                    // 创建导入前的备份
                    if (window.dataBackupManager) {
                        await window.dataBackupManager.createFullBackup({
                            metadata: { 
                                type: 'before_import',
                                importFile: file.name 
                            }
                        });
                    }

                    // 合并设置
                    this.settings = this.mergeSettings([this.settings, validatedSettings]);

                    // 应用和保存设置
                    await this.applySettings();
                    await this.saveSettings();

                    // 触发导入事件
                    this.emit('settingsImported', {
                        importData,
                        settings: this.settings
                    });

                    console.log('✅ 设置导入完成');
                    resolve({ success: true });

                } catch (error) {
                    console.error('❌ 导入设置失败:', error);
                    reject(error);
                }
            };

            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsText(file);
        });
    }

    /**
     * 验证单个设置
     */
    validateSetting(path, value) {
        const validator = this.validators.get(path);
        if (validator) {
            return validator(value);
        }
        return true; // 没有验证器时默认通过
    }

    /**
     * 验证所有设置
     */
    validateAllSettings(settings) {
        try {
            const validated = { ...settings };

            for (const [path, validator] of this.validators) {
                const value = this.getNestedValue(validated, path);
                if (value !== undefined && !validator(value)) {
                    console.warn(`⚠️ 设置验证失败，使用默认值: ${path}`);
                    const defaultValue = this.getNestedValue(this.defaultSettings, path);
                    this.setNestedValue(validated, path, defaultValue);
                }
            }

            return validated;
        } catch (error) {
            console.error('❌ 设置验证失败:', error);
            return null;
        }
    }

    /**
     * 合并设置
     */
    mergeSettings(settingsArray) {
        let merged = {};
        
        for (const settings of settingsArray) {
            if (settings && typeof settings === 'object') {
                merged = this.deepMerge(merged, settings);
            }
        }
        
        return merged;
    }

    /**
     * 深度合并对象
     */
    deepMerge(target, source) {
        const result = { ...target };
        
        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (this.isObject(source[key]) && this.isObject(result[key])) {
                    result[key] = this.deepMerge(result[key], source[key]);
                } else {
                    result[key] = source[key];
                }
            }
        }
        
        return result;
    }

    /**
     * 迁移设置
     */
    migrateSettings(settings) {
        // 这里可以添加版本迁移逻辑
        return settings;
    }

    /**
     * 设置观察器
     */
    setupObservers() {
        // 监听主题管理器变化
        if (window.themeManager) {
            // 包装主题管理器的方法来同步设置
            const originalSetTheme = window.themeManager.setTheme?.bind(window.themeManager);
            if (originalSetTheme) {
                window.themeManager.setTheme = (theme) => {
                    const result = originalSetTheme(theme);
                    // 同步到设置中
                    this.setNestedValue(this.settings, 'theme.mode', theme);
                    if (this.config.autoSave) {
                        this.saveSettings();
                    }
                    return result;
                };
            }
        }
    }

    /**
     * 设置认证监听器
     */
    setupAuthListener() {
        if (window.authManager) {
            window.authManager.on('loginSuccess', async () => {
                // 登录后同步设置
                if (this.config.syncEnabled) {
                    await this.syncSettings();
                }
            });

            window.authManager.on('logout', () => {
                // 登出后仅保留本地设置
                console.log('🔓 用户登出，设置将仅保存在本地');
            });
        }
    }

    /**
     * 设置自动保存
     */
    setupAutoSave() {
        // 防抖保存函数
        this.debouncedSave = this.debounce(async () => {
            try {
                await this.saveSettings();
            } catch (error) {
                console.error('❌ 自动保存设置失败:', error);
            }
        }, 2000);

        // 监听设置变化
        this.on('settingChanged', () => {
            this.debouncedSave();
        });
    }

    /**
     * 同步设置
     */
    async syncSettings() {
        if (this.syncInProgress) {
            return;
        }

        this.syncInProgress = true;

        try {
            console.log('🔄 开始同步用户设置...');

            // 从云端获取最新设置
            const cloudSettings = await this.loadFromCloud();

            if (Object.keys(cloudSettings).length > 0) {
                // 合并本地和云端设置
                const mergedSettings = this.mergeSettings([this.settings, cloudSettings]);
                
                // 验证合并后的设置
                const validatedSettings = this.validateAllSettings(mergedSettings);
                
                if (validatedSettings) {
                    this.settings = validatedSettings;
                    await this.applySettings();
                    await this.saveToLocalStorage(this.settings);
                    
                    this.emit('settingsSynced', {
                        settings: this.settings,
                        source: 'cloud'
                    });
                }
            }

            // 上传本地设置到云端
            await this.syncToCloud(this.settings);

            console.log('✅ 用户设置同步完成');

        } catch (error) {
            console.error('❌ 同步用户设置失败:', error);
        } finally {
            this.syncInProgress = false;
        }
    }

    /**
     * 获取嵌套值
     */
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current?.[key];
        }, obj);
    }

    /**
     * 设置嵌套值
     */
    setNestedValue(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        
        const target = keys.reduce((current, key) => {
            if (!current[key] || typeof current[key] !== 'object') {
                current[key] = {};
            }
            return current[key];
        }, obj);
        
        target[lastKey] = value;
    }

    /**
     * 解析存储值
     */
    parseStorageValue(value) {
        if (value === null) return null;
        
        try {
            return JSON.parse(value);
        } catch {
            return value;
        }
    }

    /**
     * 检查是否为对象
     */
    isObject(value) {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
    }

    /**
     * 防抖函数
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * 获取所有设置
     */
    getAll() {
        return { ...this.settings };
    }

    /**
     * 获取默认设置
     */
    getDefaults() {
        return { ...this.defaultSettings };
    }

    /**
     * 检查设置是否已修改
     */
    isModified(path = null) {
        if (path) {
            const currentValue = this.get(path);
            const defaultValue = this.getNestedValue(this.defaultSettings, path);
            return JSON.stringify(currentValue) !== JSON.stringify(defaultValue);
        } else {
            return JSON.stringify(this.settings) !== JSON.stringify(this.defaultSettings);
        }
    }

    /**
     * 获取修改的设置
     */
    getModified() {
        const modified = {};
        
        const checkModified = (current, defaults, path = '') => {
            for (const key in current) {
                const currentPath = path ? `${path}.${key}` : key;
                const currentValue = current[key];
                const defaultValue = defaults?.[key];
                
                if (this.isObject(currentValue) && this.isObject(defaultValue)) {
                    checkModified(currentValue, defaultValue, currentPath);
                } else if (JSON.stringify(currentValue) !== JSON.stringify(defaultValue)) {
                    this.setNestedValue(modified, currentPath, currentValue);
                }
            }
        };
        
        checkModified(this.settings, this.defaultSettings);
        return modified;
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
                    console.error(`❌ 设置事件处理器错误 (${event}):`, error);
                }
            });
        }
    }

    /**
     * 销毁设置管理器
     */
    destroy() {
        if (this.debouncedSave) {
            this.debouncedSave.cancel?.();
        }
        
        this.eventListeners.clear();
        console.log('⚙️ 用户设置和偏好管理器已销毁');
    }
}

// 创建全局实例
window.userSettingsManager = new UserSettingsManager();

console.log('✅ 用户设置和偏好管理器加载完成');