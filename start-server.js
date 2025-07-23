#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 启动考研平台后端服务器...\n');

const serverDir = path.join(__dirname, 'server');

// 检查server目录是否存在
if (!fs.existsSync(serverDir)) {
    console.error('❌ server 目录不存在');
    process.exit(1);
}

// 检查package.json是否存在
const packageJsonPath = path.join(serverDir, 'package.json');
if (!fs.existsSync(packageJsonPath)) {
    console.error('❌ server/package.json 不存在');
    process.exit(1);
}

// 检查node_modules是否存在
const nodeModulesPath = path.join(serverDir, 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
    console.log('📦 首次运行，正在安装依赖...');
    
    const installProcess = spawn('npm', ['install'], {
        cwd: serverDir,
        stdio: 'inherit',
        shell: true
    });
    
    installProcess.on('close', (code) => {
        if (code !== 0) {
            console.error('❌ 依赖安装失败');
            process.exit(1);
        }
        
        console.log('✅ 依赖安装完成');
        startServer();
    });
} else {
    startServer();
}

function startServer() {
    console.log('🔧 启动服务器...');
    
    const serverProcess = spawn('npm', ['start'], {
        cwd: serverDir,
        stdio: 'inherit',
        shell: true
    });
    
    serverProcess.on('close', (code) => {
        console.log(`\n🛑 服务器进程退出，退出码: ${code}`);
    });
    
    serverProcess.on('error', (error) => {
        console.error('❌ 启动服务器时出错:', error);
    });
    
    // 处理退出信号
    process.on('SIGINT', () => {
        console.log('\n🛑 收到退出信号，正在关闭服务器...');
        serverProcess.kill('SIGINT');
        process.exit(0);
    });
}