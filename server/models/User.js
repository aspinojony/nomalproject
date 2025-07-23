const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 30
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    profile: {
        avatar: String,
        displayName: String,
        bio: String
    },
    settings: {
        syncEnabled: { type: Boolean, default: true },
        autoSync: { type: Boolean, default: true },
        syncInterval: { type: Number, default: 300 }, // 秒
        dataRetentionDays: { type: Number, default: 90 }
    },
    subscription: {
        plan: { type: String, enum: ['free', 'premium'], default: 'free' },
        expiresAt: Date,
        features: [{
            name: String,
            enabled: Boolean
        }]
    },
    usage: {
        storageUsed: { type: Number, default: 0 }, // 字节
        conversationCount: { type: Number, default: 0 },
        messageCount: { type: Number, default: 0 },
        lastSyncAt: Date
    }
}, {
    timestamps: true
});

// 密码加密中间件
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// 密码验证方法
userSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// 移除敏感信息
userSchema.methods.toJSON = function() {
    const user = this.toObject();
    delete user.password;
    return user;
};

// 计算存储使用量
userSchema.methods.calculateStorageUsage = async function() {
    const Conversation = require('./Conversation');
    const conversations = await Conversation.find({ userId: this._id });
    
    let totalSize = 0;
    let messageCount = 0;
    
    conversations.forEach(conv => {
        totalSize += JSON.stringify(conv).length;
        messageCount += conv.messages.length;
    });
    
    this.usage.storageUsed = totalSize;
    this.usage.conversationCount = conversations.length;
    this.usage.messageCount = messageCount;
    this.usage.lastSyncAt = new Date();
    
    await this.save();
    return this.usage;
};

module.exports = mongoose.model('User', userSchema);