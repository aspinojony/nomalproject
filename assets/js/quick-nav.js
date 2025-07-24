/**
 * 快捷导航栏组件
 * 提供快速访问各个功能模块的入口
 */

// 快捷导航栏HTML模板
const QUICK_NAV_HTML = `
    <!-- 快捷导航栏 -->
    <div class="fixed right-4 top-1/2 transform -translate-y-1/2 z-40" x-data="quickNavApp()" x-show="showQuickNav">
        <!-- 折叠/展开按钮 -->
        <button @click="toggleQuickNav()" 
                class="mb-4 w-12 h-12 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-all duration-300 flex items-center justify-center"
                :class="isExpanded ? 'rotate-45' : 'rotate-0'">
            <i class="fas fa-plus text-lg"></i>
        </button>
        
        <!-- 导航菜单 -->
        <div class="space-y-3 transition-all duration-300 transform origin-bottom" 
             :class="isExpanded ? 'scale-100 opacity-100' : 'scale-75 opacity-0 pointer-events-none'">
            
            <!-- 首页 -->
            <a href="index.html" 
               class="quick-nav-item group" 
               :class="getCurrentPage() === 'index' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-indigo-50'"
               title="首页">
                <i class="fas fa-home text-lg group-hover:scale-110 transition-transform"></i>
                <span class="quick-nav-tooltip">首页</span>
            </a>
            
            <!-- 课程导航 -->
            <a href="subjects.html" 
               class="quick-nav-item group"
               :class="getCurrentPage() === 'subjects' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-indigo-50'"
               title="课程导航">
                <i class="fas fa-book-open text-lg group-hover:scale-110 transition-transform"></i>
                <span class="quick-nav-tooltip">课程导航</span>
            </a>
            
            <!-- 真题练习 -->
            <a href="practice.html" 
               class="quick-nav-item group"
               :class="getCurrentPage() === 'practice' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-indigo-50'"
               title="真题练习">
                <i class="fas fa-pencil-alt text-lg group-hover:scale-110 transition-transform"></i>
                <span class="quick-nav-tooltip">真题练习</span>
            </a>
            
            <!-- 题目管理 -->
            <a href="question-manager.html" 
               class="quick-nav-item group"
               :class="getCurrentPage() === 'question-manager' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-indigo-50'"
               title="题目管理">
                <i class="fas fa-cogs text-lg group-hover:scale-110 transition-transform"></i>
                <span class="quick-nav-tooltip">题目管理</span>
            </a>
            
            <!-- 学习资源 -->
            <a href="resources.html" 
               class="quick-nav-item group"
               :class="getCurrentPage() === 'resources' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-indigo-50'"
               title="学习资源">
                <i class="fas fa-external-link-alt text-lg group-hover:scale-110 transition-transform"></i>
                <span class="quick-nav-tooltip">学习资源</span>
            </a>
            
            <!-- 分割线 -->
            <div class="border-t border-gray-200 my-2"></div>
            
            <!-- 快捷功能 -->
            <button @click="openRandomPractice()" 
                    class="quick-nav-item group bg-green-500 text-white hover:bg-green-600"
                    title="随机练习">
                <i class="fas fa-random text-lg group-hover:scale-110 transition-transform"></i>
                <span class="quick-nav-tooltip">随机练习</span>
            </button>
            
            <button @click="openStatsModal()" 
                    class="quick-nav-item group bg-purple-500 text-white hover:bg-purple-600"
                    title="学习统计">
                <i class="fas fa-chart-bar text-lg group-hover:scale-110 transition-transform"></i>
                <span class="quick-nav-tooltip">学习统计</span>
            </button>
            
            <button @click="toggleDarkMode()" 
                    class="quick-nav-item group bg-gray-700 text-white hover:bg-gray-800"
                    title="深色模式">
                <i :class="isDarkMode ? 'fas fa-sun' : 'fas fa-moon'" 
                   class="text-lg group-hover:scale-110 transition-transform"></i>
                <span class="quick-nav-tooltip" x-text="isDarkMode ? '浅色模式' : '深色模式'"></span>
            </button>
            
            <!-- 返回顶部 -->
            <button @click="scrollToTop()" 
                    class="quick-nav-item group bg-orange-500 text-white hover:bg-orange-600"
                    title="返回顶部">
                <i class="fas fa-arrow-up text-lg group-hover:scale-110 transition-transform"></i>
                <span class="quick-nav-tooltip">返回顶部</span>
            </button>
        </div>
    </div>
`;

// 快捷导航栏CSS样式
const QUICK_NAV_CSS = `
    <style>
        .quick-nav-item {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 48px;
            height: 48px;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            transition: all 0.3s ease;
            position: relative;
            text-decoration: none;
            border: none;
            cursor: pointer;
        }
        
        .quick-nav-item:hover {
            transform: translateX(-4px) scale(1.05);
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
        }
        
        .quick-nav-tooltip {
            position: absolute;
            right: 60px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 14px;
            white-space: nowrap;
            opacity: 0;
            pointer-events: none;
            transition: all 0.3s ease;
            transform: translateX(10px);
        }
        
        .quick-nav-item:hover .quick-nav-tooltip {
            opacity: 1;
            transform: translateX(0);
        }
        
        .quick-nav-tooltip::after {
            content: '';
            position: absolute;
            left: 100%;
            top: 50%;
            transform: translateY(-50%);
            border: 5px solid transparent;
            border-left-color: rgba(0, 0, 0, 0.8);
        }
        
        /* 响应式设计 */
        @media (max-width: 768px) {
            .quick-nav-item {
                width: 44px;
                height: 44px;
            }
            
            .quick-nav-tooltip {
                display: none;
            }
        }
        
        /* 深色模式支持 */
        .dark .quick-nav-item {
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }
        
        .dark .quick-nav-item:not(.bg-indigo-600):not(.bg-green-500):not(.bg-purple-500):not(.bg-gray-700):not(.bg-orange-500) {
            background-color: #374151;
            color: #f3f4f6;
        }
    </style>
`;

// 快捷导航栏JavaScript逻辑
function quickNavApp() {
    return {
        isExpanded: false,
        showQuickNav: true,
        isDarkMode: false,
        
        init() {
            // 初始化深色模式状态
            this.isDarkMode = localStorage.getItem('darkMode') === 'true';
            this.applyDarkMode();
            
            // 监听滚动事件，自动隐藏/显示快捷导航
            let scrollTimer = null;
            window.addEventListener('scroll', () => {
                this.showQuickNav = false;
                clearTimeout(scrollTimer);
                scrollTimer = setTimeout(() => {
                    this.showQuickNav = true;
                }, 150);
            });
        },
        
        toggleQuickNav() {
            this.isExpanded = !this.isExpanded;
        },
        
        getCurrentPage() {
            const path = window.location.pathname;
            const filename = path.split('/').pop().split('.')[0];
            return filename || 'index';
        },
        
        openRandomPractice() {
            if (typeof startQuickPractice === 'function') {
                startQuickPractice('mixed');
            } else {
                window.location.href = 'practice.html';
            }
            this.isExpanded = false;
        },
        
        openStatsModal() {
            if (typeof showStatsModal !== 'undefined') {
                showStatsModal = true;
            } else {
                // 简单的统计信息显示
                const stats = this.getBasicStats();
                alert(\`学习统计\\n\\n总完成题数: \${stats.totalCompleted}\\n今日完成: \${stats.dailyCompleted}\\n正确率: \${stats.accuracyRate}%\\n\\n详细统计请访问练习页面\`);
            }
            this.isExpanded = false;
        },
        
        getBasicStats() {
            const totalCompleted = localStorage.getItem('totalCompleted') || 0;
            const dailyStats = localStorage.getItem('dailyStats');
            const practiceStats = localStorage.getItem('practiceStats');
            
            let dailyCompleted = 0;
            let accuracyRate = 0;
            
            if (dailyStats) {
                try {
                    const stats = JSON.parse(dailyStats);
                    const today = new Date().toDateString();
                    dailyCompleted = stats[today] || 0;
                } catch (e) {}
            }
            
            if (practiceStats) {
                try {
                    const stats = JSON.parse(practiceStats);
                    if (stats.totalAnswered > 0) {
                        accuracyRate = Math.round((stats.totalCorrect / stats.totalAnswered) * 100);
                    }
                } catch (e) {}
            }
            
            return { totalCompleted, dailyCompleted, accuracyRate };
        },
        
        toggleDarkMode() {
            this.isDarkMode = !this.isDarkMode;
            localStorage.setItem('darkMode', this.isDarkMode.toString());
            this.applyDarkMode();
            this.isExpanded = false;
        },
        
        applyDarkMode() {
            if (this.isDarkMode) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        },
        
        scrollToTop() {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
            this.isExpanded = false;
        }
    };
}

// 初始化快捷导航栏的函数
function initQuickNav() {
    // 添加CSS样式
    const styleElement = document.createElement('div');
    styleElement.innerHTML = QUICK_NAV_CSS;
    document.head.appendChild(styleElement.firstElementChild);
    
    // 添加HTML结构
    const navElement = document.createElement('div');
    navElement.innerHTML = QUICK_NAV_HTML;
    document.body.appendChild(navElement.firstElementChild);
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    // 延迟初始化，确保其他脚本已加载
    setTimeout(initQuickNav, 100);
});

console.log('🚀 快捷导航栏组件已加载');