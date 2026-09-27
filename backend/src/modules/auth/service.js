const jwt = require('jsonwebtoken');
const env = require('../../config/env');
const repository = require('../../database/repository');
const {
    hashPassword,
    verifyPassword,
    randomToken,
    hashToken
} = require('../../shared/security');
const { errors } = require('../../shared/errors');

const ACCESS_COOKIE = 'jy_access';
const REFRESH_COOKIE = 'jy_refresh';

function cookieOptions(maxAge) {
    return {
        httpOnly: true,
        secure: env.cookieSecure,
        sameSite: 'lax',
        path: '/',
        maxAge
    };
}

function createAccessToken(user) {
    return jwt.sign(
        {
            sub: String(user.id),
            username: user.username,
            role: user.role
        },
        env.jwtSecret,
        { expiresIn: env.jwtAccessExpires }
    );
}

async function issueSession(user, req, res) {
    const refreshToken = randomToken(48);
    const refreshHash = hashToken(refreshToken);
    const refreshExpiresAt = new Date(
        Date.now() + env.jwtRefreshExpiresDays * 24 * 60 * 60 * 1000
    );

    await repository.createAuthSession({
        userId: user.id,
        refreshHash,
        userAgent: req.get('user-agent') || '',
        ipAddress: req.ip || '',
        expiresAt: refreshExpiresAt.toISOString()
    });

    res.cookie(ACCESS_COOKIE, createAccessToken(user), cookieOptions(2 * 60 * 60 * 1000));
    res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions(env.jwtRefreshExpiresDays * 24 * 60 * 60 * 1000));
}

function clearSessionCookies(res) {
    res.clearCookie(ACCESS_COOKIE, cookieOptions(0));
    res.clearCookie(REFRESH_COOKIE, cookieOptions(0));
}

async function register(payload, req, res) {
    const username = payload.username.trim().toLowerCase();
    const existing = await repository.findUserByUsername(username);
    if (existing) throw errors.conflict('用户名已存在');

    const user = await repository.createUser({
        username,
        passwordHash: hashPassword(payload.password),
        nickname: payload.nickname?.trim() || username
    });
    await issueSession(user, req, res);
    return user;
}

async function login(payload, req, res) {
    const username = payload.username.trim().toLowerCase();
    const user = await repository.findUserByUsername(username);
    if (!user || user.status !== 1 || !verifyPassword(user.password_hash, payload.password)) {
        throw errors.unauthorized('用户名或密码错误');
    }

    await repository.touchUserLogin(user.id);
    await issueSession(user, req, res);
    return {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        role: user.role
    };
}

async function refresh(req, res) {
    const token = req.cookies?.jy_refresh;
    if (!token) throw errors.unauthorized('缺少刷新凭证');

    const refreshHash = hashToken(token);
    const session = await repository.findAuthSession(refreshHash);
    if (!session) throw errors.unauthorized('登录状态已失效');

    const user = await repository.findUserById(session.user_id);
    if (!user || user.status !== 1) throw errors.unauthorized('账号不可用');

    await repository.revokeAuthSession(refreshHash);
    await issueSession(user, req, res);
    return {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        role: user.role
    };
}

async function logout(req, res) {
    const token = req.cookies?.jy_refresh;
    if (token) {
        await repository.revokeAuthSession(hashToken(token)).catch(() => null);
    }
    clearSessionCookies(res);
    return { loggedOut: true };
}

async function me(userId) {
    const user = await repository.findUserById(userId);
    if (!user || user.status !== 1) throw errors.unauthorized('账号不可用');
    return user;
}

module.exports = {
    register,
    login,
    refresh,
    logout,
    me,
    issueSession,
    clearSessionCookies
};
