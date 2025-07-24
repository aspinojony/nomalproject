# 服务器部署指南

## 问题解决：讯飞星火API WebSocket连接错误

### 问题描述
在服务器环境下部署时，出现以下错误：
- `WebSocket连接错误`
- `AI API错误 [xunfei]: 连接失败`
- `使用模拟HMAC签名，仅用于开发测试！生产环境请使用真实签名`

### 解决方案

#### 1. 已完成的修复
✅ 已添加 CryptoJS 库到所有主要HTML页面  
✅ 已优化 HMAC-SHA256 签名生成逻辑  
✅ 已移除不安全的模拟签名方法  

#### 2. 部署要求

**HTTPS环境 (强烈推荐)**
- 讯飞星火API需要安全连接
- 大多数现代浏览器在HTTP环境下限制WebSocket和Crypto API

**推荐的部署平台：**
- ✅ Vercel (已配置)
- ✅ Netlify  
- ✅ GitHub Pages
- ✅ Cloudflare Pages

#### 3. 环境检查

在浏览器Console中运行以下代码检查环境：
```javascript
console.log('HTTPS环境:', location.protocol === 'https:');
console.log('CryptoJS可用:', typeof window.CryptoJS !== 'undefined');
console.log('Web Crypto API可用:', !!(window.crypto && window.crypto.subtle));
```

#### 4. 部署步骤

**Vercel部署 (推荐)**
```bash
# 1. 部署到Vercel
npm run deploy

# 2. 确保使用HTTPS访问
# https://your-project.vercel.app
```

**Docker部署**
```bash
# 1. 构建Docker镜像
docker build -t kaoyan-platform .

# 2. 运行容器 (确保使用HTTPS代理)
docker run -d -p 80:80 kaoyan-platform

# 3. 配置HTTPS反向代理 (nginx/caddy)
```

#### 5. 验证部署

访问部署的网站并：
1. 打开浏览器开发者工具
2. 查看Console是否有错误信息
3. 测试AI助手功能
4. 确认HMAC签名正常生成

#### 6. 故障排除

**如果仍然出现连接错误：**

1. **检查API密钥配置**
```javascript
// 在控制台中检查配置
window.aiAPIManager?.getConfigStatus('xunfei')
```

2. **检查网络环境**
```javascript
// 测试WebSocket连接
const testWs = new WebSocket('wss://spark-api.xf-yun.com/v4.0/chat');
testWs.onopen = () => console.log('WebSocket可连接');
testWs.onerror = (e) => console.log('WebSocket连接失败:', e);
```

3. **检查讯飞API服务状态**
- 访问讯飞开放平台确认服务正常
- 检查API密钥是否有效且未过期
- 确认账户余额充足

#### 7. 安全注意事项

⚠️ **重要**: API密钥直接暴露在前端代码中存在安全风险。

**生产环境建议：**
- 使用环境变量管理敏感信息
- 实现后端代理服务
- 设置API密钥的使用限制和监控

#### 8. 性能优化

- 使用CDN加速静态资源
- 启用Gzip压缩
- 配置适当的缓存策略
- 使用HTTP/2

## 支持的浏览器
- Chrome 60+
- Firefox 60+ 
- Safari 12+
- Edge 79+

## 联系支持
如遇到其他问题，请检查：
1. 浏览器Console错误信息
2. 网络连接状态
3. 讯飞API服务状态