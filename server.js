// server.js - 商务图表版
const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, '.')));

// ====================== 1. 数据存储 ======================
const MOCK_PRODUCTS = [
    { id: 1, name: "云端-高性能键盘", price: 599, desc: "全键无冲，手感极佳", img: "https://placehold.co/300x200/2c3e50/FFF?text=Keyboard" },
    { id: 2, name: "云端-无线耳机", price: 1299, desc: "降噪黑科技", img: "https://placehold.co/300x200/e74c3c/FFF?text=Headset" },
    { id: 3, name: "云端-电竞椅", price: 899, desc: "保护你的老腰", img: "https://placehold.co/300x200/3498db/FFF?text=Chair" },
    { id: 4, name: "云端-4K显示器", price: 2499, desc: "视网膜级清晰度", img: "https://placehold.co/300x200/9b59b6/FFF?text=Monitor" },
    { id: 5, name: "云端-智能手表", price: 1999, desc: "健康监测助手", img: "https://placehold.co/300x200/1abc9c/FFF?text=Watch" },
    { id: 6, name: "云端-机械鼠标", price: 399, desc: "指哪打哪", img: "https://placehold.co/300x200/f1c40f/FFF?text=Mouse" },
    { id: 7, name: "云端-VR眼镜", price: 3499, desc: "进入虚拟世界", img: "https://placehold.co/300x200/d35400/FFF?text=VR" },
    { id: 8, name: "云端-游戏手柄", price: 299, desc: "震动反馈细腻", img: "https://placehold.co/300x200/7f8c8d/FFF?text=Gamepad" }
];

const users = [];
let userCarts = {}; 
// 增加日志上限到 500 条，以便图表更好看
let browseLogs = []; 
// 全局统计变量
let totalRevenue = 0; 
let totalOrders = 0;

// ====================== 2. 核心接口 ======================

app.get('/api/products', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 4;
    res.json({
        items: MOCK_PRODUCTS.slice((page - 1) * limit, page * limit),
        total: MOCK_PRODUCTS.length,
        page: page,
        totalPages: Math.ceil(MOCK_PRODUCTS.length / limit)
    });
});

app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    if (users.find(u => u.username === username)) return res.status(400).json({ success: false, message: '用户已存在' });
    users.push({ username, password });
    res.json({ success: true });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);
    if (user) res.json({ success: true, username: user.username });
    else res.status(401).json({ success: false, message: '账号或密码错误' });
});

// --- 购物车相关 ---
app.post('/api/cart/add', (req, res) => {
    const { username, product } = req.body;
    if (!userCarts[username]) userCarts[username] = [];
    userCarts[username].push(product);
    addLog(username, '加入购物车', product.name);
    res.json({ success: true, count: userCarts[username].length });
});

app.get('/api/cart', (req, res) => {
    const { username } = req.query;
    res.json(userCarts[username] || []);
});

app.post('/api/cart/remove', (req, res) => {
    const { username, index } = req.body;
    if (userCarts[username]) {
        userCarts[username].splice(index, 1);
    }
    res.json({ success: true });
});

app.post('/api/cart/checkout', (req, res) => {
    const { username, totalPrice } = req.body;
    // 累加销售额
    totalRevenue += parseFloat(totalPrice);
    totalOrders += 1;
    
    if (userCarts[username]) userCarts[username] = [];
    addLog(username, '完成支付', `总额 ¥${totalPrice}`);
    res.json({ success: true });
});

// --- 监控与埋点 ---
function addLog(username, action, product) {
    const now = new Date();
    const newLog = {
        id: Date.now(),
        username: username || '游客',
        action: action,
        product: product || '-',
        time: now.toLocaleString(),
        timestamp: now.getTime(), // 用于时间排序
        ip: '10.0.0.1' // 模拟IP
    };
    browseLogs.unshift(newLog);
    if (browseLogs.length > 500) browseLogs = browseLogs.slice(0, 500);
}

app.post('/api/track', (req, res) => {
    const { username, action, product } = req.body;
    addLog(username, action, product);
    res.json({ success: true });
});

// 【重点新增】图表统计专用接口
app.get('/api/admin/stats', (req, res) => {
    // 1. 24小时流量趋势 (按小时分组)
    const trafficData = new Array(24).fill(0);
    const now = new Date();
    browseLogs.forEach(log => {
        const logTime = new Date(log.timestamp);
        // 如果是24小时内的日志
        if (now - logTime < 24 * 60 * 60 * 1000) {
            trafficData[logTime.getHours()]++;
        }
    });

    // 2. 热门商品 (统计加入购物车和浏览次数)
    const productCount = {};
    browseLogs.forEach(log => {
        if (log.product !== '-' && !log.product.includes('总额')) {
            productCount[log.product] = (productCount[log.product] || 0) + 1;
        }
    });
    // 排序取前5
    const topProducts = Object.entries(productCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    // 3. 用户行为分布
    const actionStats = { '浏览': 0, '加购': 0, '支付': 0, '其他': 0 };
    browseLogs.forEach(log => {
        if (log.action.includes('浏览')) actionStats['浏览']++;
        else if (log.action.includes('加入')) actionStats['加购']++;
        else if (log.action.includes('支付')) actionStats['支付']++;
        else actionStats['其他']++;
    });

    res.json({
        kpi: {
            revenue: totalRevenue,
            orders: totalOrders,
            visits: browseLogs.length,
            activeUsers: new Set(browseLogs.map(l => l.username)).size
        },
        charts: {
            hourlyTraffic: trafficData, // 数组 [0,0,5,10...]
            topProducts: topProducts,   // [['键盘', 10], ['鼠标', 5]]
            actionDistribution: Object.values(actionStats) // [100, 20, 5, 2]
        },
        logs: browseLogs.slice(0, 10) // 只返回最近10条给表格
    });
});

app.post('/api/admin/clear', (req, res) => {
    browseLogs = [];
    totalRevenue = 0;
    totalOrders = 0;
    res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { console.log(`Server running on port ${PORT}`); });
