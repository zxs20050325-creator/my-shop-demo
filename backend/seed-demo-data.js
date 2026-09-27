// seed-demo-data.js —— 造一批演示数据 / 清理演示数据
//
// 用法（在 backend 目录下执行）：
//   node seed-demo-data.js            造数据
//   node seed-demo-data.js --clean    删掉全部演示数据
//
// 为什么是脚本而不是纯 SQL：
//   users.password 存的是 scrypt 哈希（salt:hash 格式），Postgres 里算不出来。
//   用明文插进去的话这些账号永远登不上——旧库里那个 testuser 就是这么废掉的。
//
// 演示数据怎么识别、怎么保证不误删：
//   所有演示账号都以 demo_ 开头，且名单写死在下面的 DEMO_USERS 里。
//   清理时按这份名单精确删除，不碰任何真实账号。
//   products 表是真实商品数据，本脚本完全不碰。
//
// ⚠️ 演示账号密码统一是 demo123456，仅供演示。

require('dotenv').config();
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const DEMO_USERS = [
    'demo_zhangwei', 'demo_lina', 'demo_wangfang', 'demo_liuyang',
    'demo_chenjing', 'demo_zhaolei', 'demo_sunqi', 'demo_zhouming'
];
const DEMO_PASSWORD = 'demo123456';

// ---------------------------------------------------------------- 工具

function hashPassword(plain) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(plain, salt, 64).toString('hex');
    return `${salt}:${hash}`;
}

// 固定种子的伪随机：每次运行结果一致，方便复现和对比
let rngState = 20260927;
function rnd() {
    rngState |= 0; rngState = (rngState + 0x6D2B79F5) | 0;
    let t = Math.imul(rngState ^ (rngState >>> 15), 1 | rngState);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = arr => arr[Math.floor(rnd() * arr.length)];

const DAY = 86400000;
const START = Date.UTC(2026, 3, 1);          // 活动起点 2026-04-01
const END = Date.UTC(2026, 8, 27, 12);       // 活动终点 2026-09-27（今天）

function iso(ms) { return new Date(ms).toISOString(); }

// ---------------------------------------------------------------- 主流程

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
});

async function clean() {
    console.log('正在删除演示数据（账号名单固定，不碰真实数据）…');
    for (const t of ['user_logs', 'orders', 'carts', 'favorites', 'users']) {
        const { error, count } = await sb.from(t).delete({ count: 'exact' }).in('username', DEMO_USERS);
        if (error) throw new Error(`${t} 删除失败: ${error.message}`);
        console.log(`  ${t.padEnd(11)} 删除 ${count} 行`);
    }
    console.log('✅ 演示数据已清空');
}

async function seed() {
    const { data: products, error: pErr } = await sb.from('products').select('*').order('id');
    if (pErr) throw new Error('读取商品失败: ' + pErr.message);
    if (!products || !products.length) throw new Error('products 表是空的，先跑 supabase-migration.sql');
    console.log(`读取到 ${products.length} 个真实商品，用它们来造行为数据\n`);

    // ---- 1. 用户：注册日期错开，这样「每日活跃用户」是逐渐增长的 ----
    const users = DEMO_USERS.map((username, i) => {
        const regDay = Date.UTC(2026, 2, 20) + Math.floor(i * 12 + rnd() * 8) * DAY;
        return { username, password: hashPassword(DEMO_PASSWORD), created_at: iso(regDay) };
    });

    // ---- 2. 行为日志 + 订单 ----
    const logs = [];
    const orders = [];

    for (let day = START; day <= END; day += DAY) {
        const progress = (day - START) / (END - START);
        const intensity = 0.4 + 1.6 * progress;                  // 逐月增长
        const dow = new Date(day).getUTCDay();
        const weekend = (dow === 0 || dow === 6) ? 1.3 : 1.0;    // 周末略高
        const visits = Math.round((2 + rnd() * 5) * intensity * weekend);

        // 当天已注册的用户才能产生行为
        const active = users.filter(u => Date.parse(u.created_at) <= day);
        if (!active.length) continue;

        for (let i = 0; i < visits; i++) {
            const u = pick(active);
            const t = iso(day + Math.floor(rnd() * DAY));

            logs.push({ username: u.username, action: '浏览主页', product: '', created_at: t });

            if (rnd() < 0.55) {
                const p = pick(products);
                logs.push({
                    username: u.username,
                    action: rnd() < 0.5 ? '浏览商品' : '查看商品详情',
                    product: p.name,
                    created_at: t
                });
            }

            if (rnd() < 0.18) {
                const p = pick(products);
                logs.push({ username: u.username, action: '加入购物车', product: p.name, created_at: t });
            }

            if (rnd() < 0.08) {
                // 一次结算：1~3 件商品，订单金额 = 商品价格之和
                const items = [];
                const n = 1 + Math.floor(rnd() * 3);
                for (let k = 0; k < n; k++) items.push(pick(products));
                const total = items.reduce((s, p) => s + Number(p.price), 0);
                orders.push({ username: u.username, total, created_at: t });
                // 结算时后端会写一条 action='支付'、product='订单结算' 的日志，
                // 后台 KPI 的「成交订单」数的就是它，所以必须成对出现。
                logs.push({ username: u.username, action: '支付', product: '订单结算', created_at: t });
            }
        }
    }

    // ---- 3. 购物车 / 收藏：给部分用户留一些未结算的内容 ----
    const carts = [];
    const favorites = [];
    for (let i = 0; i < 4; i++) {
        const u = users[i];
        for (let k = 0; k < 1 + Math.floor(rnd() * 3); k++) {
            carts.push({ username: u.username, product: pick(products), created_at: iso(Date.now() - Math.floor(rnd() * 5 * DAY)) });
        }
    }
    for (let i = 4; i < 8; i++) {
        const u = users[i];
        for (let k = 0; k < 1 + Math.floor(rnd() * 3); k++) {
            favorites.push({ username: u.username, product: pick(products), created_at: iso(Date.now() - Math.floor(rnd() * 5 * DAY)) });
        }
    }

    // ---- 4. 分批写入 ----
    async function insertAll(table, rows, size = 500) {
        for (let i = 0; i < rows.length; i += size) {
            const { error } = await sb.from(table).insert(rows.slice(i, i + size));
            if (error) throw new Error(`${table} 插入失败(第 ${i} 行起): ${error.message}`);
        }
        console.log(`  ${table.padEnd(11)} 写入 ${String(rows.length).padStart(5)} 行`);
    }

    console.log('开始写入：');
    await insertAll('users', users);
    await insertAll('user_logs', logs);
    await insertAll('orders', orders);
    await insertAll('carts', carts);
    await insertAll('favorites', favorites);

    const revenue = orders.reduce((s, o) => s + o.total, 0);
    console.log('\n================ 汇总 ================');
    console.log(`  演示账号     ${users.length} 个（密码统一 ${DEMO_PASSWORD}）`);
    console.log(`  行为日志     ${logs.length} 条`);
    console.log(`  订单         ${orders.length} 笔，总营收 ¥${revenue.toFixed(2)}`);
    console.log(`  购物车       ${carts.length} 条`);
    console.log(`  收藏         ${favorites.length} 条`);
    console.log('======================================');
    console.log('账号示例：' + DEMO_USERS.slice(0, 3).join(', ') + ' …');
    console.log('\n✅ 完成。去后台 /admin 看「数据总览」。');
    console.log('   想删掉全部演示数据： node seed-demo-data.js --clean');
}

(async () => {
    try {
        if (process.argv.includes('--clean')) await clean();
        else await seed();
    } catch (e) {
        console.error('\n❌ ' + e.message);
        process.exit(1);
    }
})();
