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

CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL DEFAULT 0,
    img TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT '非遗手作',
    active INTEGER NOT NULL DEFAULT 1,     -- 1=上架 0=下架
    created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_carts_username ON carts(username);
CREATE INDEX IF NOT EXISTS idx_favorites_username ON favorites(username);
CREATE INDEX IF NOT EXISTS idx_user_logs_username ON user_logs(username);
CREATE INDEX IF NOT EXISTS idx_user_logs_created_at ON user_logs(created_at);
`);

// 首次启动写入默认商品（仅当商品表为空时，避免重复插入）
const productCount = db.prepare('SELECT COUNT(*) AS c FROM products').get().c;
if (productCount === 0) {
    const seedProducts = [
        { name: '冀筑华塔微藏盒', price: 198, img: '/images/001.jpg', category: '数字藏品' },
        { name: '赵州桥榫卯奇盒', price: 88, img: '/images/002.jpg', category: '文创周边' },
        { name: '承德御苑宸景盒', price: 328, img: '/images/003.jpg', category: '数字画作' },
        { name: '山海关雄关守盒', price: 999, img: '/images/004.jpg', category: '典藏精品' },
        { name: '隆兴寺禅筑臻盒', price: 58, img: '/images/005.jpg', category: '非遗手作' },
        { name: '开元寺塔料敌盒', price: 168, img: '/images/006.jpg', category: '非遗手作' },
        { name: '清西陵宫阙雅盒', price: 258, img: '/images/101.jpg', category: '数字藏品' },
        { name: '娲皇宫悬楼秘盒', price: 128, img: '/images/102.jpg', category: '文创周边' },
        { name: '古莲花池苑趣盒', price: 298, img: '/images/103.jpg', category: '数字画作' },
        { name: '紫荆关燕塞筑盒', price: 888, img: '/images/104.jpg', category: '典藏精品' },
        { name: '广府古城围合盒', price: 78, img: '/images/105.jpg', category: '非遗手作' },
        { name: '外八庙梵筑珍盒', price: 188, img: '/images/106.jpg', category: '非遗手作' }
    ];
    const insertProduct = db.prepare('INSERT INTO products (name, price, img, category) VALUES (?, ?, ?, ?)');
    for (const p of seedProducts) insertProduct.run(p.name, p.price, p.img, p.category);
}

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

    // --- 6. 商品管理 ---
    getAllProducts(includeInactive = false) {
        const sql = includeInactive
            ? 'SELECT * FROM products ORDER BY id ASC'
            : 'SELECT * FROM products WHERE active = 1 ORDER BY id ASC';
        return db.prepare(sql).all();
    }

    getProductById(id) {
        return db.prepare('SELECT * FROM products WHERE id = ?').get(id) || null;
    }

    createProduct({ name, price, img, category }) {
        const result = db.prepare(
            'INSERT INTO products (name, price, img, category) VALUES (?, ?, ?, ?)'
        ).run(name || '未命名商品', price || 0, img || '', category || '非遗手作');
        return { id: Number(result.lastInsertRowid) };
    }

    updateProduct(id, { name, price, img, category, active }) {
        const existing = this.getProductById(id);
        if (!existing) return false;
        const nextActive = active === undefined ? existing.active : (active ? 1 : 0);
        db.prepare(
            'UPDATE products SET name = ?, price = ?, img = ?, category = ?, active = ? WHERE id = ?'
        ).run(name ?? existing.name, price ?? existing.price, img ?? existing.img, category ?? existing.category, nextActive, id);
        return true;
    }

    setProductActive(id, active) {
        db.prepare('UPDATE products SET active = ? WHERE id = ?').run(active ? 1 : 0, id);
        return true;
    }

    deleteProduct(id) {
        db.prepare('DELETE FROM products WHERE id = ?').run(id);
        return true;
    }

    // --- 7. 订单管理 ---
    getAllOrders() {
        return db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
    }

    // --- 8. 用户购物车 / 收藏查询（服务端为准） ---
    getCartByUsername(username) {
        return db.prepare('SELECT * FROM carts WHERE username = ? ORDER BY id ASC').all(username)
            .map(r => safeParse(r.product));
    }

    getFavoritesByUsername(username) {
        return db.prepare('SELECT * FROM favorites WHERE username = ? ORDER BY id ASC').all(username)
            .map(r => safeParse(r.product));
    }
}

module.exports = new DatabaseService();
