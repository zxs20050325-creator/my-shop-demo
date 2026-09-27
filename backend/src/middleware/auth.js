const jwt = require('jsonwebtoken');
const env = require('../config/env');
const repository = require('../database/repository');
const { errors } = require('../shared/errors');

const ACCESS_COOKIE = 'jy_access';

async function authenticate(req, _res, next) {
    try {
        const token = req.cookies?.[ACCESS_COOKIE];
        if (!token) return next();

        const payload = jwt.verify(token, env.jwtSecret);
        const user = await repository.findUserById(payload.sub);

        if (user && user.status === 1) {
            req.user = {
                id: Number(user.id),
                username: user.username,
                nickname: user.nickname,
                role: user.role
            };
        }
        return next();
    } catch (_error) {
        return next();
    }
}

function requireAuth(req, _res, next) {
    if (!req.user) return next(errors.unauthorized());
    return next();
}

function requireAdmin(req, _res, next) {
    if (!req.user) return next(errors.unauthorized());
    if (req.user.role !== 'admin') return next(errors.forbidden('需要管理员权限'));
    return next();
}

module.exports = { authenticate, requireAuth, requireAdmin, ACCESS_COOKIE };
