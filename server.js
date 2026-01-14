// server.js
const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, '.')));

// ====================== 数据存储 ======================

// 商品数据
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
let browseLogs = [];

// 【新增】购物车存储结构: { "username1": [商品A, 商品B], "username2": [] }
let userCarts = {}; 

// ====================== 接口 API ======================

app.get('/api/products', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 4;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    res.json({
        items: MOCK_PRODUCTS.slice(startIndex, endIndex),
        total: MOCK_PRODUCTS.length,
        page: page,
        totalPages: Math.ceil(MOCK_PRODUCTS.length / limit)
    });
});

app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    if (users.find(u => u.username === username)) return res.status(400).json({ success: false, message: '用户已存在' });
    users.push({ username, password });
    res.json({ success: true, message: '注册成功' });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);
    if (user) res.json({ success: true, username: user.username });
    else res.status(401).json({ success: false, message: '账号或密码错误' });
});

// --- 【新增】购物车接口 ---

// 1. 添加到购物车
app.post('/api/cart/add', (req, res) => {
    const { username, product } = req.body;
    if (!username) return res.status(401).json({ error: '未登录' });
    
    if (!userCarts[username]) userCarts[username] = [];
    userCarts[username].push(product);
    
    // 顺便记录一下监控日志
    addLog(username, '加入购物车', product.name);
    
    res.json({ success: true, count: userCarts[username].length });
});

// 2. 获取购物车列表
app.get('/api/cart', (req, res) => {
    const { username } = req.query;
    const list = userCarts[username] || [];
    res.json(list);
});

// 3. 移除商品（简单版：根据索引移除）
app.post('/api/cart/remove', (req, res) => {
    const { username, index } = req.body;
    if (userCarts[username]) {
        const removed = userCarts[username].splice(index, 1);
        addLog(username, '移除商品', removed[0]?.name || '-');
    }
    res.json({ success: true });
});

// 4. 结账（清空购物车）
app.post('/api/cart/checkout', (req, res) => {
    const { username, totalPrice } = req.body;
    if (userCarts[username]) {
        userCarts[username] = []; // 清空
        addLog(username, '完成支付', `总额 ¥${totalPrice}`);
    }
    res.json({ success: true });
});

// --- 监控相关 ---
function addLog(username, action, product) {
    const newLog = {
        id: Date.now(),
        username: username || '游客',
        action: action,
        product: product || '-',
        time: new Date().toLocaleString(),
        ip: '127.0.0.1'
    };
    browseLogs.unshift(newLog);
    if (browseLogs.length > 50) browseLogs = browseLogs.slice(0, 50);
}

app.post('/api/track', (req, res) => {
    const { username, action, product } = req.body;
    addLog(username, action, product);
    res.json({ success: true });
});

app.get('/api/admin/logs', (req, res) => res.json(browseLogs));
app.post('/api/admin/clear', (req, res) => { browseLogs = []; res.json({ success: true }); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { console.log(`Server running on port ${PORT}`); });
