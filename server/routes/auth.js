const express = require('express');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const { generateTokens, verifyRefreshToken } = require('../middleware/auth');

const router = express.Router();

// 登录速率限制
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 5, // 最多5次尝试
    message: '登录尝试次数过多，请15分钟后再试',
    skipSuccessfulRequests: true
});

// 注册验证规则
const registerValidation = [
    body('username')
        .isLength({ min: 3, max: 30 })
        .withMessage('用户名长度必须在3-30个字符之间')
        .matches(/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/)
        .withMessage('用户名只能包含字母、数字、下划线和中文'),
    body('email')
        .isEmail()
        .withMessage('请输入有效的邮箱地址')
        .normalizeEmail(),
    body('password')
        .isLength({ min: 6 })
        .withMessage('密码长度至少为6个字符')
        .matches(/^(?=.*[a-zA-Z])(?=.*\d)/)
        .withMessage('密码必须包含至少一个字母和一个数字')
];

// 登录验证规则
const loginValidation = [
    body('identifier')
        .notEmpty()
        .withMessage('请输入用户名或邮箱'),
    body('password')
        .notEmpty()
        .withMessage('请输入密码')
];

// 用户注册
router.post('/register', registerValidation, async (req, res) => {
    try {
        // 检查验证错误
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: '输入验证失败',
                errors: errors.array()
            });
        }

        const { username, email, password, displayName } = req.body;

        // 检查用户是否已存在
        const existingUser = await User.findOne({
            $or: [{ email }, { username }]
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: existingUser.email === email ? '邮箱已被使用' : '用户名已被使用'
            });
        }

        // 创建新用户
        const user = new User({
            username,
            email,
            password,
            profile: {
                displayName: displayName || username
            }
        });

        await user.save();

        // 生成令牌
        const tokens = generateTokens(user._id, user);

        console.log(`✅ 新用户注册: ${username} (${email})`);

        res.status(201).json({
            success: true,
            message: '注册成功',
            data: {
                user,
                ...tokens
            }
        });

    } catch (error) {
        console.error('注册错误:', error);
        res.status(500).json({
            success: false,
            message: '注册失败，请稍后再试'
        });
    }
});

// 用户登录
router.post('/login', loginLimiter, loginValidation, async (req, res) => {
    try {
        // 检查验证错误
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: '输入验证失败',
                errors: errors.array()
            });
        }

        const { identifier, password } = req.body;

        // 查找用户（支持用户名或邮箱登录）
        const user = await User.findOne({
            $or: [
                { email: identifier },
                { username: identifier }
            ]
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: '用户名/邮箱或密码错误'
            });
        }

        // 验证密码
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(400).json({
                success: false,
                message: '用户名/邮箱或密码错误'
            });
        }

        // 生成令牌
        const tokens = generateTokens(user._id, user);

        // 更新最后登录时间
        user.usage.lastSyncAt = new Date();
        await user.save();

        console.log(`✅ 用户登录: ${user.username}`);

        res.json({
            success: true,
            message: '登录成功',
            data: {
                user,
                ...tokens
            }
        });

    } catch (error) {
        console.error('登录错误:', error);
        res.status(500).json({
            success: false,
            message: '登录失败，请稍后再试'
        });
    }
});

// 刷新令牌
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                message: '刷新令牌不存在'
            });
        }

        // 验证刷新令牌
        const decoded = await verifyRefreshToken(refreshToken);
        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(403).json({
                success: false,
                message: '用户不存在'
            });
        }

        // 生成新的令牌
        const tokens = generateTokens(user._id, user);

        res.json({
            success: true,
            message: '令牌刷新成功',
            data: tokens
        });

    } catch (error) {
        console.error('令牌刷新错误:', error);
        res.status(403).json({
            success: false,
            message: '刷新令牌无效'
        });
    }
});

// 获取用户信息
router.get('/profile', require('../middleware/auth').authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }

        // 计算存储使用情况
        await user.calculateStorageUsage();

        res.json({
            success: true,
            data: { user }
        });

    } catch (error) {
        console.error('获取用户信息错误:', error);
        res.status(500).json({
            success: false,
            message: '获取用户信息失败'
        });
    }
});

// 更新用户设置
router.put('/settings', 
    require('../middleware/auth').authenticateToken,
    [
        body('syncEnabled').optional().isBoolean(),
        body('autoSync').optional().isBoolean(),
        body('syncInterval').optional().isInt({ min: 60, max: 3600 }),
        body('dataRetentionDays').optional().isInt({ min: 7, max: 365 })
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    message: '设置参数无效',
                    errors: errors.array()
                });
            }

            const user = await User.findById(req.userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: '用户不存在'
                });
            }

            // 更新设置
            Object.keys(req.body).forEach(key => {
                if (user.settings.hasOwnProperty(key)) {
                    user.settings[key] = req.body[key];
                }
            });

            await user.save();

            res.json({
                success: true,
                message: '设置更新成功',
                data: { settings: user.settings }
            });

        } catch (error) {
            console.error('更新设置错误:', error);
            res.status(500).json({
                success: false,
                message: '更新设置失败'
            });
        }
    }
);

module.exports = router;