// 笔记管理系统
class NotesManager {
    constructor() {
        this.notes = [];
        this.loadNotes();
    }

    // 加载笔记数据
    loadNotes() {
        try {
            const savedData = localStorage.getItem('study_notes');
            if (savedData) {
                const parsedData = JSON.parse(savedData);
                
                // 兼容旧格式（直接是数组）和新格式（包含元数据的对象）
                if (Array.isArray(parsedData)) {
                    this.notes = parsedData;
                    console.log('加载旧格式笔记数据，共', this.notes.length, '条笔记');
                    // 升级到新格式
                    this.saveNotes();
                } else if (parsedData.notes && Array.isArray(parsedData.notes)) {
                    this.notes = parsedData.notes;
                    console.log('加载新格式笔记数据，共', this.notes.length, '条笔记，最后保存时间:', parsedData.lastSaved);
                } else {
                    console.warn('笔记数据格式异常，初始化为空数组');
                    this.notes = [];
                }
            } else {
                console.log('没有找到保存的笔记数据，初始化为空数组');
                this.notes = [];
            }
        } catch (error) {
            console.error('加载笔记失败:', error);
            this.notes = [];
            // 尝试备份损坏的数据
            this.backupCorruptedData();
        }
    }

    // 保存笔记数据
    saveNotes() {
        try {
            const notesData = {
                notes: this.notes,
                lastSaved: new Date().toISOString(),
                version: '1.0'
            };
            localStorage.setItem('study_notes', JSON.stringify(notesData));
            console.log('笔记已保存到localStorage，共', this.notes.length, '条笔记');
        } catch (error) {
            console.error('保存笔记失败:', error);
            // 如果localStorage空间不足，尝试清理
            if (error.name === 'QuotaExceededError') {
                console.warn('存储空间不足，尝试清理旧数据...');
                this.cleanupOldData();
                try {
                    localStorage.setItem('study_notes', JSON.stringify({
                        notes: this.notes,
                        lastSaved: new Date().toISOString(),
                        version: '1.0'
                    }));
                    console.log('清理后重新保存成功');
                } catch (retryError) {
                    console.error('重试保存失败:', retryError);
                }
            }
        }
    }

    // 创建新笔记
    createNote(title, content, subjectId, chapterId, tags = []) {
        const note = {
            id: this.generateId(),
            title: title || '无标题笔记',
            content: content || '',
            subjectId: subjectId || '',
            chapterId: chapterId || '',
            tags: tags,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            subjectName: '',
            chapterName: ''
        };

        this.notes.unshift(note);
        this.saveNotes();
        return note;
    }

    // 更新笔记
    updateNote(noteId, updates) {
        const noteIndex = this.notes.findIndex(note => note.id === noteId);
        if (noteIndex !== -1) {
            this.notes[noteIndex] = {
                ...this.notes[noteIndex],
                ...updates,
                updatedAt: new Date().toISOString()
            };
            this.saveNotes();
            return this.notes[noteIndex];
        }
        return null;
    }

    // 删除笔记
    deleteNote(noteId) {
        const noteIndex = this.notes.findIndex(note => note.id === noteId);
        if (noteIndex !== -1) {
            this.notes.splice(noteIndex, 1);
            this.saveNotes();
            return true;
        }
        return false;
    }

    // 获取所有笔记
    getAllNotes() {
        return this.notes;
    }

    // 按科目获取笔记
    getNotesBySubject(subjectId) {
        return this.notes.filter(note => note.subjectId === subjectId);
    }

    // 按章节获取笔记
    getNotesByChapter(chapterId) {
        return this.notes.filter(note => note.chapterId === chapterId);
    }

    // 搜索笔记
    searchNotes(query) {
        if (!query.trim()) return this.notes;
        
        const searchTerm = query.toLowerCase();
        return this.notes.filter(note => 
            note.title.toLowerCase().includes(searchTerm) ||
            note.content.toLowerCase().includes(searchTerm) ||
            note.tags.some(tag => tag.toLowerCase().includes(searchTerm))
        );
    }

    // 按标签筛选笔记
    filterNotesByTags(tags) {
        if (!tags || tags.length === 0) return this.notes;
        
        return this.notes.filter(note =>
            tags.some(tag => note.tags.includes(tag))
        );
    }

    // 获取所有标签
    getAllTags() {
        const allTags = new Set();
        this.notes.forEach(note => {
            note.tags.forEach(tag => allTags.add(tag));
        });
        return Array.from(allTags).sort();
    }

    // 生成唯一ID
    generateId() {
        return 'note_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // 导出笔记为Markdown
    exportNoteAsMarkdown(noteId) {
        const note = this.notes.find(n => n.id === noteId);
        if (!note) return null;

        const markdown = `# ${note.title}

**科目**: ${note.subjectName}
**章节**: ${note.chapterName}
**标签**: ${note.tags.map(tag => `#${tag}`).join(' ')}
**创建时间**: ${this.formatDate(note.createdAt)}
**更新时间**: ${this.formatDate(note.updatedAt)}

---

${note.content}
`;

        return markdown;
    }

    // 导出所有笔记
    exportAllNotes() {
        let allMarkdown = `# 我的学习笔记

导出时间: ${this.formatDate(new Date().toISOString())}
总计笔记数: ${this.notes.length}

---

`;

        this.notes.forEach((note, index) => {
            allMarkdown += `\n## ${index + 1}. ${note.title}\n\n`;
            allMarkdown += `**科目**: ${note.subjectName} | **章节**: ${note.chapterName}\n`;
            allMarkdown += `**标签**: ${note.tags.map(tag => `#${tag}`).join(' ')}\n`;
            allMarkdown += `**时间**: ${this.formatDate(note.updatedAt)}\n\n`;
            allMarkdown += `${note.content}\n\n---\n`;
        });

        return allMarkdown;
    }

    // 格式化日期
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // 清理旧数据（保留最近50条笔记）
    cleanupOldData() {
        try {
            // 清理其他可能的大数据项
            const keysToCheck = ['study_progress', 'course_data', 'user_settings'];
            keysToCheck.forEach(key => {
                const data = localStorage.getItem(key);
                if (data && data.length > 10000) { // 如果超过10KB
                    console.log(`清理大数据项: ${key}`);
                    localStorage.removeItem(key);
                }
            });
            
            // 保留最近的笔记
            if (this.notes.length > 50) {
                this.notes = this.notes
                    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
                    .slice(0, 50);
                console.log('清理后保留最近50条笔记');
            }
        } catch (error) {
            console.error('清理数据失败:', error);
        }
    }

    // 备份损坏的数据
    backupCorruptedData() {
        try {
            const corruptedData = localStorage.getItem('study_notes');
            if (corruptedData) {
                localStorage.setItem('study_notes_corrupted_backup', corruptedData);
                localStorage.setItem('study_notes_corrupted_time', new Date().toISOString());
                console.log('已备份损坏的笔记数据');
            }
        } catch (error) {
            console.error('备份损坏数据失败:', error);
        }
    }

    // 导出所有笔记为JSON文件
    exportNotesToFile() {
        try {
            const notesData = {
                notes: this.notes,
                exportTime: new Date().toISOString(),
                version: '1.0',
                totalCount: this.notes.length
            };
            
            const dataStr = JSON.stringify(notesData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `学习笔记备份_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            console.log('笔记已导出为文件');
            return true;
        } catch (error) {
            console.error('导出笔记失败:', error);
            return false;
        }
    }

    // 从文件导入笔记
    importNotesFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const importData = JSON.parse(e.target.result);
                    
                    // 验证数据格式
                    if (!importData.notes || !Array.isArray(importData.notes)) {
                        throw new Error('无效的笔记数据格式');
                    }
                    
                    // 合并策略选择
                    const mergeStrategy = confirm(
                        `检测到 ${importData.notes.length} 条笔记\n` +
                        `当前已有 ${this.notes.length} 条笔记\n\n` +
                        `选择导入方式：\n` +
                        `确定 = 合并导入（保留现有笔记）\n` +
                        `取消 = 替换导入（清空现有笔记）`
                    );
                    
                    if (mergeStrategy) {
                        // 合并导入
                        const importedNotes = importData.notes.map(note => ({
                            ...note,
                            id: this.generateId(), // 重新生成ID避免冲突
                            importedAt: new Date().toISOString()
                        }));
                        
                        this.notes = [...this.notes, ...importedNotes];
                        console.log(`成功合并导入 ${importedNotes.length} 条笔记`);
                    } else {
                        // 替换导入
                        // 先备份现有数据
                        const backupData = {
                            notes: this.notes,
                            backupTime: new Date().toISOString()
                        };
                        localStorage.setItem('study_notes_backup_before_import', JSON.stringify(backupData));
                        
                        this.notes = importData.notes;
                        console.log(`成功替换导入 ${this.notes.length} 条笔记，原数据已备份`);
                    }
                    
                    this.saveNotes();
                    resolve({
                        success: true,
                        imported: importData.notes.length,
                        total: this.notes.length
                    });
                    
                } catch (error) {
                    console.error('导入笔记失败:', error);
                    reject(error);
                }
            };
            
            reader.onerror = () => {
                reject(new Error('文件读取失败'));
            };
            
            reader.readAsText(file);
        });
    }

    // 触发文件选择对话框
    triggerImportDialog() {
        return new Promise((resolve, reject) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (file) {
                    try {
                        const result = await this.importNotesFromFile(file);
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

    // 恢复备份的笔记
    restoreFromBackup() {
        try {
            const backupData = localStorage.getItem('study_notes_backup_before_import');
            if (backupData) {
                const parsed = JSON.parse(backupData);
                this.notes = parsed.notes;
                this.saveNotes();
                console.log('已恢复导入前的备份数据');
                return true;
            } else {
                console.warn('没有找到备份数据');
                return false;
            }
        } catch (error) {
            console.error('恢复备份失败:', error);
            return false;
        }
    }
    getStorageInfo() {
        try {
            const notesData = localStorage.getItem('study_notes');
            return {
                notesCount: this.notes.length,
                storageSize: notesData ? notesData.length : 0,
                lastSaved: notesData ? JSON.parse(notesData).lastSaved : null,
                hasBackup: !!localStorage.getItem('study_notes_corrupted_backup')
            };
        } catch (error) {
            return {
                notesCount: this.notes.length,
                storageSize: 0,
                lastSaved: null,
                error: error.message
            };
        }
    }
}

// 简单的 Markdown 渲染器
class SimpleMarkdownRenderer {
    static render(markdown) {
        if (!markdown) return '';

        let html = markdown
            // 标题
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            
            // 粗体和斜体
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            
            // 代码
            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            
            // 链接
            .replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
            
            // 列表
            .replace(/^\- (.*$)/gim, '<li>$1</li>')
            
            // 换行
            .replace(/\n/g, '<br>');

        // 包装列表项
        html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
        
        return html;
    }
}

// 导出到全局
window.NotesManager = NotesManager;
window.SimpleMarkdownRenderer = SimpleMarkdownRenderer;