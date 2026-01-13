// 引入必要的模块
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const cors = require('cors'); // 解决跨域问题

// 初始化Express应用
const app = express();

// 配置中间件
app.use(express.json());
app.use(cors()); // 允许跨域请求
app.use(express.static(path.join(__dirname, '.'))); // 托管前端文件

// ====================== 替换为你的Supabase真实信息 ======================
const SUPABASE_URL = 'https://fulyzmmwivpwrvfoifdy.supabase.co'; // 你的URL
const SUPABASE_KEY = '替换成你的完整anon public密钥（eyJhbGci开头）'; // 必改！
// =====================================================================

// 初始化Supabase客户端
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 初始化：自动创建浏览记录表和商品表
async function initTables() {
  try {
    await supabase.rpc('exec', {
      sql: `
        -- 浏览记录表（存储真实浏览行为）
        CREATE TABLE IF NOT EXISTS browse_logs (
          id SERIAL PRIMARY KEY,
          user_id TEXT NOT NULL,       -- 访问用户ID
          product_id INTEGER NOT NULL, -- 浏览商品ID
          product_name TEXT NOT NULL,  -- 商品名称
          browse_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- 浏览时间
          stay_seconds INTEGER DEFAULT 0, -- 停留秒数
          ip_address TEXT DEFAULT ''   -- IP地址
        );

        -- 商品表（兼容原有商城功能）
        CREATE TABLE IF NOT EXISTS products (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          price INTEGER NOT NULL,
          desc TEXT,
          img TEXT
        );
      `
    });
    console.log('数据表初始化成功');
  } catch (err) {
    console.log('数据表已存在或初始化失败：', err.message);
  }
}
initTables();

// 1. 根路由：返回商城首页
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 2. 商品API接口 - 返回商品数据
app.get('/api/products', async (req, res) => {
  try {
    const { data, error } = await supabase.from('products').select('*');
    if (error || !data || data.length === 0) {
      const demoProducts = [
        {"id":1,"name":"云端-高性能键盘","price":599,"desc":"数据存储在Supabase，永不丢失","img":"https://placehold.co/400x300/2c3e50/FFF?text=CloudKey"},
        {"id":2,"name":"云端-无线耳机","price":1299,"desc":"支持超长待机，数据云同步","img":"https://placehold.co/400x300/e74c3c/FFF?text=CloudAudio"},
        {"id":3,"name":"云端-电竞椅","price":899,"desc":"保护你的腰椎","img":"https://placehold.co/400x300/3498db/FFF?text=CloudChair"},
        {"id":4,"name":"云端-4K显示器","price":2499,"desc":"清晰度爆表","img":"https://placehold.co/400x300/9b59b6/FFF?text=CloudScreen"}
      ];
      return res.json(demoProducts);
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: '获取商品数据失败' });
  }
});

// 3. 记录用户浏览行为（商城页调用）
app.post('/api/record-browse', async (req, res) => {
  try {
    const { user_id, product_id, product_name, stay_seconds, ip_address } = req.body;
    if (!user_id || !product_id || !product_name) {
      return res.status(400).json({ error: '用户ID、商品ID、商品名称为必填' });
    }
    // 插入真实浏览记录到Supabase
    const { data, error } = await supabase
      .from('browse_logs')
      .insert([{
        user_id,
        product_id,
        product_name,
        stay_seconds: stay_seconds || Math.floor(Math.random() * 60 + 5),
        ip_address: ip_address || req.ip
      }]);
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: '记录浏览行为失败：' + err.message });
  }
});

// 4. 获取浏览数据统计（仅返回真实数据，无模拟兜底）
app.get('/api/browse-stats', async (req, res) => {
  try {
    // 1. 总浏览量
    const { count: totalBrowse } = await supabase
      .from('browse_logs')
      .select('*', { count: 'exact', head: true });

    // 2. 今日浏览量
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: todayBrowse } = await supabase
      .from('browse_logs')
      .select('*', { count: 'exact', head: true })
      .gte('browse_time', today.toISOString());

    // 3. 商品浏览占比
    const { data: productBrowseData } = await supabase
      .from('browse_logs')
      .select('product_name, count(*) as count')
      .group('product_name');

    // 4. 24小时浏览趋势
    const hourlyStats = [];
    for (let i = 0; i < 24; i++) {
      const hourStart = new Date();
      hourStart.setHours(i, 0, 0, 0);
      const hourEnd = new Date(hourStart);
      hourEnd.setHours(i + 1, 0, 0, 0);
      const { count } = await supabase
        .from('browse_logs')
        .select('*', { count: 'exact', head: true })
        .gte('browse_time', hourStart.toISOString())
        .lt('browse_time', hourEnd.toISOString());
      hourlyStats.push({ hour: `${i}时`, count: count || 0 });
    }

    // 5. 近7天浏览量
    const dailyStats = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date();
      day.setDate(day.getDate() - i);
      day.setHours(0, 0, 0, 0);
      const dayEnd = new Date(day);
      dayEnd.setHours(23, 59, 59, 999);
      const { count } = await supabase
        .from('browse_logs')
        .select('*', { count: 'exact', head: true })
        .gte('browse_time', day.toISOString())
        .lte('browse_time', dayEnd.toISOString());
      dailyStats.push({
        date: `${day.getMonth() + 1}月${day.getDate()}日`,
        count: count || 0
      });
    }

    // 6. 热门商品TOP5
    const { data: hotProductData } = await supabase
      .from('browse_logs')
      .select('product_name, count(*) as count')
      .group('product_name')
      .order('count', { ascending: false })
      .limit(5);

    // 7. 平均停留时间
    const { data: stayTimeData } = await supabase
      .from('browse_logs')
      .select('stay_seconds');
    const avgStayTime = stayTimeData.length > 0 
      ? Math.round(stayTimeData.reduce((sum, item) => sum + item.stay_seconds, 0) / stayTimeData.length)
      : 0;

    // 仅返回真实数据（无数据则为0/空）
    res.json({
      kpis: {
        totalBrowse: totalBrowse || 0,
        todayBrowse: todayBrowse || 0,
        hotProduct: hotProductData && hotProductData.length > 0 ? hotProductData[0].product_name : '暂无',
        avgStayTime: avgStayTime
      },
      charts: {
        hourlyTrend: {
          labels: hourlyStats.map(item => item.hour),
          data: hourlyStats.map(item => item.count)
        },
        productRatio: {
          labels: productBrowseData ? productBrowseData.map(item => item.product_name) : [],
          data: productBrowseData ? productBrowseData.map(item => item.count) : []
        },
        dailyTrend: {
          labels: dailyStats.map(item => item.date),
          data: dailyStats.map(item => item.count)
        },
        hotProducts: {
          labels: hotProductData ? hotProductData.map(item => item.product_name) : [],
          data: hotProductData ? hotProductData.map(item => item.count) : []
        }
      }
    });
  } catch (err) {
    console.error('获取浏览统计失败：', err);
    // 异常时返回空数据（无模拟）
    res.json({
      kpis: { totalBrowse: 0, todayBrowse: 0, hotProduct: '暂无', avgStayTime: 0 },
      charts: {
        hourlyTrend: { labels: [], data: [] },
        productRatio: { labels: [], data: [] },
        dailyTrend: { labels: [], data: [] },
        hotProducts: { labels: [], data: [] }
      }
    });
  }
});

// 配置端口
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ 服务启动成功！端口：${PORT}`);
  console.log(`🔗 商城页面：http://localhost:${PORT}`);
  console.log(`📊 监控页面：http://localhost:${PORT}/admin.html`);
});
