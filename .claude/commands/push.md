---
description: "自动提交并推送代码变更到GitHub，带有功能描述"
tools: ["Bash", "Read", "Edit"]
---

# 推送代码变更到GitHub

自动分析代码变更，生成提交信息并推送到GitHub。

## 使用方法

```
/push [功能描述]
```

如果未提供功能描述，将会自动分析git diff生成描述。

## 执行步骤

!git status
!git add .
!git diff --cached --stat

分析以上变更，生成提交信息：
- 如果提供了 $ARGUMENTS，使用作为主要功能描述
- 自动检测修改的文件类型和范围
- 生成简洁的中文提交信息

然后执行：
!git commit -m "生成的提交信息

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

!git push origin main