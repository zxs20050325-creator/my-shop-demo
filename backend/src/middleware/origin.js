const env = require('../config/env');
const { errors } = require('../shared/errors');

function allowedOrigins() {
    return new Set(
        env.corsOrigin
            .split(',')
            .map(item => item.trim())
            .filter(Boolean)
    );
}

function verifyOrigin(req, _res, next) {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    const origin = req.get('origin');
    if (!origin) return next();
    if (allowedOrigins().has(origin)) return next();
    return next(errors.forbidden('请求来源不被允许'));
}

module.exports = { verifyOrigin };
