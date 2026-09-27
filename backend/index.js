// index.js - 后端服务完整版
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// 静态文件服务：商品图片
app.use('/images', express.static(path.join(__dirname, 'public', 'images')));

// 前端构建产物（Vite 输出到 frontend/dist）
// 开发时前端跑在 Vite dev server，由它把 /api 代理到这里，dist 不存在也不影响后端启动。
// 这也是为什么这里要 existsSync 判断而不是直接 static —— 否则本地开发时后端会因为
// 挂载一个不存在的目录而在每次请求上浪费时间，日志也容易误导。
const DIST_DIR = path.join(__dirname, '..', 'frontend', 'dist');
const HAS_DIST = fs.existsSync(path.join(DIST_DIR, 'index.html'));

if (HAS_DIST) {
    app.use(express.static(DIST_DIR));
    console.log('📦 已托管前端构建产物 frontend/dist');
} else {
    console.warn('⚠️  未找到 frontend/dist —— 前端请在 frontend/ 下用 `npm run dev` 启动（Vite dev server）');
    console.warn('    若这是线上环境，说明构建阶段没生成 dist，页面将全部 404（见文件末尾的处理）');
}

// 后台管理入口：保留 /admin 这个手敲 URL 的习惯，重定向到前端路由
// （Vue 用 hash 模式，所以后台真实地址是 /#/admin）
app.get('/admin', (req, res) => res.redirect('/#/admin'));

// 引入数据库模块
const { ready: dbReady, service: db } = require('./db');

// 管理员鉴权：所有 /api/admin/* 接口需在请求头携带正确的 x-admin-key
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
function requireAdmin(req, res, next) {
    if (req.headers['x-admin-key'] === ADMIN_PASSWORD) return next();
    res.status(401).json({ success: false, message: '未授权：管理员口令错误' });
}

// 后台登录：验证管理员口令（前台页面不暴露该接口的地址）
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    if (password === ADMIN_PASSWORD) return res.json({ success: true });
    res.status(401).json({ success: false, message: '管理员口令错误' });
});

// ==========================================
// A. 前台业务接口
// ==========================================

// 1. 获取商品（数据来自数据库，可在后台增删改/上下架）
// 支持 ?q= 关键词、?category= 分类、?sort= 排序、?page= & ?pageSize= 分页。
//
// 旧版这里忽略一切查询参数、一次返回全部商品，而前端把页码写死成 [1,2]。
// 后果：管理员新增第 13 个商品后，它在前台永远不出现——静默的数据丢失。
//
// 响应在 items 之外补了 total/page/pageSize，是「加字段」不是「改形状」，
// 老调用方（后台 admin.html）不受影响。
app.get('/api/products', async (req, res) => {
    try {
        const { q, category, sort, page, pageSize } = req.query;
        res.json(await db.searchProducts({ q, category, sort, page, pageSize }));
    } catch (e) {
        // 曾经这里返回空形状（items: []），理由是「前端判断 data.items，
        // 返回 { error } 会让首屏卡在骨架屏」—— 那是旧前端的写法，已经过时。
        // 现在 ProductExplorer 有独立的失败分支，HTTP 非 2xx 会被 api 层抛出，
        // 页面显示「藏品加载失败」；而返回 200 空数组会让首页平静地告诉你
        // 「还没有上架的藏品」—— 12 件商品明明在库里。故障必须长得像故障。
        console.error('获取商品列表失败:', e);
        res.status(500).json({ error: '商品加载失败', message: e.message });
    }
});

// 1b. 分类清单（给「分类浏览」页用）
app.get('/api/categories', async (req, res) => {
    try {
        res.json({ items: await db.getCategories() });
    } catch (e) {
        console.error('获取分类失败:', e);
        res.json({ items: [] });
    }
});

app.get('/api/products/:id', async (req, res) => {
    try {
        const p = await db.getProductById(Number(req.params.id));
        if (p && p.active === 1) return res.json(p);
        res.status(404).json({ error: 'Not found' });
    } catch (e) {
        console.error('获取商品详情失败:', e);
        res.status(404).json({ error: 'Not found' });
    }
});

// 2. 注册
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const exists = await db.getUserByUsername(username);
        if(exists) return res.status(409).json({success:false, message:'用户已存在'});
        await db.createUser(username, password);
        res.json({success:true});
    } catch(e) { res.status(500).json({success:false}); }
});

// 3. 登录
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await db.getUserByUsername(username);
        // 注意：verifyPassword 是同步方法，切勿改成 async/await
        if(user && db.verifyPassword(user.password, password)) res.json({success:true});
        else res.status(401).json({success:false, message:'用户名或密码错误'});
    } catch(e) { res.status(500).json({success:false}); }
});

// 4. 行为跟踪 (写入日志)
app.post('/api/track', async (req, res) => {
    try {
        const { username, action, product } = req.body;
        await db.addLog(username || '游客', action, product || '');
        res.json({success:true});
    } catch(e) { res.status(500).json({success:false}); }
});

// 5. 购物车/收藏
app.post('/api/cart/add', async (req, res) => {
    try {
        await db.addToCart(req.body.username, req.body.product);
        res.json({success:true});
    } catch(e) { res.status(500).json({success:false}); }
});

app.post('/api/favorites/add', async (req, res) => {
    try {
        await db.addToFavorites(req.body.username, req.body.product);
        res.json({success:true});
    } catch(e) { res.status(500).json({success:false}); }
});

// 获取购物车 / 收藏（服务端为准，登录后前端拉取）
// 注意这里和 /api/products 的兜底策略**故意不同**：
// 商品列表拿不到时返回空形状，是为了别让首屏卡在骨架屏（前端只判断 data.items）；
// 但购物车/收藏/订单拿不到时必须报错。把数据库故障伪装成「空的」，
// 用户看到的是「我的购物车怎么空了」「我的订单丢了」，
// 排查方向会被彻底带偏——真实原因（缺列、缺表、连接失败）反而被藏起来了。
app.get('/api/cart', async (req, res) => {
    const username = req.query.username;
    if (!username) return res.json({ items: [] });
    try {
        res.json({ items: await db.getCartByUsername(username) });
    } catch (e) {
        console.error('获取购物车失败:', e);
        res.status(500).json({ error: '购物车加载失败', message: e.message });
    }
});

app.get('/api/favorites', async (req, res) => {
    const username = req.query.username;
    if (!username) return res.json({ items: [] });
    try {
        res.json({ items: await db.getFavoritesByUsername(username) });
    } catch (e) {
        console.error('获取收藏失败:', e);
        res.status(500).json({ error: '收藏加载失败', message: e.message });
    }
});

// 6. 从购物车移除（前端 cart.html 调用）
app.post('/api/cart/remove', async (req, res) => {
    try {
        const { username, index } = req.body;
        await db.removeFromCart(username, index);
        res.json({success:true});
    } catch(e) { res.status(500).json({success:false}); }
});

// 6b. 改购物车数量（index 是购物车里的下标，按 id 升序定位）
app.post('/api/cart/quantity', async (req, res) => {
    try {
        const { username, index, quantity } = req.body;
        if (!username) return res.status(400).json({ success: false, message: '缺少用户名' });
        const ok = await db.setCartQuantity(username, index, quantity);
        ok
            ? res.json({ success: true })
            : res.status(400).json({ success: false, message: '定位失败或数量非法（最小为 1，减到 0 请用移除）' });
    } catch(e) {
        console.error('修改购物车数量失败:', e);
        res.status(500).json({success:false});
    }
});

// 6c. 取消收藏。旧版后端没有这个接口，前端只改本地 localStorage，
//     于是刷新或换设备后收藏会「复活」。
app.post('/api/favorites/remove', async (req, res) => {
    try {
        const { username, productId } = req.body;
        if (!username || productId === undefined || productId === null) {
            return res.status(400).json({ success: false, message: '缺少参数' });
        }
        await db.removeFromFavorites(username, productId);
        res.json({success:true});
    } catch(e) {
        console.error('取消收藏失败:', e);
        res.status(500).json({success:false});
    }
});

// 7. 结算：写订单 + 写明细 + 清空购物车 + 记录支付行为
//
// 两个关键点：
//  ① 明细（买了什么）来自服务端购物车，不是前端传的。旧版 orders 表根本没有明细字段，
//     结算时购物车内容被直接丢弃——用户付了钱却查不到自己买了什么。
//  ② 金额优先按服务端购物车重算。前端传来的 totalPrice 只作为购物车为空时的兜底，
//     否则改一下请求体就能伪造任意金额的订单，而后台「总营收」正是 SUM(orders.total)。
//     （注意：本轮仍未加登录态，username 依然由前端明文提供，见计划里「明确不做」一节。）
app.post('/api/cart/checkout', async (req, res) => {
    try {
        const { username, totalPrice, address, phone } = req.body;
        if (!username) return res.status(400).json({ success: false, message: '缺少用户名' });

        const items = await db.getCartByUsername(username);   // 已含 quantity
        const computed = items.reduce(
            (sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 1), 0
        );
        const total = items.length ? computed : (Number(totalPrice) || 0);

        const order = await db.createOrder(username, total, { address, phone, items });
        await db.clearCart(username);
        await db.addLog(username, '支付', '订单结算');

        res.json({ success: true, orderId: order.id, total, count: items.length });
    } catch(e) {
        console.error('结算失败:', e);
        res.status(500).json({success:false, message: e.message});
    }
});

// 8. 用户查自己的订单（旧版只有 requireAdmin 的 /api/admin/orders，普通用户看不到自己的单）
// ⚠️ username 由前端明文提供、服务端不核验，与购物车/收藏是同一套信任模型。
//    演示够用，但这不是能上线的鉴权——见计划里「明确不做」一节。
app.get('/api/orders', async (req, res) => {
    const username = req.query.username;
    if (!username) return res.json({ orders: [] });
    try {
        res.json({ orders: await db.getOrdersByUsername(username) });
    } catch (e) {
        console.error('获取用户订单失败:', e);
        res.status(500).json({ error: '订单加载失败', message: e.message });
    }
});

app.get('/api/orders/:id', async (req, res) => {
    try {
        const order = await db.getOrderById(Number(req.params.id));
        // 404 只用于「确实没有这笔订单」；数据库故障必须报 500，
        // 否则前端会告诉你「订单不存在」，而真正坏掉的是 order_items 表。
        if (!order) return res.status(404).json({ error: 'Not found' });
        res.json(order);
    } catch (e) {
        console.error('获取订单详情失败:', e);
        res.status(500).json({ error: '订单加载失败', message: e.message });
    }
});

// 9. 用户资料（给「个人中心」用）
// 只回用户名和注册时间 —— 绝不能带上 password 字段。
// 对比 /api/admin/users-data：那个接口会把全部用户的 scrypt 哈希返回给浏览器，是个待修的隐患。
app.get('/api/user/profile', async (req, res) => {
    const username = req.query.username;
    if (!username) return res.status(400).json({ error: '缺少用户名' });
    try {
        const user = await db.getUserByUsername(username);
        if (!user) return res.status(404).json({ error: 'Not found' });
        res.json({ username: user.username, created_at: user.created_at });
    } catch (e) {
        res.status(404).json({ error: 'Not found' });
    }
});

// 10. 改密码
app.post('/api/user/change-password', async (req, res) => {
    try {
        const { username, oldPassword, newPassword } = req.body;
        if (!username || !oldPassword || !newPassword) {
            return res.status(400).json({ success: false, message: '参数不全' });
        }
        if (String(newPassword).length < 6) {
            return res.status(400).json({ success: false, message: '新密码至少 6 位' });
        }

        const user = await db.getUserByUsername(username);
        // verifyPassword 是同步方法，切勿加 await（返回 Promise 永远 truthy = 任意密码通过）
        if (!user || !db.verifyPassword(user.password, oldPassword)) {
            return res.status(401).json({ success: false, message: '原密码错误' });
        }

        await db.changePassword(username, newPassword);
        res.json({ success: true });
    } catch (e) {
        console.error('改密码失败:', e);
        res.status(500).json({ success: false, message: e.message });
    }
});

// 6. 清空日志 (Admin用)
app.post('/api/admin/clear', requireAdmin, async (req, res) => {
    try {
        await db.clearAllLogs();
        res.json({success:true});
    } catch(e) { res.status(500).json({success:false}); }
});

// ==========================================
// B. 后台统计接口 (核心功能)
// ==========================================

// 1. 获取仪表盘数据 (图表 + KPI)
app.get('/api/admin/stats', requireAdmin, async (req, res) => {
    try {
        // --- 第一步：获取数据 ---
        // 获取所有日志 (限制5000条用于分析)
        const logs = await db.getRecentLogs(5000);
        // 获取KPI数据
        const kpiStats = await db.getLatestStats();

        // --- 第二步：按日期聚合数据 (实现每日流量/日活) ---
        // 生成从今年1月1日到今天的日期列表（使用北京时间 UTC+8）
        const now = new Date();
        // 转换为北京时间 (UTC+8)
        const beijingNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
        const startOfYear = new Date(beijingNow.getFullYear(), 0, 1);
        const dateMap = new Map(); // Key: '2023-10-01', Value: { pv: 0, users: Set }

        // 初始化每一天的数据为0
        for (let d = new Date(startOfYear); d <= beijingNow; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            dateMap.set(dateStr, { pv: 0, users: new Set() });
        }

        // 遍历日志，填充数据
        logs.forEach(log => {
            if (log.created_at) {
                const dateStr = new Date(log.created_at).toISOString().split('T')[0];
                if (dateMap.has(dateStr)) {
                    const entry = dateMap.get(dateStr);
                    entry.pv += 1; // 流量+1
                    entry.users.add(log.username); // 用户名存入Set去重
                }
            }
        });

        // --- 第三步：转换格式给前端 ---
        const dateLabels = [];
        const dailyTraffic = [];
        const dailyActiveUsers = [];

        dateMap.forEach((val, key) => {
            // 将 '2023-10-01' 转为 '10-1'
            const [y, m, d] = key.split('-');
            dateLabels.push(`${parseInt(m)}-${parseInt(d)}`);
            dailyTraffic.push(val.pv);
            dailyActiveUsers.push(val.users.size);
        });

        // --- 第四步：计算行为分布 ---
        let actionDist = [0, 0, 0, 0]; // 浏览, 加购, 支付, 其他
        logs.forEach(l => {
            const act = l.action || '';
            if (act.includes('浏览')) actionDist[0]++;
            else if (act.includes('加入') || act.includes('购物车')) actionDist[1]++;
            else if (act.includes('支付') || act.includes('结算')) actionDist[2]++;
            else actionDist[3]++;
        });

        // --- 第五步：计算热门商品 ---
        const prodCount = {};
        logs.forEach(l => {
            if(l.product) prodCount[l.product] = (prodCount[l.product] || 0) + 1;
        });
        const topProducts = Object.entries(prodCount)
            .sort((a,b) => b[1] - a[1])
            .slice(0, 5);

        // --- 第六步：返回结果 ---
        res.json({
            kpi: {
                revenue: kpiStats.total_revenue,
                orders: kpiStats.total_orders,
                visits: logs.length,
                activeUsers: new Set(logs.map(l => l.username)).size
            },
            charts: {
                dateLabels,        // 日期标签 ['1-1', '1-2'...]
                dailyTraffic,      // 每日PV
                dailyActiveUsers,  // 每日UV
                actionDistribution: actionDist,
                topProducts
            },
            // 只返回最新50条日志给前端列表显示
            // 时间字段保持UTC时间，由前端进行时区转换
            logs: logs.slice(0, 50).map(l => ({
                time: l.created_at,
                username: l.username,
                action: l.action,
                product: l.product
            }))
        });

    } catch (err) {
        console.error("Admin stats error:", err);
        res.status(500).json({error: "Server Error"});
    }
});

// 2. 获取所有用户详细数据 (用于用户管理面板)
app.get('/api/admin/users-data', requireAdmin, async (req, res) => {
    try {
        const users = await db.getAllUsers();
        const carts = await db.getAllCarts();
        const favorites = await db.getAllFavorites();
        const logs = await db.getRecentLogs(200); // 最近活动取200条

        res.json({ users, carts, favorites, logs });
    } catch (e) {
        console.error("Users data error:", e);
        res.status(500).json({error: "Server Error"});
    }
});

// ==========================================
// C. 后台管理接口：商品 & 订单
// ==========================================

// 商品列表（含下架商品）
app.get('/api/admin/products', requireAdmin, async (req, res) => {
    try {
        res.json({ items: await db.getAllProducts(true) });
    } catch (e) {
        console.error('加载商品列表失败:', e);
        res.json({ items: [] });
    }
});

// 新增商品
app.post('/api/admin/products', requireAdmin, async (req, res) => {
    try {
        const { name, price, img, category } = req.body;
        const result = await db.createProduct({ name, price, img, category });
        res.json({ success: true, id: result.id });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// 编辑商品
app.put('/api/admin/products/:id', requireAdmin, async (req, res) => {
    try {
        const ok = await db.updateProduct(Number(req.params.id), req.body);
        ok ? res.json({ success: true }) : res.status(404).json({ success: false, message: '商品不存在' });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// 上下架
app.post('/api/admin/products/:id/toggle', requireAdmin, async (req, res) => {
    try {
        await db.setProductActive(Number(req.params.id), req.body.active);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// 删除商品
app.delete('/api/admin/products/:id', requireAdmin, async (req, res) => {
    try {
        await db.deleteProduct(Number(req.params.id));
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// 订单列表
app.get('/api/admin/orders', requireAdmin, async (req, res) => {
    try {
        res.json({ orders: await db.getAllOrders() });
    } catch (e) {
        console.error('加载订单失败:', e);
        res.json({ orders: [] });
    }
});

// 健康检查端点（Render 需要）
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// SPA 回退：非 /api 的 GET 一律交给前端（刷新页面、直接输网址都要能用）。
// 必须放在所有 API 路由之后，否则会把接口请求也吞掉（/health 就在上面，别提前注册）。
// 用负向前瞻排除 /api，比「靠注册顺序」更稳——日后有人在下面加接口也不会踩坑。
//
// 没有 dist 时的分支同样重要：那时所有非 /api 的 GET 都会掉进最后一个兜底中间件，
// 返回 {"error":"接口不存在"}。首页打不开却告诉你"接口不存在"，排查方向会被整个带偏——
// 真实原因是构建阶段没生成 dist（踩过的坑：NODE_ENV=production 让 npm install 跳过
// devDependencies，vite 没装上）。所以这里显式接管，把故障原样喊出来。
if (HAS_DIST) {
    app.get(/^\/(?!api\/).*/, (req, res) => {
        res.sendFile(path.join(DIST_DIR, 'index.html'));
    });
} else {
    app.get(/^\/(?!api\/).*/, (req, res) => {
        res.status(503).type('text/plain; charset=utf-8').send(
            '前端构建产物缺失：' + path.join(DIST_DIR, 'index.html') + ' 不存在。\n\n' +
            '后端与 /api 接口是正常的，只是页面没被构建出来。检查部署的构建阶段：\n' +
            '  1. 构建命令里有没有跑 `npm run build`（frontend 目录）；\n' +
            '  2. frontend 的依赖安装有没有带 --include=dev ——\n' +
            '     NODE_ENV=production 会让 npm 跳过 devDependencies，而 vite 就在里面。\n'
        );
    });
}

// 全局错误处理中间件
app.use((err, req, res, next) => {
    console.error('❌ 服务器错误:', err.stack);
    res.status(500).json({ error: '服务器内部错误', message: err.message });
});

// 404 处理
app.use((req, res) => {
    res.status(404).json({ error: '接口不存在' });
});

// 等待数据库就绪后启动服务器
const PORT = process.env.PORT || 3000;

dbReady.then(() => {
    console.log('✅ 数据库已就绪，启动服务器...');
    
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 服务器启动成功：http://localhost:${PORT}`);
        console.log(`📊 健康检查：http://localhost:${PORT}/health`);
    }).on('error', (err) => {
        console.error(' 服务器启动失败:', err);
        process.exit(1);
    });
}).catch(err => {
    console.error('❌ 数据库初始化失败，无法启动服务器:', err);
    process.exit(1);
});