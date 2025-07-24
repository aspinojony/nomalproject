# 计算机考研学习平台 - 功能使用说明

## 📋 目录

- [项目概述](#项目概述)
- [核心功能](#核心功能)
- [页面说明](#页面说明)
- [开发工具](#开发工具)
- [部署指南](#部署指南)
- [常见问题](#常见问题)

## 🎯 项目概述

计算机考研学习平台是一个专为计算机考研学生设计的综合性学习工具，集成了AI智能辅导、题目练习、笔记管理、学习统计等多项功能。

### 技术栈
- **前端**: HTML5, CSS3, JavaScript (ES6+), Alpine.js, Tailwind CSS
- **后端**: Node.js, Express.js (可选)
- **数据库**: MongoDB (可选), LocalStorage
- **AI服务**: 讯飞星火API, 支持多种AI服务商

## 🚀 核心功能

### 1. 学习内容管理

#### 📚 课程体系
- **公共课程**: 数学、英语、政治
- **专业课程**: 数据结构、操作系统、计算机网络、组成原理
- **章节管理**: 支持多级章节结构和进度跟踪

#### 📝 题目练习
- **真题库**: 覆盖10年历年真题，1280+题目
- **智能练习**: 根据错题和薄弱知识点推荐练习
- **多种题型**: 选择题、填空题、简答题、编程题

### 2. AI智能辅导

#### 🤖 AI助手功能
- **智能答疑**: 支持学习问题的实时解答
- **知识点解释**: 详细解释复杂概念和算法
- **学习建议**: 基于学习进度提供个性化建议
- **代码辅导**: 编程题的代码分析和优化建议

#### 配置说明
```javascript
// AI服务配置
const aiConfig = {
    provider: 'xunfei', // 支持: xunfei, openai, claude
    apiKey: 'your-api-key',
    model: 'generalv3.5',
    maxTokens: 4000
};
```

### 3. 笔记管理系统

#### 📖 笔记功能
- **富文本编辑**: 支持Markdown语法和可视化编辑
- **分类管理**: 按学科、章节、标签分类
- **云端同步**: 支持多设备同步（需要后端支持）
- **导入导出**: 支持多种格式的导入导出

#### 使用方法
1. 访问 `notes-management.html`
2. 点击"新建笔记"创建笔记
3. 使用工具栏进行格式化编辑
4. 支持自动保存和版本管理

### 4. 学习统计分析

#### 📊 统计功能
- **学习时长**: 每日、每周、每月学习时长统计
- **答题统计**: 正确率、错题分析、知识点掌握度
- **进度跟踪**: 章节学习进度、整体完成度
- **学习目标**: 可设置个人学习目标和计划

#### 数据导出
```javascript
// 导出学习统计数据
function exportStudyStats() {
    const stats = window.studyStats.getFullStats();
    const blob = new Blob([JSON.stringify(stats, null, 2)], {
        type: 'application/json'
    });
    // 下载文件...
}
```

## 📄 页面说明

### 主要页面

#### 1. 首页 (`index.html`)
- **功能**: 平台入口，展示核心功能和数据统计
- **特色**: 现代化渐变设计，响应式布局
- **访问**: 直接访问根目录

#### 2. 学科页面 (`subjects.html`)
- **功能**: 展示所有学科和章节内容
- **参数**: `?type=public` (公共课) 或 `?type=professional` (专业课)
- **特色**: 章节树形结构，进度可视化

#### 3. 练习页面 (`practice.html`)
- **功能**: 题目练习和测试
- **模式**: 顺序练习、随机练习、专项练习
- **特色**: 实时反馈，智能推荐

#### 4. 笔记管理 (`notes-management.html`)
- **功能**: 创建、编辑、管理学习笔记
- **特色**: 富文本编辑，分类管理，搜索功能

#### 5. 数据管理 (`study-data-manager.html`)
- **功能**: 学习数据的导入导出和备份
- **格式**: JSON, CSV, Excel
- **特色**: 批量操作，数据验证

### 工具页面

#### 题目管理器 (`question-manager.html`)
- **功能**: 管理题目库，支持批量导入
- **权限**: 需要管理员权限
- **操作**: 增删改查，分类管理

#### 资源页面 (`resources.html`)
- **功能**: 学习资源汇总和下载
- **内容**: 电子书、视频课程、参考资料

## 🛠️ 开发工具

### 测试管理中心 (`test/index.html`)

新建的测试管理中心提供了完整的开发测试工具：

#### 功能特性
- **测试概览**: 统计各类测试页面数量
- **测试分类**: 按功能分类管理测试页面
  - 核心功能测试
  - UI界面测试
  - 功能特性测试
  - 集成测试
  - 性能测试
  - Bug修复测试

#### 开发工具
- **数据生成**: 生成测试用的题目、用户、统计数据
- **环境控制**: 调试模式切换、本地存储管理
- **日志导出**: 导出开发调试日志

#### 使用方法
1. 访问 `/test/index.html`
2. 在概览页面查看测试统计
3. 在测试页面中搜索和运行特定测试
4. 使用开发工具生成测试数据

### 测试页面列表

#### 核心功能测试
- `ai-test.html` - AI助手功能测试
- `chapter-test.html` - 章节管理测试
- `question-manager-test.html` - 题目管理测试

#### UI界面测试
- `navbar-demo.html` - 导航栏组件测试
- `ui-improvements-test.html` - UI改进测试

#### 集成测试
- `integration-test.html` - 系统集成测试
- `complete-import-system-test.html` - 导入系统测试
- `cors-fix-test.html` - CORS修复测试

## 🏗️ 项目结构

```
├── index.html                 # 主页
├── subjects.html             # 学科页面
├── practice.html             # 练习页面
├── notes-management.html     # 笔记管理
├── study-data-manager.html   # 数据管理
├── question-manager.html     # 题目管理
├── resources.html           # 资源页面
├── assets/                  # 资源文件
│   ├── js/                 # JavaScript文件
│   │   ├── core/          # 核心模块
│   │   ├── ai-*.js        # AI相关功能
│   │   ├── stats-*.js     # 统计相关功能
│   │   └── utils.js       # 工具函数
│   ├── css/               # 样式文件
│   ├── components/        # HTML组件
│   └── data/             # 数据文件
├── test/                  # 测试文件
│   ├── index.html        # 测试管理中心
│   ├── ai-test.html      # AI功能测试
│   ├── chapter-test.html # 章节管理测试
│   └── ...               # 其他测试文件
├── server/               # 后端服务（可选）
│   ├── app.js           # 服务器入口
│   ├── models/          # 数据模型
│   └── routes/          # API路由
└── CLAUDE.md            # 开发指南
```

## 🚀 部署指南

### 前端部署

#### 静态部署
1. 将项目文件上传到Web服务器
2. 确保服务器支持HTTPS（AI功能需要）
3. 配置适当的CORS策略

#### Vercel部署
```json
{
  "version": 2,
  "builds": [
    {
      "src": "**/*",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ]
}
```

### 后端部署（可选）

#### 环境要求
- Node.js 16+
- MongoDB 4.4+

#### 部署步骤
1. 安装依赖: `npm install`
2. 配置环境变量
3. 启动服务: `npm start`

#### 环境变量
```bash
PORT=3000
MONGODB_URI=mongodb://localhost:27017/kaoyan
JWT_SECRET=your-jwt-secret
CORS_ORIGIN=https://yourdomain.com
```

## 🔧 配置说明

### AI服务配置

在 `assets/js/ai-service.js` 中配置AI服务：

```javascript
const AI_CONFIG = {
    // 讯飞星火配置
    xunfei: {
        appId: 'your-app-id',
        apiSecret: 'your-api-secret',
        apiKey: 'your-api-key',
        version: 'v3.5'
    },
    
    // OpenAI配置
    openai: {
        apiKey: 'your-openai-key',
        model: 'gpt-3.5-turbo',
        baseURL: 'https://api.openai.com/v1'
    }
};
```

### 数据库配置

#### 本地存储结构
```javascript
// 学习统计数据结构
const studyStats = {
    totalStudyTime: 0,        // 总学习时长（分钟）
    dailyStats: {},           // 每日统计
    subjectProgress: {},      // 学科进度
    questionStats: {},        // 答题统计
    goals: {},               // 学习目标
    lastUpdate: Date.now()   // 最后更新时间
};

// 笔记数据结构
const notes = {
    id: 'uuid',
    title: '笔记标题',
    content: '笔记内容',
    subject: '学科',
    chapter: '章节',
    tags: ['标签1', '标签2'],
    createdAt: Date.now(),
    updatedAt: Date.now()
};
```

## ❓ 常见问题

### Q1: AI功能无法使用？
**A**: 检查以下几点：
1. 确保使用HTTPS协议访问
2. 检查AI服务API密钥是否正确配置
3. 查看浏览器控制台是否有错误信息
4. 确认网络连接正常

### Q2: 数据无法保存？
**A**: 可能原因：
1. 浏览器禁用了LocalStorage
2. 存储空间不足
3. 浏览器处于隐私模式

### Q3: 题目无法加载？
**A**: 检查：
1. `bilibilicatgorybydifficulty.json` 文件是否存在
2. 文件格式是否正确
3. 服务器CORS配置是否允许跨域请求

### Q4: 如何备份学习数据？
**A**: 使用数据管理页面：
1. 访问 `study-data-manager.html`
2. 点击"导出数据"
3. 选择导出格式（JSON推荐）
4. 保存到本地

### Q5: 如何自定义题目？
**A**: 使用题目管理器：
1. 访问 `question-manager.html`
2. 点击"添加题目"
3. 填写题目信息
4. 保存并测试

## 📞 技术支持

### 开发者信息
- **作者**: ouyangzhiheng
- **邮箱**: aspinojony@gmail.com
- **GitHub**: https://github.com/aspinojony/nomalproject

### 反馈渠道
1. GitHub Issues
2. 邮件反馈
3. 项目内置反馈功能

### 更新日志
- **v2.0.0** (2024-07-24): 界面重构，性能优化
- **v1.5.0** (2024-07-15): AI功能增强
- **v1.0.0** (2024-06-01): 基础功能发布

---

*本文档持续更新，请关注最新版本*