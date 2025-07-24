// 主题切换功能测试脚本
console.log('🔍 开始测试主题切换功能...');

// 等待页面加载完成
function waitForLoad() {
    return new Promise((resolve) => {
        if (document.readyState === 'complete') {
            resolve();
        } else {
            window.addEventListener('load', resolve);
        }
    });
}

// 等待主题管理器初始化
function waitForThemeManager() {
    return new Promise((resolve) => {
        let attempts = 0;
        const maxAttempts = 50; // 5秒
        
        const check = () => {
            attempts++;
            if (window.themeManager) {
                console.log('✅ 主题管理器已初始化');
                resolve(window.themeManager);
            } else if (attempts < maxAttempts) {
                setTimeout(check, 100);
            } else {
                console.error('❌ 主题管理器初始化超时');
                resolve(null);
            }
        };
        check();
    });
}

// 测试主题切换功能
async function testThemeToggle() {
    console.log('⏳ 等待页面加载...');
    await waitForLoad();
    
    console.log('⏳ 等待主题管理器初始化...');
    const themeManager = await waitForThemeManager();
    
    if (!themeManager) {
        console.error('❌ 主题管理器未找到，测试失败');
        return false;
    }
    
    console.log('🎯 开始测试主题切换...');
    
    try {
        // 记录初始状态
        const initialTheme = themeManager.getCurrentTheme();
        console.log(`📝 初始主题: ${initialTheme}`);
        
        // 测试切换功能
        console.log('🔄 执行主题切换...');
        themeManager.toggle();
        
        // 等待一点时间让切换完成
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const newTheme = themeManager.getCurrentTheme();
        console.log(`📝 切换后主题: ${newTheme}`);
        
        // 验证切换是否成功
        if (newTheme !== initialTheme) {
            console.log('✅ 主题切换成功！');
            
            // 检查DOM类是否正确应用
            const hasCorrectClass = document.documentElement.classList.contains('dark') === (newTheme === 'dark');
            if (hasCorrectClass) {
                console.log('✅ DOM类应用正确');
            } else {
                console.warn('⚠️ DOM类应用可能有问题');
            }
            
            // 检查按钮是否存在
            const modernButton = document.getElementById('modern-theme-toggle');
            const manualButton = document.getElementById('manual-theme-toggle');
            
            if (modernButton) {
                console.log('✅ 现代主题按钮存在');
                console.log(`📍 按钮位置: ${modernButton.style.position || '未设置'}`);
            } else if (manualButton && manualButton.style.display !== 'none') {
                console.log('⚠️ 使用临时主题按钮');
            } else {
                console.warn('⚠️ 未找到可见的主题切换按钮');
            }
            
            return true;
        } else {
            console.error('❌ 主题切换失败 - 主题未改变');
            return false;
        }
    } catch (error) {
        console.error('❌ 测试过程中发生错误:', error);
        return false;
    }
}

// 测试按钮点击
async function testButtonClick() {
    const modernButton = document.getElementById('modern-theme-toggle');
    const manualButton = document.getElementById('manual-theme-toggle');
    
    let targetButton = modernButton;
    if (!modernButton || modernButton.style.display === 'none') {
        targetButton = manualButton;
    }
    
    if (targetButton) {
        console.log('🖱️ 测试按钮点击...');
        const initialTheme = window.themeManager?.getCurrentTheme();
        
        // 模拟点击
        targetButton.click();
        
        // 等待切换完成
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const newTheme = window.themeManager?.getCurrentTheme();
        
        if (newTheme !== initialTheme) {
            console.log('✅ 按钮点击切换成功');
            return true;
        } else {
            console.error('❌ 按钮点击切换失败');
            return false;
        }
    } else {
        console.error('❌ 未找到可点击的按钮');
        return false;
    }
}

// 主测试函数
async function runTests() {
    console.log('🚀 开始主题功能测试');
    console.log('=' .repeat(50));
    
    const toggleTest = await testThemeToggle();
    const buttonTest = await testButtonClick();
    
    console.log('=' .repeat(50));
    console.log('📊 测试结果:');
    console.log(`  主题切换功能: ${toggleTest ? '✅ 通过' : '❌ 失败'}`);
    console.log(`  按钮点击功能: ${buttonTest ? '✅ 通过' : '❌ 失败'}`);
    
    if (toggleTest && buttonTest) {
        console.log('🎉 所有测试通过！主题切换功能正常工作');
        return true;
    } else {
        console.log('❌ 部分测试失败，需要进一步检查');
        return false;
    }
}

// 如果在浏览器环境中运行，自动开始测试
if (typeof window !== 'undefined') {
    // 等待DOM准备好后运行测试
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(runTests, 1000);
        });
    } else {
        setTimeout(runTests, 1000);
    }
}

// 导出测试函数供手动调用
if (typeof window !== 'undefined') {
    window.runThemeTests = runTests;
    window.testThemeToggle = testThemeToggle;
    window.testButtonClick = testButtonClick;
}