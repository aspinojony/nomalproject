/**
 * 章节选择器控制器
 * 用于AI助手询问时选择相关的课程章节
 */
class ChapterSelector {
    constructor() {
        this.currentCategory = 'all';
        this.selectedChapter = null;
        this.courseData = [];
        this.filteredData = [];
        this.onSelect = null; // 选择回调函数
        
        this.init();
    }

    async init() {
        try {
            await this.loadComponent();
            await this.loadCourseData();
            this.bindEvents();
            this.renderChapterList();
            console.log('✅ 章节选择器初始化完成');
        } catch (error) {
            console.error('章节选择器初始化失败:', error);
        }
    }

    async loadComponent() {
        // 检查是否已经存在
        if (document.getElementById('chapter-selector')) {
            this.bindElements();
            return;
        }

        try {
            // 尝试加载HTML组件
            const response = await fetch('assets/components/chapter-selector.html');
            if (response.ok) {
                const html = await response.text();
                document.body.insertAdjacentHTML('beforeend', html);
            } else {
                throw new Error('无法加载章节选择器组件');
            }
        } catch (error) {
            console.warn('使用内嵌HTML组件:', error.message);
            this.insertInlineComponent();
        }

        this.bindElements();
    }

    bindElements() {
        this.container = document.getElementById('chapter-selector');
        this.modal = this.container?.querySelector('.chapter-selector-modal');
        this.searchInput = document.getElementById('chapter-search-input');
        this.chapterList = document.getElementById('chapter-list');
        this.selectedInfo = document.getElementById('selected-chapter-info');
        this.confirmBtn = document.getElementById('chapter-confirm-btn');
        this.tabs = this.container?.querySelectorAll('.chapter-tab');
    }

    insertInlineComponent() {
        // 直接插入HTML组件避免加载问题
        const html = `
<!-- 章节选择器组件 -->
<div id="chapter-selector" class="chapter-selector-container" style="display: none;">
    <div class="chapter-selector-overlay" onclick="window.chapterSelector.close()"></div>
    <div class="chapter-selector-modal">
        <div class="chapter-selector-header">
            <h3>选择相关章节</h3>
            <button class="chapter-close-btn" onclick="window.chapterSelector.close()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>
        </div>
        
        <div class="chapter-selector-body">
            <div class="chapter-search">
                <input type="text" id="chapter-search-input" placeholder="搜索科目或章节..." 
                       class="chapter-search-input">
                <svg class="chapter-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"/>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
            </div>
            
            <div class="chapter-categories">
                <div class="chapter-tabs">
                    <button class="chapter-tab active" data-category="all">全部</button>
                    <button class="chapter-tab" data-category="public">公共课</button>
                    <button class="chapter-tab" data-category="professional">专业课</button>
                </div>
            </div>
            
            <div class="chapter-list" id="chapter-list">
                <!-- 章节列表将动态加载到这里 -->
            </div>
        </div>
        
        <div class="chapter-selector-footer">
            <div class="selected-chapter-info" id="selected-chapter-info">
                <span class="no-selection">请选择一个章节</span>
            </div>
            <button class="chapter-confirm-btn" id="chapter-confirm-btn" disabled>
                确认选择
            </button>
        </div>
    </div>
</div>`;
        
        document.body.insertAdjacentHTML('beforeend', html);
        
        // 添加CSS样式
        this.addComponentStyles();
    }
    
    addComponentStyles() {
        if (document.getElementById('chapter-selector-styles')) return;
        
        const styles = `
        <style id="chapter-selector-styles">
        .chapter-selector-container {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        }

        .chapter-selector-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
        }

        .chapter-selector-modal {
            background: white;
            border-radius: 12px;
            width: 90%;
            max-width: 600px;
            max-height: 80vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
            position: relative;
        }

        .chapter-selector-header {
            padding: 20px;
            border-bottom: 1px solid #e5e7eb;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .chapter-selector-header h3 {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
            color: #1f2937;
        }

        .chapter-close-btn {
            background: none;
            border: none;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 6px;
            cursor: pointer;
            color: #6b7280;
            transition: all 0.2s;
        }

        .chapter-close-btn:hover {
            background: #f3f4f6;
            color: #374151;
        }

        .chapter-close-btn svg {
            width: 20px;
            height: 20px;
        }

        .chapter-selector-body {
            flex: 1;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }

        .chapter-search {
            padding: 20px 20px 0;
            position: relative;
        }

        .chapter-search-input {
            width: 100%;
            padding: 12px 16px 12px 40px;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            font-size: 14px;
            background: #f9fafb;
            transition: all 0.2s;
        }

        .chapter-search-input:focus {
            outline: none;
            border-color: #3b82f6;
            background: white;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .chapter-search-icon {
            position: absolute;
            left: 32px;
            top: 32px;
            width: 16px;
            height: 16px;
            color: #9ca3af;
            pointer-events: none;
        }

        .chapter-categories {
            padding: 16px 20px 0;
        }

        .chapter-tabs {
            display: flex;
            gap: 8px;
            border-bottom: 1px solid #e5e7eb;
        }

        .chapter-tab {
            padding: 8px 16px;
            background: none;
            border: none;
            color: #6b7280;
            font-size: 14px;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            transition: all 0.2s;
        }

        .chapter-tab.active,
        .chapter-tab:hover {
            color: #3b82f6;
            border-bottom-color: #3b82f6;
        }

        .chapter-list {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
        }

        .subject-group {
            margin-bottom: 24px;
        }

        .subject-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 12px;
            padding: 8px 0;
            border-bottom: 1px solid #e5e7eb;
        }

        .subject-icon {
            width: 20px;
            height: 20px;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 12px;
        }

        .subject-name {
            font-weight: 600;
            color: #1f2937;
            font-size: 16px;
        }

        .chapter-items {
            display: grid;
            gap: 8px;
        }

        .chapter-item {
            padding: 12px 16px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s;
            background: white;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .chapter-item:hover {
            border-color: #3b82f6;
            background: #f8faff;
        }

        .chapter-item.selected {
            border-color: #3b82f6;
            background: #eff6ff;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .chapter-info {
            flex: 1;
        }

        .chapter-name {
            font-weight: 500;
            color: #1f2937;
            font-size: 14px;
            margin-bottom: 4px;
        }

        .chapter-meta {
            display: flex;
            gap: 12px;
            font-size: 12px;
            color: #6b7280;
        }

        .chapter-duration {
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .chapter-difficulty {
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .difficulty-badge {
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 11px;
            font-weight: 500;
        }

        .difficulty-easy {
            background: #dcfce7;
            color: #166534;
        }

        .difficulty-medium {
            background: #fef3c7;
            color: #92400e;
        }

        .difficulty-hard {
            background: #fee2e2;
            color: #991b1b;
        }

        .chapter-select-icon {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            border: 2px solid #d1d5db;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
        }

        .chapter-item.selected .chapter-select-icon {
            border-color: #3b82f6;
            background: #3b82f6;
            color: white;
        }

        .chapter-selector-footer {
            padding: 20px;
            border-top: 1px solid #e5e7eb;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
        }

        .selected-chapter-info {
            flex: 1;
            font-size: 14px;
        }

        .no-selection {
            color: #9ca3af;
        }

        .selected-info {
            color: #374151;
        }

        .selected-subject {
            font-weight: 600;
            color: #3b82f6;
        }

        .chapter-confirm-btn {
            padding: 10px 24px;
            background: #3b82f6;
            color: white;
            border: none;
            border-radius: 6px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
        }

        .chapter-confirm-btn:hover:not(:disabled) {
            background: #2563eb;
        }

        .chapter-confirm-btn:disabled {
            background: #9ca3af;
            cursor: not-allowed;
        }

        .empty-state {
            text-align: center;
            padding: 40px 20px;
            color: #6b7280;
        }

        .empty-state svg {
            width: 48px;
            height: 48px;
            margin: 0 auto 16px;
            color: #d1d5db;
        }

        @media (max-width: 640px) {
            .chapter-selector-modal {
                width: 95%;
                max-height: 90vh;
            }
            
            .chapter-selector-header,
            .chapter-selector-footer {
                padding: 16px;
            }
            
            .chapter-search {
                padding: 16px 16px 0;
            }
            
            .chapter-list {
                padding: 16px;
            }
            
            .chapter-meta {
                flex-direction: column;
                gap: 4px;
            }
        }
        </style>`;
        
        document.head.insertAdjacentHTML('beforeend', styles);
    }

async loadCourseData() {
    try {
        // ✅ 强制使用 resourceLoader 加载 JSON 数据
        const data = await window.resourceLoader.loadJSON(
            'bilibilicatgorybydifficulty.json',
            window.fallbackCourseData || [],
            { useJSFallback: true }
        );

        // ✅ 筛选 ID 1–9 的课程
        this.courseData = data.filter(course => course.id >= 1 && course.id <= 9);
        console.log('✅ 从 bilibilicatgorybydifficulty.json 加载课程，共', this.courseData.length, '门');

        // ✅ 初始全部数据渲染（默认显示全部）
        this.filteredData = this.courseData;
    } catch (error) {
        console.error('❌ 加载课程数据失败:', error);
        this.courseData = [];
        this.filteredData = [];
    }
}


    bindEvents() {
        if (!this.container) return;

        // 搜索功能
        if (this.searchInput) {
            this.searchInput.addEventListener('input', this.handleSearch.bind(this));
        }

        // 分类切换
        if (this.tabs) {
            this.tabs.forEach(tab => {
                tab.addEventListener('click', this.handleCategoryChange.bind(this));
            });
        }

        // 确认按钮
        if (this.confirmBtn) {
            this.confirmBtn.addEventListener('click', this.handleConfirm.bind(this));
        }

        // 点击遮罩关闭
        const overlay = this.container.querySelector('.chapter-selector-overlay');
        if (overlay) {
            overlay.addEventListener('click', this.close.bind(this));
        }

        // ESC键关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible()) {
                this.close();
            }
        });
    }

    handleSearch(e) {
        const query = e.target.value.toLowerCase().trim();
        
        if (!query) {
            this.filteredData = this.filterByCategory(this.courseData);
        } else {
            const filtered = this.courseData.filter(subject => {
                const nameMatch = subject.name.toLowerCase().includes(query);
                const chapterMatch = subject.chapters?.some(chapter => 
                    chapter.name.toLowerCase().includes(query)
                );
                return nameMatch || chapterMatch;
            });
            
            this.filteredData = this.filterByCategory(filtered);
        }
        
        this.renderChapterList();
    }

    handleCategoryChange(e) {
        const category = e.target.dataset.category;
        
        // 更新活动状态
        this.tabs.forEach(tab => tab.classList.remove('active'));
        e.target.classList.add('active');
        
        this.currentCategory = category;
        this.filteredData = this.filterByCategory(this.courseData);
        this.renderChapterList();
    }

filterByCategory(data) {
    if (this.currentCategory === 'all') {
        return data;
    }

    return data.filter(subject => {
        if (this.currentCategory === 'public') {
            return subject.id >= 1 && subject.id <= 5;
        } else if (this.currentCategory === 'professional') {
            return subject.id >= 6 && subject.id <= 9;
        }
        return true;
    });
}

    renderChapterList() {
        if (!this.chapterList) {
            console.error('chapterList元素未找到');
            return;
        }

        console.log('渲染章节列表，过滤后数据:', this.filteredData.length, '个科目');

        if (this.filteredData.length === 0) {
            console.log('没有数据，显示空状态');
            this.chapterList.innerHTML = this.renderEmptyState();
            return;
        }

        const html = this.filteredData.map(subject => {
            console.log('渲染科目:', subject.name, '章节数:', subject.chapters?.length || 0);
            return this.renderSubjectGroup(subject);
        }).join('');
        
        this.chapterList.innerHTML = html;
        
        // 绑定章节点击事件
        this.chapterList.querySelectorAll('.chapter-item').forEach(item => {
            item.addEventListener('click', this.handleChapterSelect.bind(this));
        });
        
        console.log('章节列表渲染完成');
    }

    renderSubjectGroup(subject) {
        const chapters = subject.chapters || [];
        
        // 简化图标，使用emoji或简单字符
        const iconChar = this.getSubjectIcon(subject.name);
        
        return `
            <div class="subject-group">
                <div class="subject-header">
                    <div class="subject-icon" style="background-color: ${subject.color || '#3b82f6'}">
                        ${iconChar}
                    </div>
                    <div class="subject-name">${subject.name}</div>
                </div>
                <div class="chapter-items">
                    ${chapters.map((chapter, index) => this.renderChapterItem(chapter, subject, index)).join('')}
                </div>
            </div>
        `;
    }

    getSubjectIcon(subjectName) {
        const iconMap = {
            '高等数学': '∫',
            '线性代数': '⊗',
            '概率论与数理统计': '∑',
            '英语二': 'E',
            '政治': 'P',
            '数据结构': 'D',
            '操作系统': 'O',
            '计算机网络': 'N',
            '计算机组成原理': 'C'
        };
        return iconMap[subjectName] || '📚';
    }

    renderChapterItem(chapter, subject, index) {
        const difficultyClass = this.getDifficultyClass(chapter.difficulty);
        const chapterId = `${subject.id}-${index}`;
        
        return `
            <div class="chapter-item" data-subject-id="${subject.id}" data-chapter-index="${index}" data-chapter-id="${chapterId}">
                <div class="chapter-info">
                    <div class="chapter-name">${chapter.name}</div>
                    <div class="chapter-meta">
                        <span class="chapter-duration">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"/>
                                <polyline points="12,6 12,12 16,14"/>
                            </svg>
                            ${chapter.duration || '未知'}
                        </span>
                        <span class="chapter-difficulty">
                            <span class="difficulty-badge ${difficultyClass}">
                                ${chapter.difficulty || '中等'}
                            </span>
                        </span>
                    </div>
                </div>
                <div class="chapter-select-icon">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                        <polyline points="20,6 9,17 4,12"/>
                    </svg>
                </div>
            </div>
        `;
    }

    renderEmptyState() {
        return `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"/>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <p>没有找到相关章节</p>
                <p style="font-size: 12px; margin-top: 8px;">请尝试调整搜索关键词或切换分类</p>
            </div>
        `;
    }

    getDifficultyClass(difficulty) {
        const difficultyMap = {
            '简单': 'difficulty-easy',
            '中等': 'difficulty-medium', 
            '困难': 'difficulty-hard'
        };
        return difficultyMap[difficulty] || 'difficulty-medium';
    }

    handleChapterSelect(e) {
        const item = e.currentTarget;
        const subjectId = parseInt(item.dataset.subjectId);
        const chapterIndex = parseInt(item.dataset.chapterIndex);
        
        // 清除之前的选择
        this.chapterList.querySelectorAll('.chapter-item').forEach(el => {
            el.classList.remove('selected');
        });
        
        // 选中当前项
        item.classList.add('selected');
        
        // 更新选择信息
        const subject = this.courseData.find(s => s.id === subjectId);
        const chapter = subject?.chapters?.[chapterIndex];
        
        if (subject && chapter) {
            this.selectedChapter = {
                subject: {
                    id: subject.id,
                    name: subject.name,
                    color: subject.color
                },
                chapter: {
                    index: chapterIndex,
                    name: chapter.name,
                    duration: chapter.duration,
                    difficulty: chapter.difficulty,
                    url: chapter.url
                }
            };
            
            this.updateSelectedInfo();
            this.confirmBtn.disabled = false;
        }
    }

    updateSelectedInfo() {
        if (!this.selectedInfo || !this.selectedChapter) return;
        
        const { subject, chapter } = this.selectedChapter;
        
        this.selectedInfo.innerHTML = `
            <div class="selected-info">
                <span class="selected-subject">${subject.name}</span> 
                → ${chapter.name}
            </div>
        `;
    }

    handleConfirm() {
        if (!this.selectedChapter) return;
        
        // 执行回调函数
        if (this.onSelect && typeof this.onSelect === 'function') {
            this.onSelect(this.selectedChapter);
        }
        
        this.close();
    }

    // 公共方法
    show(callback) {
        if (!this.container) {
            console.error('章节选择器组件未初始化');
            return;
        }
        
        console.log('显示章节选择器，当前数据:', this.courseData.length, '个科目');
        
        this.onSelect = callback;
        this.container.style.display = 'flex';
        
        // 重置状态
        this.selectedChapter = null;
        this.confirmBtn.disabled = true;
        this.selectedInfo.innerHTML = '<span class="no-selection">请选择一个章节</span>';
        
        // 清除搜索和选择
        if (this.searchInput) {
            this.searchInput.value = '';
        }
        this.handleSearch({ target: { value: '' } });
        
        // 聚焦搜索框
        setTimeout(() => {
            if (this.searchInput) {
                this.searchInput.focus();
            }
        }, 100);
    }

    close() {
        if (!this.container) return;
        
        this.container.style.display = 'none';
        this.selectedChapter = null;
        this.onSelect = null;
    }

    isVisible() {
        return this.container && this.container.style.display !== 'none';
    }

    // 获取选中的章节信息
    getSelectedChapter() {
        return this.selectedChapter;
    }
}

// 全局实例
window.chapterSelector = new ChapterSelector();

// 导出类
window.ChapterSelector = ChapterSelector;