// server.js - 云端最终版
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
// 关键：Render 会分配一个端口，如果没分配就用 3000
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ==========================================
// 👇 请确保这里是你自己的 Supabase 设置
const SUPABASE_URL = 'https://fulyzmmwivpwrvfofidy.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_miLBqFe78ez-ZTruWfF1Mw_C_fCC2Ui'; 
// ==========================================

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 1. 获取商品
app.get('/api/products', async (req, res) => {
    const { data, error } = await supabase.from('products').select('*').order('id');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// 2. 接收汇报
app.post('/api/report', async (req, res) => {
    const { user, action, detail } = req.body;
    await supabase.from('logs').insert({
        time: new Date().toLocaleTimeString(),
        user, action, detail
    });
    res.send({ status: 'ok' });
});

// 3. 管理员日志
app.get('/api/admin/logs', async (req, res) => {
    const { data } = await supabase.from('logs').select('*').order('id', { ascending: false }).limit(100);
    res.json(data || []);
});

// 4. 清空日志
app.post('/api/admin/clear', async (req, res) => {
    await supabase.from('logs').delete().gt('id', 0);
    res.send({ status: 'cleared' });
});

// 5. 健康检查
app.get('/', (req, res) => {
    res.send('Backend is running!');
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);

});
