/**
 * 题库管理工具
 * 提供题目导入、编辑、导出等功能
 */
class QuestionBankManager {
    constructor() {
        this.storageKey = 'question_bank';
        this.questions = this.loadQuestions();
        this.categories = {
            // 公共课
            'mathematics': '高等数学',
            'linear_algebra': '线性代数', 
            'probability': '概率论与数理统计',
            'politics': '政治',
            'english': '英语',
            // 专业课
            'data_structure': '数据结构',
            'algorithm': '算法设计', 
            'operating_system': '操作系统',
            'computer_network': '计算机网络',
            'computer_organization': '组成原理',
            'compiler': '编译原理',
            'database': '数据库'
        };
        
        console.log('📚 题库管理器初始化完成');
    }

    /**
     * 加载题目数据
     */
    loadQuestions() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (error) {
            console.error('❌ 加载题目失败:', error);
        }
        return this.getDefaultQuestions();
    }

    /**
     * 获取默认题目数据（从practice.html中的sampleQuestions迁移）
     */
    getDefaultQuestions() {
        return [
            // 高等数学
            {
                id: "MATH_2023_001",
                category: "mathematics", 
                subject: "高等数学",
                chapter: "极限与连续",
                year: 2023,
                difficulty: "中等",
                difficulty_score: 7,
                points: 4,
                estimated_time: 5,
                question_type: "single_choice",
                question: "设函数f(x) = (sin x)/x，则lim(x→0) f(x)的值为（）",
                options: ["0", "1", "∞", "不存在"],
                correct_answer: 1,
                explanation: "这是一个重要极限。当x→0时，(sin x)/x的极限等于1。这可以通过夹逼定理或洛必达法则证明。",
                tags: ["极限", "重要极限", "三角函数"],
                source: {
                    exam_name: "全国硕士研究生入学统一考试",
                    exam_code: "数学一",
                    paper_type: "统考真题"
                },
                created_at: new Date().toISOString()
            },
            {
                id: "MATH_2023_002",
                category: "mathematics",
                subject: "高等数学", 
                chapter: "导数与微分",
                year: 2023,
                difficulty: "简单",
                difficulty_score: 3,
                points: 4,
                estimated_time: 3,
                question_type: "single_choice",
                question: "函数f(x) = x³ - 3x + 1在点x = 1处的导数值为（）",
                options: ["-3", "0", "3", "1"],
                correct_answer: 1,
                explanation: "f'(x) = 3x² - 3，所以f'(1) = 3(1)² - 3 = 3 - 3 = 0。",
                tags: ["导数", "多项式求导", "基本运算"],
                source: {
                    exam_name: "全国硕士研究生入学统一考试",
                    exam_code: "数学一",
                    paper_type: "统考真题"
                },
                created_at: new Date().toISOString()
            },

            // 线性代数
            {
                id: "LA_2023_001",
                category: "linear_algebra",
                subject: "线性代数",
                chapter: "矩阵运算",
                year: 2023,
                difficulty: "中等",
                difficulty_score: 6,
                points: 3,
                estimated_time: 4,
                question_type: "single_choice",
                question: "设A是3×3矩阵，|A| = 2，则|2A|的值为（）",
                options: ["4", "8", "16", "32"],
                correct_answer: 2,
                explanation: "对于n×n矩阵A，|kA| = k^n|A|。这里n=3，k=2，所以|2A| = 2³|A| = 8×2 = 16。",
                tags: ["行列式", "矩阵", "数乘"],
                source: {
                    exam_name: "全国硕士研究生入学统一考试",
                    exam_code: "数学一",
                    paper_type: "统考真题"
                },
                created_at: new Date().toISOString()
            },
            {
                id: "LA_2023_002",
                category: "linear_algebra",
                subject: "线性代数",
                chapter: "线性方程组",
                year: 2023,
                difficulty: "困难",
                difficulty_score: 8,
                points: 5,
                estimated_time: 8,
                question_type: "single_choice",
                question: "齐次线性方程组Ax = 0有非零解的充要条件是（）",
                options: ["A可逆", "rank(A) = n", "rank(A) < n", "|A| ≠ 0"],
                correct_answer: 2,
                explanation: "齐次线性方程组Ax = 0有非零解当且仅当系数矩阵A的秩小于未知数个数n，即rank(A) < n。这等价于|A| = 0（A不可逆）。",
                tags: ["齐次方程组", "矩阵的秩", "线性无关"],
                source: {
                    exam_name: "全国硕士研究生入学统一考试",
                    exam_code: "数学一",
                    paper_type: "统考真题"
                },
                created_at: new Date().toISOString()
            },

            // 概率论与数理统计
            {
                id: "PROB_2023_001",
                category: "probability",
                subject: "概率论与数理统计",
                chapter: "随机事件与概率",
                year: 2023,
                difficulty: "中等",
                difficulty_score: 6,
                points: 3,
                estimated_time: 4,
                question_type: "single_choice",
                question: "设事件A和B相互独立，P(A) = 0.3，P(B) = 0.4，则P(A∪B)等于（）",
                options: ["0.7", "0.58", "0.12", "0.42"],
                correct_answer: 1,
                explanation: "当A和B相互独立时，P(A∩B) = P(A)P(B) = 0.3×0.4 = 0.12。根据加法公式：P(A∪B) = P(A) + P(B) - P(A∩B) = 0.3 + 0.4 - 0.12 = 0.58。",
                tags: ["独立事件", "概率运算", "加法公式"],
                source: {
                    exam_name: "全国硕士研究生入学统一考试",
                    exam_code: "数学一",
                    paper_type: "统考真题"
                },
                created_at: new Date().toISOString()
            },
            {
                id: "PROB_2023_002",
                category: "probability",
                subject: "概率论与数理统计",
                chapter: "随机变量及其分布",
                year: 2023,
                difficulty: "困难",
                difficulty_score: 8,
                points: 4,
                estimated_time: 6,
                question_type: "single_choice",
                question: "设随机变量X~N(2, 9)，则P(X > 5)等于（）",
                options: ["Φ(1)", "1 - Φ(1)", "Φ(3)", "1 - Φ(3)"],
                correct_answer: 1,
                explanation: "X~N(2, 9)表示X服从均值为2、方差为9（标准差为3）的正态分布。标准化：P(X > 5) = P((X-2)/3 > (5-2)/3) = P(Z > 1) = 1 - Φ(1)，其中Z~N(0,1)。",
                tags: ["正态分布", "标准化", "概率计算"],
                source: {
                    exam_name: "全国硕士研究生入学统一考试",
                    exam_code: "数学一",
                    paper_type: "统考真题"
                },
                created_at: new Date().toISOString()
            },

            // 政治
            {
                id: "POL_2023_001",
                category: "politics",
                subject: "政治",
                chapter: "马克思主义基本原理",
                year: 2023,
                difficulty: "中等",
                difficulty_score: 6,
                points: 2,
                estimated_time: 3,
                question_type: "single_choice",
                question: "马克思主义哲学的根本特征是（）",
                options: ["实践性", "革命性", "科学性", "实践性和革命性的统一"],
                correct_answer: 3,
                explanation: "马克思主义哲学的根本特征是实践性和革命性的统一。它既是科学的世界观和方法论，又是改造世界的思想武器，体现了科学性与革命性、理论性与实践性的高度统一。",
                tags: ["马克思主义哲学", "基本特征", "实践性"],
                source: {
                    exam_name: "全国硕士研究生入学统一考试",
                    exam_code: "思想政治理论",
                    paper_type: "统考真题"
                },
                created_at: new Date().toISOString()
            },
            {
                id: "POL_2023_002",
                category: "politics",
                subject: "政治",
                chapter: "毛泽东思想概论",
                year: 2023,
                difficulty: "简单",
                difficulty_score: 4,
                points: 2,
                estimated_time: 2,
                question_type: "single_choice",
                question: "毛泽东思想形成的标志是（）",
                options: ["《星星之火，可以燎原》", "《中国的红色政权为什么能够存在？》", "《井冈山的斗争》", "农村包围城市道路理论的形成"],
                correct_answer: 3,
                explanation: "毛泽东思想形成的标志是农村包围城市、武装夺取政权道路理论的提出和阐述，这一理论在《中国的红色政权为什么能够存在？》《井冈山的斗争》等著作中得到系统论述。",
                tags: ["毛泽东思想", "形成标志", "农村包围城市"],
                source: {
                    exam_name: "全国硕士研究生入学统一考试",
                    exam_code: "思想政治理论",
                    paper_type: "统考真题"
                },
                created_at: new Date().toISOString()
            },

            // 英语
            {
                id: "ENG_2023_001",
                category: "english",
                subject: "英语",
                chapter: "阅读理解",
                year: 2023,
                difficulty: "中等",
                difficulty_score: 6,
                points: 2,
                estimated_time: 3,
                question_type: "single_choice",
                question: "The word \"elaborate\" in the passage most probably means ______.",
                options: ["simple", "detailed", "brief", "vague"],
                correct_answer: 1,
                explanation: "'Elaborate'作为形容词时意为'复杂的、详细的、精心制作的'。在阅读理解中，需要根据上下文来判断词汇的确切含义。这里应该选择'detailed'（详细的）。",
                tags: ["词汇理解", "阅读理解", "语义推断"],
                source: {
                    exam_name: "全国硕士研究生入学统一考试",
                    exam_code: "英语二",
                    paper_type: "统考真题"
                },
                created_at: new Date().toISOString()
            },
            {
                id: "ENG_2023_002",
                category: "english",
                subject: "英语",
                chapter: "完型填空",
                year: 2023,
                difficulty: "困难",
                difficulty_score: 7,
                points: 0.5,
                estimated_time: 2,
                question_type: "single_choice",
                question: "Scientists believe that the ability to learn language is ______ to humans.",
                options: ["unique", "common", "similar", "related"],
                correct_answer: 0,
                explanation: "根据句意'科学家认为学习语言的能力对人类来说是______的'，应该选择'unique'（独特的）。这里强调语言学习能力是人类独有的特征。",
                tags: ["完型填空", "语法填空", "词汇辨析"],
                source: {
                    exam_name: "全国硕士研究生入学统一考试",
                    exam_code: "英语二",
                    paper_type: "统考真题"
                },
                created_at: new Date().toISOString()
            },

            // 原有的专业课题目
            {
                id: "DS_2023_001",
                category: "data_structure", 
                subject: "数据结构",
                chapter: "线性表",
                year: 2023,
                difficulty: "中等",
                difficulty_score: 7,
                points: 2,
                estimated_time: 3,
                question_type: "single_choice",
                question: "在一个长度为n的顺序表中，在第i个位置上插入一个元素时需要移动的元素个数为（）",
                options: ["n-i", "n-i+1", "n-i-1", "i"],
                correct_answer: 0,
                explanation: "在顺序表的第i个位置插入元素时，需要将第i个位置及其后面的所有元素向后移动一位。由于顺序表长度为n，第i个位置后面还有n-i个元素需要移动。",
                tags: ["顺序表", "插入操作", "算法分析"],
                source: {
                    exam_name: "全国硕士研究生入学统一考试",
                    exam_code: "408",
                    paper_type: "统考真题"
                },
                created_at: new Date().toISOString()
            },
            {
                id: "OS_2023_001",
                category: "operating_system",
                subject: "操作系统", 
                chapter: "进程管理",
                year: 2023,
                difficulty: "困难",
                difficulty_score: 9,
                points: 3,
                estimated_time: 5,
                question_type: "single_choice",
                question: "下列关于死锁的叙述中，正确的是（）",
                options: [
                    "只有在系统中同时出现四个必要条件时，才会发生死锁",
                    "死锁预防是通过设置某些限制条件，去破坏产生死锁的四个必要条件中的一个或几个",
                    "死锁避免是当进程提出资源请求时，系统测试分配后是否会产生死锁",
                    "以上都正确"
                ],
                correct_answer: 3,
                explanation: "四个选项都是正确的。死锁的四个必要条件同时满足时会发生死锁；死锁预防通过破坏必要条件来防止死锁；死锁避免通过银行家算法等方法在分配资源前进行安全性检查。",
                tags: ["死锁", "进程管理", "资源管理"],
                source: {
                    exam_name: "全国硕士研究生入学统一考试",
                    exam_code: "408",
                    paper_type: "统考真题"
                },
                created_at: new Date().toISOString()
            },
            {
                id: "CN_2022_001",
                category: "computer_network",
                subject: "计算机网络",
                chapter: "传输层", 
                year: 2022,
                difficulty: "简单",
                difficulty_score: 3,
                points: 2,
                estimated_time: 2,
                question_type: "single_choice",
                question: "TCP协议提供的是（）",
                options: [
                    "可靠的数据报服务",
                    "不可靠的数据报服务",
                    "可靠的字节流服务", 
                    "不可靠的字节流服务"
                ],
                correct_answer: 2,
                explanation: "TCP（传输控制协议）提供面向连接的可靠字节流服务。它通过序号、确认、重传等机制保证数据的可靠传输，并且以字节流的方式提供服务。",
                tags: ["TCP", "传输协议", "可靠性"],
                source: {
                    exam_name: "全国硕士研究生入学统一考试",
                    exam_code: "408",
                    paper_type: "统考真题"
                },
                created_at: new Date().toISOString()
            }
        ];
    }

    /**
     * 保存题目数据
     */
    saveQuestions() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.questions));
            console.log('✅ 题目数据已保存');
        } catch (error) {
            console.error('❌ 保存题目失败:', error);
        }
    }

    /**
     * 生成题目ID
     */
    generateQuestionId(subject, year, number) {
        const subjectCodes = {
            // 公共课
            '高等数学': 'MATH',
            '线性代数': 'LA',
            '概率论与数理统计': 'PROB',
            '政治': 'POL',
            '英语': 'ENG',
            // 专业课
            '数据结构': 'DS',
            '算法设计': 'AD',
            '操作系统': 'OS', 
            '计算机网络': 'CN',
            '组成原理': 'CO',
            '编译原理': 'CP',
            '数据库': 'DB'
        };
        
        const code = subjectCodes[subject] || 'OT';
        const num = String(number).padStart(3, '0');
        return `${code}_${year}_${num}`;
    }

    /**
     * 添加单个题目
     */
    addQuestion(questionData) {
        try {
            // 验证必填字段
            const required = ['subject', 'year', 'question', 'options', 'correct_answer'];
            for (const field of required) {
                if (!questionData[field] && questionData[field] !== 0) {
                    throw new Error(`缺少必填字段: ${field}`);
                }
            }

            // 生成ID
            const count = this.questions.filter(q => 
                q.subject === questionData.subject && 
                q.year === questionData.year
            ).length + 1;
            
            const question = {
                id: this.generateQuestionId(questionData.subject, questionData.year, count),
                category: this.mapSubjectToCategory(questionData.subject),
                subject: questionData.subject,
                chapter: questionData.chapter || '',
                year: questionData.year,
                difficulty: questionData.difficulty || '中等',
                difficulty_score: this.mapDifficultyToScore(questionData.difficulty),
                points: questionData.points || 2,
                estimated_time: questionData.estimated_time || 3,
                question_type: questionData.question_type || 'single_choice',
                question: questionData.question,
                options: questionData.options,
                correct_answer: questionData.correct_answer,
                explanation: questionData.explanation || '',
                tags: questionData.tags || [],
                source: questionData.source || {},
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            this.questions.push(question);
            this.saveQuestions();
            
            console.log('✅ 题目添加成功:', question.id);
            return question;
        } catch (error) {
            console.error('❌ 添加题目失败:', error);
            throw error;
        }
    }

    /**
     * 批量导入题目
     */
    importQuestions(questionsData) {
        const results = {
            success: 0,
            failed: 0,
            errors: []
        };

        questionsData.forEach((questionData, index) => {
            try {
                this.addQuestion(questionData);
                results.success++;
            } catch (error) {
                results.failed++;
                results.errors.push({
                    index: index + 1,
                    error: error.message,
                    data: questionData
                });
            }
        });

        console.log(`📊 批量导入完成: 成功${results.success}题，失败${results.failed}题`);
        return results;
    }

    /**
     * 从JSON文件导入
     */
    async importFromJSON(file) {
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            let questionsToImport = [];
            
            // 支持两种格式：直接数组或包含questions字段的对象
            if (Array.isArray(data)) {
                questionsToImport = data;
            } else if (data.questions && Array.isArray(data.questions)) {
                questionsToImport = data.questions;
            } else {
                throw new Error('无效的JSON格式');
            }

            return this.importQuestions(questionsToImport);
        } catch (error) {
            console.error('❌ JSON导入失败:', error);
            throw error;
        }
    }

    /**
     * 从CSV文件导入 
     */
    async importFromCSV(file) {
        try {
            const text = await file.text();
            const lines = text.split('\n');
            const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
            
            const questionsToImport = [];
            
            for (let i = 1; i < lines.length; i++) {
                if (lines[i].trim() === '') continue;
                
                const values = this.parseCSVLine(lines[i]);
                const questionData = {};
                
                headers.forEach((header, index) => {
                    if (values[index] && values[index] !== '') {
                        if (header === 'options') {
                            questionData[header] = values[index].split('|').map(opt => opt.trim());
                        } else if (header === 'tags') {
                            questionData[header] = values[index].split('|').map(tag => tag.trim());
                        } else if (header === 'correct_answer' || header === 'year' || header === 'points') {
                            questionData[header] = parseInt(values[index]);
                        } else {
                            questionData[header] = values[index];
                        }
                    }
                });
                
                questionsToImport.push(questionData);
            }
            
            return this.importQuestions(questionsToImport);
        } catch (error) {
            console.error('❌ CSV导入失败:', error);
            throw error;
        }
    }

    /**
     * 解析CSV行（处理引号包围的字段）
     */
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current.trim());
        return result;
    }

    /**
     * 从Excel文件导入（通过转换为CSV）
     */
    async importFromExcel(file) {
        try {
            const reader = new FileReader();
            return new Promise((resolve, reject) => {
                reader.onload = async (e) => {
                    try {
                        const data = new Uint8Array(e.target.result);
                        const workbook = XLSX.read(data, { type: 'array' });
                        const sheetName = workbook.SheetNames[0];
                        const worksheet = workbook.Sheets[sheetName];
                        const jsonData = XLSX.utils.sheet_to_json(worksheet);
                        
                        resolve(this.importQuestions(jsonData));
                    } catch (error) {
                        reject(error);
                    }
                };
                reader.onerror = () => reject(reader.error);
                reader.readAsArrayBuffer(file);
            });
        } catch (error) {
            console.error('❌ Excel导入失败:', error);
            throw error;
        }
    }

    /**
     * 导出题目数据
     */
    exportQuestions(format = 'json', filters = {}) {
        let questions = this.getFilteredQuestions(filters);
        
        if (format === 'json') {
            return this.exportToJSON(questions);
        } else if (format === 'csv') {
            return this.exportToCSV(questions);
        }
    }

    /**
     * 导出为JSON格式
     */
    exportToJSON(questions) {
        const data = {
            metadata: {
                version: "2.0",
                exported_at: new Date().toISOString(),
                total_questions: questions.length
            },
            questions: questions
        };
        
        return JSON.stringify(data, null, 2);
    }

    /**
     * 导出为CSV格式  
     */
    exportToCSV(questions) {
        const headers = [
            'id', 'subject', 'chapter', 'year', 'difficulty', 'points', 
            'question', 'options', 'correct_answer', 'explanation', 'tags'
        ];
        
        const csvData = [headers.join(',')];
        
        questions.forEach(q => {
            const row = [
                q.id,
                q.subject,
                q.chapter || '',
                q.year,
                q.difficulty,
                q.points,
                `"${q.question.replace(/"/g, '""')}"`,
                `"${q.options.join('|')}"`,
                q.correct_answer,
                `"${(q.explanation || '').replace(/"/g, '""')}"`,
                `"${(q.tags || []).join('|')}"`
            ];
            csvData.push(row.join(','));
        });
        
        return csvData.join('\n');
    }

    /**
     * 获取过滤后的题目
     */
    getFilteredQuestions(filters) {
        return this.questions.filter(q => {
            if (filters.subject && q.subject !== filters.subject) return false;
            if (filters.year && q.year !== filters.year) return false;
            if (filters.difficulty && q.difficulty !== filters.difficulty) return false;
            if (filters.category && q.category !== filters.category) return false;
            return true;
        });
    }

    /**
     * 搜索题目
     */
    searchQuestions(keyword, filters = {}) {
        const filtered = this.getFilteredQuestions(filters);
        
        if (!keyword) return filtered;
        
        const lowerKeyword = keyword.toLowerCase();
        return filtered.filter(q => {
            return q.question.toLowerCase().includes(lowerKeyword) ||
                   q.explanation.toLowerCase().includes(lowerKeyword) ||
                   q.tags.some(tag => tag.toLowerCase().includes(lowerKeyword)) ||
                   q.options.some(opt => opt.toLowerCase().includes(lowerKeyword));
        });
    }

    /**
     * 删除题目
     */
    deleteQuestion(questionId) {
        const index = this.questions.findIndex(q => q.id === questionId);
        if (index > -1) {
            this.questions.splice(index, 1);
            this.saveQuestions();
            console.log('✅ 题目删除成功:', questionId);
            return true;
        }
        return false;
    }

    /**
     * 更新题目
     */
    updateQuestion(questionId, updates) {
        const index = this.questions.findIndex(q => q.id === questionId);
        if (index > -1) {
            this.questions[index] = {
                ...this.questions[index],
                ...updates,
                updated_at: new Date().toISOString()
            };
            this.saveQuestions();
            console.log('✅ 题目更新成功:', questionId);
            return this.questions[index];
        }
        return null;
    }

    /**
     * 获取统计信息
     */
    getStatistics() {
        const stats = {
            total: this.questions.length,
            by_subject: {},
            by_year: {},
            by_difficulty: {}
        };

        this.questions.forEach(q => {
            // 按科目统计
            stats.by_subject[q.subject] = (stats.by_subject[q.subject] || 0) + 1;
            
            // 按年份统计
            stats.by_year[q.year] = (stats.by_year[q.year] || 0) + 1;
            
            // 按难度统计
            stats.by_difficulty[q.difficulty] = (stats.by_difficulty[q.difficulty] || 0) + 1;
        });

        return stats;
    }

    /**
     * 辅助方法：科目映射到分类
     */
    mapSubjectToCategory(subject) {
        const mapping = {
            // 公共课
            '高等数学': 'mathematics',
            '线性代数': 'linear_algebra',
            '概率论与数理统计': 'probability',
            '政治': 'politics',
            '英语': 'english',
            // 专业课
            '数据结构': 'data_structure',
            '算法设计': 'algorithm',
            '操作系统': 'operating_system', 
            '计算机网络': 'computer_network',
            '组成原理': 'computer_organization',
            '编译原理': 'compiler',
            '数据库': 'database'
        };
        return mapping[subject] || 'other';
    }

    /**
     * 辅助方法：难度映射到分数
     */
    mapDifficultyToScore(difficulty) {
        const mapping = {
            '简单': 3,
            '中等': 7,
            '困难': 9
        };
        return mapping[difficulty] || 5;
    }

    /**
     * 验证题目数据
     */
    validateQuestion(questionData) {
        const errors = [];
        
        if (!questionData.subject) errors.push('科目不能为空');
        if (!questionData.question) errors.push('题目内容不能为空');
        if (!questionData.options || !Array.isArray(questionData.options) || questionData.options.length < 2) {
            errors.push('选项至少需要2个');
        }
        if (typeof questionData.correct_answer !== 'number' || questionData.correct_answer < 0) {
            errors.push('正确答案索引无效');
        }
        if (questionData.options && questionData.correct_answer >= questionData.options.length) {
            errors.push('正确答案索引超出选项范围');
        }
        if (!questionData.year || questionData.year < 2000 || questionData.year > 2050) {
            errors.push('年份必须在2000-2050之间');
        }
        
        return errors;
    }

    /**
     * 批量删除题目
     */
    batchDeleteQuestions(questionIds) {
        const deleted = [];
        const failed = [];
        
        questionIds.forEach(id => {
            if (this.deleteQuestion(id)) {
                deleted.push(id);
            } else {
                failed.push(id);
            }
        });
        
        return { deleted, failed };
    }

    /**
     * 复制题目
     */
    duplicateQuestion(questionId) {
        const original = this.questions.find(q => q.id === questionId);
        if (!original) return null;
        
        const copy = {
            ...original,
            id: this.generateQuestionId(original.subject, original.year, this.questions.length + 1),
            question: original.question + ' (副本)',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        this.questions.push(copy);
        this.saveQuestions();
        return copy;
    }

    /**
     * 获取题目详情
     */
    getQuestion(questionId) {
        return this.questions.find(q => q.id === questionId);
    }

    /**
     * 获取随机题目
     */
    getRandomQuestions(count = 10, filters = {}) {
        const filtered = this.getFilteredQuestions(filters);
        const shuffled = [...filtered].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }
}

// 创建全局实例
window.QuestionBankManager = QuestionBankManager;
window.questionBank = new QuestionBankManager();

console.log('📚 题库管理工具加载完成');