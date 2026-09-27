// db.js - 数据访问层（Supabase 版）
//
// 契约：对外暴露的方法名与返回数据形状，与旧 SQLite 版完全一致，
//       只是全部变成了 async。{ data, error } 在本文件内部拆掉，
//       error 一律抛出，因此 index.js 现有的 try/catch 和全局错误中间件继续生效。
//
// 唯一的同步方法：verifyPassword —— 详见其定义处的注释，禁止改成 async。
require('dotenv').config();
const crypto = require('crypto');
const dns = require('dns').promises;
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

// Supabase 托管实例的 PostgREST db-max-rows 硬上限。
// 服务端会把 .limit() 静默压到 1000，超出部分不会报错、直接不返回，
// 所以超过 1000 行的读取必须用 .range() 分页（见 selectLimited）。
const PG_MAX_ROWS = 1000;

let supabase = null;

function getClient() {
    if (!supabase) throw new Error('[db] Supabase 客户端尚未初始化');
    return supabase;
}

// 把 PostgREST 的 error 转成异常抛出
function fail(error, ctx) {
    const e = new Error(`[db] ${ctx} 失败: ${error.message}`);
    e.code = error.code;
    e.details = error.details;
    e.hint = error.hint;
    throw e;
}

// 拆 { data, error }，出错则抛出
async function unwrap(query, ctx) {
    const { data, error } = await query;
    if (error) fail(error, ctx);
    return data;
}

// 金额字段用 DOUBLE PRECISION，PostgREST 会序列化成 JSON number；
// 这里兜底兼容历史数据或字符串输入。
function toNumber(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}

// 读 JSONB：正常情况下拿到的已经是对象。
// 这里只为兼容历史脏数据（被双重编码成 JSON 文本的标量）。
function asJson(v) {
    if (typeof v !== 'string') return v ?? null;
    const s = v.trim();
    if (s.startsWith('{') || s.startsWith('[')) {
        try { return JSON.parse(s); } catch (e) { /* 落回原字符串 */ }
    }
    return v;
}

// 写 JSONB：直接把对象交给 supabase-js，不要 JSON.stringify，
// 否则会存成一个被双重编码的 JSONB 字符串标量，读出来是字符串而不是对象。
function toJson(v) {
    if (v === null || v === undefined) return {};
    if (typeof v === 'string') {
        const s = v.trim();
        if (s.startsWith('{') || s.startsWith('[')) {
            try { return JSON.parse(s); } catch (e) { /* 落回原值 */ }
        }
    }
    return v;
}

// 分页读取，绕过 PostgREST 的 1000 行上限。
// buildQuery 必须是 thunk，每轮返回一个全新的 query builder（builder 不可复用）。
// 注意排序必须带唯一列（如 id）兜底，否则 created_at 有并列时分页会重复或漏行。
async function selectLimited(buildQuery, limit, ctx) {
    const out = [];
    let from = 0;
    while (out.length < limit) {
        const size = Math.min(PG_MAX_ROWS, limit - out.length);
        const { data, error } = await buildQuery().range(from, from + size - 1);
        if (error) fail(error, ctx);
        if (!data || data.length === 0) break;
        out.push(...data);
        if (data.length < size) break;   // 已到末尾
        from += data.length;
    }
    return out;
}

// --- 密码哈希工具（纯计算，无 I/O，保持同步）---
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

// --- 种子商品（与旧 SQLite 版逐字一致）---
const SEED_PRODUCTS = [
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

// 数据库为空时写入初始商品，行为与旧版 seedData() 一致
async function seedData() {
    const { count, error } = await getClient()
        .from('products')
        .select('id', { head: true, count: 'exact' });
    if (error) fail(error, 'seedData 计数');

    if (!count) {
        const rows = SEED_PRODUCTS.map(([name, price, img, category]) =>
            ({ name, price, img, category }));
        const { error: insErr } = await getClient().from('products').insert(rows);
        if (insErr) fail(insErr, 'seedData 插入');
        console.log('✅ 初始商品数据已写入');
    }
}

// 只报「密钥属于哪一类」，绝不回显密钥本身。
// supabase 有两种名字极像的密钥，搞混是最常见的事故：
//   sb_secret_*      服务端密钥，后端必须用这个
//   sb_publishable_* 公开密钥，设计上就要发给浏览器，绕过不了 RLS
function describeKey(k) {
    if (!k) return '未设置 ❌';
    if (k.startsWith('sb_secret_')) return 'sb_secret_*（服务端密钥 ✅）';
    if (k.startsWith('sb_publishable_')) return 'sb_publishable_*（公开密钥 ❌ 后端必须用 sb_secret_ 开头的）';
    if (k.startsWith('eyJ')) return 'JWT 格式（旧版密钥，需确认是 service_role 而非 anon）';
    return `未知格式（长度 ${k.length}）`;
}

// undici 只抛一句 "fetch failed"，真正的原因（ENOTFOUND / ECONNRESET / 证书错误）
// 藏在 error.cause 链里。不扒出来，线上报错就等于什么都没说。
function causeChain(e) {
    const out = [];
    for (let c = e, i = 0; c && i < 5; c = c.cause, i++) {
        out.push([c.message, c.code].filter(Boolean).join(' / '));
    }
    return out.join('  ←  ');
}

// 连接失败时跑一遍分层探测，把「到底哪一层断了」定位到具体一步
async function diagnoseConnection() {
    const lines = [
        `SUPABASE_URL         = ${SUPABASE_URL}`,
        `SUPABASE_SERVICE_KEY = ${describeKey(SUPABASE_KEY)}`
    ];

    let host = null;
    try { host = new URL(SUPABASE_URL).host; } catch (e) { /* 下面会报 */ }
    lines.push(`主机名               = ${host || '❌ SUPABASE_URL 不是合法 URL'}`);

    if (host) {
        try {
            const { address } = await dns.lookup(host);
            lines.push(`DNS 解析             = ${address} ✅`);
        } catch (e) {
            lines.push(`DNS 解析             = ❌ ${causeChain(e)}`);
        }
    }

    try {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/products?select=id&limit=1`, {
            headers: { apikey: SUPABASE_KEY },
            signal: AbortSignal.timeout(15000)
        });
        lines.push(`HTTPS 探测           = HTTP ${r.status}` +
            (r.status === 401 ? '（能连上，是密钥不对）' : ' ✅'));
    } catch (e) {
        lines.push(`HTTPS 探测           = ❌ ${causeChain(e)}`);
    }

    return '\n     ' + lines.join('\n     ');
}

// 初始化：建客户端 + 连通性探测 + 种子数据
async function initializeDatabase() {
    if (!SUPABASE_URL) throw new Error('缺少环境变量 SUPABASE_URL');
    if (!SUPABASE_KEY) throw new Error('缺少环境变量 SUPABASE_SERVICE_KEY');

    supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
        // Node 服务端没有用户会话，关掉可避免多余的后台定时刷新
        auth: { persistSession: false, autoRefreshToken: false },
        db: { schema: 'public' }
    });

    // 连通性 + 迁移检查：表不存在会返回 42P01，这里 fail-fast 并给出可操作提示。
    // head: true 只取计数，不传输任何行。
    const { error } = await supabase
        .from('products')
        .select('id', { head: true, count: 'exact' });

    if (error) {
        const report = await diagnoseConnection();
        throw new Error(
            `Supabase 连接或表检查失败：${error.message}\n\n` +
            `  诊断：${report}\n\n` +
            `  怎么读这份诊断：\n` +
            `   · DNS 解析失败      → SUPABASE_URL 的域名写错了\n` +
            `   · HTTPS 探测 401    → 密钥用错了（看上面的密钥类型那一行）\n` +
            `   · HTTPS 探测超时/重置 → 这台机器的出网被拦\n` +
            `   · HTTPS 探测 200 却仍报错 → 表不存在，去 Supabase SQL Editor\n` +
            `                        执行 backend/supabase-migration.sql`
        );
    }

    await seedData();
    return true;
}

class DatabaseService {

    // --- 1. 用户相关 ---
    async createUser(username, password) {
        return unwrap(
            getClient().from('users')
                .insert({ username, password: hashPassword(password) })
                .select('id, username')
                .single(),
            'createUser'
        );
    }

    async getUserByUsername(username) {
        return unwrap(
            getClient().from('users').select('*').eq('username', username).maybeSingle(),
            'getUserByUsername'
        );
    }

    // 同步方法！只做 scrypt 哈希比对，不碰数据库。
    // 调用方是 `if (user && db.verifyPassword(...))`，
    // 若改成 async 而漏写 await，返回的 Promise 永远 truthy，
    // 等于「任何密码都能登录任意用户」——一个静默的认证绕过漏洞。
    verifyPassword(stored, plain) {
        return verifyPassword(stored, plain);
    }

    async getAllUsers() {
        return unwrap(
            getClient().from('users').select('*')
                .order('created_at', { ascending: false })
                .order('id', { ascending: false }),
            'getAllUsers'
        );
    }

    // --- 2. 购物车相关 ---
    async addToCart(username, product) {
        return unwrap(
            getClient().from('carts')
                .insert({ username, product: toJson(product) })
                .select('id')
                .single(),
            'addToCart'
        );
    }

    async getAllCarts() {
        const rows = await unwrap(
            getClient().from('carts').select('*')
                .order('created_at', { ascending: false })
                .order('id', { ascending: false }),
            'getAllCarts'
        );
        return rows.map(r => ({ ...r, product: asJson(r.product) }));
    }

    async removeFromCart(username, index) {
        const rows = await unwrap(
            getClient().from('carts').select('id')
                .eq('username', username)
                .order('id', { ascending: true }),
            'removeFromCart'
        );
        if (!rows.length) return false;

        const i = Number(index);
        if (!Number.isInteger(i) || i < 0 || i >= rows.length) return false;

        const { error } = await getClient().from('carts').delete().eq('id', rows[i].id);
        if (error) fail(error, 'removeFromCart');
        return true;
    }

    async clearCart(username) {
        const { error } = await getClient().from('carts').delete().eq('username', username);
        if (error) fail(error, 'clearCart');
    }

    // --- 3. 收藏夹相关 ---
    async addToFavorites(username, product) {
        return unwrap(
            getClient().from('favorites')
                .insert({ username, product: toJson(product) })
                .select('id')
                .single(),
            'addToFavorites'
        );
    }

    async getAllFavorites() {
        const rows = await unwrap(
            getClient().from('favorites').select('*')
                .order('created_at', { ascending: false })
                .order('id', { ascending: false }),
            'getAllFavorites'
        );
        return rows.map(r => ({ ...r, product: asJson(r.product) }));
    }

    // --- 4. 用户行为日志 ---
    async addLog(username, action, product = '') {
        return unwrap(
            getClient().from('user_logs')
                .insert({ username, action, product })
                .select('id')
                .single(),
            'addLog'
        );
    }

    // 分页读取：index.js 会请求 5000 条，超过 PostgREST 的 1000 行上限
    async getRecentLogs(limit = 2000) {
        return selectLimited(
            () => getClient().from('user_logs').select('*')
                .order('created_at', { ascending: false })
                .order('id', { ascending: false }),
            limit,
            'getRecentLogs'
        );
    }

    // PostgREST 拒绝对没有 WHERE 的 DELETE（code 21000），必须给一个恒真条件。
    // user_logs.id 是 BIGINT IDENTITY，最小值为 1，故 gte 0 覆盖全表。
    async clearAllLogs() {
        const { error } = await getClient().from('user_logs').delete().gte('id', 0);
        if (error) fail(error, 'clearAllLogs');
    }

    // --- 5. 订单 & 统计 ---
    async createOrder(username, total) {
        return unwrap(
            getClient().from('orders')
                .insert({ username, total: toNumber(total) })
                .select('id')
                .single(),
            'createOrder'
        );
    }

    // 走 RPC：hosted Supabase 把 PostgREST 的聚合功能锁死为关闭，
    // .select('total.sum()') 会返回 PGRST123，只能由数据库函数完成聚合。
    async getLatestStats() {
        const data = await unwrap(getClient().rpc('get_latest_stats'), 'getLatestStats');
        const row = Array.isArray(data) ? data[0] : data;
        return {
            total_orders: toNumber(row?.total_orders),
            total_revenue: toNumber(row?.total_revenue)
        };
    }

    // --- 6. 商品管理 ---
    async getAllProducts(includeInactive = false) {
        let q = getClient().from('products').select('*').order('id', { ascending: true });
        if (!includeInactive) q = q.eq('active', 1);
        return unwrap(q, 'getAllProducts');
    }

    async getProductById(id) {
        const n = Number(id);
        if (!Number.isFinite(n)) return null;   // 旧版 WHERE id = NaN 静默返回空；
                                                // 直接 .eq('id', NaN) 会让 PostgREST 报 400
        return unwrap(
            getClient().from('products').select('*').eq('id', n).maybeSingle(),
            'getProductById'
        );
    }

    async createProduct({ name, price, img, category } = {}) {
        return unwrap(
            getClient().from('products')
                .insert({
                    name: name || '未命名商品',
                    price: toNumber(price),
                    img: img || '',
                    category: category || '非遗手作'
                })
                .select('id')
                .single(),
            'createProduct'
        );
    }

    async updateProduct(id, { name, price, img, category, active } = {}) {
        const existing = await this.getProductById(id);
        if (!existing) return false;

        // active 必须始终是整数 1/0：index.js 里有 `p.active === 1` 的严格比较
        const nextActive = active === undefined ? existing.active : (active ? 1 : 0);

        const { error } = await getClient().from('products').update({
            name: name ?? existing.name,
            price: (price === undefined || price === null) ? existing.price : toNumber(price),
            img: img ?? existing.img,
            category: category ?? existing.category,
            active: nextActive
        }).eq('id', id);
        if (error) fail(error, 'updateProduct');
        return true;
    }

    async setProductActive(id, active) {
        const { error } = await getClient().from('products')
            .update({ active: active ? 1 : 0 }).eq('id', id);
        if (error) fail(error, 'setProductActive');
        return true;
    }

    async deleteProduct(id) {
        const { error } = await getClient().from('products').delete().eq('id', id);
        if (error) fail(error, 'deleteProduct');
        return true;
    }

    // --- 7. 订单管理 ---
    async getAllOrders() {
        return unwrap(
            getClient().from('orders').select('*')
                .order('created_at', { ascending: false })
                .order('id', { ascending: false }),
            'getAllOrders'
        );
    }

    // --- 8. 用户购物车 / 收藏查询 ---
    // 注意：返回的是「商品对象」组成的数组，不是行对象数组。
    async getCartByUsername(username) {
        const rows = await unwrap(
            getClient().from('carts').select('product')
                .eq('username', username)
                .order('id', { ascending: true }),
            'getCartByUsername'
        );
        return rows.map(r => asJson(r.product));
    }

    async getFavoritesByUsername(username) {
        const rows = await unwrap(
            getClient().from('favorites').select('product')
                .eq('username', username)
                .order('id', { ascending: true }),
            'getFavoritesByUsername'
        );
        return rows.map(r => asJson(r.product));
    }
}

// 数据库服务实例和初始化 Promise
const dbService = new DatabaseService();

// 刻意不在这里 catch：统一由 index.js 的 .catch 负责打日志并 process.exit(1)，
// 避免出现两个退出点导致日志顺序混乱、掩盖真正原因。
const dbReadyPromise = initializeDatabase().then(() => {
    console.log('✅ Supabase 数据库就绪');
    return dbService;
});

module.exports = {
    ready: dbReadyPromise,
    service: dbService
};
