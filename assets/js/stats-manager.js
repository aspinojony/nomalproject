/**
 * 学习统计管理器
 * 负责收集、存储、计算和展示学习数据
 */
class StudyStatsManager {
    constructor() {
        this.storageKey = 'study_statistics';
        this.currentSession = null;
        this.stats = this.loadStats();
        this.observers = [];
        
        // 初始化当前会话
        this.initCurrentSession();
        
        // 绑定页面卸载事件
        this.bindUnloadEvents();
        
        console.log('📊 学习统计管理器初始化完成');
    }

    /**
     * 初始化默认统计数据结构
     */
    getDefaultStats() {
        const today = new Date().toISOString().split('T')[0];
        return {
            // 基础统计
            totalStudyTime: 0,
            totalSessions: 0,
            totalQuestionsAnswered: 0,
            correctAnswers: 0,
            streakDays: 0,
            maxStreakDays: 0,
            
            // 按日期统计
            dailyStats: {
                [today]: {
                    date: today,
                    studyTime: 0,
                    sessions: 0,
                    questionsAnswered: 0,
                    correctAnswers: 0,
                    subjects: {}
                }
            },
            
            // 按科目统计
            subjectStats: {
                'mathematics': { name: '数学', time: 0, questions: 0, correct: 0 },
                'english': { name: '英语', time: 0, questions: 0, correct: 0 },
                'politics': { name: '政治', time: 0, questions: 0, correct: 0 },
                'data_structure': { name: '数据结构', time: 0, questions: 0, correct: 0 },
                'operating_system': { name: '操作系统', time: 0, questions: 0, correct: 0 },
                'computer_network': { name: '计算机网络', time: 0, questions: 0, correct: 0 },
                'computer_organization': { name: '组成原理', time: 0, questions: 0, correct: 0 }
            },
            
            // 学习目标
            goals: {
                dailyStudyTime: 120, // 每日目标(分钟)
                weeklyStudyTime: 840, // 每周目标(分钟)
                dailyQuestions: 50, // 每日答题目标
                monthlyQuestions: 500, // 每月答题目标
                targetAccuracy: 85 // 目标正确率
            },
            
            // 元数据
            metadata: {
                version: '1.0',
                createdAt: new Date().toISOString(),
                lastUpdated: new Date().toISOString()
            }
        };
    }

    /**
     * 加载统计数据
     */
    loadStats() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const stats = JSON.parse(stored);
                return this.mergeWithDefaults(stats);
            }
        } catch (error) {
            console.error('❌ 加载统计数据失败:', error);
        }
        return this.getDefaultStats();
    }

    /**
     * 合并默认数据结构
     */
    mergeWithDefaults(stats) {
        const defaults = this.getDefaultStats();
        return {
            ...defaults,
            ...stats,
            subjectStats: { ...defaults.subjectStats, ...stats.subjectStats },
            goals: { ...defaults.goals, ...stats.goals }
        };
    }

    /**
     * 保存统计数据
     */
    saveStats() {
        try {
            this.stats.metadata.lastUpdated = new Date().toISOString();
            localStorage.setItem(this.storageKey, JSON.stringify(this.stats));
            this.notifyObservers('statsUpdated', this.stats);
        } catch (error) {
            console.error('❌ 保存统计数据失败:', error);
        }
    }

    /**
     * 开始学习会话
     */
    startStudySession(subject = null, chapter = null) {
        if (this.currentSession?.isActive) {
            this.endStudySession();
        }

        this.currentSession = {
            id: Date.now(),
            startTime: new Date(),
            subject: subject,
            chapter: chapter,
            questionsAnswered: 0,
            correctAnswers: 0,
            isActive: true
        };

        console.log('📚 开始学习会话:', { subject, chapter });
        this.notifyObservers('sessionStarted', this.currentSession);
    }

    /**
     * 结束学习会话
     */
    endStudySession() {
        if (!this.currentSession?.isActive) return;

        this.currentSession.endTime = new Date();
        this.currentSession.studyTime = Math.round(
            (this.currentSession.endTime - this.currentSession.startTime) / (1000 * 60)
        );
        this.currentSession.isActive = false;

        // 更新统计数据
        this.updateStats(this.currentSession);

        console.log('⏹️ 结束学习会话:', {
            duration: this.currentSession.studyTime + '分钟'
        });

        this.notifyObservers('sessionEnded', this.currentSession);
        this.saveStats();
    }

    /**
     * 更新统计数据
     */
    updateStats(session) {
        const today = new Date().toISOString().split('T')[0];
        const studyTime = session.studyTime || 0;

        // 更新总体统计
        this.stats.totalStudyTime += studyTime;
        this.stats.totalSessions += 1;
        this.stats.totalQuestionsAnswered += session.questionsAnswered || 0;
        this.stats.correctAnswers += session.correctAnswers || 0;

        // 更新今日统计
        if (!this.stats.dailyStats[today]) {
            this.stats.dailyStats[today] = {
                date: today,
                studyTime: 0,
                sessions: 0,
                questionsAnswered: 0,
                correctAnswers: 0,
                subjects: {}
            };
        }

        const dailyStat = this.stats.dailyStats[today];
        dailyStat.studyTime += studyTime;
        dailyStat.sessions += 1;
        dailyStat.questionsAnswered += session.questionsAnswered || 0;
        dailyStat.correctAnswers += session.correctAnswers || 0;

        // 更新科目统计
        if (session.subject && this.stats.subjectStats[session.subject]) {
            const subjectStat = this.stats.subjectStats[session.subject];
            subjectStat.time += studyTime;
            subjectStat.questions += session.questionsAnswered || 0;
            subjectStat.correct += session.correctAnswers || 0;
        }
    }

    /**
     * 记录答题结果
     */
    recordAnswer(isCorrect, subject = null) {
        if (!this.currentSession?.isActive) {
            console.warn('⚠️ 没有活跃的学习会话');
            return;
        }

        this.currentSession.questionsAnswered++;
        if (isCorrect) {
            this.currentSession.correctAnswers++;
        }

        if (subject) {
            this.currentSession.subject = subject;
        }

        this.notifyObservers('answerRecorded', {
            isCorrect,
            subject,
            totalQuestions: this.currentSession.questionsAnswered,
            correctAnswers: this.currentSession.correctAnswers
        });
    }

    /**
     * 获取今日统计
     */
    getTodayStats() {
        const today = new Date().toISOString().split('T')[0];
        return this.stats.dailyStats[today] || {
            studyTime: 0,
            sessions: 0,
            questionsAnswered: 0,
            correctAnswers: 0
        };
    }

    /**
     * 获取学习准确率
     */
    getAccuracy() {
        return this.stats.totalQuestionsAnswered > 0 ? 
            Math.round((this.stats.correctAnswers / this.stats.totalQuestionsAnswered) * 100) : 0;
    }

    /**
     * 获取目标完成度
     */
    getGoalProgress() {
        const today = this.getTodayStats();
        
        return {
            daily: {
                current: today.studyTime,
                target: this.stats.goals.dailyStudyTime,
                progress: Math.min(100, Math.round((today.studyTime / this.stats.goals.dailyStudyTime) * 100))
            },
            accuracy: {
                current: this.getAccuracy(),
                target: this.stats.goals.targetAccuracy,
                progress: Math.min(100, Math.round((this.getAccuracy() / this.stats.goals.targetAccuracy) * 100))
            }
        };
    }

    /**
     * 获取科目排序（按学习时间）
     */
    getSubjectsRanking() {
        return Object.entries(this.stats.subjectStats)
            .map(([key, stats]) => ({ key, ...stats }))
            .sort((a, b) => b.time - a.time);
    }

    /**
     * 初始化当前学习会话
     */
    initCurrentSession() {
        this.currentSession = {
            isActive: false
        };
    }

    /**
     * 绑定页面卸载事件
     */
    bindUnloadEvents() {
        window.addEventListener('beforeunload', () => {
            if (this.currentSession?.isActive) {
                this.endStudySession();
            }
        });
    }

    /**
     * 观察者模式
     */
    addObserver(callback) {
        this.observers.push(callback);
    }

    removeObserver(callback) {
        this.observers = this.observers.filter(obs => obs !== callback);
    }

    notifyObservers(event, data) {
        this.observers.forEach(callback => {
            try {
                callback(event, data);
            } catch (error) {
                console.error('❌ 观察者回调错误:', error);
            }
        });
    }

    /**
     * 导出学习记录数据（包含章节进度）
     */
    async exportStudyData(format = 'json') {
        try {
            if (format === 'csv') {
                return await this.exportCSVData();
            } else {
                return await this.exportJSONData();
            }
        } catch (error) {
            console.error('❌ 导出学习记录失败:', error);
            return {
                success: false,
                message: '导出失败: ' + error.message,
                error: error
            };
        }
    }

    /**
     * 导出JSON格式数据（包含章节进度）
     */
    async exportJSONData() {
        // 获取章节进度数据
        const chapterProgress = await this.getAllChapterProgress();
        
        const exportData = {
            // 完整的统计数据
            stats: this.stats,
            // 章节完成度数据
            chapterProgress: chapterProgress,
            // 当前会话信息（不包含活跃状态）
            currentSession: this.currentSession?.isActive ? {
                ...this.currentSession,
                isActive: false // 导出时不保存活跃状态
            } : null,
            // 导出元数据
            exportInfo: {
                exportTime: new Date().toISOString(),
                version: '1.2',
                platform: 'Computer Science Study Platform',
                dataTypes: ['dailyStats', 'subjectStats', 'goals', 'sessions', 'chapterProgress'],
                totalStudyTime: this.stats.totalStudyTime,
                totalSessions: this.stats.totalSessions,
                totalChapters: chapterProgress.totalChapters,
                completedChapters: chapterProgress.completedChapters,
                dataIntegrity: this.calculateDataIntegrity()
            }
        };

        // 创建文件并下载
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `学习记录完整版_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('📥 完整学习记录JSON已导出');
        this.notifyObservers('dataExported', exportData.exportInfo);
        
        return {
            success: true,
            message: '完整学习记录JSON导出成功',
            exportInfo: exportData.exportInfo
        };
    }

    /**
     * 导出CSV格式数据（包含章节进度）
     */
    async exportCSVData() {
        // 准备CSV数据
        const csvData = await this.prepareEnhancedCSVData();
        
        // 创建CSV文件并下载
        const csvStr = this.convertToCSV(csvData);
        const csvBlob = new Blob(['\ufeff' + csvStr], { type: 'text/csv;charset=utf-8;' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(csvBlob);
        link.download = `学习记录详细版_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('📥 详细学习记录CSV已导出');
        this.notifyObservers('dataExported', { 
            format: 'csv', 
            recordCount: csvData.length,
            exportTime: new Date().toISOString()
        });
        
        return {
            success: true,
            message: '详细学习记录CSV导出成功',
            recordCount: csvData.length
        };
    }

    /**
     * 获取所有章节进度数据（兼容多种数据源）
     */
    async getAllChapterProgress() {
        try {
            console.log('🔍 开始获取章节进度数据...');
            
            // 优先尝试从subjects.html的localStorage获取数据
            console.log('📋 尝试从subjects localStorage获取数据...');
            const subjectsProgress = this.getSubjectsProgressFromLocalStorage();
            if (subjectsProgress && subjectsProgress.totalChapters > 0) {
                console.log('✅ 从subjects页面localStorage获取章节进度数据成功');
                console.log('📊 数据详情:', {
                    totalChapters: subjectsProgress.totalChapters,
                    completedChapters: subjectsProgress.completedChapters,
                    courseCount: Object.keys(subjectsProgress.courseProgress || {}).length
                });
                return subjectsProgress;
            }

            // 如果subjects进度为空，尝试从IndexedDB获取
            console.log('📋 subjects数据为空，尝试从IndexedDB获取数据...');
            const indexedDBProgress = await this.getIndexedDBProgress();
            if (indexedDBProgress && indexedDBProgress.totalChapters > 0) {
                console.log('✅ 从IndexedDB获取章节进度数据成功');
                console.log('📊 IndexedDB数据详情:', {
                    totalChapters: indexedDBProgress.totalChapters,
                    completedChapters: indexedDBProgress.completedChapters,
                    courseCount: Object.keys(indexedDBProgress.courseProgress || {}).length
                });
                return indexedDBProgress;
            }

            // 如果都没有数据，返回空结构
            console.log('⚠️ 未找到任何章节进度数据，返回空结构');
            const emptyResult = {
                courseProgress: {},
                totalChapters: 0,
                completedChapters: 0,
                totalWatchedSeconds: 0
            };
            console.log('📊 空结构返回:', emptyResult);
            return emptyResult;
            
        } catch (error) {
            console.error('❌ 获取章节进度失败:', error);
            console.error('🔍 错误堆栈:', error.stack);
            return {
                courseProgress: {},
                totalChapters: 0,
                completedChapters: 0,
                totalWatchedSeconds: 0,
                error: error.message
            };
        }
    }

    /**
     * 从subjects.html的localStorage获取进度数据
     */
    getSubjectsProgressFromLocalStorage() {
        try {
            console.log('📋 检查localStorage中的study_progress数据...');
            const stored = localStorage.getItem('study_progress');
            if (!stored) {
                console.log('⚠️ localStorage中未找到study_progress数据');
                return {
                    courseProgress: {},
                    totalChapters: 0,
                    completedChapters: 0,
                    totalWatchedSeconds: 0
                };
            }

            console.log(`📋 找到study_progress数据，大小: ${stored.length} 字符`);
            const progressData = JSON.parse(stored);
            console.log('📋 解析后的数据结构:', {
                hasPublicSubjects: !!(progressData.publicSubjects),
                publicSubjectsCount: progressData.publicSubjects ? progressData.publicSubjects.length : 0,
                hasProfessionalSubjects: !!(progressData.professionalSubjects),
                professionalSubjectsCount: progressData.professionalSubjects ? progressData.professionalSubjects.length : 0
            });

            const chapterProgressData = {
                courseProgress: {},
                totalChapters: 0,
                completedChapters: 0,
                totalWatchedSeconds: 0
            };

            // 处理公共课和专业课数据
            const allSubjects = [
                ...(progressData.publicSubjects || []),
                ...(progressData.professionalSubjects || [])
            ];

            console.log(`📚 准备处理 ${allSubjects.length} 个科目`);

            allSubjects.forEach((subject, index) => {
                console.log(`📚 处理科目 ${index + 1}: ${subject.name} (ID: ${subject.id})`);
                
                if (!subject.chapters || !Array.isArray(subject.chapters)) {
                    console.warn(`⚠️ 科目 ${subject.name} 没有有效的章节数据`);
                    return;
                }

                const courseData = {
                    courseName: subject.name,
                    courseId: subject.id,
                    chapters: [],
                    completedCount: 0,
                    totalWatchedSeconds: 0
                };

                console.log(`📖 处理科目 ${subject.name} 的 ${subject.chapters.length} 个章节`);

                // 处理每个章节
                subject.chapters.forEach((chapter, chapterIndex) => {
                    const chapterData = {
                        index: chapterIndex,
                        name: chapter.name,
                        duration: chapter.duration || '0',
                        difficulty: chapter.difficulty || '中等',
                        completed: chapter.completed || false,
                        watchedSeconds: this.parseDurationToSeconds(chapter.duration),
                        lastVisited: null,
                        isAutoCompleted: false
                    };

                    console.log(`  📄 章节 ${chapterIndex + 1}: ${chapter.name} - ${chapterData.completed ? '已完成' : '未完成'} (${chapterData.watchedSeconds}秒)`);

                    courseData.chapters.push(chapterData);
                    chapterProgressData.totalChapters++;
                    
                    if (chapterData.completed) {
                        courseData.completedCount++;
                        chapterProgressData.completedChapters++;
                    }
                    
                    courseData.totalWatchedSeconds += chapterData.watchedSeconds;
                    chapterProgressData.totalWatchedSeconds += chapterData.watchedSeconds;
                });

                chapterProgressData.courseProgress[subject.id] = courseData;
                console.log(`✅ 科目 ${subject.name} 处理完成: ${courseData.completedCount}/${courseData.chapters.length} 章节完成`);
            });

            console.log('✅ subjects localStorage数据处理完成:', {
                totalChapters: chapterProgressData.totalChapters,
                completedChapters: chapterProgressData.completedChapters,
                completionRate: chapterProgressData.totalChapters > 0 ? 
                    Math.round((chapterProgressData.completedChapters / chapterProgressData.totalChapters) * 100) : 0,
                totalWatchedMinutes: Math.round(chapterProgressData.totalWatchedSeconds / 60),
                courseCount: Object.keys(chapterProgressData.courseProgress).length
            });

            return chapterProgressData;
            
        } catch (error) {
            console.error('❌ 从subjects localStorage获取进度失败:', error);
            console.error('🔍 错误详情:', error.stack);
            return {
                courseProgress: {},
                totalChapters: 0,
                completedChapters: 0,
                totalWatchedSeconds: 0
            };
        }
    }

    /**
     * 从IndexedDB获取进度数据（原有逻辑）
     */
    async getIndexedDBProgress() {
        try {
            // 获取课程数据
            const courses = await this.getCourseData();
            if (!courses) {
                throw new Error('无法获取课程数据');
            }

            const chapterProgressData = {
                courseProgress: {},
                totalChapters: 0,
                completedChapters: 0,
                totalWatchedSeconds: 0
            };

            // 遍历所有课程获取章节进度
            for (const course of courses) {
                const progressMap = await this.loadProgressFromDB(course.id);
                
                const courseData = {
                    courseName: course.name,
                    courseId: course.id,
                    chapters: [],
                    completedCount: 0,
                    totalWatchedSeconds: 0
                };

                // 处理每个章节
                course.chapters.forEach((chapter, index) => {
                    const progress = progressMap[index] || {};
                    const chapterData = {
                        index: index,
                        name: chapter.name,
                        duration: chapter.duration,
                        difficulty: chapter.difficulty,
                        completed: progress.completed || false,
                        watchedSeconds: progress.watchedSeconds || 0,
                        lastVisited: progress.lastVisited || null,
                        isAutoCompleted: progress.isAutoCompleted || false
                    };

                    courseData.chapters.push(chapterData);
                    chapterProgressData.totalChapters++;
                    
                    if (chapterData.completed) {
                        courseData.completedCount++;
                        chapterProgressData.completedChapters++;
                    }
                    
                    courseData.totalWatchedSeconds += chapterData.watchedSeconds;
                    chapterProgressData.totalWatchedSeconds += chapterData.watchedSeconds;
                });

                chapterProgressData.courseProgress[course.id] = courseData;
            }

            return chapterProgressData;
            
        } catch (error) {
            console.error('❌ 从IndexedDB获取进度失败:', error);
            return {
                courseProgress: {},
                totalChapters: 0,
                completedChapters: 0,
                totalWatchedSeconds: 0
            };
        }
    }

    /**
     * 解析时长字符串为秒数
     */
    parseDurationToSeconds(duration) {
        if (!duration || typeof duration !== 'string') {
            return 0;
        }

        try {
            // 匹配各种时长格式
            const patterns = [
                /(\d+)小时(\d+)分钟/,           // "3小时30分钟"
                /(\d+)小时(\d+)分/,            // "3小时30分"  
                /(\d+)h\s*(\d+)m/,           // "3h 30m"
                /(\d+)小时/,                 // "3小时"
                /(\d+)分钟/,                 // "30分钟"
                /(\d+)分(\d+)秒/,            // "30分45秒"
                /(\d+)分/,                   // "30分"
                /(\d+)秒/                    // "45秒"
            ];

            // 处理 "3小时30分钟" 格式
            let match = duration.match(/(\d+)小时(\d+)分钟/);
            if (match) {
                return parseInt(match[1]) * 3600 + parseInt(match[2]) * 60;
            }

            // 处理 "3小时30分" 格式
            match = duration.match(/(\d+)小时(\d+)分/);
            if (match) {
                return parseInt(match[1]) * 3600 + parseInt(match[2]) * 60;
            }

            // 处理 "3小时" 格式
            match = duration.match(/(\d+)小时/);
            if (match) {
                return parseInt(match[1]) * 3600;
            }

            // 处理 "30分45秒" 格式
            match = duration.match(/(\d+)分(\d+)秒/);
            if (match) {
                return parseInt(match[1]) * 60 + parseInt(match[2]);
            }

            // 处理 "30分钟" 或 "30分" 格式
            match = duration.match(/(\d+)分/);
            if (match) {
                return parseInt(match[1]) * 60;
            }

            // 处理 "45秒" 格式
            match = duration.match(/(\d+)秒/);
            if (match) {
                return parseInt(match[1]);
            }

            // 处理 "3h 30m" 格式
            match = duration.match(/(\d+)h\s*(\d+)m/);
            if (match) {
                return parseInt(match[1]) * 3600 + parseInt(match[2]) * 60;
            }

            return 0;
        } catch (error) {
            console.error('解析时长失败:', duration, error);
            return 0;
        }
    }

    /**
     * 获取课程数据
     */
    async getCourseData() {
        try {
            // 优先从全局变量获取
            if (window.coursesData) {
                return window.coursesData;
            }

            // 尝试从课程数据加载器获取
            if (window.courseDataLoader && typeof window.courseDataLoader.loadCourseData === 'function') {
                return await window.courseDataLoader.loadCourseData();
            }

            // 尝试获取嵌入式数据
            if (window.fallbackCourseData) {
                return window.fallbackCourseData;
            }

            throw new Error('无法找到课程数据源');
            
        } catch (error) {
            console.error('❌ 获取课程数据失败:', error);
            return null;
        }
    }

    /**
     * 从IndexedDB加载进度（兼容progress-db.js）
     */
    async loadProgressFromDB(courseId) {
        try {
            const DB_NAME = "StudyProgressDB";
            const STORE_NAME = "progress";
            
            // 初始化数据库
            const db = await new Promise((resolve, reject) => {
                const request = indexedDB.open(DB_NAME, 1);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject("IndexedDB 打开失败");
            });

            // 读取数据
            const tx = db.transaction(STORE_NAME, "readonly");
            const store = tx.objectStore(STORE_NAME);

            return new Promise((resolve) => {
                const request = store.getAll();
                request.onsuccess = () => {
                    const progress = {};
                    request.result
                        .filter(item => item.courseId == courseId)
                        .forEach(item => {
                            progress[item.chapterIndex] = item;
                        });
                    resolve(progress);
                };
                request.onerror = () => resolve({});
            });
            
        } catch (error) {
            console.error('❌ 从IndexedDB加载进度失败:', error);
            return {};
        }
    }

    /**
     * 准备增强版CSV数据（包含章节进度）
     */
    async prepareEnhancedCSVData() {
        const csvData = [];
        
        // 1. 每日统计数据
        Object.entries(this.stats.dailyStats).forEach(([date, dayStats]) => {
            csvData.push({
                类型: '每日统计',
                日期: date,
                课程科目: '',
                章节名称: '',
                学习时长分钟: dayStats.studyTime || 0,
                学习会话: dayStats.sessions || 0,
                答题数量: dayStats.questionsAnswered || 0,
                正确答案: dayStats.correctAnswers || 0,
                正确率: dayStats.questionsAnswered > 0 ? 
                    Math.round((dayStats.correctAnswers / dayStats.questionsAnswered) * 100) + '%' : '0%',
                完成状态: '',
                观看时长: '',
                备注: `学习${Math.round((dayStats.studyTime || 0) / 60 * 10) / 10}小时`
            });
        });
        
        // 2. 科目统计数据
        Object.entries(this.stats.subjectStats).forEach(([key, subjectStats]) => {
            csvData.push({
                类型: '科目统计',
                日期: '',
                课程科目: subjectStats.name,
                章节名称: '',
                学习时长分钟: subjectStats.time || 0,
                学习会话: '',
                答题数量: subjectStats.questions || 0,
                正确答案: subjectStats.correct || 0,
                正确率: subjectStats.questions > 0 ? 
                    Math.round((subjectStats.correct / subjectStats.questions) * 100) + '%' : '0%',
                完成状态: '',
                观看时长: '',
                备注: `累计学习${Math.round((subjectStats.time || 0) / 60 * 10) / 10}小时`
            });
        });

        // 3. 章节进度数据
        const chapterProgress = await this.getAllChapterProgress();
        Object.values(chapterProgress.courseProgress).forEach(course => {
            course.chapters.forEach(chapter => {
                csvData.push({
                    类型: '章节进度',
                    日期: chapter.lastVisited ? new Date(chapter.lastVisited).toLocaleDateString('zh-CN') : '',
                    课程科目: course.courseName,
                    章节名称: chapter.name,
                    学习时长分钟: '',
                    学习会话: '',
                    答题数量: '',
                    正确答案: '',
                    正确率: '',
                    完成状态: chapter.completed ? '已完成' : '未完成',
                    观看时长: chapter.watchedSeconds > 0 ? 
                        Math.floor(chapter.watchedSeconds / 60) + '分' + (chapter.watchedSeconds % 60) + '秒' : '0秒',
                    备注: `难度:${chapter.difficulty}${chapter.isAutoCompleted ? ' (自动完成)' : ''}`
                });
            });
        });
        
        // 4. 总体统计
        csvData.push({
            类型: '总体统计',
            日期: '',
            课程科目: '全部',
            章节名称: '',
            学习时长分钟: this.stats.totalStudyTime,
            学习会话: this.stats.totalSessions,
            答题数量: this.stats.totalQuestionsAnswered || 0,
            正确答案: this.stats.correctAnswers || 0,
            正确率: this.stats.totalQuestionsAnswered > 0 ? 
                Math.round((this.stats.correctAnswers / this.stats.totalQuestionsAnswered) * 100) + '%' : '0%',
            完成状态: `${chapterProgress.completedChapters}/${chapterProgress.totalChapters}章节`,
            观看时长: chapterProgress.totalWatchedSeconds > 0 ?
                Math.floor(chapterProgress.totalWatchedSeconds / 3600) + '小时' + 
                Math.floor((chapterProgress.totalWatchedSeconds % 3600) / 60) + '分钟' : '0',
            备注: `总计学习${Math.round(this.stats.totalStudyTime / 60 * 10) / 10}小时，连续${this.stats.streakDays}天`
        });
        
        return csvData;
    }

    /**
     * 转换为CSV格式
     */
    convertToCSV(data) {
        if (!data || data.length === 0) return '';
        
        // 获取列标题
        const headers = Object.keys(data[0]);
        
        // 创建CSV内容
        const csvContent = [
            headers.join(','),
            ...data.map(row => 
                headers.map(header => {
                    const value = row[header] || '';
                    // 如果包含逗号或换行符，需要用双引号包围
                    return typeof value === 'string' && (value.includes(',') || value.includes('\n') || value.includes('"')) 
                        ? `"${value.replace(/"/g, '""')}"` 
                        : value;
                }).join(',')
            )
        ].join('\n');
        
        return csvContent;
    }

    /**
     * 导入学习记录数据（包含章节进度）
     */
    async importStudyData(file) {
        return new Promise((resolve, reject) => {
            if (!file) {
                reject(new Error('未选择文件'));
                return;
            }

            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    const importData = JSON.parse(e.target.result);
                    
                    // 验证数据格式
                    if (!this.validateImportData(importData)) {
                        throw new Error('无效的学习记录数据格式');
                    }

                    // 备份当前数据
                    await this.backupCurrentData();

                    // 选择导入策略
                    this.showImportOptions(importData)
                        .then(async (strategy) => {
                            const result = await this.processImportData(importData, strategy);
                            resolve(result);
                        })
                        .catch(reject);
                        
                } catch (error) {
                    console.error('❌ 导入学习记录失败:', error);
                    reject(error);
                }
            };
            
            reader.onerror = () => {
                reject(new Error('文件读取失败'));
            };
            
            reader.readAsText(file);
        });
    }

    /**
     * 验证导入数据格式（增强版）
     */
    validateImportData(data) {
        try {
            // 检查基本结构
            if (!data.stats || typeof data.stats !== 'object') {
                console.error('缺少 stats 数据');
                return false;
            }

            // 检查必要的统计字段
            const requiredFields = ['totalStudyTime', 'totalSessions', 'dailyStats', 'subjectStats'];
            for (let field of requiredFields) {
                if (!(field in data.stats)) {
                    console.error(`缺少必要字段: ${field}`);
                    return false;
                }
            }

            // 检查数据类型
            if (typeof data.stats.totalStudyTime !== 'number' ||
                typeof data.stats.totalSessions !== 'number' ||
                typeof data.stats.dailyStats !== 'object' ||
                typeof data.stats.subjectStats !== 'object') {
                console.error('数据类型不正确');
                return false;
            }

            // 检查章节进度数据（如果存在）
            if (data.chapterProgress) {
                if (typeof data.chapterProgress !== 'object') {
                    console.error('章节进度数据格式不正确');
                    return false;
                }
                
                // 验证章节进度结构
                if (data.chapterProgress.courseProgress && 
                    typeof data.chapterProgress.courseProgress !== 'object') {
                    console.error('课程进度数据格式不正确');
                    return false;
                }
            }

            console.log('✅ 数据格式验证通过');
            return true;
            
        } catch (error) {
            console.error('❌ 数据验证失败:', error);
            return false;
        }
    }

    /**
     * 显示导入选项对话框（增强版）
     */
    showImportOptions(importData) {
        return new Promise((resolve, reject) => {
            const currentData = this.stats;
            const importStats = importData.stats;
            const hasChapterProgress = importData.chapterProgress && 
                importData.chapterProgress.totalChapters > 0;
            
            const message = `检测到学习记录数据：
            
📊 当前数据：
• 总学习时长：${Math.round(currentData.totalStudyTime / 60)}小时
• 学习会话：${currentData.totalSessions}次
• 答题数量：${currentData.totalQuestionsAnswered}题
• 数据日期：${Object.keys(currentData.dailyStats).length}天

📥 导入数据：
• 总学习时长：${Math.round(importStats.totalStudyTime / 60)}小时
• 学习会话：${importStats.totalSessions}次  
• 答题数量：${importStats.totalQuestionsAnswered || 0}题
• 数据日期：${Object.keys(importStats.dailyStats).length}天
${hasChapterProgress ? `• 章节进度：${importData.chapterProgress.completedChapters}/${importData.chapterProgress.totalChapters}章节完成` : ''}

请选择导入方式：`;

            // 创建自定义对话框
            const dialog = document.createElement('div');
            dialog.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
            dialog.innerHTML = `
                <div class="bg-white rounded-xl max-w-md w-full p-6">
                    <h3 class="text-xl font-bold text-gray-900 mb-4">📥 导入学习记录</h3>
                    <div class="text-sm text-gray-600 mb-6 whitespace-pre-line">${message}</div>
                    <div class="space-y-3">
                        <button id="merge-btn" class="w-full bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600 transition-colors">
                            🔄 合并导入（推荐）
                            <div class="text-xs opacity-90 mt-1">保留现有数据，合并新数据${hasChapterProgress ? '和章节进度' : ''}</div>
                        </button>
                        <button id="replace-btn" class="w-full bg-orange-500 text-white p-3 rounded-lg hover:bg-orange-600 transition-colors">
                            🔄 替换导入
                            <div class="text-xs opacity-90 mt-1">清空现有数据，使用导入数据${hasChapterProgress ? '和章节进度' : ''}</div>
                        </button>
                        <button id="cancel-btn" class="w-full bg-gray-500 text-white p-3 rounded-lg hover:bg-gray-600 transition-colors">
                            ❌ 取消导入
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(dialog);

            // 绑定事件
            dialog.querySelector('#merge-btn').onclick = () => {
                document.body.removeChild(dialog);
                resolve('merge');
            };

            dialog.querySelector('#replace-btn').onclick = () => {
                document.body.removeChild(dialog);
                resolve('replace');
            };

            dialog.querySelector('#cancel-btn').onclick = () => {
                document.body.removeChild(dialog);
                reject(new Error('用户取消导入'));
            };
        });
    }

    /**
     * 处理导入数据（增强版）
     */
    async processImportData(importData, strategy) {
        try {
            const oldStats = { ...this.stats };
            
            if (strategy === 'replace') {
                // 替换模式：直接使用导入数据
                this.stats = this.mergeWithDefaults(importData.stats);
                
            } else if (strategy === 'merge') {
                // 合并模式：智能合并数据
                this.stats = this.mergeStatsData(this.stats, importData.stats);
            }

            // 保存统计数据
            this.saveStats();
            
            // 处理章节进度数据（如果存在）
            let chapterProgressResult = null;
            if (importData.chapterProgress) {
                chapterProgressResult = await this.importChapterProgress(
                    importData.chapterProgress, 
                    strategy
                );
            }
            
            const result = {
                success: true,
                strategy: strategy,
                message: strategy === 'merge' ? '数据合并成功' : '数据替换成功',
                oldStats: {
                    totalStudyTime: oldStats.totalStudyTime,
                    totalSessions: oldStats.totalSessions,
                    totalQuestions: oldStats.totalQuestionsAnswered
                },
                newStats: {
                    totalStudyTime: this.stats.totalStudyTime,
                    totalSessions: this.stats.totalSessions,
                    totalQuestions: this.stats.totalQuestionsAnswered
                },
                chapterProgress: chapterProgressResult
            };

            console.log('✅ 学习记录导入成功:', result);
            this.notifyObservers('dataImported', result);
            
            return result;
            
        } catch (error) {
            console.error('❌ 处理导入数据失败:', error);
            throw error;
        }
    }

    /**
     * 导入章节进度数据
     */
    async importChapterProgress(chapterProgressData, strategy) {
        try {
            if (!chapterProgressData.courseProgress) {
                throw new Error('章节进度数据格式错误');
            }

            let importedCount = 0;
            let errorCount = 0;

            // 遍历所有课程的章节进度（保存到IndexedDB）
            for (const [courseId, courseData] of Object.entries(chapterProgressData.courseProgress)) {
                if (!courseData.chapters || !Array.isArray(courseData.chapters)) {
                    console.warn(`课程 ${courseId} 的章节数据格式错误`);
                    continue;
                }

                // 处理每个章节的进度
                for (const chapter of courseData.chapters) {
                    try {
                        await this.saveChapterProgressToDB(
                            parseInt(courseId), 
                            chapter.index, 
                            {
                                completed: chapter.completed || false,
                                watchedSeconds: chapter.watchedSeconds || 0,
                                isAutoCompleted: chapter.isAutoCompleted || false
                            },
                            strategy
                        );
                        importedCount++;
                    } catch (error) {
                        console.error(`导入章节进度失败 ${courseId}:${chapter.index}:`, error);
                        errorCount++;
                    }
                }
            }

            // 【关键修复】同步数据到subjects.html使用的localStorage格式
            console.log('🔄 开始同步章节进度到subjects localStorage格式...');
            const syncResult = await this.syncChapterProgressToSubjectsFormat(chapterProgressData, strategy);
            console.log('✅ 章节进度同步到subjects格式完成:', syncResult);

            console.log(`✅ 章节进度导入完成: ${importedCount}个成功, ${errorCount}个失败`);
            
            return {
                success: true,
                importedCount: importedCount,
                errorCount: errorCount,
                totalChapters: chapterProgressData.totalChapters,
                completedChapters: chapterProgressData.completedChapters,
                syncResult: syncResult
            };
            
        } catch (error) {
            console.error('❌ 导入章节进度失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 保存章节进度到IndexedDB
     */
    async saveChapterProgressToDB(courseId, chapterIndex, data, strategy) {
        try {
            const DB_NAME = "StudyProgressDB";
            const STORE_NAME = "progress";
            
            // 初始化数据库
            const db = await new Promise((resolve, reject) => {
                const request = indexedDB.open(DB_NAME, 1);
                
                request.onupgradeneeded = function (event) {
                    const db = event.target.result;
                    if (!db.objectStoreNames.contains(STORE_NAME)) {
                        db.createObjectStore(STORE_NAME, { keyPath: "key" });
                    }
                };
                
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject("IndexedDB 打开失败");
            });

            const tx = db.transaction(STORE_NAME, "readwrite");
            const store = tx.objectStore(STORE_NAME);

            const key = `${courseId}:${chapterIndex}`;
            
            if (strategy === 'merge') {
                // 合并模式：如果记录存在，保留观看时长更大的值
                const existingRecord = await new Promise((resolve) => {
                    const request = store.get(key);
                    request.onsuccess = () => resolve(request.result);
                    request.onerror = () => resolve(null);
                });

                if (existingRecord) {
                    data.watchedSeconds = Math.max(
                        existingRecord.watchedSeconds || 0, 
                        data.watchedSeconds || 0
                    );
                    data.completed = existingRecord.completed || data.completed;
                }
            }

            const record = {
                key,
                courseId,
                chapterIndex,
                ...data,
                lastVisited: new Date().toISOString()
            };

            store.put(record);
            
            return new Promise((resolve, reject) => {
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
            
        } catch (error) {
            console.error('❌ 保存章节进度失败:', error);
            throw error;
        }
    }

    /**
     * 备份当前数据（增强版）
     */
    async backupCurrentData() {
        try {
            // 备份统计数据
            const statsBackupData = {
                stats: this.stats,
                backupTime: new Date().toISOString(),
                version: '1.2'
            };
            
            localStorage.setItem('study_stats_backup_before_import', JSON.stringify(statsBackupData));
            
            // 备份章节进度数据
            const chapterProgress = await this.getAllChapterProgress();
            const chapterBackupData = {
                chapterProgress: chapterProgress,
                backupTime: new Date().toISOString(),
                version: '1.2'
            };
            
            localStorage.setItem('chapter_progress_backup_before_import', JSON.stringify(chapterBackupData));
            
            console.log('✅ 当前数据和章节进度已备份');
            
        } catch (error) {
            console.error('❌ 备份数据失败:', error);
        }
    }

    /**
     * 恢复备份数据（增强版）
     */
    async restoreBackupData() {
        try {
            // 恢复统计数据
            const statsBackup = localStorage.getItem('study_stats_backup_before_import');
            let statsRestored = false;
            
            if (statsBackup) {
                const backupData = JSON.parse(statsBackup);
                this.stats = backupData.stats;
                this.saveStats();
                statsRestored = true;
            }
            
            // 恢复章节进度数据
            const chapterBackup = localStorage.getItem('chapter_progress_backup_before_import');
            let chapterRestored = false;
            
            if (chapterBackup) {
                const backupData = JSON.parse(chapterBackup);
                await this.restoreChapterProgressFromBackup(backupData.chapterProgress);
                chapterRestored = true;
            }
            
            if (statsRestored || chapterRestored) {
                console.log('✅ 已恢复备份数据');
                this.notifyObservers('dataRestored', { statsRestored, chapterRestored });
                
                return {
                    success: true,
                    message: '数据恢复成功',
                    statsRestored: statsRestored,
                    chapterRestored: chapterRestored
                };
            } else {
                throw new Error('没有找到备份数据');
            }
            
        } catch (error) {
            console.error('❌ 恢复备份数据失败:', error);
            return {
                success: false,
                message: '恢复失败: ' + error.message
            };
        }
    }

    /**
     * 从备份恢复章节进度
     */
    async restoreChapterProgressFromBackup(chapterProgressData) {
        try {
            if (!chapterProgressData.courseProgress) {
                throw new Error('备份的章节进度数据格式错误');
            }

            // 清空现有的章节进度数据
            await this.clearAllChapterProgress();
            
            // 恢复每个课程的章节进度
            for (const [courseId, courseData] of Object.entries(chapterProgressData.courseProgress)) {
                if (courseData.chapters && Array.isArray(courseData.chapters)) {
                    for (const chapter of courseData.chapters) {
                        await this.saveChapterProgressToDB(
                            parseInt(courseId), 
                            chapter.index, 
                            {
                                completed: chapter.completed || false,
                                watchedSeconds: chapter.watchedSeconds || 0,
                                isAutoCompleted: chapter.isAutoCompleted || false
                            },
                            'replace' // 使用替换模式恢复
                        );
                    }
                }
            }
            
            console.log('✅ 章节进度已从备份恢复');
            
        } catch (error) {
            console.error('❌ 恢复章节进度失败:', error);
            throw error;
        }
    }

    /**
     * 清空所有章节进度数据
     */
    async clearAllChapterProgress() {
        try {
            const DB_NAME = "StudyProgressDB";
            const STORE_NAME = "progress";
            
            const db = await new Promise((resolve, reject) => {
                const request = indexedDB.open(DB_NAME, 1);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject("IndexedDB 打开失败");
            });

            const tx = db.transaction(STORE_NAME, "readwrite");
            const store = tx.objectStore(STORE_NAME);
            
            store.clear();
            
            return new Promise((resolve, reject) => {
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
            
        } catch (error) {
            console.error('❌ 清空章节进度失败:', error);
            throw error;
        }
    }

    /**
     * 智能合并统计数据
     */
    mergeStatsData(currentStats, importStats) {
        const merged = { ...currentStats };
        
        // 合并基础统计
        merged.totalStudyTime += importStats.totalStudyTime || 0;
        merged.totalSessions += importStats.totalSessions || 0;
        merged.totalQuestionsAnswered += importStats.totalQuestionsAnswered || 0;
        merged.correctAnswers += importStats.correctAnswers || 0;
        merged.maxStreakDays = Math.max(merged.maxStreakDays || 0, importStats.maxStreakDays || 0);
        
        // 合并每日统计
        Object.keys(importStats.dailyStats || {}).forEach(date => {
            const importDayStats = importStats.dailyStats[date];
            if (merged.dailyStats[date]) {
                // 如果日期已存在，合并数据
                merged.dailyStats[date].studyTime += importDayStats.studyTime || 0;
                merged.dailyStats[date].sessions += importDayStats.sessions || 0;
                merged.dailyStats[date].questionsAnswered += importDayStats.questionsAnswered || 0;
                merged.dailyStats[date].correctAnswers += importDayStats.correctAnswers || 0;
            } else {
                // 新日期，直接添加
                merged.dailyStats[date] = { ...importDayStats };
            }
        });
        
        // 合并科目统计
        Object.keys(importStats.subjectStats || {}).forEach(subject => {
            const importSubjectStats = importStats.subjectStats[subject];
            if (merged.subjectStats[subject]) {
                merged.subjectStats[subject].time += importSubjectStats.time || 0;
                merged.subjectStats[subject].questions += importSubjectStats.questions || 0;
                merged.subjectStats[subject].correct += importSubjectStats.correct || 0;
            } else {
                merged.subjectStats[subject] = { ...importSubjectStats };
            }
        });
        
        // 保留更新的目标设置（如果导入数据中有更新的目标）
        if (importStats.goals) {
            merged.goals = { ...merged.goals, ...importStats.goals };
        }
        
        // 更新元数据
        merged.metadata = {
            ...merged.metadata,
            lastUpdated: new Date().toISOString(),
            importedAt: new Date().toISOString(),
            mergedFrom: importStats.metadata?.version || 'unknown'
        };
        
        return merged;
    }

    /**
     * 备份当前数据
     */
    backupCurrentData() {
        try {
            const backupData = {
                stats: this.stats,
                backupTime: new Date().toISOString(),
                version: '1.1'
            };
            
            localStorage.setItem('study_stats_backup_before_import', JSON.stringify(backupData));
            console.log('✅ 当前数据已备份');
            
        } catch (error) {
            console.error('❌ 备份数据失败:', error);
        }
    }

    /**
     * 恢复备份数据
     */
    restoreBackupData() {
        try {
            const backup = localStorage.getItem('study_stats_backup_before_import');
            if (backup) {
                const backupData = JSON.parse(backup);
                this.stats = backupData.stats;
                this.saveStats();
                
                console.log('✅ 已恢复备份数据');
                this.notifyObservers('dataRestored', backupData);
                
                return {
                    success: true,
                    message: '数据恢复成功',
                    backupTime: backupData.backupTime
                };
            } else {
                throw new Error('没有找到备份数据');
            }
            
        } catch (error) {
            console.error('❌ 恢复备份数据失败:', error);
            return {
                success: false,
                message: '恢复失败: ' + error.message
            };
        }
    }

    /**
     * 计算数据完整性检查值
     */
    calculateDataIntegrity() {
        try {
            const checksum = {
                dailyStatsCount: Object.keys(this.stats.dailyStats).length,
                totalStudyTime: this.stats.totalStudyTime,
                totalSessions: this.stats.totalSessions,
                subjectsCount: Object.keys(this.stats.subjectStats).length,
                lastUpdated: this.stats.metadata?.lastUpdated
            };
            
            return btoa(JSON.stringify(checksum)).slice(0, 16);
            
        } catch (error) {
            return 'unknown';
        }
    }

    /**
     * 触发文件导入对话框
     */
    triggerImportDialog() {
        return new Promise((resolve, reject) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (file) {
                    try {
                        const result = await this.importStudyData(file);
                        resolve(result);
                    } catch (error) {
                        reject(error);
                    }
                } else {
                    reject(new Error('未选择文件'));
                }
                document.body.removeChild(input);
            };
            
            input.oncancel = () => {
                document.body.removeChild(input);
                reject(new Error('用户取消'));
            };
            
            document.body.appendChild(input);
            input.click();
        });
    }

    /**
     * 同步chapters.html的进度到IndexedDB
     */
    async syncSubjectsProgressToIndexedDB() {
        try {
            const subjectsProgress = this.getSubjectsProgressFromLocalStorage();
            if (subjectsProgress.totalChapters === 0) {
                console.log('⚠️ subjects进度为空，跳过同步');
                return false;
            }

            let syncCount = 0;
            for (const [courseId, courseData] of Object.entries(subjectsProgress.courseProgress)) {
                for (const chapter of courseData.chapters) {
                    try {
                        await this.saveChapterProgressToDB(
                            parseInt(courseId),
                            chapter.index,
                            {
                                completed: chapter.completed,
                                watchedSeconds: chapter.watchedSeconds,
                                isAutoCompleted: false
                            },
                            'replace' // 使用替换模式
                        );
                        syncCount++;
                    } catch (error) {
                        console.error(`同步章节进度失败 ${courseId}:${chapter.index}:`, error);
                    }
                }
            }

            console.log(`✅ 已同步 ${syncCount} 个章节进度到IndexedDB`);
            return syncCount > 0;
            
        } catch (error) {
            console.error('❌ 同步subjects进度到IndexedDB失败:', error);
            return false;
        }
    }

    /**
     * 【完善版】同步章节进度数据到subjects.html格式的localStorage
     */
    async syncChapterProgressToSubjectsFormat(chapterProgressData, strategy) {
        try {
            console.log('🔄 开始同步章节进度到subjects localStorage格式...');
            
            // 获取当前的subjects progress数据
            let currentSubjectsData = {};
            const existingData = localStorage.getItem('study_progress');
            if (existingData) {
                try {
                    currentSubjectsData = JSON.parse(existingData);
                    console.log('📋 发现现有的subjects数据');
                } catch (error) {
                    console.warn('⚠️ 解析现有subjects数据失败，将创建新数据');
                    currentSubjectsData = {};
                }
            } else {
                console.log('📋 未找到现有subjects数据，将创建新数据');
            }

            // 确保数据结构存在
            if (!currentSubjectsData.publicSubjects) {
                currentSubjectsData.publicSubjects = [];
            }
            if (!currentSubjectsData.professionalSubjects) {
                currentSubjectsData.professionalSubjects = [];
            }

            // 获取课程映射
            const courseMapping = this.createCourseIdToSubjectMapping();
            
            let updatedSubjects = 0;
            let createdSubjects = 0;

            // 遍历导入的章节进度数据
            for (const [courseId, courseData] of Object.entries(chapterProgressData.courseProgress)) {
                console.log(`🔄 处理课程: ${courseData.courseName} (ID: ${courseId})`);
                
                // 确定课程类型和数字ID
                const courseInfo = this.determineCourseType(courseId, courseData.courseName, courseMapping);
                
                if (!courseInfo.isValid) {
                    console.warn(`⚠️ 无法识别课程: ${courseData.courseName} (${courseId})，跳过`);
                    continue;
                }
                
                const numericId = courseInfo.numericId;
                const courseType = courseInfo.courseType;
                const targetArray = courseType === 'public' ? currentSubjectsData.publicSubjects : currentSubjectsData.professionalSubjects;
                
                // 查找现有的科目（使用数字ID）
                let existingSubject = targetArray.find(subject => subject.id === numericId);
                
                if (!existingSubject) {
                    // 创建新科目，使用默认信息
                    const defaultInfo = courseMapping.subjectDefaults[numericId] || {
                        name: courseData.courseName,
                        description: '导入的科目',
                        icon: 'fas fa-book',
                        bgColor: 'from-gray-500 to-gray-600'
                    };
                    
                    existingSubject = {
                        id: numericId,
                        name: defaultInfo.name,
                        description: defaultInfo.description,
                        icon: defaultInfo.icon,
                        bgColor: defaultInfo.bgColor,
                        progress: 0,  // 将在下面计算
                        completedChapters: 0,  // 将在下面计算
                        chapters: []
                    };
                    targetArray.push(existingSubject);
                    createdSubjects++;
                    console.log(`➕ 创建新科目: ${defaultInfo.name} (ID: ${numericId})`);
                } else {
                    updatedSubjects++;
                    console.log(`🔄 更新现有科目: ${existingSubject.name} (ID: ${numericId})`);
                }

                // 更新章节数据
                if (courseData.chapters && Array.isArray(courseData.chapters)) {
                    // 转换章节数据格式
                    existingSubject.chapters = courseData.chapters.map(chapter => ({
                        name: chapter.name,
                        duration: this.convertSecondsToReadableFormat(chapter.watchedSeconds || 0) || chapter.duration || '0分钟',
                        difficulty: chapter.difficulty || '中等',
                        completed: chapter.completed || false
                    }));
                    
                    // 【关键】计算科目级别的progress和completedChapters
                    const totalChapters = existingSubject.chapters.length;
                    const completedCount = existingSubject.chapters.filter(ch => ch.completed).length;
                    
                    existingSubject.completedChapters = completedCount;
                    existingSubject.progress = totalChapters > 0 ? Math.round((completedCount / totalChapters) * 100) : 0;
                    
                    console.log(`  ✅ 更新了 ${totalChapters} 个章节`);
                    console.log(`  📊 完成状态: ${completedCount}/${totalChapters} (${existingSubject.progress}%)`);
                } else {
                    console.warn(`⚠️ 科目 ${courseData.courseName} 没有有效的章节数据`);
                }
            }

            // 确保科目按ID排序
            currentSubjectsData.publicSubjects.sort((a, b) => a.id - b.id);
            currentSubjectsData.professionalSubjects.sort((a, b) => a.id - b.id);

            // 添加时间戳
            currentSubjectsData.lastUpdated = new Date().toISOString();

            // 保存更新后的数据到localStorage
            localStorage.setItem('study_progress', JSON.stringify(currentSubjectsData));
            
            // 计算总体统计
            const totalSubjects = currentSubjectsData.publicSubjects.length + currentSubjectsData.professionalSubjects.length;
            const totalChapters = [...currentSubjectsData.publicSubjects, ...currentSubjectsData.professionalSubjects]
                .reduce((sum, subject) => sum + (subject.chapters ? subject.chapters.length : 0), 0);
            const completedChapters = [...currentSubjectsData.publicSubjects, ...currentSubjectsData.professionalSubjects]
                .reduce((sum, subject) => sum + (subject.completedChapters || 0), 0);
            
            console.log('✅ 章节进度同步到subjects格式完成:', {
                updatedSubjects: updatedSubjects,
                createdSubjects: createdSubjects,
                totalSubjects: totalSubjects,
                totalChapters: totalChapters,
                completedChapters: completedChapters,
                overallCompletionRate: totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0
            });

            return {
                success: true,
                updatedSubjects: updatedSubjects,
                createdSubjects: createdSubjects,
                totalSubjects: totalSubjects,
                totalChapters: totalChapters,
                completedChapters: completedChapters,
                overallCompletionRate: totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0
            };
            
        } catch (error) {
            console.error('❌ 同步章节进度到subjects格式失败:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 创建课程ID到科目类型的映射（完善版）
     */
    createCourseIdToSubjectMapping() {
        return {
            // 字符串ID -> 数字ID映射（用于导入）
            stringToNumber: {
                'mathematics': 1,
                'linear_algebra': 2,
                'probability': 3,
                'english': 4,
                'politics': 5,
                'data_structure': 6,
                'operating_system': 7,
                'computer_network': 8,
                'computer_organization': 9,
                // 兼容其他可能的ID格式
                '数学': 1,
                '线性代数': 2,
                '概率统计': 3,
                '英语': 4,
                '政治': 5,
                '数据结构': 6,
                '操作系统': 7,
                '计算机网络': 8,
                '组成原理': 9
            },
            // 数字ID -> 字符串ID映射（用于导出）
            numberToString: {
                1: 'mathematics',
                2: 'linear_algebra', 
                3: 'probability',
                4: 'english',
                5: 'politics',
                6: 'data_structure',
                7: 'operating_system',
                8: 'computer_network',
                9: 'computer_organization'
            },
            // 科目分类
            publicCourseIds: [1, 2, 3, 4, 5],
            professionalCourseIds: [6, 7, 8, 9],
            // 默认科目信息
            subjectDefaults: {
                1: { name: '高等数学', description: '数学一/数学二', icon: 'fas fa-square-root-alt', bgColor: 'from-blue-500 to-blue-600' },
                2: { name: '线性代数', description: '基础线性代数', icon: 'fas fa-vector-square', bgColor: 'from-purple-500 to-purple-600' },
                3: { name: '概率统计', description: '概率论与数理统计', icon: 'fas fa-chart-bar', bgColor: 'from-green-500 to-green-600' },
                4: { name: '英语', description: '考研英语一/二', icon: 'fas fa-language', bgColor: 'from-red-500 to-red-600' },
                5: { name: '政治', description: '思想政治理论', icon: 'fas fa-flag', bgColor: 'from-yellow-500 to-yellow-600' },
                6: { name: '数据结构', description: '数据结构与算法', icon: 'fas fa-sitemap', bgColor: 'from-indigo-500 to-indigo-600' },
                7: { name: '操作系统', description: '计算机操作系统', icon: 'fas fa-desktop', bgColor: 'from-teal-500 to-teal-600' },
                8: { name: '计算机网络', description: '计算机网络原理', icon: 'fas fa-network-wired', bgColor: 'from-pink-500 to-pink-600' },
                9: { name: '组成原理', description: '计算机组成原理', icon: 'fas fa-microchip', bgColor: 'from-gray-500 to-gray-600' }
            }
        };
    }

    /**
     * 确定课程类型和数字ID（增强版）
     */
    determineCourseType(courseId, courseName, courseIdToSubjectMap) {
        // 尝试从映射表获取数字ID
        let numericId = null;
        
        // 如果courseId是数字或数字字符串，直接使用
        if (typeof courseId === 'number') {
            numericId = courseId;
        } else if (!isNaN(courseId)) {
            numericId = parseInt(courseId);
        } else {
            // 从字符串ID映射获取数字ID
            numericId = courseIdToSubjectMap.stringToNumber[courseId] || 
                       courseIdToSubjectMap.stringToNumber[courseName];
        }
        
        // 如果还是没有找到，基于课程名称推断
        if (!numericId) {
            const courseNameMappings = {
                '高等数学': 1, '数学': 1, '高数': 1,
                '线性代数': 2, '线代': 2,
                '概率统计': 3, '概率论': 3, '概率': 3,
                '英语': 4, 'English': 4,
                '政治': 5, '思政': 5,
                '数据结构': 6, '数据结构与算法': 6,
                '操作系统': 7, 'OS': 7,
                '计算机网络': 8, '网络': 8,
                '组成原理': 9, '计算机组成': 9
            };
            
            for (const [name, id] of Object.entries(courseNameMappings)) {
                if (courseName.includes(name)) {
                    numericId = id;
                    break;
                }
            }
        }
        
        // 确定课程类型
        let courseType = 'professional'; // 默认为专业课
        if (numericId && courseIdToSubjectMap.publicCourseIds.includes(numericId)) {
            courseType = 'public';
        }
        
        return {
            courseType: courseType,
            numericId: numericId,
            isValid: numericId !== null
        };
    }

    /**
     * 将秒数转换为可读格式
     */
    convertSecondsToReadableFormat(seconds) {
        if (!seconds || seconds <= 0) {
            return '0分钟';
        }
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (hours > 0) {
            if (minutes > 0) {
                return `${hours}小时${minutes}分钟`;
            } else {
                return `${hours}小时`;
            }
        } else {
            return `${minutes}分钟`;
        }
    }

    /**
     * 获取数据存储信息（增强版）
     */
    getStorageInfo() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            const hasBackup = !!localStorage.getItem('study_stats_backup_before_import');
            
            // 获取subjects进度信息
            const subjectsProgress = this.getSubjectsProgressFromLocalStorage();
            
            return {
                totalStudyTime: this.stats.totalStudyTime,
                totalSessions: this.stats.totalSessions,
                dailyStatsCount: Object.keys(this.stats.dailyStats).length,
                storageSize: stored ? stored.length : 0,
                lastUpdated: this.stats.metadata?.lastUpdated,
                hasBackup: hasBackup,
                dataIntegrity: this.calculateDataIntegrity(),
                // 新增章节进度信息
                chapterProgress: {
                    totalChapters: subjectsProgress.totalChapters,
                    completedChapters: subjectsProgress.completedChapters,
                    completionRate: subjectsProgress.totalChapters > 0 ? 
                        Math.round((subjectsProgress.completedChapters / subjectsProgress.totalChapters) * 100) : 0
                }
            };
            
        } catch (error) {
            return {
                error: error.message,
                hasBackup: false,
                chapterProgress: {
                    totalChapters: 0,
                    completedChapters: 0,
                    completionRate: 0
                }
            };
        }
    }
}

// 创建全局实例
window.StudyStatsManager = StudyStatsManager;
window.studyStats = new StudyStatsManager();

console.log('📊 学习统计管理器加载完成');