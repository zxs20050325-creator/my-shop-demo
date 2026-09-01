// db.js - 数据访问层（SQLite 版）
// 使用 Node 内置的 node:sqlite，无需外部数据库服务、无需云账号
require('dotenv').config();
const path = require('path');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');

// 数据库文件路径（默认在 backend 目录下，可用环境变量 DB_PATH 覆盖）
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'jiyi.db');
const db = new DatabaseSync(DB_PATH);

// WAL 模式：提升并发读写性能
db.exec('PRAGMA journal_mode = WAL;');

// 首次启动自动建表（IF NOT EXISTS，重复执行无副作用）
db.exec(`
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,              -- 存储 scrypt 哈希，非明文
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS carts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    product TEXT NOT NULL,               -- 商品对象 JSON 字符串
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    product TEXT NOT NULL,               -- 商品对象 JSON 字符串
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS user_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    action TEXT NOT NULL,
    product TEXT,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    total REAL NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_carts_username ON carts(username);
CREATE INDEX IF NOT EXISTS idx_favorites_username ON favorites(username);
CREATE INDEX IF NOT EXISTS idx_user_logs_username ON user_logs(username);
CREATE INDEX IF NOT EXISTS idx_user_logs_created_at ON user_logs(created_at);
`);

// --- 密码哈希工具（scrypt，Node 内置 crypto，无额外依赖）---
function hashPassword(plain) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(plain, salt, 64).toString('hex');
    return `${salt}:${hash}`;
}

function verifyPassword(stored, plain) {
    if (!stored || !String(stored).includes(':')) return false;
    const [salt, hash] = String(stored).split(':');
    const test = crypto.scryptSync(plain, salt, 64).toString('hex');
    return test === hash;
}

function safeParse(str) {
    try { return str ? JSON.parse(str) : null; } catch (e) { return null; }
}

class DatabaseService {

    // --- 1. 用户相关 ---
    createUser(username, password) {
        const result = db.prepare(
            'INSERT INTO users (username, password) VALUES (?, ?)'
        ).run(username, hashPassword(password));
        return { id: Number(result.lastInsertRowid), username };
    }

    getUserByUsername(username) {
        const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
        return user || null;
    }

    verifyPassword(stored, plain) {
        return verifyPassword(stored, plain);
    }

    getAllUsers() {
        return db.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
    }

    // --- 2. 购物车相关 ---
    addToCart(username, product) {
        const result = db.prepare(
            'INSERT INTO carts (username, product) VALUES (?, ?)'
        ).run(username, JSON.stringify(product || {}));
        return { id: Number(result.lastInsertRowid) };
    }

    getAllCarts() {
        return db.prepare('SELECT * FROM carts ORDER BY created_at DESC').all()
            .map(r => ({ ...r, product: safeParse(r.product) }));
    }

    removeFromCart(username, index) {
        const rows = db.prepare('SELECT id FROM carts WHERE username = ? ORDER BY id ASC').all(username);
        if (index >= 0 && index < rows.length) {
            db.prepare('DELETE FROM carts WHERE id = ?').run(rows[index].id);
            return true;
        }
        return false;
    }

    clearCart(username) {
        db.prepare('DELETE FROM carts WHERE username = ?').run(username);
    }

    // --- 3. 收藏夹相关 ---
    addToFavorites(username, product) {
        const result = db.prepare(
            'INSERT INTO favorites (username, product) VALUES (?, ?)'
        ).run(username, JSON.stringify(product || {}));
        return { id: Number(result.lastInsertRowid) };
    }

    getAllFavorites() {
        return db.prepare('SELECT * FROM favorites ORDER BY created_at DESC').all()
            .map(r => ({ ...r, product: safeParse(r.product) }));
    }

    // --- 4. 用户行为日志（核心数据源）---
    addLog(username, action, product = '') {
        const result = db.prepare(
            'INSERT INTO user_logs (username, action, product) VALUES (?, ?, ?)'
        ).run(username, action, product);
        return { id: Number(result.lastInsertRowid) };
    }

    getRecentLogs(limit = 2000) {
        return db.prepare('SELECT * FROM user_logs ORDER BY created_at DESC LIMIT ?').all(limit);
    }

    clearAllLogs() {
        db.prepare('DELETE FROM user_logs').run();
    }

    // --- 5. 订单 & 统计 ---
    createOrder(username, total) {
        const result = db.prepare(
            'INSERT INTO orders (username, total) VALUES (?, ?)'
        ).run(username, total || 0);
        return { id: Number(result.lastInsertRowid) };
    }

    // 营收来自真实订单表，不再用「订单数 * 199」的假数据
    getLatestStats() {
        const { count } = db.prepare(
            "SELECT COUNT(*) AS count FROM user_logs WHERE action LIKE '%支付%' OR action LIKE '%结算%'"
        ).get();
        const { revenue } = db.prepare('SELECT COALESCE(SUM(total), 0) AS revenue FROM orders').get();
        return { total_orders: count || 0, total_revenue: revenue || 0 };
    }
}

module.exports = new DatabaseService();
