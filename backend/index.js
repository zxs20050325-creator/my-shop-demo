// index.js - 后端服务完整版
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// 静态文件服务
app.use('/images', express.static(path.join(__dirname, 'public', 'images')));
app.use('/frontend', express.static(path.join(__dirname, '..', 'frontend')));

// 根路径重定向到前台首页（部署后可直接访问根域名）
app.get('/', (req, res) => res.redirect('/frontend/index.html'));

// 后台管理入口（与前台分离的独立路径，便于区分前后台）
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, '..', 'frontend', 'admin.html')));

// 引入数据库模块
const db = require('./db');

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
app.get('/api/products', (req, res) => {
    const items = db.getAllProducts(false); // 只返回已上架商品
    res.json({ items });
});

app.get('/api/products/:id', (req, res) => {
    const p = db.getProductById(Number(req.params.id));
    if (p && p.active === 1) return res.json(p);
    res.status(404).json({ error: 'Not found' });
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
app.get('/api/cart', (req, res) => {
    const username = req.query.username;
    if (!username) return res.json({ items: [] });
    res.json({ items: db.getCartByUsername(username) });
});

app.get('/api/favorites', (req, res) => {
    const username = req.query.username;
    if (!username) return res.json({ items: [] });
    res.json({ items: db.getFavoritesByUsername(username) });
});

// 6. 从购物车移除（前端 cart.html 调用）
app.post('/api/cart/remove', async (req, res) => {
    try {
        const { username, index } = req.body;
        await db.removeFromCart(username, index);
        res.json({success:true});
    } catch(e) { res.status(500).json({success:false}); }
});

// 7. 结算（前端 cart.html 调用）：记录订单 + 清空购物车 + 记录支付行为
app.post('/api/cart/checkout', async (req, res) => {
    try {
        const { username, totalPrice } = req.body;
        await db.createOrder(username, totalPrice);
        await db.clearCart(username);
        await db.addLog(username, '支付', '订单结算');
        res.json({success:true});
    } catch(e) { res.status(500).json({success:false}); }
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
app.get('/api/admin/products', requireAdmin, (req, res) => {
    res.json({ items: db.getAllProducts(true) });
});

// 新增商品
app.post('/api/admin/products', requireAdmin, (req, res) => {
    try {
        const { name, price, img, category } = req.body;
        const result = db.createProduct({ name, price, img, category });
        res.json({ success: true, id: result.id });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// 编辑商品
app.put('/api/admin/products/:id', requireAdmin, (req, res) => {
    try {
        const ok = db.updateProduct(Number(req.params.id), req.body);
        ok ? res.json({ success: true }) : res.status(404).json({ success: false, message: '商品不存在' });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// 上下架
app.post('/api/admin/products/:id/toggle', requireAdmin, (req, res) => {
    try {
        db.setProductActive(Number(req.params.id), req.body.active);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// 删除商品
app.delete('/api/admin/products/:id', requireAdmin, (req, res) => {
    try {
        db.deleteProduct(Number(req.params.id));
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// 订单列表
app.get('/api/admin/orders', requireAdmin, (req, res) => {
    res.json({ orders: db.getAllOrders() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running: http://localhost:${PORT}`));
