/**
 * 题目管理界面控制器
 */
class QuestionManagerUI {
    constructor() {
        this.currentPage = 1;
        this.pageSize = 10;
        this.currentFilters = {};
        this.selectedQuestions = new Set();
        this.editingQuestion = null;
        
        this.init();
    }

    /**
     * 初始化界面
     */
    init() {
        this.loadStats();
        this.loadFilters();
        this.loadQuestions();
        this.bindEvents();
        
        console.log('📝 题目管理界面初始化完成');
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // 搜索关键词输入
        document.getElementById('search-keyword').addEventListener('input', (e) => {
            if (this.searchTimeout) clearTimeout(this.searchTimeout);
            this.searchTimeout = setTimeout(() => {
                this.applyFilters();
            }, 500);
        });

        // 文件选择
        document.getElementById('import-file').addEventListener('change', (e) => {
            const file = e.target.files[0];
            const selectedFileSpan = document.getElementById('selected-file');
            if (file) {
                selectedFileSpan.textContent = file.name;
                
                // 自动检测文件格式
                const ext = file.name.split('.').pop().toLowerCase();
                const formatSelect = document.getElementById('import-format');
                if (ext === 'json') formatSelect.value = 'json';
                else if (ext === 'csv') formatSelect.value = 'csv';
                else if (ext === 'xlsx' || ext === 'xls') formatSelect.value = 'excel';
            } else {
                selectedFileSpan.textContent = '';
            }
        });

        // 表单提交
        document.getElementById('question-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveQuestion();
        });
    }

    /**
     * 加载统计信息
     */
    loadStats() {
        const stats = window.questionBank.getStatistics();
        
        document.getElementById('total-questions').textContent = stats.total;
        document.getElementById('subjects-count').textContent = Object.keys(stats.by_subject).length;
        
        // 计算本月新增
        const thisMonth = new Date().toISOString().slice(0, 7);
        const recentQuestions = window.questionBank.questions.filter(q => 
            q.created_at && q.created_at.startsWith(thisMonth)
        ).length;
        document.getElementById('recent-questions').textContent = recentQuestions;
        
        // 计算平均难度
        const avgScore = stats.total > 0 ? 
            window.questionBank.questions.reduce((sum, q) => sum + (q.difficulty_score || 5), 0) / stats.total : 0;
        document.getElementById('avg-difficulty').textContent = avgScore.toFixed(1);
    }

    /**
     * 加载筛选器选项
     */
    loadFilters() {
        const subjects = new Set();
        const years = new Set();
        
        window.questionBank.questions.forEach(q => {
            if (q.subject) subjects.add(q.subject);
            if (q.year) years.add(q.year);
        });

        // 填充科目选项
        const subjectSelect = document.getElementById('filter-subject');
        subjectSelect.innerHTML = '<option value="">全部科目</option>';
        [...subjects].sort().forEach(subject => {
            const option = document.createElement('option');
            option.value = subject;
            option.textContent = subject;
            subjectSelect.appendChild(option);
        });

        // 填充年份选项
        const yearSelect = document.getElementById('filter-year');
        yearSelect.innerHTML = '<option value="">全部年份</option>';
        [...years].sort((a, b) => b - a).forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearSelect.appendChild(option);
        });
    }

    /**
     * 加载题目列表
     */
    loadQuestions() {
        const filtered = this.getFilteredQuestions();
        const start = (this.currentPage - 1) * this.pageSize;
        const end = start + this.pageSize;
        const pageData = filtered.slice(start, end);

        this.renderQuestionTable(pageData);
        this.renderPagination(filtered.length);
    }

    /**
     * 获取过滤后的题目
     */
    getFilteredQuestions() {
        const keyword = document.getElementById('search-keyword').value.trim();
        return window.questionBank.searchQuestions(keyword, this.currentFilters);
    }

    /**
     * 渲染题目表格
     */
    renderQuestionTable(questions) {
        const tbody = document.getElementById('questions-tbody');
        tbody.innerHTML = '';

        questions.forEach(question => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <input type="checkbox" value="${question.id}" 
                           ${this.selectedQuestions.has(question.id) ? 'checked' : ''}
                           onchange="questionManagerUI.toggleQuestionSelection('${question.id}')">
                </td>
                <td>${question.id}</td>
                <td>${question.subject}</td>
                <td class="question-text" title="${this.escapeHtml(question.question)}">
                    ${this.escapeHtml(question.question)}
                </td>
                <td>${question.year}</td>
                <td>
                    <span class="difficulty-badge difficulty-${question.difficulty}">
                        ${question.difficulty}
                    </span>
                </td>
                <td>${question.points || 2}</td>
                <td class="actions">
                    <button class="btn btn-info btn-sm" onclick="questionManagerUI.viewQuestion('${question.id}')" title="查看详情">
                        查看
                    </button>
                    <button class="btn btn-warning btn-sm" onclick="questionManagerUI.editQuestion('${question.id}')" title="编辑">
                        编辑
                    </button>
                    <button class="btn btn-success btn-sm" onclick="questionManagerUI.duplicateQuestion('${question.id}')" title="复制">
                        复制
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="questionManagerUI.deleteQuestion('${question.id}')" title="删除">
                        删除
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });

        // 更新批量操作按钮显示状态
        this.updateBatchActions();
    }

    /**
     * 渲染分页
     */
    renderPagination(totalItems) {
        const totalPages = Math.ceil(totalItems / this.pageSize);
        const pagination = document.getElementById('pagination');
        
        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }

        let html = '';
        
        // 上一页
        if (this.currentPage > 1) {
            html += `<button onclick="questionManagerUI.goToPage(${this.currentPage - 1})">上一页</button>`;
        }

        // 页码
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(totalPages, this.currentPage + 2);

        if (startPage > 1) {
            html += `<button onclick="questionManagerUI.goToPage(1)">1</button>`;
            if (startPage > 2) html += `<span>...</span>`;
        }

        for (let i = startPage; i <= endPage; i++) {
            html += `<button class="${i === this.currentPage ? 'active' : ''}" 
                     onclick="questionManagerUI.goToPage(${i})">${i}</button>`;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) html += `<span>...</span>`;
            html += `<button onclick="questionManagerUI.goToPage(${totalPages})">${totalPages}</button>`;
        }

        // 下一页
        if (this.currentPage < totalPages) {
            html += `<button onclick="questionManagerUI.goToPage(${this.currentPage + 1})">下一页</button>`;
        }

        // 页面信息
        html += `<span style="margin-left: 20px;">共 ${totalItems} 条记录，第 ${this.currentPage} / ${totalPages} 页</span>`;

        pagination.innerHTML = html;
    }

    /**
     * 跳转到指定页面
     */
    goToPage(page) {
        this.currentPage = page;
        this.loadQuestions();
    }

    /**
     * 应用筛选条件
     */
    applyFilters() {
        this.currentFilters = {
            subject: document.getElementById('filter-subject').value,
            year: document.getElementById('filter-year').value ? parseInt(document.getElementById('filter-year').value) : null,
            difficulty: document.getElementById('filter-difficulty').value
        };

        // 清空null值
        Object.keys(this.currentFilters).forEach(key => {
            if (!this.currentFilters[key]) delete this.currentFilters[key];
        });

        this.currentPage = 1;
        this.loadQuestions();
    }

    /**
     * 切换题目选择状态
     */
    toggleQuestionSelection(questionId) {
        if (this.selectedQuestions.has(questionId)) {
            this.selectedQuestions.delete(questionId);
        } else {
            this.selectedQuestions.add(questionId);
        }
        this.updateBatchActions();
        this.updateSelectAllCheckbox();
    }

    /**
     * 全选/取消全选
     */
    toggleSelectAll() {
        const selectAll = document.getElementById('select-all');
        const checkboxes = document.querySelectorAll('#questions-tbody input[type="checkbox"]');
        
        checkboxes.forEach(checkbox => {
            const questionId = checkbox.value;
            if (selectAll.checked) {
                this.selectedQuestions.add(questionId);
                checkbox.checked = true;
            } else {
                this.selectedQuestions.delete(questionId);
                checkbox.checked = false;
            }
        });
        
        this.updateBatchActions();
    }

    /**
     * 更新全选复选框状态
     */
    updateSelectAllCheckbox() {
        const selectAll = document.getElementById('select-all');
        const checkboxes = document.querySelectorAll('#questions-tbody input[type="checkbox"]');
        const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
        
        if (checkedCount === 0) {
            selectAll.indeterminate = false;
            selectAll.checked = false;
        } else if (checkedCount === checkboxes.length) {
            selectAll.indeterminate = false;
            selectAll.checked = true;
        } else {
            selectAll.indeterminate = true;
        }
    }

    /**
     * 更新批量操作按钮
     */
    updateBatchActions() {
        const batchDelete = document.getElementById('batch-delete');
        if (this.selectedQuestions.size > 0) {
            batchDelete.style.display = 'inline-block';
            batchDelete.textContent = `批量删除 (${this.selectedQuestions.size})`;
        } else {
            batchDelete.style.display = 'none';
        }
    }

    /**
     * 显示新增题目模态框
     */
    showAddQuestionModal() {
        this.editingQuestion = null;
        document.getElementById('modal-title').textContent = '新增题目';
        this.resetQuestionForm();
        this.showQuestionModal();
    }

    /**
     * 编辑题目
     */
    editQuestion(questionId) {
        const question = window.questionBank.getQuestion(questionId);
        if (!question) return;

        this.editingQuestion = question;
        document.getElementById('modal-title').textContent = '编辑题目';
        this.fillQuestionForm(question);
        this.showQuestionModal();
    }

    /**
     * 查看题目详情
     */
    viewQuestion(questionId) {
        const question = window.questionBank.getQuestion(questionId);
        if (!question) return;

        alert(`题目详情：\n\n${question.question}\n\n选项：\n${question.options.map((opt, idx) => `${String.fromCharCode(65 + idx)}. ${opt}`).join('\n')}\n\n正确答案：${String.fromCharCode(65 + question.correct_answer)}\n\n解析：${question.explanation || '无'}`);
    }

    /**
     * 复制题目
     */
    duplicateQuestion(questionId) {
        if (confirm('确认要复制这道题目吗？')) {
            const duplicated = window.questionBank.duplicateQuestion(questionId);
            if (duplicated) {
                this.loadQuestions();
                this.loadStats();
                alert('题目复制成功！');
            }
        }
    }

    /**
     * 删除题目
     */
    deleteQuestion(questionId) {
        if (confirm('确认要删除这道题目吗？删除后不可恢复！')) {
            if (window.questionBank.deleteQuestion(questionId)) {
                this.selectedQuestions.delete(questionId);
                this.loadQuestions();
                this.loadStats();
                alert('题目删除成功！');
            }
        }
    }

    /**
     * 批量删除
     */
    batchDelete() {
        if (this.selectedQuestions.size === 0) return;
        
        if (confirm(`确认要删除选中的 ${this.selectedQuestions.size} 道题目吗？删除后不可恢复！`)) {
            const result = window.questionBank.batchDeleteQuestions([...this.selectedQuestions]);
            
            this.selectedQuestions.clear();
            this.loadQuestions();
            this.loadStats();
            
            alert(`批量删除完成！成功删除 ${result.deleted.length} 道题目${result.failed.length > 0 ? `，失败 ${result.failed.length} 道` : ''}。`);
        }
    }

    /**
     * 显示题目模态框
     */
    showQuestionModal() {
        this.initOptionsContainer();
        document.getElementById('question-modal').style.display = 'block';
    }

    /**
     * 隐藏题目模态框
     */
    hideQuestionModal() {
        document.getElementById('question-modal').style.display = 'none';
    }

    /**
     * 重置题目表单
     */
    resetQuestionForm() {
        document.getElementById('question-form').reset();
        document.getElementById('question-year').value = new Date().getFullYear();
        document.getElementById('question-difficulty').value = '中等';
        document.getElementById('question-points').value = 2;
    }

    /**
     * 填充题目表单
     */
    fillQuestionForm(question) {
        document.getElementById('question-subject').value = question.subject || '';
        document.getElementById('question-chapter').value = question.chapter || '';
        document.getElementById('question-year').value = question.year || '';
        document.getElementById('question-difficulty').value = question.difficulty || '中等';
        document.getElementById('question-points').value = question.points || 2;
        document.getElementById('question-text').value = question.question || '';
        document.getElementById('question-explanation').value = question.explanation || '';
        document.getElementById('question-tags').value = (question.tags || []).join(', ');
        
        // 填充选项
        this.initOptionsContainer(question.options, question.correct_answer);
    }

    /**
     * 初始化选项容器
     */
    initOptionsContainer(options = ['', '', '', ''], correctAnswer = 0) {
        const container = document.getElementById('options-container');
        container.innerHTML = '';

        options.forEach((option, index) => {
            this.addOptionItem(option, index === correctAnswer);
        });
    }

    /**
     * 添加选项
     */
    addOption() {
        this.addOptionItem('', false);
    }

    /**
     * 添加选项项
     */
    addOptionItem(text = '', isCorrect = false) {
        const container = document.getElementById('options-container');
        const optionCount = container.children.length;
        
        const div = document.createElement('div');
        div.className = 'option-item';
        div.innerHTML = `
            <input type="radio" name="correct_answer" value="${optionCount}" class="option-radio" ${isCorrect ? 'checked' : ''}>
            <input type="text" class="option-input" value="${this.escapeHtml(text)}" placeholder="选项 ${String.fromCharCode(65 + optionCount)}">
            <button type="button" class="btn btn-danger btn-sm" onclick="questionManagerUI.removeOption(this)">删除</button>
        `;
        container.appendChild(div);
    }

    /**
     * 删除选项
     */
    removeOption(button) {
        const container = document.getElementById('options-container');
        if (container.children.length <= 2) {
            alert('至少需要保留2个选项！');
            return;
        }
        
        button.parentElement.remove();
        
        // 重新编号
        const items = container.querySelectorAll('.option-item');
        items.forEach((item, index) => {
            const radio = item.querySelector('input[type="radio"]');
            const input = item.querySelector('.option-input');
            radio.value = index;
            input.placeholder = `选项 ${String.fromCharCode(65 + index)}`;
        });
    }

    /**
     * 保存题目
     */
    saveQuestion() {
        const formData = new FormData(document.getElementById('question-form'));
        const options = [];
        let correctAnswer = 0;
        
        // 收集选项
        const optionItems = document.querySelectorAll('.option-item');
        optionItems.forEach((item, index) => {
            const text = item.querySelector('.option-input').value.trim();
            const isCorrect = item.querySelector('input[type="radio"]').checked;
            
            if (text) options.push(text);
            if (isCorrect) correctAnswer = options.length - 1;
        });

        const questionData = {
            subject: document.getElementById('question-subject').value,
            chapter: document.getElementById('question-chapter').value,
            year: parseInt(document.getElementById('question-year').value),
            difficulty: document.getElementById('question-difficulty').value,
            points: parseInt(document.getElementById('question-points').value),
            question: document.getElementById('question-text').value,
            options: options,
            correct_answer: correctAnswer,
            explanation: document.getElementById('question-explanation').value,
            tags: document.getElementById('question-tags').value.split(',').map(tag => tag.trim()).filter(tag => tag)
        };

        try {
            if (this.editingQuestion) {
                // 更新题目
                window.questionBank.updateQuestion(this.editingQuestion.id, questionData);
                alert('题目更新成功！');
            } else {
                // 新增题目
                window.questionBank.addQuestion(questionData);
                alert('题目添加成功！');
            }

            this.hideQuestionModal();
            this.loadQuestions();
            this.loadStats();
            this.loadFilters();
        } catch (error) {
            alert('保存失败：' + error.message);
        }
    }

    /**
     * 显示导入模态框
     */
    showImportModal() {
        document.getElementById('import-modal').style.display = 'block';
    }

    /**
     * 隐藏导入模态框
     */
    hideImportModal() {
        document.getElementById('import-modal').style.display = 'none';
    }

    /**
     * 显示导入区域
     */
    showImportSection() {
        this.hideImportModal();
        document.getElementById('import-section').style.display = 'block';
    }

    /**
     * 隐藏导入区域
     */
    hideImportSection() {
        document.getElementById('import-section').style.display = 'none';
        document.getElementById('import-file').value = '';
        document.getElementById('selected-file').textContent = '';
    }

    /**
     * 导入文件
     */
    async importFile() {
        const fileInput = document.getElementById('import-file');
        const file = fileInput.files[0];
        
        if (!file) {
            alert('请先选择文件！');
            return;
        }

        const format = document.getElementById('import-format').value;
        const progressSection = document.getElementById('import-progress');
        const progressBar = document.getElementById('progress-bar');
        const statusDiv = document.getElementById('import-status');
        
        try {
            progressSection.style.display = 'block';
            progressBar.style.width = '10%';
            statusDiv.textContent = '正在读取文件...';

            let result;
            if (format === 'json' || (format === 'auto' && file.name.toLowerCase().endsWith('.json'))) {
                result = await window.questionBank.importFromJSON(file);
            } else if (format === 'csv' || (format === 'auto' && file.name.toLowerCase().endsWith('.csv'))) {
                result = await window.questionBank.importFromCSV(file);
            } else if (format === 'excel' || (format === 'auto' && (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')))) {
                if (typeof XLSX === 'undefined') {
                    throw new Error('Excel支持需要加载XLSX库');
                }
                result = await window.questionBank.importFromExcel(file);
            } else {
                throw new Error('不支持的文件格式');
            }

            progressBar.style.width = '100%';
            statusDiv.innerHTML = `
                <div style="color: green;">导入完成！</div>
                <div>成功导入：${result.success} 题</div>
                ${result.failed > 0 ? `<div style="color: red;">失败：${result.failed} 题</div>` : ''}
                ${result.errors.length > 0 ? `<div><details><summary>查看错误详情</summary><pre>${JSON.stringify(result.errors, null, 2)}</pre></details></div>` : ''}
            `;

            // 刷新界面
            setTimeout(() => {
                this.loadQuestions();
                this.loadStats();
                this.loadFilters();
                this.hideImportSection();
            }, 2000);

        } catch (error) {
            progressBar.style.width = '100%';
            progressBar.style.background = '#dc3545';
            statusDiv.innerHTML = `<div style="color: red;">导入失败：${error.message}</div>`;
        }
    }

    /**
     * 导出题目
     */
    exportQuestions() {
        const format = prompt('请选择导出格式：\n1. JSON\n2. CSV\n请输入数字（1或2）：', '1');
        
        if (!format || (format !== '1' && format !== '2')) return;

        try {
            const exportFormat = format === '1' ? 'json' : 'csv';
            const data = window.questionBank.exportQuestions(exportFormat, this.currentFilters);
            
            const blob = new Blob([data], { 
                type: exportFormat === 'json' ? 'application/json' : 'text/csv' 
            });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `questions_${new Date().toISOString().slice(0, 10)}.${exportFormat}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            alert('导出成功！');
        } catch (error) {
            alert('导出失败：' + error.message);
        }
    }

    /**
     * 下载模板文件
     */
    downloadTemplate() {
        const csvTemplate = `subject,chapter,year,difficulty,points,question,options,correct_answer,explanation,tags
高等数学,极限与连续,2024,中等,4,"函数f(x)=e^x-1的导数是（）","e^x|e^x-1|x*e^x|1",0,"f(x)=e^x-1的导数是f'(x)=e^x，因为e^x的导数就是它本身，常数-1的导数为0。","导数|指数函数|基本运算"
线性代数,行列式,2024,简单,3,"二阶行列式|1 2; 3 4|的值为（）","-2|2|10|-10",0,"二阶行列式|a b; c d| = ad - bc = 1×4 - 2×3 = 4 - 6 = -2","行列式计算|二阶行列式|基础运算"
概率论与数理统计,概率基础,2024,中等,3,"抛掷一枚均匀硬币两次，至少出现一次正面的概率是（）","1/4|1/2|3/4|1",2,"样本空间为{HH,HT,TH,TT}，至少一次正面的事件为{HH,HT,TH}，概率为3/4。","概率计算|独立事件|基础概率"
政治,马克思主义基本原理,2024,简单,2,"物质的唯一特性是（）","运动|客观实在性|可知性|时间性",1,"物质的唯一特性是客观实在性。这是马克思主义哲学对物质本质特征的概括。","唯物主义|物质观|马克思主义哲学"
英语,词汇语法,2024,中等,1,"The manager decided to ______ the meeting until next week.","cancel|postpone|attend|schedule",1,"postpone表示推迟、延期。句意为经理决定把会议推迟到下周。","词汇辨析|动词|语法填空"
数据结构,线性表,2024,中等,2,"在一个长度为n的顺序表中，在第i个位置上插入一个元素时需要移动的元素个数为（）","n-i|n-i+1|n-i-1|i",0,"在顺序表的第i个位置插入元素时，需要将第i个位置及其后面的所有元素向后移动一位。","顺序表|插入操作|算法分析"`;

        const blob = new Blob([csvTemplate], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'question_template.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // 同时提供JSON模板下载
        setTimeout(() => {
            const jsonTemplate = {
                "metadata": {
                    "version": "2.0",
                    "description": "考研题目导入模板 - JSON格式",
                    "created_at": new Date().toISOString(),
                    "instructions": "请按照以下格式填写题目数据，然后导入到题目管理工具中"
                },
                "questions": [
                    {
                        "subject": "高等数学",
                        "chapter": "积分学",
                        "year": 2024,
                        "difficulty": "中等",
                        "points": 4,
                        "question": "∫x²dx的结果是（）",
                        "options": ["x³/3 + C", "x³ + C", "2x + C", "x² + C"],
                        "correct_answer": 0,
                        "explanation": "x²的不定积分是x³/3 + C，根据幂函数积分公式∫x^n dx = x^(n+1)/(n+1) + C。",
                        "tags": ["不定积分", "幂函数", "基本积分公式"]
                    },
                    {
                        "subject": "英语",
                        "chapter": "阅读理解", 
                        "year": 2024,
                        "difficulty": "困难",
                        "points": 2,
                        "question": "The author's attitude towards the new policy can be best described as ______.",
                        "options": ["supportive", "critical", "neutral", "indifferent"],
                        "correct_answer": 1,
                        "explanation": "根据文章中的关键词和语调，作者对新政策持批评态度。",
                        "tags": ["阅读理解", "态度题", "语调推断"]
                    }
                ]
            };
            
            const jsonBlob = new Blob([JSON.stringify(jsonTemplate, null, 2)], { type: 'application/json' });
            const jsonUrl = URL.createObjectURL(jsonBlob);
            
            const jsonA = document.createElement('a');
            jsonA.href = jsonUrl;
            jsonA.download = 'question_template.json';
            document.body.appendChild(jsonA);
            jsonA.click();
            document.body.removeChild(jsonA);
            URL.revokeObjectURL(jsonUrl);
        }, 1000);
        
        alert('📥 模板文件已下载！\n\n已为您下载了CSV和JSON两种格式的模板文件：\n• question_template.csv - Excel可直接打开编辑\n• question_template.json - 程序员友好的JSON格式\n\n请选择其中一种格式填写题目数据后导入。');
    }

    /**
     * 刷新数据
     */
    refreshData() {
        this.selectedQuestions.clear();
        this.currentPage = 1;
        this.currentFilters = {};
        
        // 重置筛选器
        document.getElementById('filter-subject').value = '';
        document.getElementById('filter-year').value = '';
        document.getElementById('filter-difficulty').value = '';
        document.getElementById('search-keyword').value = '';
        
        this.loadStats();
        this.loadFilters();
        this.loadQuestions();
        
        alert('数据已刷新！');
    }

    /**
     * HTML转义
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// 全局函数（供HTML调用）
function showAddQuestionModal() {
    questionManagerUI.showAddQuestionModal();
}

function showImportModal() {
    questionManagerUI.showImportModal();
}

function hideImportModal() {
    questionManagerUI.hideImportModal();
}

function showImportSection() {
    questionManagerUI.showImportSection();
}

function hideImportSection() {
    questionManagerUI.hideImportSection();
}

function importFile() {
    questionManagerUI.importFile();
}

function exportQuestions() {
    questionManagerUI.exportQuestions();
}

function downloadTemplate() {
    questionManagerUI.downloadTemplate();
}

function refreshData() {
    questionManagerUI.refreshData();
}

function applyFilters() {
    questionManagerUI.applyFilters();
}

function toggleSelectAll() {
    questionManagerUI.toggleSelectAll();
}

function batchDelete() {
    questionManagerUI.batchDelete();
}

function hideQuestionModal() {
    questionManagerUI.hideQuestionModal();
}

function addOption() {
    questionManagerUI.addOption();
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    window.questionManagerUI = new QuestionManagerUI();
});

console.log('📝 题目管理界面脚本加载完成');