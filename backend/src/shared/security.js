const crypto = require('crypto');

function hashPassword(plain) {
    const salt = crypto.randomBytes(16).toString('hex');
    const derived = crypto.scryptSync(String(plain), salt, 64).toString('hex');
    return `${salt}:${derived}`;
}

function verifyPassword(stored, plain) {
    if (!stored || !String(stored).includes(':')) return false;
    const [salt, expected] = String(stored).split(':');
    const actual = crypto.scryptSync(String(plain), salt, 64).toString('hex');
    const a = Buffer.from(actual, 'hex');
    const b = Buffer.from(expected, 'hex');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function randomToken(bytes = 32) {
    return crypto.randomBytes(bytes).toString('hex');
}

function hashToken(token) {
    return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function centsFromYuan(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 0) return 0;
    return Math.round(numeric * 100);
}

function yuanFromCents(value) {
    return Number((Number(value || 0) / 100).toFixed(2));
}

module.exports = {
    hashPassword,
    verifyPassword,
    randomToken,
    hashToken,
    centsFromYuan,
    yuanFromCents
};
