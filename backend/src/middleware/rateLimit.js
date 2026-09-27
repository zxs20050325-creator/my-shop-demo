const { rateLimit } = require('express-rate-limit');

function jsonLimiter(limit, windowMs) {
    return rateLimit({
        windowMs,
        limit,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        handler: (req, res) => res.status(429).json({
            success: false,
            error: {
                code: 'TOO_MANY_REQUESTS',
                message: '请求过于频繁，请稍后重试'
            },
            requestId: req.requestId
        })
    });
}

const loginLimiter = jsonLimiter(8, 10 * 60 * 1000);
const registerLimiter = jsonLimiter(5, 30 * 60 * 1000);
const writeLimiter = jsonLimiter(120, 60 * 1000);

module.exports = { loginLimiter, registerLimiter, writeLimiter };
