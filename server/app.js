const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const conversationRoutes = require('./routes/conversations');
const syncRoutes = require('./routes/sync');
const { authenticateToken } = require('./middleware/auth');
const SyncManager = require('./services/syncManager');

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
    }
});

// 安全中间件
app.use(helmet());
app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true
}));

// 速率限制
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 100, // 每个IP最多100个请求
    message: '请求过于频繁，请稍后再试',
    standardHeaders: true,
    legacyHeaders: false
});
app.use('/api/', limiter);

// 解析请求体
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 连接MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kaoyan-sync', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('✅ 连接到MongoDB数据库');
}).catch(err => {
    console.error('❌ MongoDB连接失败:', err);
    process.exit(1);
});

// 初始化同步管理器
const syncManager = new SyncManager(io);

// 路由
app.use('/api/auth', authRoutes);
app.use('/api/conversations', authenticateToken, conversationRoutes);
app.use('/api/sync', authenticateToken, syncRoutes(syncManager));

// WebSocket连接处理
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
        return next(new Error('Authentication error'));
    }
    
    const jwt = require('jsonwebtoken');
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return next(new Error('Authentication error'));
        }
        socket.userId = decoded.userId;
        next();
    });
});

io.on('connection', (socket) => {
    console.log(`✅ 用户 ${socket.userId} 建立WebSocket连接`);
    
    // 加入用户专属房间
    socket.join(`user_${socket.userId}`);
    
    // 注册同步管理器事件
    syncManager.registerSocketEvents(socket);
    
    socket.on('disconnect', () => {
        console.log(`❌ 用户 ${socket.userId} 断开WebSocket连接`);
    });
});

// 健康检查
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error('服务器错误:', err);
    res.status(500).json({
        success: false,
        message: '服务器内部错误'
    });
});

// 404处理
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: '接口不存在'
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 云同步服务器运行在端口 ${PORT}`);
    console.log(`📡 WebSocket服务已启动`);
});