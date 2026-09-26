// db.js - 数据访问层（SQLite 版）
// 使用 sql.js（纯 JavaScript 实现），无需 C++ 编译工具，兼容所有 Node 版本
require('dotenv').config();
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const initSqlJs = require('sql.js');

// 数据库文件路径
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'jiyi.db');

let db;
let SQL;

// 异步初始化数据库
async function initializeDatabase() {
    try {
        // 初始化 sql.js
        SQL = await initSqlJs();
        
        // 尝试加载现有数据库文件
        if (fs.existsSync(DB_PATH)) {
            const fileBuffer = fs.readFileSync(DB_PATH);
            db = new SQL.Database(fileBuffer);
            console.log('✅ 数据库加载成功:', DB_PATH);
        } else {
            // 创建新数据库
            db = new SQL.Database();
            console.log('✅ 创建新数据库:', DB_PATH);
        }
        
        // 启用 WAL 模式
        db.run('PRAGMA journal_mode = WAL;');
        
        // 建表
        createTables();
        
        // 初始化默认数据
        await seedData();
        
        return true;
    } catch (error) {
        console.error('❌ 数据库初始化失败:', error.message);
        throw error;
    }
}

function createTables() {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        );

        CREATE TABLE IF NOT EXISTS carts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            product TEXT NOT NULL,
            created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        );

        CREATE TABLE IF NOT EXISTS favorites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            product TEXT NOT NULL,
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
            active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        );

        CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
        CREATE INDEX IF NOT EXISTS idx_carts_username ON carts(username);
        CREATE INDEX IF NOT EXISTS idx_favorites_username ON favorites(username);
        CREATE INDEX IF NOT EXISTS idx_user_logs_username ON user_logs(username);
        CREATE INDEX IF NOT EXISTS idx_user_logs_created_at ON user_logs(created_at);
    `);
    
    saveDatabase();
}

async function seedData() {
    const count = db.exec('SELECT COUNT(*) AS c FROM products')[0]?.values[0][0] || 0;
    
    if (count === 0) {
        const seedProducts = [
            ['冀筑华塔微藏盒', 198, '/images/001.jpg', '数字藏品'],
            ['赵州桥榫卯奇盒', 88, '/images/002.jpg', '文创周边'],
            ['承德御苑宸景盒', 328, '/images/003.jpg', '数字画作'],
            ['山海关雄关守盒', 999, '/images/004.jpg', '典藏精品'],
            ['隆兴寺禅筑臻盒', 58, '/images/005.jpg', '非遗手作'],
            ['开元寺塔料敌盒', 168, '/images/006.jpg', '非遗手作'],
            ['清西陵宫阙雅盒', 258, '/images/101.jpg', '数字藏品'],
            ['娲皇宫悬楼秘盒', 128, '/images/102.jpg', '文创周边'],
            ['古莲花池苑趣盒', 298, '/images/103.jpg', '数字画作'],
            ['紫荆关燕塞筑盒', 888, '/images/104.jpg', '典藏精品'],
            ['广府古城围合盒', 78, '/images/105.jpg', '非遗手作'],
            ['外八庙梵筑珍盒', 188, '/images/106.jpg', '非遗手作']
        ];
        
        const stmt = db.prepare('INSERT INTO products (name, price, img, category) VALUES (?, ?, ?, ?)');
        for (const p of seedProducts) {
            stmt.run(p);
        }
        stmt.free();
        saveDatabase();
        console.log('✅ 初始商品数据已写入');
    }
}

// 保存数据库到文件
function saveDatabase() {
    try {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(DB_PATH, buffer);
    } catch (error) {
        console.error('❌ 保存数据库失败:', error.message);
    }
}

// --- 密码哈希工具 ---
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
        db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashPassword(password)]);
        saveDatabase();
        const result = db.exec('SELECT last_insert_rowid() as id')[0];
        return { id: result.values[0][0], username };
    }

    getUserByUsername(username) {
        const result = db.exec(`SELECT * FROM users WHERE username = '${username.replace(/'/g, "''")}'`);
        if (result.length === 0) return null;
        
        const columns = result[0].columns;
        const values = result[0].values[0];
        const user = {};
        columns.forEach((col, i) => user[col] = values[i]);
        return user;
    }

    verifyPassword(stored, plain) {
        return verifyPassword(stored, plain);
    }

    getAllUsers() {
        const result = db.exec('SELECT * FROM users ORDER BY created_at DESC');
        if (result.length === 0) return [];
        
        const columns = result[0].columns;
        return result[0].values.map(values => {
            const user = {};
            columns.forEach((col, i) => user[col] = values[i]);
            return user;
        });
    }

    // --- 2. 购物车相关 ---
    addToCart(username, product) {
        db.run('INSERT INTO carts (username, product) VALUES (?, ?)', [username, JSON.stringify(product || {})]);
        saveDatabase();
        const result = db.exec('SELECT last_insert_rowid() as id')[0];
        return { id: result.values[0][0] };
    }

    getAllCarts() {
        const result = db.exec('SELECT * FROM carts ORDER BY created_at DESC');
        if (result.length === 0) return [];
        
        const columns = result[0].columns;
        return result[0].values.map(values => {
            const cart = {};
            columns.forEach((col, i) => cart[col] = values[i]);
            cart.product = safeParse(cart.product);
            return cart;
        });
    }

    removeFromCart(username, index) {
        const rows = db.exec(`SELECT id FROM carts WHERE username = '${username.replace(/'/g, "''")}' ORDER BY id ASC`);
        if (rows.length === 0) return false;
        
        const ids = rows[0].values.map(v => v[0]);
        if (index >= 0 && index < ids.length) {
            db.run('DELETE FROM carts WHERE id = ?', [ids[index]]);
            saveDatabase();
            return true;
        }
        return false;
    }

    clearCart(username) {
        db.run('DELETE FROM carts WHERE username = ?', [username]);
        saveDatabase();
    }

    // --- 3. 收藏夹相关 ---
    addToFavorites(username, product) {
        db.run('INSERT INTO favorites (username, product) VALUES (?, ?)', [username, JSON.stringify(product || {})]);
        saveDatabase();
        const result = db.exec('SELECT last_insert_rowid() as id')[0];
        return { id: result.values[0][0] };
    }

    getAllFavorites() {
        const result = db.exec('SELECT * FROM favorites ORDER BY created_at DESC');
        if (result.length === 0) return [];
        
        const columns = result[0].columns;
        return result[0].values.map(values => {
            const fav = {};
            columns.forEach((col, i) => fav[col] = values[i]);
            fav.product = safeParse(fav.product);
            return fav;
        });
    }

    // --- 4. 用户行为日志 ---
    addLog(username, action, product = '') {
        db.run('INSERT INTO user_logs (username, action, product) VALUES (?, ?, ?)', [username, action, product]);
        saveDatabase();
        const result = db.exec('SELECT last_insert_rowid() as id')[0];
        return { id: result.values[0][0] };
    }

    getRecentLogs(limit = 2000) {
        const result = db.exec(`SELECT * FROM user_logs ORDER BY created_at DESC LIMIT ${limit}`);
        if (result.length === 0) return [];
        
        const columns = result[0].columns;
        return result[0].values.map(values => {
            const log = {};
            columns.forEach((col, i) => log[col] = values[i]);
            return log;
        });
    }

    clearAllLogs() {
        db.run('DELETE FROM user_logs');
        saveDatabase();
    }

    // --- 5. 订单 & 统计 ---
    createOrder(username, total) {
        db.run('INSERT INTO orders (username, total) VALUES (?, ?)', [username, total || 0]);
        saveDatabase();
        const result = db.exec('SELECT last_insert_rowid() as id')[0];
        return { id: result.values[0][0] };
    }

    getLatestStats() {
        const orderResult = db.exec("SELECT COUNT(*) AS count FROM user_logs WHERE action LIKE '%支付%' OR action LIKE '%结算%'");
        const count = orderResult.length > 0 ? orderResult[0].values[0][0] : 0;
        
        const revenueResult = db.exec('SELECT COALESCE(SUM(total), 0) AS revenue FROM orders');
        const revenue = revenueResult.length > 0 ? revenueResult[0].values[0][0] : 0;
        
        return { total_orders: count || 0, total_revenue: revenue || 0 };
    }

    // --- 6. 商品管理 ---
    getAllProducts(includeInactive = false) {
        const sql = includeInactive
            ? 'SELECT * FROM products ORDER BY id ASC'
            : 'SELECT * FROM products WHERE active = 1 ORDER BY id ASC';
        
        const result = db.exec(sql);
        if (result.length === 0) return [];
        
        const columns = result[0].columns;
        return result[0].values.map(values => {
            const product = {};
            columns.forEach((col, i) => product[col] = values[i]);
            return product;
        });
    }

    getProductById(id) {
        const result = db.exec(`SELECT * FROM products WHERE id = ${id}`);
        if (result.length === 0) return null;
        
        const columns = result[0].columns;
        const values = result[0].values[0];
        const product = {};
        columns.forEach((col, i) => product[col] = values[i]);
        return product;
    }

    createProduct({ name, price, img, category }) {
        db.run('INSERT INTO products (name, price, img, category) VALUES (?, ?, ?, ?)', 
            [name || '未命名商品', price || 0, img || '', category || '非遗手作']);
        saveDatabase();
        const result = db.exec('SELECT last_insert_rowid() as id')[0];
        return { id: result.values[0][0] };
    }

    updateProduct(id, { name, price, img, category, active }) {
        const existing = this.getProductById(id);
        if (!existing) return false;
        
        const nextActive = active === undefined ? existing.active : (active ? 1 : 0);
        db.run('UPDATE products SET name = ?, price = ?, img = ?, category = ?, active = ? WHERE id = ?',
            [name ?? existing.name, price ?? existing.price, img ?? existing.img, category ?? existing.category, nextActive, id]);
        saveDatabase();
        return true;
    }

    setProductActive(id, active) {
        db.run('UPDATE products SET active = ? WHERE id = ?', [active ? 1 : 0, id]);
        saveDatabase();
        return true;
    }

    deleteProduct(id) {
        db.run('DELETE FROM products WHERE id = ?', [id]);
        saveDatabase();
        return true;
    }

    // --- 7. 订单管理 ---
    getAllOrders() {
        const result = db.exec('SELECT * FROM orders ORDER BY created_at DESC');
        if (result.length === 0) return [];
        
        const columns = result[0].columns;
        return result[0].values.map(values => {
            const order = {};
            columns.forEach((col, i) => order[col] = values[i]);
            return order;
        });
    }

    // --- 8. 用户购物车 / 收藏查询 ---
    getCartByUsername(username) {
        const result = db.exec(`SELECT * FROM carts WHERE username = '${username.replace(/'/g, "''")}' ORDER BY id ASC`);
        if (result.length === 0) return [];
        
        const columns = result[0].columns;
        return result[0].values.map(values => {
            const cart = {};
            columns.forEach((col, i) => cart[col] = values[i]);
            return safeParse(cart.product);
        });
    }

    getFavoritesByUsername(username) {
        const result = db.exec(`SELECT * FROM favorites WHERE username = '${username.replace(/'/g, "''")}' ORDER BY id ASC`);
        if (result.length === 0) return [];
        
        const columns = result[0].columns;
        return result[0].values.map(values => {
            const fav = {};
            columns.forEach((col, i) => fav[col] = values[i]);
            return safeParse(fav.product);
        });
    }
}

// 导出异步初始化的数据库服务
let dbService = null;

async function getDatabaseService() {
    if (!dbService) {
        await initializeDatabase();
        dbService = new DatabaseService();
    }
    return dbService;
}

// 立即初始化并导出
const initPromise = initializeDatabase().then(() => {
    dbService = new DatabaseService();
    module.exports = dbService;
}).catch(err => {
    console.error('数据库初始化失败，进程退出:', err);
    process.exit(1);
});

module.exports = new Proxy({}, {
    get(target, prop) {
        if (!dbService) {
            throw new Error('数据库尚未初始化完成');
        }
        return dbService[prop];
    }
});
