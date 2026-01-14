// server.js
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const cors = require('cors');

const app = express();

app.use(express.json());
app.use(cors());
// 托管静态文件 (HTML, CSS)
app.use(express.static(path.join(__dirname, '.')));

// ====================== 模拟数据 (当Supabase没配置时使用) ======================
// 为了演示分页，我们需要至少8个商品
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

// 简易内存用户库 (重启服务器后会清空，演示用)
const users = [];

// ====================== Supabase 配置 (可选) ======================
const SUPABASE_URL = 'https://fulyzmmwivpwrvfoifdy.supabase.co';
const SUPABASE_KEY = 'YOUR_SUPABASE_KEY_HERE'; // 请填入你的Key，如果不填则使用Mock数据
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ====================== 接口 API ======================

// 1. 获取商品列表 (支持分页 ?page=1)
app.get('/api/products', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 4; // 每页显示4个

    try {
        let allProducts = MOCK_PRODUCTS;
        
        // 尝试从Supabase获取 (如果配置了Key)
        if (SUPABASE_KEY !== 'YOUR_SUPABASE_KEY_HERE') {
            const { data, error } = await supabase.from('products').select('*');
            if (!error && data && data.length > 0) {
                allProducts = data;
            }
        }

        // 计算分页
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        const paginatedItems = allProducts.slice(startIndex, endIndex);

        res.json({
            items: paginatedItems,
            total: allProducts.length,
            page: page,
            totalPages: Math.ceil(allProducts.length / limit)
        });

    } catch (err) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// 2. 注册接口
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    if (users.find(u => u.username === username)) {
        return res.status(400).json({ success: false, message: '用户已存在' });
    }
    users.push({ username, password });
    res.json({ success: true, message: '注册成功' });
});

// 3. 登录接口
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
        res.json({ success: true, username: user.username });
    } else {
        res.status(401).json({ success: false, message: '账号或密码错误' });
    }
});

// 4. 记录浏览行为
app.post('/api/record-browse', async (req, res) => {
    // 这里保持你原来的逻辑，简单返回成功，防止前端报错
    console.log("记录浏览:", req.body);
    res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
