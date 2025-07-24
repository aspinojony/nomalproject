const express = require('express');

module.exports = (syncManager) => {
    const router = express.Router();

    // 同步用户数据
    router.post('/data', async (req, res) => {
        try {
            const { data, timestamp } = req.body;
            const userId = req.user.userId;
            
            // 使用同步管理器处理数据同步
            const result = await syncManager.syncUserData(userId, data, timestamp);
            
            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            console.error('数据同步失败:', error);
            res.status(500).json({
                success: false,
                message: '数据同步失败'
            });
        }
    });

    // 获取用户最新数据
    router.get('/data', async (req, res) => {
        try {
            const userId = req.user.userId;
            const data = await syncManager.getUserData(userId);
            
            res.json({
                success: true,
                data: data
            });
        } catch (error) {
            console.error('获取同步数据失败:', error);
            res.status(500).json({
                success: false,
                message: '获取同步数据失败'
            });
        }
    });

    // 获取同步状态
    router.get('/status', async (req, res) => {
        try {
            const userId = req.user.userId;
            const status = await syncManager.getSyncStatus(userId);
            
            res.json({
                success: true,
                data: status
            });
        } catch (error) {
            console.error('获取同步状态失败:', error);
            res.status(500).json({
                success: false,
                message: '获取同步状态失败'
            });
        }
    });

    return router;
};