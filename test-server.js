const http = require('http');
const url = require('url');

// 创建一个简单的测试客户端
function testThemePage() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 8081,
            path: '/theme-test.html',
            method: 'GET'
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                if (res.statusCode === 200) {
                    console.log('✅ 主题测试页面加载成功');
                    
                    // 检查关键组件是否存在
                    const hasThemeManager = data.includes('theme-manager.js');
                    const hasTestScript = data.includes('test-theme.js');
                    const hasModernButton = data.includes('modern-theme-toggle');
                    const hasManualButton = data.includes('manual-theme-toggle');
                    
                    console.log(`📁 主题管理器脚本: ${hasThemeManager ? '✅' : '❌'}`);
                    console.log(`📁 测试脚本: ${hasTestScript ? '✅' : '❌'}`);
                    console.log(`🔘 现代按钮引用: ${hasModernButton ? '✅' : '❌'}`);
                    console.log(`🔘 临时按钮引用: ${hasManualButton ? '✅' : '❌'}`);
                    
                    if (hasThemeManager && hasTestScript) {
                        console.log('✅ 页面结构完整，主题功能应该正常工作');
                        resolve(true);
                    } else {
                        console.log('⚠️ 页面结构可能有问题');
                        resolve(false);
                    }
                } else {
                    console.log(`❌ 页面加载失败: ${res.statusCode}`);
                    resolve(false);
                }
            });
        });

        req.on('error', (error) => {
            console.error('❌ 网络请求错误:', error.message);
            reject(error);
        });

        req.end();
    });
}

// 测试主页
function testIndexPage() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 8081,
            path: '/',
            method: 'GET'
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                if (res.statusCode === 200) {
                    console.log('✅ 主页加载成功');
                    
                    // 检查关键组件
                    const hasThemeManager = data.includes('theme-manager.js');
                    const hasManualButton = data.includes('manual-theme-toggle');
                    const hasToggleFunction = data.includes('toggleManualTheme');
                    
                    console.log(`📁 主题管理器脚本: ${hasThemeManager ? '✅' : '❌'}`);
                    console.log(`🔘 临时按钮: ${hasManualButton ? '✅' : '❌'}`);
                    console.log(`⚙️ 切换函数: ${hasToggleFunction ? '✅' : '❌'}`);
                    
                    if (hasThemeManager && hasManualButton && hasToggleFunction) {
                        console.log('✅ 主页主题功能应该正常工作');
                        resolve(true);
                    } else {
                        console.log('⚠️ 主页可能存在主题功能问题');
                        resolve(false);
                    }
                } else {
                    console.log(`❌ 主页加载失败: ${res.statusCode}`);
                    resolve(false);
                }
            });
        });

        req.on('error', (error) => {
            console.error('❌ 网络请求错误:', error.message);
            reject(error);
        });

        req.end();
    });
}

// 主测试函数
async function runTests() {
    console.log('🚀 开始服务器端主题功能测试');
    console.log('=' .repeat(50));
    
    try {
        const themePageTest = await testThemePage();
        const indexPageTest = await testIndexPage();
        
        console.log('=' .repeat(50));
        console.log('📊 测试结果:');
        console.log(`  主题测试页面: ${themePageTest ? '✅ 通过' : '❌ 失败'}`);
        console.log(`  主页功能: ${indexPageTest ? '✅ 通过' : '❌ 失败'}`);
        
        if (themePageTest && indexPageTest) {
            console.log('🎉 所有页面测试通过！');
            console.log('💡 请在浏览器中访问以下链接进行最终测试:');
            console.log('   - 主题测试页面: http://localhost:8081/theme-test.html');
            console.log('   - 主页: http://localhost:8081/');
            return true;
        } else {
            console.log('❌ 部分测试失败，需要进一步检查');
            return false;
        }
    } catch (error) {
        console.error('❌ 测试过程中发生错误:', error);
        return false;
    }
}

runTests();