/**
 * 学习进度导入系统设计方案
 * 
 * 当前系统存在的问题：
 * 1. 数据存储分散：IndexedDB存储详细进度，localStorage存储简化进度
 * 2. 数据同步不完整：导入时缺少科目级别的progress和completedChapters字段
 * 3. 课程ID映射复杂：需要在数字ID和字符串ID之间转换
 * 4. 数据结构不统一：导出和导入的数据格式不完全匹配subjects.html期望的格式
 */

// 1. subjects.html期望的完整数据结构
const subjectsDataStructure = {
    publicSubjects: [
        {
            id: 1,  // 数字ID，用于课程数据匹配
            name: "高等数学",
            description: "数学一/数学二", 
            icon: "fas fa-square-root-alt",
            bgColor: "from-blue-500 to-blue-600",
            progress: 65,  // 科目完成百分比，需要计算
            completedChapters: 8,  // 已完成章节数，需要计算
            chapters: [
                {
                    name: "函数与极限",
                    duration: "3小时",
                    difficulty: "中等", 
                    completed: true  // 关键字段：章节是否完成
                }
                // ... 更多章节
            ]
        }
        // ... 更多公共课科目
    ],
    professionalSubjects: [
        // 类似结构，但id为6-9
    ],
    lastUpdated: "2024-01-01T00:00:00.000Z"
};

// 2. 导出数据的当前结构
const exportDataStructure = {
    chapterProgress: {
        courseProgress: {
            "mathematics": {  // 字符串ID，需要映射到数字ID
                courseName: "数学",
                courseId: "mathematics",
                chapters: [
                    {
                        index: 0,
                        name: "函数与极限", 
                        duration: "3小时",
                        difficulty: "中等",
                        completed: true,
                        watchedSeconds: 10800
                    }
                ],
                completedCount: 8,
                totalWatchedSeconds: 86400
            }
        },
        totalChapters: 50,
        completedChapters: 25
    }
};

// 3. 完善的课程ID映射表
const courseIdMapping = {
    // 字符串ID -> 数字ID映射（用于导入）
    stringToNumber: {
        "mathematics": 1,
        "linear_algebra": 2, 
        "probability": 3,
        "english": 4,
        "politics": 5,
        "data_structure": 6,
        "operating_system": 7,
        "computer_network": 8,
        "computer_organization": 9
    },
    // 数字ID -> 字符串ID映射（用于导出）
    numberToString: {
        1: "mathematics",
        2: "linear_algebra",
        3: "probability", 
        4: "english",
        5: "politics",
        6: "data_structure",
        7: "operating_system",
        8: "computer_network",
        9: "computer_organization"  
    },
    // 科目分类
    publicCourseIds: [1, 2, 3, 4, 5],
    professionalCourseIds: [6, 7, 8, 9]
};

// 4. 改进的导入流程设计
const importProcessDesign = {
    step1: "数据验证和格式检查",
    step2: "课程ID映射和转换", 
    step3: "章节数据同步到IndexedDB",
    step4: "科目数据同步到localStorage",
    step5: "计算科目级别的progress和completedChapters",
    step6: "触发UI更新和数据刷新"
};

// 5. 数据同步策略
const syncStrategy = {
    // 双向同步：确保IndexedDB和localStorage数据一致
    biDirectionalSync: true,
    // 优先级：subjects.html的localStorage为准
    priority: "localStorage",
    // 合并策略：保留最新的完成状态
    mergeStrategy: "keepLatest",
    // 数据完整性检查
    integrityCheck: true
};

export {
    subjectsDataStructure,
    exportDataStructure, 
    courseIdMapping,
    importProcessDesign,
    syncStrategy
};