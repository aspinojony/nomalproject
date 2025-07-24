# 部署指南

## 项目概述
这是一个纯前端的计算机考研学习平台，包含：
- HTML 页面：index.html, subjects.html, practice.html
- 静态资源：CSS, JavaScript, JSON 数据文件
- 无需后端服务器或数据库

## 部署方案

### 方案一：静态网站托管（推荐）

#### 1. Vercel 部署（免费，最简单）
```bash
# 1. 安装 Vercel CLI
npm install -g vercel

# 2. 在项目根目录执行
vercel

# 3. 按提示操作：
# - 登录 Vercel 账户
# - 选择项目名称
# - 选择部署设置（默认即可）
# - 完成部署，获得访问链接
```

#### 2. Netlify 部署（免费）
```bash
# 方法1：网页直接部署
# 1. 访问 https://app.netlify.com/
# 2. 注册/登录账户
# 3. 点击 "Sites" -> "Add new site" -> "Deploy manually"
# 4. 拖拽整个项目文件夹到上传区域
# 5. 等待部署完成，获得访问链接

# 方法2：Git 集成部署
# 1. 将代码推送到 GitHub
# 2. 在 Netlify 中连接 GitHub 仓库
# 3. 设置自动部署
```

#### 3. GitHub Pages 部署（免费）
```bash
# 1. 创建 GitHub 仓库
git init
git add .
git commit -m "初始化项目"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main

# 2. 在 GitHub 仓库中：
# - 进入 Settings -> Pages
# - Source 选择 "Deploy from a branch"
# - Branch 选择 "main"
# - 点击 Save
# - 访问 https://YOUR_USERNAME.github.io/YOUR_REPO
```

### 方案二：云服务器部署

#### 1. 使用 Nginx（适用于 VPS/云服务器）
```bash
# 安装 Nginx
sudo apt update
sudo apt install nginx

# 上传项目文件到服务器
scp -r . user@your-server:/var/www/kaoyan-platform/

# 配置 Nginx
sudo nano /etc/nginx/sites-available/kaoyan-platform

# Nginx 配置内容：
server {
    listen 80;
    server_name your-domain.com;
    
    root /var/www/kaoyan-platform;
    index index.html;
    
    location / {
        try_files $uri $uri/ =404;
    }
    
    # 为 JSON 文件设置正确的 MIME 类型
    location ~* \.json$ {
        add_header Content-Type application/json;
    }
}

# 启用配置
sudo ln -s /etc/nginx/sites-available/kaoyan-platform /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 2. 使用 Apache
```bash
# 安装 Apache
sudo apt install apache2

# 上传文件
sudo cp -r . /var/www/html/kaoyan-platform/

# 配置虚拟主机
sudo nano /etc/apache2/sites-available/kaoyan-platform.conf

# Apache 配置内容：
<VirtualHost *:80>
    ServerName your-domain.com
    DocumentRoot /var/www/html/kaoyan-platform
    
    <Directory /var/www/html/kaoyan-platform>
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>

# 启用站点
sudo a2ensite kaoyan-platform.conf
sudo systemctl reload apache2
```

### 方案三：容器化部署

#### Docker 部署
```dockerfile
# Dockerfile
FROM nginx:alpine

# 复制项目文件到 Nginx 默认目录
COPY . /usr/share/nginx/html/

# 复制 Nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

```bash
# 构建镜像
docker build -t kaoyan-platform .

# 运行容器
docker run -d -p 80:80 kaoyan-platform
```

## 部署前检查清单

### 1. 文件完整性检查
- [ ] index.html（主页）
- [ ] subjects.html（课程页面）
- [ ] practice.html（练习页面）
- [ ] bilibilicatgorybydifficulty.json（课程数据）
- [ ] couser.json（课程配置）
- [ ] assets/ 目录及其子文件

### 2. 功能测试
- [ ] 页面能否正常打开
- [ ] JSON 数据能否正常加载
- [ ] 视频链接能否正常跳转
- [ ] 学习进度能否正常保存

### 3. 性能优化
- [ ] 压缩 CSS/JS 文件
- [ ] 优化图片大小
- [ ] 启用 Gzip 压缩
- [ ] 设置缓存策略

## HTTPS 配置（推荐）

### 使用 Let's Encrypt（免费 SSL）
```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取 SSL 证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo crontab -e
# 添加：0 12 * * * /usr/bin/certbot renew --quiet
```

## 域名配置

### 1. 购买域名
- 阿里云、腾讯云、GoDaddy 等平台购买域名

### 2. DNS 配置
```
类型    名称    值
A       @       your-server-ip
A       www     your-server-ip
```

### 3. 备案（中国大陆服务器）
- 根据服务商要求完成 ICP 备案

## 监控和维护

### 1. 访问日志
```bash
# Nginx 日志位置
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### 2. 性能监控
- 使用 Google Analytics 统计访问量
- 配置 CDN 加速访问速度

### 3. 备份策略
```bash
# 定期备份网站文件
tar -czf backup-$(date +%Y%m%d).tar.gz /var/www/kaoyan-platform/
```

## 推荐的最简单部署流程

对于初学者，推荐使用 **Vercel** 部署：

1. 访问 [vercel.com](https://vercel.com)
2. 注册账户
3. 点击 "Import Project"
4. 连接 GitHub 仓库或直接上传文件
5. 等待自动部署完成
6. 获得 https://your-project.vercel.app 访问链接

优势：
- 完全免费
- 自动 HTTPS
- 全球 CDN 加速
- 自动部署更新
- 无需服务器维护

## 注意事项

1. **CORS 问题**：静态托管会自动解决 JSON 文件的 CORS 问题
2. **文件路径**：确保所有资源使用相对路径
3. **移动端适配**：测试各种设备的显示效果
4. **SEO 优化**：添加合适的 meta 标签和 sitemap
5. **备案要求**：如使用中国大陆服务器需要完成备案