# 计算机考研学习平台

一个专为计算机考研学生设计的综合性学习工具，集成了AI智能辅导、题目练习、笔记管理、学习统计等多项功能。

## ✨ 主要特性

- 🤖 **AI智能辅导** - 基于讯飞星火API的智能答疑和学习建议
- 📚 **全科目覆盖** - 数学、英语、政治、专业课完整课程体系  
- 📝 **智能题库** - 1280+历年真题，支持多种练习模式
- 📖 **笔记管理** - 富文本编辑，分类管理，云端同步
- 📊 **学习统计** - 详细的学习数据分析和进度跟踪
- 🎨 **现代界面** - 基于现代设计规范的美观界面
- 📱 **响应式设计** - 完美支持PC、平板、手机
- 🧪 **测试管理** - 完整的开发测试工具集

## 🚀 快速开始

### 在线访问
直接访问 [https://your-domain.com](https://your-domain.com) 即可使用

### 本地部署
```bash
# 克隆项目
git clone https://github.com/aspinojony/nomalproject.git

# 进入项目目录
cd nomalproject

# 启动本地服务器
python3 -m http.server 8080
# 或使用Node.js
npx serve .

# 访问 http://localhost:8080
```

## 📁 项目结构

```
├── index.html                 # 主页 - 平台入口和功能概览
├── subjects.html             # 学科页面 - 课程和章节管理
├── practice.html             # 练习页面 - 题目练习和测试
├── notes-management.html     # 笔记管理 - 创建和管理学习笔记
├── study-data-manager.html   # 数据管理 - 导入导出学习数据
├── question-manager.html     # 题目管理 - 管理题库内容
├── assets/                   # 资源文件
│   ├── js/                  # JavaScript文件
│   │   ├── core/           # 核心模块系统
│   │   ├── ai-*.js         # AI相关功能
│   │   └── stats-*.js      # 统计相关功能  
│   ├── css/                # 样式文件
│   ├── components/         # HTML组件
│   └── data/              # 数据文件
├── test/                   # 测试文件目录
│   ├── index.html         # 🧪 测试管理中心
│   └── *.html            # 各类功能测试页面
├── server/                # 后端服务（可选）
└── docs/                  # 文档文件
```

## 🧪 测试管理中心

项目包含完整的测试管理系统，访问 `/test/index.html` 可以：

- 📊 **测试概览** - 查看所有测试页面统计
- 🔍 **测试分类** - 按功能分类管理测试（核心功能、UI界面、集成测试等）
- 🛠️ **开发工具** - 数据生成、环境控制、日志导出
- 🚀 **快速测试** - 一键运行测试和生成报告

### 测试分类
- **核心功能测试** - AI助手、章节管理、题目管理
- **UI界面测试** - 导航栏、界面改进
- **集成测试** - 系统集成、导入导出、CORS修复
- **性能测试** - 窗口缩放、资源加载
- **Bug修复测试** - 各类问题修复验证

## 🔧 配置说明

### AI服务配置
在 `assets/js/ai-service.js` 中配置AI服务：

```javascript
const AI_CONFIG = {
    provider: 'xunfei',        // AI服务商
    appId: 'your-app-id',      // 应用ID
    apiSecret: 'your-secret',   // API密钥
    version: 'v3.5'            // API版本
};
```

### 数据存储
- **本地存储** - 使用localStorage存储学习数据
- **云端同步** - 可选的MongoDB后端支持
- **数据导出** - 支持JSON、CSV等格式导出

## 📖 功能详解

### 🎯 核心学习功能

1. **学科体系**
   - 公共课：数学、英语、政治
   - 专业课：数据结构、操作系统、计算机网络、组成原理

2. **题目练习**
   - 顺序练习、随机练习、专项练习
   - 实时反馈和智能推荐
   - 错题本和知识点分析

3. **AI智能辅导**
   - 智能答疑和问题解答
   - 学习建议和路径规划  
   - 代码分析和优化建议

### 📊 数据分析功能

1. **学习统计**
   - 每日/每周/每月学习时长
   - 答题正确率和进步曲线
   - 知识点掌握度分析

2. **目标管理**
   - 个性化学习目标设置
   - 进度跟踪和提醒
   - 成就系统和激励机制

### 🛠️ 管理工具

1. **笔记管理**
   - 富文本编辑器
   - 按学科章节分类
   - 搜索和标签功能

2. **数据管理**
   - 学习数据导入导出
   - 备份和恢复功能
   - 多格式支持

## 🚀 部署指南

### 前端部署

#### Vercel部署（推荐）
1. Fork本项目到你的GitHub
2. 在Vercel中导入项目
3. 自动部署完成

#### 传统Web服务器
1. 将文件上传到服务器
2. 确保支持HTTPS（AI功能必需）
3. 配置合适的CORS策略

### 后端部署（可选）

如需云端同步功能：

```bash
# 进入server目录
cd server

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env

# 启动服务
npm start
```

## 📱 移动端支持

- ✅ 响应式设计，完美适配移动设备
- ✅ 触摸友好的交互界面
- ✅ 离线使用支持
- ✅ PWA支持（渐进式Web应用）

## 🤝 贡献指南

欢迎提交Issue和Pull Request！

1. Fork项目
2. 创建功能分支：`git checkout -b feature/new-feature`
3. 提交更改：`git commit -m 'Add new feature'`
4. 推送分支：`git push origin feature/new-feature`
5. 提交Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 👨‍💻 作者信息

- **开发者**: aspinojony
- **邮箱**: aspinojony@gmail.com  
- **GitHub**: [@aspinojony](https://github.com/aspinojony)

## 🔗 相关链接

- [用户使用指南](USER_GUIDE.md)
- [开发文档](CLAUDE.md)
- [部署指南](deploy.md)
- [测试管理中心](test/index.html)

## 📈 项目统计

- 🎯 **核心功能**: 15+ 主要功能模块
- 📝 **题库容量**: 1280+ 历年真题
- 🧪 **测试覆盖**: 15+ 测试页面
- 📚 **文档完整度**: 详细的使用和开发文档
- 🎨 **界面现代化**: 基于现代设计规范
- 🛠️ **开发工具**: 完整的测试管理系统

---

⭐ 如果这个项目对你有帮助，请给个Star！
