/**
 * AI助手通用加载器
 * 在任何页面中引用此脚本即可自动加载AI助手
 */

// 确保在DOM加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    loadAIAssistant();
});

async function loadAIAssistant() {
    try {
        console.log('🚀 开始加载AI助手...');
        
        // 动态加载CSS
        if (!document.querySelector('link[href*="ai-assistant-float.css"]')) {
            const cssLink = document.createElement('link');
            cssLink.rel = 'stylesheet';
            cssLink.href = 'assets/css/ai-assistant-float.css';
            document.head.appendChild(cssLink);
            console.log('✅ CSS样式表已加载');
        }
        
        // 动态加载API管理器相关脚本
        const scriptsToLoad = [
            'assets/js/xunfei-spark-api.js',
            'assets/js/ai-api-manager.js',
            'assets/js/ai-assistant-float.js'
        ];

        for (const script of scriptsToLoad) {
            if (!document.querySelector(`script[src="${script}"]`)) {
                console.log(`📥 正在加载: ${script}`);
                await new Promise((resolve, reject) => {
                    const scriptElement = document.createElement('script');
                    scriptElement.src = script;
                    scriptElement.onload = () => {
                        console.log(`✅ 已加载: ${script}`);
                        resolve();
                    };
                    scriptElement.onerror = (error) => {
                        console.error(`❌ 加载失败: ${script}`, error);
                        reject(error);
                    };
                    document.head.appendChild(scriptElement);
                });
            } else {
                console.log(`⏭️ 已存在: ${script}`);
            }
        }
        
        // 等待一段时间确保类定义加载完成
        console.log('⏳ 等待脚本初始化...');
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // 检查类是否可用
        console.log('🔍 检查类可用性:', {
            XunfeiSparkAPI: !!window.XunfeiSparkAPI,
            AIAPIManager: !!window.AIAPIManager,
            AIAssistantFloat: !!window.AIAssistantFloat
        });
        
        // 初始化AI API管理器
        if (!window.aiAPIManager && window.AIAPIManager) {
            window.aiAPIManager = new AIAPIManager();
            console.log('✅ AI API管理器初始化完成');
        } else if (!window.AIAPIManager) {
            console.error('❌ AIAPIManager类未找到');
        }
        
        // 初始化AI助手
        if (!window.aiAssistant && window.AIAssistantFloat) {
            console.log('🤖 正在初始化AI助手...');
            try {
                window.aiAssistant = new AIAssistantFloat();
                console.log('✅ AI助手初始化成功');
                
                // 验证实例方法
                if (typeof window.aiAssistant.show === 'function') {
                    console.log('✅ AI助手方法可用');
                } else {
                    console.error('❌ AI助手show方法不可用');
                }
            } catch (error) {
                console.error('❌ AI助手初始化失败:', error);
                throw error;
            }
        } else if (!window.AIAssistantFloat) {
            console.error('❌ AIAssistantFloat类未找到');
        }
        
        // 添加启动按钮
        addTriggerButton();
        
        console.log('🎉 AI助手加载完成');
    } catch (error) {
        console.error('💥 AI助手加载失败:', error);
    }
}

function addTriggerButton() {
    // 避免重复添加
    if (document.getElementById('ai-assistant-trigger')) {
        console.log('触发按钮已存在，跳过添加');
        return;
    }
    
    const triggerHTML = `
    <div id="ai-assistant-trigger-container" class="ai-trigger-container">
        <button 
            id="ai-assistant-trigger" 
            class="ai-assistant-trigger"
            title="打开AI学习助手">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2L2 7L12 12L22 7L12 2Z"/>
                <path d="M2 17L12 22L22 17"/>
                <path d="M2 12L12 17L22 12"/>
            </svg>
            <div class="ai-trigger-pulse"></div>
        </button>
    </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', triggerHTML);
    
    // 等待DOM更新后绑定事件
    setTimeout(() => {
        const triggerBtn = document.getElementById('ai-assistant-trigger');
        if (triggerBtn) {
            triggerBtn.addEventListener('click', function() {
                console.log('🖱️ 触发按钮被点击');
                
                // 详细检查状态
                console.log('🔍 当前状态:', {
                    aiAssistant: !!window.aiAssistant,
                    aiAssistantType: typeof window.aiAssistant,
                    showMethod: !!window.aiAssistant?.show,
                    showMethodType: typeof window.aiAssistant?.show
                });
                
                if (window.aiAssistant && typeof window.aiAssistant.show === 'function') {
                    console.log('✅ 正在打开AI助手...');
                    try {
                        window.aiAssistant.show();
                        console.log('✅ AI助手已打开');
                    } catch (error) {
                        console.error('❌ 打开AI助手失败:', error);
                    }
                } else {
                    console.error('❌ AI助手未正确初始化');
                    
                    // 尝试延迟调用并重新初始化
                    console.log('🔄 尝试重新初始化...');
                    setTimeout(() => {
                        if (window.AIAssistantFloat) {
                            try {
                                if (!window.aiAssistant) {
                                    window.aiAssistant = new AIAssistantFloat();
                                    console.log('✅ 重新初始化成功');
                                }
                                
                                if (window.aiAssistant?.show) {
                                    window.aiAssistant.show();
                                    console.log('✅ 延迟打开成功');
                                }
                            } catch (error) {
                                console.error('❌ 重新初始化失败:', error);
                                alert('AI助手初始化失败，请刷新页面重试');
                            }
                        } else {
                            console.error('❌ AIAssistantFloat类不可用');
                            alert('AI助手未完全加载，请稍后再试或刷新页面');
                        }
                    }, 1000);
                }
            });
            console.log('✅ 触发按钮事件绑定完成');
        } else {
            console.error('❌ 未找到触发按钮元素');
        }
    }, 100);
    
    // 添加按钮样式
    if (!document.querySelector('style[data-ai-trigger-styles]')) {
        const style = document.createElement('style');
        style.setAttribute('data-ai-trigger-styles', 'true');
        style.textContent = `
        /* AI触发按钮容器 - 固定定位不受页面缩放影响 */
        .ai-trigger-container {
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 9999;
            pointer-events: none;
        }
        
        .ai-assistant-trigger {
            width: 64px;
            height: 64px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none;
            border-radius: 50%;
            box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
            pointer-events: all;
        }

        .ai-assistant-trigger:hover {
            transform: scale(1.1);
            box-shadow: 0 12px 32px rgba(102, 126, 234, 0.6);
        }

        .ai-assistant-trigger svg {
            width: 26px;
            height: 26px;
            z-index: 2;
        }

        .ai-trigger-pulse {
            position: absolute;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            opacity: 0;
            animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }

        @keyframes pulse-ring {
            0% {
                transform: scale(1);
                opacity: 0.6;
            }
            50% {
                transform: scale(1.3);
                opacity: 0.3;
            }
            100% {
                transform: scale(1.5);
                opacity: 0;
            }
        }

        /* 响应式适配 */
        @media (max-width: 768px) {
            .ai-trigger-container {
                bottom: 16px;
                right: 16px;
            }
            
            .ai-assistant-trigger {
                width: 56px;
                height: 56px;
            }
            
            .ai-assistant-trigger svg {
                width: 22px;
                height: 22px;
            }
        }

        /* 深色模式适配 */
        .dark .ai-assistant-trigger {
            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
            box-shadow: 0 8px 24px rgba(79, 70, 229, 0.4);
        }

        .dark .ai-assistant-trigger:hover {
            box-shadow: 0 12px 32px rgba(79, 70, 229, 0.6);
        }

        .dark .ai-trigger-pulse {
            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
        }
        `;
        document.head.appendChild(style);
    }
}

// 暴露全局接口
window.loadAIAssistant = loadAIAssistant;