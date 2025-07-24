FROM nginx:alpine

# 复制项目文件到 Nginx 默认目录
COPY . /usr/share/nginx/html/

# 复制 Nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 创建非 root 用户运行 Nginx
RUN addgroup -g 1001 -S nodejs \
    && adduser -S nextjs -u 1001

EXPOSE 80

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]