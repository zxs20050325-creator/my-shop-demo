// server.js - 完整版 (已修正云端北京时间时区问题)
const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, '.')));

// ====================== 1. 数据存储 (保持不变) ======================
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
let browseLogs = []; 
let totalRevenue = 0; 
let totalOrders = 0;

// ====================== 2. 核心接口 (保持不变) ======================

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

// --- 购物车相关 (保持不变) ---
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
    totalRevenue += parseFloat(totalPrice);
    totalOrders += 1;
    if (userCarts[username]) userCarts[username] = [];
    addLog(username, '完成支付', `总额 ¥${totalPrice}`);
    res.json({ success: true });
});

// --- 监控与埋点 (保持不变) ---
function addLog(username, action, product) {
    const now = new Date();
    const newLog = {
        id: Date.now(),
        username: username || '游客',
        action: action,
        product: product || '-',
        time: now.toLocaleString(), // 这个本地时间仅供参考，统计时会用 timestamp 重算
        timestamp: now.getTime(), 
        ip: '10.0.0.1' 
    };
    browseLogs.unshift(newLog);
    if (browseLogs.length > 500) browseLogs = browseLogs.slice(0, 500);
}

app.post('/api/track', (req, res) => {
    const { username, action, product } = req.body;
    addLog(username, action, product);
    res.json({ success: true });
});

// ====================== 【仅修改此处】图表统计专用接口 ======================
// 增加了 +8 小时偏移量，强制云端显示为北京时间
app.get('/api/admin/stats', (req, res) => {
    // 1. 24小时流量趋势 (修正为北京时间)
    const trafficData = new Array(24).fill(0);
    const now = new Date(); // 服务器时间 (UTC)

    browseLogs.forEach(log => {
        // 将日志时间戳 + 8小时
        const cnTime = new Date(log.timestamp + 8 * 3600000);
        
        // 简单逻辑：直接取修正后的小时数落位
        const hour = cnTime.getUTCHours(); 
        trafficData[hour]++;
    });

    // 2. 热门商品 (逻辑不变)
    const productCount = {};
    browseLogs.forEach(log => {
        if (log.product !== '-' && !log.product.includes('总额')) {
            productCount[log.product] = (productCount[log.product] || 0) + 1;
        }
    });
    const topProducts = Object.entries(productCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    // 3. 用户行为分布 (逻辑不变)
    const actionStats = { '浏览': 0, '加购': 0, '支付': 0, '其他': 0 };
    browseLogs.forEach(log => {
        if (log.action.includes('浏览')) actionStats['浏览']++;
        else if (log.action.includes('加入')) actionStats['加购']++;
        else if (log.action.includes('支付')) actionStats['支付']++;
        else actionStats['其他']++;
    });

    // 4. 处理日志显示时间 (修正为北京时间字符串)
    const formattedLogs = browseLogs.slice(0, 10).map(log => {
        const cnTime = new Date(log.timestamp + 8 * 3600000);
        // 手动拼接成 YYYY-MM-DD HH:mm:ss 格式，确保表格显示对的时间
        const timeStr = cnTime.toISOString().replace('T', ' ').substring(0, 19);
        return {
            ...log,
            time: timeStr // 覆盖原本的 time 字段
        };
    });

    res.json({
        kpi: {
            revenue: totalRevenue,
            orders: totalOrders,
            visits: browseLogs.length,
            activeUsers: new Set(browseLogs.map(l => l.username)).size
        },
        charts: {
            hourlyTraffic: trafficData, 
            topProducts: topProducts,   
            actionDistribution: Object.values(actionStats) 
        },
        logs: formattedLogs
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
