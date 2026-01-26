// server.js - 最终完整版 (含数据过滤 + 冀遗筑梦商品 + 北京时间)
const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, '.')));

// ====================== 1. 数据存储 ======================
const MOCK_PRODUCTS = [
    // 第一页
    { id: 1, name: "【镇店之宝】冀州古韵·微缩避暑山庄", price: 399, desc: "皇家园林典范，缩尺还原山水之间，承载千年古建智慧。", img: "images/001.jpg" },
    { id: 2, name: "【非遗国礼】蔚县剪纸·百鸟朝凤", price: 168, desc: "世界非遗技艺，刀刻彩染，色彩明艳，寓意吉祥如意。", img: "images/002.jpg" },
    { id: 3, name: "【镇宅神兽】沧州铁狮·铸铁摆件", price: 299, desc: "威武雄壮，镇海吼缩影，象征力量与守护，燕赵雄风。", img: "images/003.jpg" },
    { id: 4, name: "【白如玉】曲阳定窑·刻花梅瓶", price: 899, desc: "千年定瓷，白如玉薄如纸，手工刻花，尽显宋韵素雅。", img: "images/004.jpg" },
    { id: 5, name: "【光影传奇】唐山皮影·传统礼盒", price: 128, desc: "一口叙说千古事，双手对舞百万兵，光影间的民间艺术。", img: "images/005.jpg" },
    { id: 6, name: "【古城印记】正定记忆·浮雕砖刻", price: 268, desc: "复刻古城墙纹理，抚摸历史的痕迹，自在正定，文化传承。", img: "images/006.jpg" },
    // 第二页
    { id: 7, name: "【文房至宝】易水古砚·雕龙画凤", price: 688, desc: "南有端砚，北有易水。石质细腻，发墨如油，文人雅士首选。", img: "images/101.jpg" },
    { id: 8, name: "【新春纳福】武强年画·连年有余", price: 88, desc: "中国木版年画之乡，色彩浓烈，线条粗犷，不仅是画，更是福气。", img: "images/102.jpg" },
    { id: 9, name: "【皇家工艺】花丝镶嵌·鎏金首饰盒", price: 1299, desc: "燕京八绝之一，细如发丝，堆垒编织，尽显宫廷奢华技艺。", img: "images/103.jpg" },
    { id: 10, name: "【掌中乾坤】衡水内画·水晶鼻烟壶", price: 568, desc: "鬼斧神工，寸幅之地具千里之势，集诗书画印于一壶。", img: "images/104.jpg" },
    { id: 11, name: "【民间艺术】玉田泥塑·萌趣生肖", price: 68, desc: "乡土气息浓郁，造型夸张可爱，唤醒儿时的快乐记忆。", img: "images/105.jpg" },
    { id: 12, name: "【民间绝响】抚宁吹歌·乐器模型", price: 328, desc: "唢呐一响，黄金万两。非遗吹歌文化，传承民族之音。", img: "images/106.jpg" }
];

const users = [];
let userCarts = {}; 
let browseLogs = []; 
let totalRevenue = 0; 
let totalOrders = 0;

// ====================== 2. 核心接口 ======================

app.get('/api/products', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 6; 
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

// --- 购物车 ---
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

// --- 监控 ---
function addLog(username, action, product) {
    const now = new Date();
    const newLog = {
        id: Date.now(),
        username: username || '游客',
        action: action,
        product: product || '-',
        time: now.toLocaleString(),
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

// --- 图表接口 (改动重点：数据过滤) ---
app.get('/api/admin/stats', (req, res) => {
    // 1. 流量趋势
    const trafficData = new Array(24).fill(0);
    browseLogs.forEach(log => {
        const cnTime = new Date(log.timestamp + 8 * 3600000);
        const hour = cnTime.getUTCHours(); 
        trafficData[hour]++;
    });

    // 2. 热门商品 (过滤非商品的操作)
    const productCount = {};
    browseLogs.forEach(log => {
        // 排除掉：没名字的、包含"总额"的、包含"第x页"的、包含"列表"的
        if (log.product !== '-' 
            && !log.product.includes('总额')
            && !log.product.includes('页')
            && !log.product.includes('列表')
            && !log.product.includes('首页')
        ) {
            productCount[log.product] = (productCount[log.product] || 0) + 1;
        }
    });
    const topProducts = Object.entries(productCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    // 3. 行为分布
    const actionStats = { '浏览': 0, '加购': 0, '支付': 0, '其他': 0 };
    browseLogs.forEach(log => {
        if (log.action.includes('浏览')) actionStats['浏览']++;
        else if (log.action.includes('加入')) actionStats['加购']++;
        else if (log.action.includes('支付')) actionStats['支付']++;
        else actionStats['其他']++;
    });

    const formattedLogs = browseLogs.slice(0, 10).map(log => {
        const cnTime = new Date(log.timestamp + 8 * 3600000);
        const timeStr = cnTime.toISOString().replace('T', ' ').substring(0, 19);
        return { ...log, time: timeStr };
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
