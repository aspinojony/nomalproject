/**
 * AI助手悬浮窗控制器
 * 提供模态窗口显示、最小化、状态切换等交互功能
 */
class AIAssistantFloat {
    constructor() {
        this.isVisible = false;
        this.isMinimized = false;
        this.isFloatingMode = false; // true=悬浮模式, false=模态模式
        this.selectedChapter = null;
        this.lastAIResponse = null;
        
        // 拖拽状态
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.windowStartX = 0;
        this.windowStartY = 0;
        this.lastMoveTime = 0;
        this.dragGhost = null;
        this.snapZones = [];
        this.dragBoundary = null;
        
        // 窗口调节状态
        this.isResizing = false;
        this.resizeDirection = null;
        this.resizeStartX = 0;
        this.resizeStartY = 0;
        this.windowStartWidth = 0;
        this.windowStartHeight = 0;
        this.windowStartLeft = 0;
        this.windowStartTop = 0;
        
        this.init();
    }

    async init() {
        try {
            await this.loadComponent();
            this.bindEvents();
        } catch (error) {
            console.error('AI助手初始化失败:', error);
        }
    }

    async loadComponent() {
        // 直接使用内嵌HTML避免CORS问题
        console.warn('使用内嵌HTML组件，避免CORS问题');
        this.insertInlineComponent();
        
        // 等待DOM更新
        await new Promise(resolve => setTimeout(resolve, 100));
        
        this.container = document.getElementById('ai-assistant-float');
        this.window = document.getElementById('ai-float-window');
        this.bubble = document.getElementById('ai-float-bubble');
        this.header = document.getElementById('ai-float-header');
        this.content = document.getElementById('ai-float-content');
        this.messages = document.getElementById('ai-messages');
        this.input = document.getElementById('ai-input');
        this.sendBtn = document.getElementById('ai-send-btn');
        this.charCount = document.querySelector('.ai-char-count');
        
        // 章节选择相关元素
        this.chapterBtn = document.getElementById('ai-chapter-btn');
        this.chapterInfo = document.getElementById('ai-chapter-info');
        this.chapterText = document.getElementById('ai-selected-chapter-text');
        this.chapterRemove = document.getElementById('ai-chapter-remove');
        this.notesBtn = document.getElementById('ai-notes-btn');
        
        this.minimizeBtn = document.getElementById('ai-float-minimize');
        this.closeBtn = document.getElementById('ai-float-close');
        this.configBtn = document.getElementById('ai-float-config');
        this.modeToggleBtn = document.getElementById('ai-float-mode-toggle');
        this.sizeMenuBtn = document.getElementById('ai-float-size-menu');
        this.configModal = document.getElementById('ai-config-modal');
        this.sizePresets = document.getElementById('ai-size-presets');
        this.windowResizers = document.getElementById('ai-window-resizers');
        
        // 调试信息：检查关键元素
        console.log('🔍 关键DOM元素检查:', {
            container: !!this.container,
            window: !!this.window,
            bubble: !!this.bubble,
            header: !!this.header,
            messages: !!this.messages,
            input: !!this.input,
            sendBtn: !!this.sendBtn,
            minimizeBtn: !!this.minimizeBtn,
            closeBtn: !!this.closeBtn,
            configBtn: !!this.configBtn,
            modeToggleBtn: !!this.modeToggleBtn
        });
        
        if (!this.container) {
            throw new Error('AI助手组件元素未找到');
        }
        
        console.log('✅ AI助手组件加载完成');
    }

    insertInlineComponent() {
        const html = `
<!-- AI助手悬浮窗组件 -->
<div id="ai-assistant-float" class="ai-float-container" style="display: none;">
    <!-- 悬浮窗主体 -->
    <div class="ai-float-window" id="ai-float-window">
        <!-- 标题栏 -->
        <div class="ai-float-header" id="ai-float-header">
            <div class="ai-float-title">
                <svg class="ai-float-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2L2 7L12 12L22 7L12 2Z"/>
                    <path d="M2 17L12 22L22 17"/>
                    <path d="M2 12L12 17L22 12"/>
                </svg>
                <span>AI学习助手</span>
            </div>
            <div class="ai-float-controls">
                <button class="ai-float-btn ai-float-mode-toggle" id="ai-float-mode-toggle" title="切换悬浮/模态模式">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
                    </svg>
                </button>
                <button class="ai-float-btn ai-float-config" id="ai-float-config" title="设置">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="3"/>
                        <path d="M12 1v6m0 10v6m11-7h-6M6 12H0m15.364-6.364l-4.243 4.243m-6.243 4.243l-4.242-4.243M19.071 19.071l-4.243-4.243M9.929 4.929L5.686 9.172"/>
                    </svg>
                </button>
                <button class="ai-float-btn ai-float-minimize" id="ai-float-minimize" title="最小化">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                </button>
                <button class="ai-float-btn ai-float-close" id="ai-float-close" title="关闭">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>
        </div>

        <!-- 内容区域 -->
        <div class="ai-float-content" id="ai-float-content">
            <!-- 对话区域 -->
            <div class="ai-chat-area" id="ai-chat-area">
                <div class="ai-messages" id="ai-messages">
                    <div class="ai-message ai-message-assistant">
                        <div class="ai-message-avatar">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"/>
                                <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                                <line x1="9" y1="9" x2="9.01" y2="9"/>
                                <line x1="15" y1="9" x2="15.01" y2="9"/>
                            </svg>
                        </div>
                        <div class="ai-message-content">
                            <p>你好！我是基于讯飞星火X1的AI学习助手，有什么可以帮助你的吗？</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 快捷功能按钮 -->
            <div class="ai-quick-actions">
                <button class="ai-quick-btn" data-action="explain">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                        <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    解释知识点
                </button>
                <button class="ai-quick-btn" data-action="practice">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9 12l2 2 4-4"/>
                        <circle cx="12" cy="12" r="10"/>
                    </svg>
                    题目讲解
                </button>
                <button class="ai-quick-btn" data-action="plan">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    学习规划
                </button>
            </div>

            <!-- 输入区域 -->
            <div class="ai-input-area">
                <!-- 章节选择提示 -->
                <div class="ai-chapter-info" id="ai-chapter-info" style="display: none;">
                    <div class="ai-chapter-selected">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                        </svg>
                        <span class="ai-chapter-text">相关章节：<span id="ai-selected-chapter-text">未选择</span></span>
                        <button class="ai-chapter-remove" id="ai-chapter-remove" title="移除章节关联">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>
                    </div>
                </div>
                
                <div class="ai-input-container">
                    <button class="ai-chapter-btn" id="ai-chapter-btn" title="选择相关章节">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                        </svg>
                    </button>
                    <textarea 
                        class="ai-input" 
                        id="ai-input" 
                        placeholder="输入你的问题，选择相关章节..." 
                        rows="1"
                        maxlength="500"
                    ></textarea>
                    <button class="ai-send-btn" id="ai-send-btn" title="发送">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="22" y1="2" x2="11" y2="13"/>
                            <polygon points="22,2 15,22 11,13 2,9"/>
                        </svg>
                    </button>
                </div>
                <div class="ai-input-stats">
                    <span class="ai-char-count">0/500</span>
                    <button class="ai-notes-btn" id="ai-notes-btn" title="保存为笔记" style="display: none;">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                        </svg>
                        保存笔记
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- 窗口大小调节器 -->
    <div class="ai-window-resizers" id="ai-window-resizers">
        <div class="ai-resizer ai-resizer-n" data-direction="n"></div>
        <div class="ai-resizer ai-resizer-s" data-direction="s"></div>
        <div class="ai-resizer ai-resizer-e" data-direction="e"></div>
        <div class="ai-resizer ai-resizer-w" data-direction="w"></div>
        <div class="ai-resizer ai-resizer-nw" data-direction="nw"></div>
        <div class="ai-resizer ai-resizer-ne" data-direction="ne"></div>
        <div class="ai-resizer ai-resizer-sw" data-direction="sw"></div>
        <div class="ai-resizer ai-resizer-se" data-direction="se"></div>
    </div>

    <!-- 大小预设菜单 -->
    <div class="ai-size-presets" id="ai-size-presets">
        <button class="ai-size-preset-btn" data-size="small">📏 小窗口 (350x450)</button>
        <button class="ai-size-preset-btn" data-size="medium">📑 中窗口 (480x650)</button>
        <button class="ai-size-preset-btn" data-size="large">📖 大窗口 (600x800)</button>
        <button class="ai-size-preset-btn" data-size="wide">📺 宽屏 (700x500)</button>
    </div>

    <!-- 最小化时的悬浮球 -->
    <div class="ai-float-bubble" id="ai-float-bubble" style="display: none;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L2 7L12 12L22 7L12 2Z"/>
            <path d="M2 17L12 22L22 17"/>
            <path d="M2 12L12 17L22 12"/>
        </svg>
        <div class="ai-bubble-indicator"></div>
    </div>

    <!-- 配置模态框 -->
    <div class="ai-config-modal" id="ai-config-modal" style="display: none;">
        <div class="ai-config-overlay" onclick="window.aiAssistant.closeConfigModal()"></div>
        <div class="ai-config-content">
            <div class="ai-config-header">
                <h3>⚙️ AI服务配置</h3>
                <button class="ai-config-close" onclick="window.aiAssistant.closeConfigModal()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>
            <div class="ai-config-body">
                <div class="ai-config-tab active" data-provider="xunfei">
                    <h4>讯飞星火X1配置</h4>
                    <div class="ai-config-form">
                        <div class="ai-form-group">
                            <label>App ID</label>
                            <input type="text" id="xunfei-appid" placeholder="请输入App ID">
                        </div>
                        <div class="ai-form-group">
                            <label>API Key</label>
                            <input type="text" id="xunfei-apikey" placeholder="请输入API Key">
                        </div>
                        <div class="ai-form-group">
                            <label>API Secret</label>
                            <input type="password" id="xunfei-apisecret" placeholder="请输入API Secret">
                        </div>
                        <div class="ai-config-help">
                            <p>📝 获取Spark X1 API密钥步骤：</p>
                            <ol>
                                <li>访问 <a href="https://www.xfyun.cn/" target="_blank">讯飞开放平台</a></li>
                                <li>注册登录后进入控制台</li>
                                <li>创建星火认知大模型X1应用</li>
                                <li>获取 App ID、API Key、API Secret</li>
                            </ol>
                            <p style="margin-top: 12px; padding: 8px; background: #e3f2fd; border-radius: 4px; font-size: 12px; color: #1976d2;">
                                💡 <strong>Spark X1</strong> 是讯飞星火的高性能模型，提供更优质的对话体验
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            <div class="ai-config-footer">
                <button class="ai-btn ai-btn-secondary" onclick="window.aiAssistant.testConnection()">
                    🔧 测试连接
                </button>
                <button class="ai-btn ai-btn-primary" onclick="window.aiAssistant.saveConfig()">
                    💾 保存配置
                </button>
            </div>
        </div>
    </div>
</div>
`;
        document.body.insertAdjacentHTML('beforeend', html);
        
        // 添加章节选择相关CSS
        this.addChapterStyles();
    }

    addChapterStyles() {
        // 检查是否已经添加过样式
        if (document.getElementById('ai-chapter-styles')) return;
        
        const styles = `
        <style id="ai-chapter-styles">
        .ai-chapter-info {
            padding: 8px 12px;
            background: #f0f9ff;
            border: 1px solid #bae6fd;
            border-radius: 6px;
            margin-bottom: 8px;
        }
        
        .ai-chapter-selected {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
            color: #0369a1;
        }
        
        .ai-chapter-selected svg {
            width: 14px;
            height: 14px;
            flex-shrink: 0;
        }
        
        .ai-chapter-text {
            flex: 1;
        }
        
        .ai-chapter-remove {
            background: none;
            border: none;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
            cursor: pointer;
            color: #64748b;
            transition: all 0.2s;
        }
        
        .ai-chapter-remove:hover {
            background: #fee2e2;
            color: #dc2626;
        }
        
        .ai-chapter-remove svg {
            width: 12px;
            height: 12px;
        }
        
        .ai-input-container {
            position: relative;
        }
        
        .ai-chapter-btn {
            position: absolute;
            left: 8px;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
            cursor: pointer;
            color: #6b7280;
            transition: all 0.2s;
            z-index: 1;
        }
        
        .ai-chapter-btn:hover {
            background: #f3f4f6;
            color: #3b82f6;
        }
        
        .ai-chapter-btn svg {
            width: 16px;
            height: 16px;
        }
        
        .ai-input {
            padding-left: 44px !important;
        }
        
        .ai-notes-btn {
            background: none;
            border: 1px solid #d1d5db;
            color: #6b7280;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 11px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 4px;
            transition: all 0.2s;
        }
        
        .ai-notes-btn:hover {
            background: #f9fafb;
            color: #374151;
            border-color: #9ca3af;
        }
        
        .ai-notes-btn svg {
            width: 12px;
            height: 12px;
        }
        
        .ai-notes-btn.saving {
            background: #3b82f6;
            color: white;
            border-color: #3b82f6;
        }
        
        .ai-input-stats {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        </style>`;
        
        document.head.insertAdjacentHTML('beforeend', styles);
    }

    bindEvents() {
        // 检查必需的关键元素
        const requiredElements = {
            header: this.header,
            bubble: this.bubble,
            minimizeBtn: this.minimizeBtn,
            closeBtn: this.closeBtn,
            configBtn: this.configBtn,
            input: this.input,
            sendBtn: this.sendBtn
        };
        
        const missingRequired = Object.entries(requiredElements)
            .filter(([name, element]) => !element)
            .map(([name]) => name);
            
        if (missingRequired.length > 0) {
            console.error('AI助手: 必需DOM元素未找到:', missingRequired);
            console.log('详细元素状态:', {
                header: !!this.header,
                bubble: !!this.bubble,
                minimizeBtn: !!this.minimizeBtn,
                closeBtn: !!this.closeBtn,
                configBtn: !!this.configBtn,
                modeToggleBtn: !!this.modeToggleBtn,
                input: !!this.input,
                sendBtn: !!this.sendBtn
            });
            return;
        }

        // 绑定必需事件
        this.bubble.addEventListener('click', this.show.bind(this));
        this.minimizeBtn.addEventListener('click', this.minimize.bind(this));
        this.closeBtn.addEventListener('click', this.hide.bind(this));
        this.configBtn.addEventListener('click', this.showConfigModal.bind(this));
        
        // 绑定可选事件
        if (this.modeToggleBtn) {
            this.modeToggleBtn.addEventListener('click', this.toggleMode.bind(this));
        }
        
        if (this.sizeMenuBtn) {
            this.sizeMenuBtn.addEventListener('click', this.toggleSizeMenu.bind(this));
        }
        
        // 点击其他地方关闭大小预设菜单
        document.addEventListener('click', (e) => {
            if (this.sizePresets && !this.sizePresets.contains(e.target) && !this.sizeMenuBtn.contains(e.target)) {
                this.sizePresets.classList.remove('show');
            }
        });
        
        // 点击容器背景关闭悬浮窗（仅在模态模式下）
        this.container.addEventListener('click', (e) => {
            if (e.target === this.container && !this.isFloatingMode) {
                this.hide();
            }
        });
        
        // 拖拽事件 - 使用节流优化性能
        this.header.addEventListener('mousedown', this.handleDragStart.bind(this));
        this.throttledDragMove = this.throttle(this.handleDragMove.bind(this), 16); // 60fps
        document.addEventListener('mousemove', this.throttledDragMove);
        document.addEventListener('mouseup', this.handleDragEnd.bind(this));
        
        // 窗口调节事件
        if (this.windowResizers) {
            const resizers = this.windowResizers.querySelectorAll('.ai-resizer');
            resizers.forEach(resizer => {
                resizer.addEventListener('mousedown', this.handleResizeStart.bind(this));
            });
        }
        
        // 大小预设事件
        if (this.sizePresets) {
            const presetBtns = this.sizePresets.querySelectorAll('.ai-size-preset-btn');
            presetBtns.forEach(btn => {
                btn.addEventListener('click', this.handleSizePreset.bind(this));
            });
        }
        
        this.input.addEventListener('input', this.handleInputChange.bind(this));
        this.input.addEventListener('keydown', this.handleKeyDown.bind(this));
        this.sendBtn.addEventListener('click', this.handleSendMessage.bind(this));
        
        // 章节选择相关事件
        if (this.chapterBtn) {
            this.chapterBtn.addEventListener('click', this.handleChapterSelect.bind(this));
        }
        
        if (this.chapterRemove) {
            this.chapterRemove.addEventListener('click', this.handleChapterRemove.bind(this));
        }
        
        if (this.notesBtn) {
            this.notesBtn.addEventListener('click', this.handleSaveNote.bind(this));
        }
        
        // 快捷按钮事件
        document.querySelectorAll('.ai-quick-btn').forEach(btn => {
            btn.addEventListener('click', this.handleQuickAction.bind(this));
        });
        
        console.log('✅ AI助手事件绑定完成');
    }

    // 创建拖拽吸附区域
    createSnapZones() {
        const snapSize = 20;
        const zones = [
            { x: 0, y: 0, width: window.innerWidth / 2, height: window.innerHeight, type: 'left' },
            { x: window.innerWidth / 2, y: 0, width: window.innerWidth / 2, height: window.innerHeight, type: 'right' },
            { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight / 2, type: 'top' },
            { x: 0, y: window.innerHeight / 2, width: window.innerWidth, height: window.innerHeight / 2, type: 'bottom' }
        ];
        
        zones.forEach(zone => {
            const element = document.createElement('div');
            element.className = 'ai-snap-zone';
            element.style.left = zone.x + 'px';
            element.style.top = zone.y + 'px';
            element.style.width = zone.width + 'px';
            element.style.height = zone.height + 'px';
            element.dataset.type = zone.type;
            document.body.appendChild(element);
            this.snapZones.push(element);
        });
    }
    
    // 清理拖拽元素
    cleanupDragElements() {
        if (this.dragGhost) {
            this.dragGhost.remove();
            this.dragGhost = null;
        }
        
        if (this.dragBoundary) {
            this.dragBoundary.remove();
            this.dragBoundary = null;
        }
        
        this.snapZones.forEach(zone => zone.remove());
        this.snapZones = [];
    }
    
    // 模式切换方法
    toggleMode() {
        this.isFloatingMode = !this.isFloatingMode;
        this.updateDisplayMode();
    }
    
    updateDisplayMode() {
        if (this.isFloatingMode) {
            // 悬浮模式
            this.container.classList.add('floating-mode');
            this.container.classList.remove('modal-mode');
            this.window.classList.add('floating-mode');
            this.window.classList.remove('modal-mode');
            
            // 设置默认位置
            if (!this.window.style.top || !this.window.style.left) {
                this.window.style.top = '50px';
                this.window.style.left = '50px';
            }
            
        } else {
            // 模态模式
            this.container.classList.add('modal-mode');
            this.container.classList.remove('floating-mode');
            this.window.classList.add('modal-mode');
            this.window.classList.remove('floating-mode');
            
            // 清除位置样式
            this.window.style.top = '';
            this.window.style.left = '';
            
            // 清理拖拽状态
            if (this.isDragging) {
                this.handleDragEnd();
            }
        }
    }
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    }
    
    // 防抖函数 - 优化视觉效果
    debounce(func, wait) {
        let timeout;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }
    toggleMode() {
        this.isFloatingMode = !this.isFloatingMode;
        this.updateDisplayMode();
    }
    
    updateDisplayMode() {
        if (this.isFloatingMode) {
            // 悬浮模式
            this.container.classList.add('floating-mode');
            this.container.classList.remove('modal-mode');
            this.window.classList.add('floating-mode');
            this.window.classList.remove('modal-mode');
            
            // 设置默认位置
            if (!this.window.style.top || !this.window.style.left) {
                this.window.style.top = '50px';
                this.window.style.left = '50px';
            }
            
        } else {
            // 模态模式
            this.container.classList.add('modal-mode');
            this.container.classList.remove('floating-mode');
            this.window.classList.add('modal-mode');
            this.window.classList.remove('floating-mode');
            
            // 清除位置样式
            this.window.style.top = '';
            this.window.style.left = '';
        }
    }
    
    // 拖拽开始
    handleDragStart(e) {
        if (!this.isFloatingMode || this.isResizing) return;
        
        this.isDragging = true;
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
        this.lastMoveTime = Date.now();
        
        const rect = this.window.getBoundingClientRect();
        this.windowStartX = rect.left;
        this.windowStartY = rect.top;
        
        // 添加拖拽样式
        this.header.classList.add('dragging');
        this.window.classList.add('dragging');
        
        // 创建虚影效果
        this.createDragGhost(rect);
        
        // 创建吸附区域
        this.createSnapZones();
        
        // 创建边界提示
        this.createDragBoundary();
        
        // 禁止选中文本
        document.body.style.userSelect = 'none';
        document.body.style.webkitUserSelect = 'none';
        
        e.preventDefault();
    }
    
    // 创建拖拽虚影
    createDragGhost(rect) {
        this.dragGhost = document.createElement('div');
        this.dragGhost.className = 'ai-drag-ghost';
        this.dragGhost.style.left = rect.left + 'px';
        this.dragGhost.style.top = rect.top + 'px';
        this.dragGhost.style.width = rect.width + 'px';
        this.dragGhost.style.height = rect.height + 'px';
        document.body.appendChild(this.dragGhost);
    }
    
    // 创建边界提示
    createDragBoundary() {
        this.dragBoundary = document.createElement('div');
        this.dragBoundary.className = 'ai-drag-boundary';
        document.body.appendChild(this.dragBoundary);
    }
    
    // 拖拽过程
    handleDragMove(e) {
        const now = Date.now();
        if (now - this.lastMoveTime < 16) return; // 60fps 限制
        this.lastMoveTime = now;
        
        if (this.isDragging && this.isFloatingMode && !this.isResizing) {
            const deltaX = e.clientX - this.dragStartX;
            const deltaY = e.clientY - this.dragStartY;
            
            let newX = this.windowStartX + deltaX;
            let newY = this.windowStartY + deltaY;
            
            // 边界检测和吸附
            const snapResult = this.checkSnapZones(e.clientX, e.clientY);
            if (snapResult) {
                newX = snapResult.x;
                newY = snapResult.y;
                this.highlightSnapZone(snapResult.zone);
            } else {
                this.clearSnapHighlight();
                // 边界限制
                newX = Math.max(0, Math.min(window.innerWidth - this.window.offsetWidth, newX));
                newY = Math.max(0, Math.min(window.innerHeight - this.window.offsetHeight, newY));
            }
            
            // 更新虚影位置
            if (this.dragGhost) {
                this.dragGhost.style.left = newX + 'px';
                this.dragGhost.style.top = newY + 'px';
            }
            
            // 显示边界提示
            this.updateBoundaryHighlight(newX, newY);
        }
        
        if (this.isResizing && this.isFloatingMode) {
            this.handleResizeMove(e);
        }
    }
    
    // 检查吸附区域
    checkSnapZones(mouseX, mouseY) {
        const threshold = 30;
        
        // 边缘吸附
        if (mouseX < threshold) {
            return { x: 0, y: Math.max(0, this.windowStartY + (mouseY - this.dragStartY)), zone: 'left' };
        }
        if (mouseX > window.innerWidth - threshold) {
            return { x: window.innerWidth - this.window.offsetWidth, y: Math.max(0, this.windowStartY + (mouseY - this.dragStartY)), zone: 'right' };
        }
        if (mouseY < threshold) {
            return { x: Math.max(0, this.windowStartX + (mouseX - this.dragStartX)), y: 0, zone: 'top' };
        }
        if (mouseY > window.innerHeight - threshold) {
            return { x: Math.max(0, this.windowStartX + (mouseX - this.dragStartX)), y: window.innerHeight - this.window.offsetHeight, zone: 'bottom' };
        }
        
        return null;
    }
    
    // 高亮吸附区域
    highlightSnapZone(zone) {
        this.snapZones.forEach(element => {
            if (element.dataset.type === zone) {
                element.classList.add('active');
            } else {
                element.classList.remove('active');
            }
        });
    }
    
    // 清除吸附高亮
    clearSnapHighlight() {
        this.snapZones.forEach(element => element.classList.remove('active'));
    }
    
    // 更新边界高亮
    updateBoundaryHighlight(x, y) {
        if (!this.dragBoundary) return;
        
        const threshold = 10;
        const showBoundary = x <= threshold || y <= threshold || 
                           x >= window.innerWidth - this.window.offsetWidth - threshold ||
                           y >= window.innerHeight - this.window.offsetHeight - threshold;
        
        if (showBoundary) {
            this.dragBoundary.classList.add('show');
        } else {
            this.dragBoundary.classList.remove('show');
        }
    }
    
    // 拖拽结束
    handleDragEnd(e) {
        if (this.isDragging) {
            this.isDragging = false;
            
            // 应用最终位置
            if (this.dragGhost) {
                const ghostRect = this.dragGhost.getBoundingClientRect();
                this.window.style.left = ghostRect.left + 'px';
                this.window.style.top = ghostRect.top + 'px';
            }
            
            // 清理状态
            this.header.classList.remove('dragging');
            this.window.classList.remove('dragging');
            
            // 恢复文本选中
            document.body.style.userSelect = '';
            document.body.style.webkitUserSelect = '';
            
            // 清理拖拽元素
            this.cleanupDragElements();
        }
        
        if (this.isResizing) {
            this.isResizing = false;
            this.resizeDirection = null;
        }
    }
    
    // 窗口调节开始
    handleResizeStart(e) {
        if (!this.isFloatingMode) return;
        
        this.isResizing = true;
        this.resizeDirection = e.target.dataset.direction;
        this.resizeStartX = e.clientX;
        this.resizeStartY = e.clientY;
        
        const rect = this.window.getBoundingClientRect();
        this.windowStartWidth = rect.width;
        this.windowStartHeight = rect.height;
        this.windowStartLeft = rect.left;
        this.windowStartTop = rect.top;
        
        e.preventDefault();
        e.stopPropagation();
    }
    
    // 窗口调节过程
    handleResizeMove(e) {
        if (!this.isResizing || !this.isFloatingMode) return;
        
        const deltaX = e.clientX - this.resizeStartX;
        const deltaY = e.clientY - this.resizeStartY;
        
        let newWidth = this.windowStartWidth;
        let newHeight = this.windowStartHeight;
        let newLeft = this.windowStartLeft;
        let newTop = this.windowStartTop;
        
        const direction = this.resizeDirection;
        const minWidth = 320;
        const minHeight = 400;
        const maxWidth = window.innerWidth - 20;
        const maxHeight = window.innerHeight - 20;
        
        if (direction.includes('e')) {
            newWidth = Math.max(minWidth, Math.min(maxWidth, this.windowStartWidth + deltaX));
        }
        if (direction.includes('w')) {
            const widthChange = this.windowStartWidth - deltaX;
            if (widthChange >= minWidth && widthChange <= maxWidth) {
                newWidth = widthChange;
                newLeft = this.windowStartLeft + deltaX;
            }
        }
        if (direction.includes('s')) {
            newHeight = Math.max(minHeight, Math.min(maxHeight, this.windowStartHeight + deltaY));
        }
        if (direction.includes('n')) {
            const heightChange = this.windowStartHeight - deltaY;
            if (heightChange >= minHeight && heightChange <= maxHeight) {
                newHeight = heightChange;
                newTop = this.windowStartTop + deltaY;
            }
        }
        
        // 边界检查
        if (newLeft < 0) {
            newWidth += newLeft;
            newLeft = 0;
        }
        if (newTop < 0) {
            newHeight += newTop;
            newTop = 0;
        }
        if (newLeft + newWidth > window.innerWidth) {
            newWidth = window.innerWidth - newLeft;
        }
        if (newTop + newHeight > window.innerHeight) {
            newHeight = window.innerHeight - newTop;
        }
        
        this.window.style.width = newWidth + 'px';
        this.window.style.height = newHeight + 'px';
        this.window.style.left = newLeft + 'px';
        this.window.style.top = newTop + 'px';
    }
    
    // 切换大小预设菜单
    toggleSizeMenu() {
        if (!this.sizePresets) return;
        
        this.sizePresets.classList.toggle('show');
    }
    
    // 处理大小预设
    handleSizePreset(e) {
        if (!this.isFloatingMode) return;
        
        const size = e.target.dataset.size;
        const presets = {
            small: { width: 350, height: 450 },
            medium: { width: 480, height: 650 },
            large: { width: 600, height: 800 },
            wide: { width: 700, height: 500 }
        };
        
        const preset = presets[size];
        if (preset) {
            this.window.style.width = preset.width + 'px';
            this.window.style.height = preset.height + 'px';
            
            // 确保窗口在屏幕范围内
            const rect = this.window.getBoundingClientRect();
            if (rect.right > window.innerWidth) {
                this.window.style.left = (window.innerWidth - preset.width) + 'px';
            }
            if (rect.bottom > window.innerHeight) {
                this.window.style.top = (window.innerHeight - preset.height) + 'px';
            }
        }
        
        this.sizePresets.classList.remove('show');
    }
    handleChapterSelect() {
        if (!window.chapterSelector) {
            console.error('章节选择器未初始化');
            return;
        }
        
        window.chapterSelector.show((selectedChapter) => {
            this.selectedChapter = selectedChapter;
            this.updateChapterDisplay();
        });
    }

    // 移除章节关联
    handleChapterRemove() {
        this.selectedChapter = null;
        this.updateChapterDisplay();
    }

    // 更新章节显示
    updateChapterDisplay() {
        if (!this.chapterInfo || !this.chapterText) return;
        
        if (this.selectedChapter) {
            this.chapterInfo.style.display = 'block';
            this.chapterText.textContent = `${this.selectedChapter.subject.name} → ${this.selectedChapter.chapter.name}`;
        } else {
            this.chapterInfo.style.display = 'none';
        }
    }

    // 保存笔记处理
    async handleSaveNote() {
        if (!this.lastAIResponse || !this.notesBtn) return;
        
        this.notesBtn.classList.add('saving');
        this.notesBtn.textContent = '保存中...';
        
        try {
            if (!window.NotesManager) {
                throw new Error('笔记管理器未初始化');
            }
            
            const notesManager = new window.NotesManager();
            
            // 生成笔记内容
            const noteContent = this.generateNoteContent();
            const noteTitle = this.generateNoteTitle();
            
            // 创建笔记
            const note = notesManager.createNote(
                noteTitle,
                noteContent,
                this.selectedChapter?.subject?.id || '',
                this.selectedChapter?.chapter?.index || '',
                ['AI助手', '自动生成']
            );
            
            // 更新科目和章节名称
            if (this.selectedChapter) {
                notesManager.updateNote(note.id, {
                    subjectName: this.selectedChapter.subject.name,
                    chapterName: this.selectedChapter.chapter.name
                });
            }
            
            this.showSuccessMessage('笔记保存成功！');
            this.notesBtn.style.display = 'none';
            
        } catch (error) {
            console.error('保存笔记失败:', error);
            this.showErrorMessage(`保存失败: ${error.message}`);
        } finally {
            this.notesBtn.classList.remove('saving');
            this.notesBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                </svg>
                保存笔记
            `;
        }
    }

    // 生成笔记内容
    generateNoteContent() {
        const userMessage = this.getLastUserMessage();
        const aiResponse = this.lastAIResponse;
        
        let content = '';
        
        if (this.selectedChapter) {
            content += `## 相关章节\n`;
            content += `**科目**: ${this.selectedChapter.subject.name}\n`;
            content += `**章节**: ${this.selectedChapter.chapter.name}\n\n`;
        }
        
        if (userMessage) {
            content += `## 问题\n${userMessage}\n\n`;
        }
        
        if (aiResponse) {
            content += `## AI回答\n${aiResponse}\n\n`;
        }
        
        content += `---\n*由AI助手自动生成于 ${new Date().toLocaleString('zh-CN')}*`;
        
        return content;
    }

    // 生成笔记标题
    generateNoteTitle() {
        const userMessage = this.getLastUserMessage();
        
        if (this.selectedChapter) {
            const chapterName = this.selectedChapter.chapter.name;
            const shortChapter = chapterName.length > 20 ? chapterName.substring(0, 20) + '...' : chapterName;
            return `${shortChapter} - AI问答`;
        }
        
        if (userMessage) {
            const shortMessage = userMessage.length > 30 ? userMessage.substring(0, 30) + '...' : userMessage;
            return `${shortMessage} - AI回答`;
        }
        
        return `AI助手问答 - ${new Date().toLocaleDateString('zh-CN')}`;
    }

    // 获取最后一条用户消息
    getLastUserMessage() {
        const userMessages = this.messages.querySelectorAll('.ai-message-user');
        if (userMessages.length > 0) {
            const lastUserMessage = userMessages[userMessages.length - 1];
            return lastUserMessage.querySelector('.ai-message-content p')?.textContent || '';
        }
        return '';
    }

    // 显示成功消息
    showSuccessMessage(message) {
        this.addMessage(`✅ ${message}`, 'assistant');
    }

    // 显示错误消息
    showErrorMessage(message) {
        this.addMessage(`❌ ${message}`, 'assistant');
    }

    handleInputChange() {
        const value = this.input.value;
        const length = value.length;
        
        this.charCount.textContent = `${length}/500`;
        this.sendBtn.disabled = length === 0;
        
        this.input.style.height = 'auto';
        this.input.style.height = Math.min(this.input.scrollHeight, 120) + 'px';
    }

    handleKeyDown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.handleSendMessage();
        }
    }

    async handleSendMessage() {
        const message = this.input.value.trim();
        if (!message) return;
        
        this.addMessage(message, 'user');
        this.input.value = '';
        this.handleInputChange();
        
        this.sendBtn.disabled = true;
        this.addLoadingMessage();
        
        try {
            // 检查AI API管理器是否可用
            if (!window.aiAPIManager) {
                throw new Error('AI服务未初始化');
            }

            // 检查API配置状态
            const configStatus = window.aiAPIManager.getConfigStatus();
            if (!configStatus.xunfei?.isConfigured) {
                this.removeLoadingMessage();
                this.addMessage('AI服务未配置，请点击右上角设置按钮配置API密钥。', 'assistant');
                this.showConfigPrompt();
                return;
            }

            // 监听AI响应
            let responseText = '';
            const handleAIMessage = (event) => {
                const { content, isComplete } = event.detail;
                
                // 严格过滤无效内容
                if (content !== undefined && 
                    content !== null && 
                    content !== 'undefined' && 
                    typeof content === 'string' && 
                    content.trim() !== '') {
                    
                    responseText += content;
                    
                    // 更新或创建响应消息
                    this.updateResponseMessage(responseText);
                } else {
                    console.warn('过滤无效AI响应内容:', content);
                }
                
                if (isComplete) {
                    window.removeEventListener('ai-message', handleAIMessage);
                    window.removeEventListener('ai-error', handleAIError);
                    this.removeLoadingMessage();
                    this.sendBtn.disabled = false;
                }
            };

            const handleAIError = (event) => {
                const { type, error } = event.detail;
                window.removeEventListener('ai-message', handleAIMessage);
                window.removeEventListener('ai-error', handleAIError);
                this.removeLoadingMessage();
                this.addMessage(`AI服务错误: ${error.message || type}`, 'assistant');
                this.sendBtn.disabled = false;
            };

            window.addEventListener('ai-message', handleAIMessage);
            window.addEventListener('ai-error', handleAIError);

            // 构建发送消息，包含章节上下文
            let messageToSend = message;
            if (this.selectedChapter) {
                messageToSend = `相关章节：${this.selectedChapter.subject.name} - ${this.selectedChapter.chapter.name}\n\n${message}`;
            }

            // 发送消息到AI API
            await window.aiAPIManager.sendMessage(messageToSend);

        } catch (error) {
            console.error('发送消息失败:', error);
            this.removeLoadingMessage();
            this.addMessage(`发送失败: ${error.message}`, 'assistant');
            this.sendBtn.disabled = false;
        }
    }

    /**
     * 更新AI响应消息（流式响应）
     */
    updateResponseMessage(content) {
        // 检查内容有效性并清理
        if (!content || content === 'undefined' || content.trim() === '') {
            return;
        }
        
        // 清理内容中的undefined字符串
        const cleanContent = content.replace(/undefined/g, '').trim();
        if (!cleanContent) {
            return;
        }
        
        // 找到最后一条AI消息或创建新的
        let lastMessage = this.messages.querySelector('.ai-message-assistant:last-child:not(.ai-loading)');
        
        if (!lastMessage || lastMessage.dataset.isUser === 'true') {
            // 创建新的AI响应消息
            lastMessage = document.createElement('div');
            lastMessage.className = 'ai-message ai-message-assistant';
            lastMessage.innerHTML = `
                <div class="ai-message-avatar">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                        <line x1="9" y1="9" x2="9.01" y2="9"/>
                        <line x1="15" y1="9" x2="15.01" y2="9"/>
                    </svg>
                </div>
                <div class="ai-message-content">
                    <p></p>
                </div>
            `;
            this.messages.appendChild(lastMessage);
        }

        // 更新消息内容
        const contentElement = lastMessage.querySelector('.ai-message-content p');
        if (contentElement) {
            contentElement.textContent = cleanContent;
        }

        // 保存最后的AI响应
        this.lastAIResponse = cleanContent;
        
        // 显示保存笔记按钮
        if (this.notesBtn && cleanContent.trim()) {
            this.notesBtn.style.display = 'flex';
        }

        this.scrollToBottom();
    }

    /**
     * 显示配置提示
     */
    showConfigPrompt() {
        const promptDiv = document.createElement('div');
        promptDiv.className = 'ai-config-prompt';
        promptDiv.innerHTML = `
            <div class="ai-message ai-message-assistant">
                <div class="ai-message-avatar">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                        <line x1="12" y1="9" x2="12" y2="13"/>
                        <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                </div>
                <div class="ai-message-content">
                    <p>🔧 <strong>需要配置AI服务</strong></p>
                    <p>请访问 <a href="https://www.xfyun.cn/" target="_blank" style="color: #667eea;">讯飞开放平台</a> 获取API密钥：</p>
                    <ol style="margin: 8px 0; padding-left: 20px; font-size: 13px;">
                        <li>注册登录讯飞开放平台</li>
                        <li>创建应用获取 AppID、APIKey、APISecret</li>
                        <li>点击下方按钮配置密钥</li>
                    </ol>
                    <button class="ai-config-btn" onclick="window.aiAssistant.showConfigModal()">
                        ⚙️ 配置API密钥
                    </button>
                </div>
            </div>
        `;
        
        this.messages.appendChild(promptDiv);
        this.scrollToBottom();
    }

    handleQuickAction(e) {
        const action = e.currentTarget.dataset.action;
        const messages = {
            explain: '请解释一下当前的知识点',
            practice: '我需要练习题目的详细讲解',
            plan: '帮我制定学习计划'
        };
        
        const message = messages[action];
        if (message) {
            this.input.value = message;
            this.handleInputChange();
            this.input.focus();
        }
    }

    addMessage(content, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `ai-message ai-message-${type}`;
        
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'ai-message-avatar';
        
        const avatarSvg = type === 'assistant' 
            ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                 <circle cx="12" cy="12" r="10"/>
                 <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                 <line x1="9" y1="9" x2="9.01" y2="9"/>
                 <line x1="15" y1="9" x2="15.01" y2="9"/>
               </svg>`
            : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                 <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                 <circle cx="12" cy="7" r="4"/>
               </svg>`;
        
        avatarDiv.innerHTML = avatarSvg;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'ai-message-content';
        contentDiv.innerHTML = `<p>${content}</p>`;
        
        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);
        
        this.messages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    addLoadingMessage() {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'ai-message ai-message-assistant ai-loading';
        loadingDiv.innerHTML = `
            <div class="ai-message-avatar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                    <line x1="9" y1="9" x2="9.01" y2="9"/>
                    <line x1="15" y1="9" x2="15.01" y2="9"/>
                </svg>
            </div>
            <div class="ai-message-content">
                <p>思考中...</p>
            </div>
        `;
        
        this.messages.appendChild(loadingDiv);
        this.scrollToBottom();
    }

    removeLoadingMessage() {
        const loading = this.messages.querySelector('.ai-loading');
        if (loading) {
            loading.remove();
        }
    }

    scrollToBottom() {
        setTimeout(() => {
            this.messages.scrollTop = this.messages.scrollHeight;
        }, 50);
    }

    show() {
        if (this.isVisible && !this.isMinimized) return;
        
        this.isVisible = true;
        this.isMinimized = false;
        
        this.container.style.display = 'flex';
        this.window.style.display = 'flex';
        this.bubble.style.display = 'none';
        
        // 初始化为模态模式
        if (!this.container.classList.contains('floating-mode') && !this.container.classList.contains('modal-mode')) {
            this.isFloatingMode = false;
            this.updateDisplayMode();
        }
        
        this.window.classList.add('show');
        
        setTimeout(() => {
            this.input.focus();
        }, 300);
    }

    hide() {
        if (!this.isVisible) return;
        
        this.isVisible = false;
        this.isMinimized = false;
        
        this.window.classList.add('hide');
        
        setTimeout(() => {
            this.container.style.display = 'none';
            this.window.classList.remove('show', 'hide');
        }, 300);
    }

    minimize() {
        if (!this.isVisible || this.isMinimized) return;
        
        this.isMinimized = true;
        
        this.window.style.display = 'none';
        this.bubble.style.display = 'flex';
    }

    toggle() {
        if (this.isVisible && !this.isMinimized) {
            this.hide();
        } else {
            this.show();
        }
    }

    /**
     * 显示配置模态框
     */
    showConfigModal() {
        if (this.configModal) {
            this.configModal.style.display = 'flex';
            this.loadCurrentConfig();
        }
    }

    /**
     * 关闭配置模态框
     */
    closeConfigModal() {
        if (this.configModal) {
            this.configModal.style.display = 'none';
        }
    }

    /**
     * 加载当前配置到表单
     */
    loadCurrentConfig() {
        if (!window.aiAPIManager) return;

        const config = window.aiAPIManager.loadAPIConfig('xunfei');
        
        const appIdInput = document.getElementById('xunfei-appid');
        const apiKeyInput = document.getElementById('xunfei-apikey');
        const apiSecretInput = document.getElementById('xunfei-apisecret');

        if (appIdInput) appIdInput.value = config.appId || '';
        if (apiKeyInput) apiKeyInput.value = config.apiKey || '';
        if (apiSecretInput) apiSecretInput.value = config.apiSecret || '';
    }

    /**
     * 保存配置
     */
    async saveConfig() {
        try {
            const appId = document.getElementById('xunfei-appid')?.value?.trim();
            const apiKey = document.getElementById('xunfei-apikey')?.value?.trim();
            const apiSecret = document.getElementById('xunfei-apisecret')?.value?.trim();

            if (!appId || !apiKey || !apiSecret) {
                this.showConfigMessage('请填写完整的配置信息', 'error');
                return;
            }

            if (!window.aiAPIManager) {
                this.showConfigMessage('AI服务管理器未初始化', 'error');
                return;
            }

            this.showConfigMessage('正在保存配置...', 'info');

            const result = await window.aiAPIManager.setAPIConfig('xunfei', {
                appId,
                apiKey,
                apiSecret
            });

            if (result.success) {
                this.showConfigMessage('配置保存成功！', 'success');
                setTimeout(() => {
                    this.closeConfigModal();
                }, 1500);
            } else {
                this.showConfigMessage(result.message, 'error');
            }

        } catch (error) {
            console.error('保存配置失败:', error);
            this.showConfigMessage(`保存失败: ${error.message}`, 'error');
        }
    }

    /**
     * 测试连接
     */
    async testConnection() {
        try {
            if (!window.aiAPIManager) {
                this.showConfigMessage('AI服务管理器未初始化', 'error');
                return;
            }

            this.showConfigMessage('正在测试连接...', 'info');

            const result = await window.aiAPIManager.testConnection('xunfei');
            
            if (result) {
                this.showConfigMessage('连接测试成功！', 'success');
            }

        } catch (error) {
            console.error('连接测试失败:', error);
            this.showConfigMessage(`连接失败: ${error.message}`, 'error');
        }
    }

    /**
     * 显示配置消息
     */
    showConfigMessage(message, type = 'info') {
        // 查找或创建消息容器
        let msgContainer = document.querySelector('.ai-config-message');
        if (!msgContainer) {
            msgContainer = document.createElement('div');
            msgContainer.className = 'ai-config-message';
            
            const configBody = document.querySelector('.ai-config-body');
            if (configBody) {
                configBody.insertBefore(msgContainer, configBody.firstChild);
            }
        }

        // 设置消息样式和内容
        msgContainer.className = `ai-config-message ai-config-message-${type}`;
        msgContainer.textContent = message;
        msgContainer.style.display = 'block';

        // 自动隐藏消息（除了错误消息）
        if (type !== 'error') {
            setTimeout(() => {
                msgContainer.style.display = 'none';
            }, 3000);
        }
    }
}

// 导出类供其他模块使用
window.AIAssistantFloat = AIAssistantFloat;

// 仅在CommonJS环境下导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIAssistantFloat;
}