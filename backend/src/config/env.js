const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

function value(name, fallback = '') {
    return process.env[name] || fallback;
}

function required(name, fallback = '') {
    const current = value(name, fallback);
    if (!current && process.env.NODE_ENV === 'production') {
        throw new Error(`缺少生产环境变量：${name}`);
    }
    return current;
}

const env = {
    nodeEnv: value('NODE_ENV', 'development'),
    port: Number(value('PORT', '3000')),
    databaseUrl: required('DATABASE_URL'),
    jwtSecret: required('JWT_SECRET', 'dev-only-change-me-please-32-characters'),
    jwtAccessExpires: value('JWT_ACCESS_EXPIRES', '2h'),
    jwtRefreshExpiresDays: Number(value('JWT_REFRESH_EXPIRES_DAYS', '7')),
    cookieSecure: value('COOKIE_SECURE', 'false') === 'true',
    corsOrigin: value('CORS_ORIGIN', 'http://localhost:5173'),
    adminBootstrapToken: value('ADMIN_BOOTSTRAP_TOKEN', '')
};

if (env.nodeEnv === 'production' && env.jwtSecret === 'dev-only-change-me-please-32-characters') {
    throw new Error('生产环境必须配置安全的 JWT_SECRET');
}

module.exports = Object.freeze(env);
