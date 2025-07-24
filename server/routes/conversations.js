const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');

// 获取用户的所有对话
router.get('/', async (req, res) => {
    try {
        const conversations = await Conversation.find({ userId: req.user.userId })
            .sort({ updatedAt: -1 });
        
        res.json({
            success: true,
            data: conversations
        });
    } catch (error) {
        console.error('获取对话列表失败:', error);
        res.status(500).json({
            success: false,
            message: '获取对话列表失败'
        });
    }
});

// 创建新对话
router.post('/', async (req, res) => {
    try {
        const { title, subject } = req.body;
        
        const conversation = new Conversation({
            userId: req.user.userId,
            title: title || '新对话',
            subject: subject || 'general',
            messages: []
        });
        
        await conversation.save();
        
        res.status(201).json({
            success: true,
            data: conversation
        });
    } catch (error) {
        console.error('创建对话失败:', error);
        res.status(500).json({
            success: false,
            message: '创建对话失败'
        });
    }
});

// 获取特定对话
router.get('/:id', async (req, res) => {
    try {
        const conversation = await Conversation.findOne({
            _id: req.params.id,
            userId: req.user.userId
        });
        
        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: '对话不存在'
            });
        }
        
        res.json({
            success: true,
            data: conversation
        });
    } catch (error) {
        console.error('获取对话失败:', error);
        res.status(500).json({
            success: false,
            message: '获取对话失败'
        });
    }
});

// 更新对话
router.put('/:id', async (req, res) => {
    try {
        const { title, messages } = req.body;
        
        const conversation = await Conversation.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.userId },
            { 
                title,
                messages,
                updatedAt: new Date()
            },
            { new: true }
        );
        
        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: '对话不存在'
            });
        }
        
        res.json({
            success: true,
            data: conversation
        });
    } catch (error) {
        console.error('更新对话失败:', error);
        res.status(500).json({
            success: false,
            message: '更新对话失败'
        });
    }
});

// 删除对话
router.delete('/:id', async (req, res) => {
    try {
        const conversation = await Conversation.findOneAndDelete({
            _id: req.params.id,
            userId: req.user.userId
        });
        
        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: '对话不存在'
            });
        }
        
        res.json({
            success: true,
            message: '对话删除成功'
        });
    } catch (error) {
        console.error('删除对话失败:', error);
        res.status(500).json({
            success: false,
            message: '删除对话失败'
        });
    }
});

module.exports = router;