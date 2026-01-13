// 引入必要的模块
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const path = require('path'); // 新增：用于处理文件路径

// 初始化Express应用
const app = express();

// 配置JSON解析（处理POST请求等）
app.use(express.json());

// 新增：配置静态文件服务，托管前端的HTML/CSS/JS等文件
app.use(express.static(path.join(__dirname, '.')));

// 配置Supabase（替换成你自己的URL和KEY）
const SUPABASE_URL = 'https://fulyzmmwivpwrvfoifdy.supabase.co'; // 你的Supabase URL
const SUPABASE_KEY = 'sb_publishable_miLBqFe78ez-ZTruWfF1Mw_C_fCC2Ui'; // 替换成自己的密钥
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 新增：根路径路由 - 访问域名时直接返回前端首页index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 商品API接口 - 返回商品数据
app.get('/api/products', async (req, res) => {
  try {
    // 从Supabase获取商品数据（如果数据库有数据会自动读取，这里保留示例数据兜底）
    const { data, error } = await supabase
      .from('products') // 假设你的Supabase表名是products
      .select('*');

    // 如果数据库读取失败/无数据，返回示例商品数据
    if (error || !data || data.length === 0) {
      const demoProducts = [
        {"id":1,"name":"云端-高性能键盘","price":599,"desc":"数据存储在Supabase，永不丢失","img":"https://placehold.co/400x300/2c3e50/FFF?text=CloudKey"},
        {"id":2,"name":"云端-无线耳机","price":1299,"desc":"支持超长待机，数据云同步","img":"https://placehold.co/400x300/e74c3c/FFF?text=CloudAudio"},
        {"id":3,"name":"云端-电竞椅","price":899,"desc":"保护你的腰椎","img":"https://placehold.co/400x300/3498db/FFF?text=CloudChair"},
        {"id":4,"name":"云端-4K显示器","price":2499,"desc":"清晰度爆表","img":"https://placehold.co/400x300/9b59b6/FFF?text=CloudScreen"}
      ];
      return res.json(demoProducts);
    }

    // 数据库有数据则返回真实数据
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: '获取商品数据失败' });
  }
});

// 配置端口（Render自动分配或本地3000）
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

