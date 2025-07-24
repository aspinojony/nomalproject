#!/bin/bash

echo "🔍 主题切换功能最终验证"
echo "=" | head -c 50; echo

# 检查关键文件是否存在
echo "📁 检查关键文件:"
for file in "assets/js/theme-manager.js" "assets/css/theme-manager.css" "theme-test.html" "index.html"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file (缺失)"
    fi
done

echo
echo "🔍 检查主题管理器关键功能:"

# 检查主题管理器类定义
if grep -q "class ModernThemeManager" assets/js/theme-manager.js > /dev/null 2>&1; then
    echo "  ✅ ModernThemeManager 类已定义"
else
    echo "  ❌ ModernThemeManager 类未找到"
fi

# 检查切换方法
if grep -q "toggle()" assets/js/theme-manager.js > /dev/null 2>&1; then
    echo "  ✅ toggle() 方法已定义"
else
    echo "  ❌ toggle() 方法未找到"
fi

# 检查按钮创建方法
if grep -q "createToggleButton()" assets/js/theme-manager.js > /dev/null 2>&1; then
    echo "  ✅ createToggleButton() 方法已定义"
else
    echo "  ❌ createToggleButton() 方法未找到"
fi

# 检查全局函数导出
if grep -q "window.toggleTheme" assets/js/theme-manager.js > /dev/null 2>&1; then
    echo "  ✅ 全局函数已导出"
else
    echo "  ❌ 全局函数未导出"
fi

echo
echo "🎨 检查CSS主题变量:"

# 检查CSS变量定义
if grep -q ":root" assets/css/theme-manager.css > /dev/null 2>&1; then
    echo "  ✅ CSS根变量已定义"
else
    echo "  ❌ CSS根变量未找到"
fi

# 检查深色模式类
if grep -q "\.dark" assets/css/theme-manager.css > /dev/null 2>&1; then
    echo "  ✅ 深色模式CSS类已定义"
else
    echo "  ❌ 深色模式CSS类未找到"
fi

echo
echo "🔗 检查HTML集成:"

# 检查主页主题脚本引用
if grep -q "theme-manager.js" index.html > /dev/null 2>&1; then
    echo "  ✅ 主页已引用主题管理器"
else
    echo "  ❌ 主页未引用主题管理器"
fi

# 检查测试页面
if grep -q "theme-manager.js" theme-test.html > /dev/null 2>&1; then
    echo "  ✅ 测试页面已引用主题管理器"
else
    echo "  ❌ 测试页面未引用主题管理器"
fi

echo
echo "🚀 服务器状态检查:"

# 检查服务器是否运行
if curl -s http://localhost:8081/ > /dev/null 2>&1; then
    echo "  ✅ 服务器运行中 (端口 8081)"
    echo "  🌐 主页: http://localhost:8081/"
    echo "  🧪 测试页面: http://localhost:8081/theme-test.html"
else
    echo "  ❌ 服务器未运行"
    echo "  💡 请运行: python3 -m http.server 8081"
fi

echo
echo "✅ 验证完成！"
echo "💡 建议在浏览器中测试以下功能:"
echo "   1. 访问主页，点击右上角主题切换按钮"
echo "   2. 访问测试页面，运行自动测试"
echo "   3. 检查主题切换是否平滑，按钮图标是否正确变化"