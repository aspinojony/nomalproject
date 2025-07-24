const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['user', 'assistant', 'system'],
        required: true
    },
    content: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    metadata: {
        tokenCount: Number,
        model: String,
        processingTime: Number,
        aiProvider: String,
        cost: Number
    },
    version: {
        type: Number,
        default: 1
    },
    deleted: {
        type: Boolean,
        default: false
    },
    deletedAt: Date
});

const conversationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    clientId: {
        type: String,
        required: true,
        index: true
    },
    title: {
        type: String,
        required: true,
        maxlength: 200
    },
    aiProvider: {
        type: String,
        default: 'unknown'
    },
    model: String,
    messages: [messageSchema],
    tags: [{
        name: String,
        color: String,
        createdAt: { type: Date, default: Date.now }
    }],
    metadata: {
        totalTokens: { type: Number, default: 0 },
        totalCost: { type: Number, default: 0 },
        estimatedReadingTime: Number,
        language: { type: String, default: 'zh-CN' },
        subject: String, // 学科分类
        difficulty: String // 难度级别
    },
    status: {
        type: String,
        enum: ['active', 'archived', 'deleted'],
        default: 'active'
    },
    sharing: {
        isPublic: { type: Boolean, default: false },
        shareCode: String,
        sharedAt: Date,
        viewCount: { type: Number, default: 0 }
    },
    version: {
        type: Number,
        default: 1
    },
    lastMessageAt: {
        type: Date,
        default: Date.now
    },
    syncStatus: {
        lastSyncAt: Date,
        syncVersion: { type: Number, default: 1 },
        conflictResolved: { type: Boolean, default: true },
        deviceId: String
    }
}, {
    timestamps: true
});

// 索引优化
conversationSchema.index({ userId: 1, updatedAt: -1 });
conversationSchema.index({ userId: 1, clientId: 1 }, { unique: true });
conversationSchema.index({ userId: 1, 'syncStatus.syncVersion': 1 });
conversationSchema.index({ userId: 1, status: 1, lastMessageAt: -1 });

// 虚拟字段
conversationSchema.virtual('messageCount').get(function() {
    return this.messages.filter(msg => !msg.deleted).length;
});

conversationSchema.virtual('unreadCount').get(function() {
    // 可以根据需要实现未读消息计数逻辑
    return 0;
});

// 中间件：更新最后消息时间
conversationSchema.pre('save', function(next) {
    if (this.isModified('messages')) {
        const activeMessages = this.messages.filter(msg => !msg.deleted);
        if (activeMessages.length > 0) {
            this.lastMessageAt = activeMessages[activeMessages.length - 1].timestamp;
        }
        
        // 更新token和成本统计
        this.metadata.totalTokens = activeMessages.reduce((sum, msg) => 
            sum + (msg.metadata?.tokenCount || 0), 0);
        this.metadata.totalCost = activeMessages.reduce((sum, msg) => 
            sum + (msg.metadata?.cost || 0), 0);
    }
    next();
});

// 实例方法：添加消息
conversationSchema.methods.addMessage = function(messageData) {
    const message = {
        ...messageData,
        timestamp: new Date(),
        version: 1
    };
    
    this.messages.push(message);
    this.syncStatus.syncVersion += 1;
    this.syncStatus.lastSyncAt = new Date();
    
    return message;
};

// 实例方法：软删除消息
conversationSchema.methods.deleteMessage = function(messageId) {
    const message = this.messages.id(messageId);
    if (message) {
        message.deleted = true;
        message.deletedAt = new Date();
        this.syncStatus.syncVersion += 1;
        this.syncStatus.lastSyncAt = new Date();
        return true;
    }
    return false;
};

// 实例方法：获取活跃消息
conversationSchema.methods.getActiveMessages = function() {
    return this.messages.filter(msg => !msg.deleted);
};

// 实例方法：生成分享代码
conversationSchema.methods.generateShareCode = function() {
    if (this.sharing.isPublic) {
        return this.sharing.shareCode;
    }
    
    const crypto = require('crypto');
    this.sharing.shareCode = crypto.randomBytes(16).toString('hex');
    this.sharing.isPublic = true;
    this.sharing.sharedAt = new Date();
    
    return this.sharing.shareCode;
};

// 静态方法：按用户和同步版本查询
conversationSchema.statics.findByUserAndVersion = function(userId, afterVersion = 0) {
    return this.find({
        userId: userId,
        'syncStatus.syncVersion': { $gt: afterVersion }
    }).sort({ 'syncStatus.syncVersion': 1 });
};

// 静态方法：冲突检测
conversationSchema.statics.detectConflicts = function(userId, conversations) {
    const clientIds = conversations.map(conv => conv.clientId);
    return this.find({
        userId: userId,
        clientId: { $in: clientIds },
        'syncStatus.syncVersion': { $gt: 1 }
    });
};

module.exports = mongoose.model('Conversation', conversationSchema);