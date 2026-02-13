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

// 引入数据库模块
const db = require('./db');

// 静态商品数据 (用于前台展示)
const MOCK_PRODUCTS = [
    { id: 1, name: "冀筑华塔微藏盒", price: 198, img: "/images/001.jpg", category: "数字藏品" },
    { id: 2, name: "赵州桥榫卯奇盒", price: 88, img: "/images/002.jpg", category: "文创周边" },
    { id: 3, name: "承德御苑宸景盒", price: 328, img: "/images/003.jpg", category: "数字画作" },
    { id: 4, name: "山海关雄关守盒", price: 999, img: "/images/004.jpg", category: "典藏精品" },
    { id: 5, name: "隆兴寺禅筑臻盒", price: 58, img: "/images/005.jpg", category: "非遗手作" },
    { id: 6, name: "开元寺塔料敌盒", price: 168, img: "/images/006.jpg", category: "非遗手作" },
    { id: 7, name: "清西陵宫阙雅盒", price: 258, img: "/images/007.jpg", category: "数字藏品" },
    { id: 8, name: "娲皇宫悬楼秘盒", price: 128, img: "/images/008.jpg", category: "文创周边" },
    { id: 9, name: "古莲花池苑趣盒", price: 298, img: "/images/009.jpg", category: "数字画作" },
    { id: 10, name: "紫荆关燕塞筑盒", price: 888, img: "/images/010.jpg", category: "典藏精品" },
    { id: 11, name: "广府古城围合盒", price: 78, img: "/images/011.jpg", category: "非遗手作" },
    { id: 12, name: "外八庙梵筑珍盒", price: 188, img: "/images/012.jpg", category: "非遗手作" }
];

// ==========================================
// A. 前台业务接口
// ==========================================

// 1. 获取商品
app.get('/api/products', (req, res) => res.json({ items: MOCK_PRODUCTS }));
app.get('/api/products/:id', (req, res) => {
    const p = MOCK_PRODUCTS.find(i => i.id == req.params.id);
    p ? res.json(p) : res.status(404).json({error: 'Not found'});
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
        if(user && user.password === password) res.json({success:true});
        else res.status(401).json({success:false});
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

// 6. 清空日志 (Admin用)
app.post('/api/admin/clear', async (req, res) => {
    try {
        await db.clearAllLogs();
        res.json({success:true});
    } catch(e) { res.status(500).json({success:false}); }
});

// ==========================================
// B. 后台统计接口 (核心功能)
// ==========================================

// 1. 获取仪表盘数据 (图表 + KPI)
app.get('/api/admin/stats', async (req, res) => {
    try {
        // --- 第一步：获取数据 ---
        // 获取所有日志 (限制5000条用于分析)
        const logs = await db.getRecentLogs(5000);
        // 获取KPI数据
        const kpiStats = await db.getLatestStats();

        // --- 第二步：按日期聚合数据 (实现每日流量/日活) ---
        // 生成从今年1月1日到今天的日期列表
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const dateMap = new Map(); // Key: '2023-10-01', Value: { pv: 0, users: Set }

        // 初始化每一天的数据为0
        for (let d = new Date(startOfYear); d <= now; d.setDate(d.getDate() + 1)) {
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