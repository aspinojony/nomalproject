// 备用课程数据 - 当外部JSON文件加载失败时使用
window.fallbackCourseData = [
    {
        "id": 1,
        "name": "高等数学",
        "desc": "数学一/二/三必备",
        "icon": "fas fa-square-root-alt",
        "color": "#3b82f6",
        "bv": "BV1bez8YzEWn",
        "chapters": [
            {
                "id": 1,
                "name": "第一章 函数与极限",
                "bv": "BV1bez8YzEWn",
                "progress": 0,
                "difficulty": "基础",
                "duration": "120分钟"
            },
            {
                "id": 2,
                "name": "第二章 导数与微分",
                "bv": "BV1bez8YzEWn",
                "progress": 0,
                "difficulty": "中等",
                "duration": "140分钟"
            }
        ]
    },
    {
        "id": 2,
        "name": "线性代数",
        "desc": "数学必修课程",
        "icon": "fas fa-calculator",
        "color": "#10b981",
        "bv": "BV1aW411Q7x1",
        "chapters": [
            {
                "id": 1,
                "name": "第一章 行列式",
                "bv": "BV1aW411Q7x1",
                "progress": 0,
                "difficulty": "基础",
                "duration": "100分钟"
            }
        ]
    },
    {
        "id": 3,
        "name": "概率论与数理统计",
        "desc": "数学一/三必修",
        "icon": "fas fa-chart-bar",
        "color": "#f59e0b",
        "bv": "BV1ot411y7mU",
        "chapters": [
            {
                "id": 1,
                "name": "第一章 随机事件",
                "bv": "BV1ot411y7mU",
                "progress": 0,
                "difficulty": "基础",
                "duration": "90分钟"
            }
        ]
    },
    {
        "id": 4,
        "name": "政治",
        "desc": "思想政治理论",
        "icon": "fas fa-flag",
        "color": "#ef4444",
        "bv": "BV1YJ411W7Jy",
        "chapters": [
            {
                "id": 1,
                "name": "马克思主义基本原理",
                "bv": "BV1YJ411W7Jy",
                "progress": 0,
                "difficulty": "基础",
                "duration": "120分钟"
            }
        ]
    },
    {
        "id": 5,
        "name": "英语",
        "desc": "英语一/二",
        "icon": "fas fa-language",
        "color": "#8b5cf6",
        "bv": "BV1Et411b73Z",
        "chapters": [
            {
                "id": 1,
                "name": "词汇基础",
                "bv": "BV1Et411b73Z",
                "progress": 0,
                "difficulty": "基础",
                "duration": "60分钟"
            }
        ]
    },
    {
        "id": 6,
        "name": "数据结构",
        "desc": "408专业课核心",
        "icon": "fas fa-sitemap",
        "color": "#06b6d4",
        "bv": "BV1nJ411V7bd",
        "chapters": [
            {
                "id": 1,
                "name": "第一章 绪论",
                "bv": "BV1nJ411V7bd",
                "progress": 0,
                "difficulty": "基础",
                "duration": "80分钟"
            },
            {
                "id": 2,
                "name": "第二章 线性表",
                "bv": "BV1nJ411V7bd",
                "progress": 0,
                "difficulty": "中等",
                "duration": "120分钟"
            }
        ]
    },
    {
        "id": 7,
        "name": "计算机组成原理",
        "desc": "408专业课",
        "icon": "fas fa-microchip",
        "color": "#f97316",
        "bv": "BV1BE411D7ii",
        "chapters": [
            {
                "id": 1,
                "name": "第一章 计算机系统概述",
                "bv": "BV1BE411D7ii",
                "progress": 0,
                "difficulty": "基础",
                "duration": "100分钟"
            }
        ]
    },
    {
        "id": 8,
        "name": "操作系统",
        "desc": "408专业课",
        "icon": "fas fa-desktop",
        "color": "#84cc16",
        "bv": "BV1YE411D7nH",
        "chapters": [
            {
                "id": 1,
                "name": "第一章 操作系统概述",
                "bv": "BV1YE411D7nH",
                "progress": 0,
                "difficulty": "基础",
                "duration": "90分钟"
            }
        ]
    },
    {
        "id": 9,
        "name": "计算机网络",
        "desc": "408专业课",
        "icon": "fas fa-network-wired",
        "color": "#ec4899",
        "bv": "BV19E411D78Q",
        "chapters": [
            {
                "id": 1,
                "name": "第一章 概述",
                "bv": "BV19E411D78Q",
                "progress": 0,
                "difficulty": "基础",
                "duration": "110分钟"
            }
        ]
    }
];

// 备用真题数据
window.fallbackPracticeData = {
    subjects: [
        {
            id: 1,
            name: "数据结构",
            questions: [
                {
                    id: 1,
                    question: "以下关于栈的描述正确的是？",
                    options: [
                        "A. 栈是一种先进先出的数据结构",
                        "B. 栈是一种后进先出的数据结构", 
                        "C. 栈只能在两端进行插入和删除操作",
                        "D. 栈的容量是无限的"
                    ],
                    answer: 1,
                    explanation: "栈（Stack）是一种后进先出（LIFO）的数据结构，只能在栈顶进行插入和删除操作。"
                }
            ]
        },
        {
            id: 2,
            name: "操作系统",
            questions: [
                {
                    id: 1,
                    question: "进程和程序的区别是什么？",
                    options: [
                        "A. 进程是静态的，程序是动态的",
                        "B. 进程是动态的，程序是静态的",
                        "C. 进程和程序没有区别",
                        "D. 进程包含程序"
                    ],
                    answer: 1,
                    explanation: "进程是程序的一次执行过程，是动态的；程序是静态的代码集合。"
                }
            ]
        }
    ]
};

console.log('📦 备用数据已加载');