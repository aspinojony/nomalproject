const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({
            success: false,
            message: '访问被拒绝，需要身份验证令牌'
        });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({
                success: false,
                message: '令牌无效或已过期'
            });
        }

        req.userId = decoded.userId;
        req.userInfo = decoded;
        next();
    });
};

const generateTokens = (userId, userInfo) => {
    const accessToken = jwt.sign(
        { 
            userId: userId,
            username: userInfo.username,
            email: userInfo.email
        },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
        { userId: userId },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '30d' }
    );

    return { accessToken, refreshToken };
};

const verifyRefreshToken = (token) => {
    return new Promise((resolve, reject) => {
        jwt.verify(token, process.env.JWT_REFRESH_SECRET, (err, decoded) => {
            if (err) {
                reject(err);
            } else {
                resolve(decoded);
            }
        });
    });
};

module.exports = {
    authenticateToken,
    generateTokens,
    verifyRefreshToken
};