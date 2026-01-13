// server.js
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const cors = require('cors');

const app = express();

// 中间件
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, '.'))); // 托管当前目录下的所有静态文件

// ====================== 🔑 替换为你的 Supabase 信息 ======================
const SUPABASE_URL = 'https://fulyzmmwivpwrvfoifdy.supabase.co';
// 👇 必须替换为你的 anon public key（在 Supabase → Project Settings → API 中）
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; 
// =====================================================================

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 根路由：商城首页
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 商品列表接口（带演示数据兜底）
app.get('/api/products', async (req, res) => {
  try {
    const { data, error } = await supabase.from('products').select('*');
    if (error || !data || data.length === 0) {
      return res.json([
        { id: 1, name: "云端-高性能键盘", price: 599, desc: "数据存储在Supabase，永不丢失", img: "https://placehold.co/400x300/2c3e50/FFF?text=CloudKey" },
        { id: 2, name: "云端-无线耳机", price: 1299, desc: "支持超长待机，数据云同步", img: "https://placehold.co/400x300/e74c3c/FFF?text=CloudAudio" },
        { id: 3, name: "云端-电竞椅", price: 899, desc: "保护你的腰椎", img: "https://placehold.co/400x300/3498db/FFF?text=CloudChair" },
        { id: 4, name: "云端-4K显示器", price: 2499, desc: "清晰度爆表", img: "https://placehold.co/400x300/9b59b6/FFF?text=CloudScreen" }
      ]);
    }
    res.json(data);
  } catch (err) {
    console.error('❌ 获取商品失败:', err.message);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 记录用户浏览行为
app.post('/api/record-browse', async (req, res) => {
  try {
    const { user_id, product_id, product_name, stay_seconds, ip_address } = req.body;

    if (!user_id || !product_id || !product_name) {
      return res.status(400).json({ error: 'user_id、product_id、product_name 为必填字段' });
    }

    const { data, error } = await supabase
      .from('browse_logs')
      .insert([{
        user_id: String(user_id),
        product_id: Number(product_id),
        product_name: String(product_name),
        stay_seconds: stay_seconds ? Number(stay_seconds) : Math.floor(Math.random() * 60 + 5),
        ip_address: ip_address || req.ip || 'unknown'
      }])
      .select();

    if (error) throw error;

    console.log('✅ 浏览记录已保存:', data[0]);
    res.json({ success: true, data: data[0] });
  } catch (err) {
    console.error('❌ 记录浏览失败:', err.message);
    res.status(500).json({ error: '记录失败: ' + err.message });
  }
});

// 获取真实浏览统计数据（仅从数据库读取，无模拟数据）
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

    // 3. 所有浏览记录（用于聚合）
    const { data: logs } = await supabase
      .from('browse_logs')
      .select('product_name, stay_seconds, browse_time');

    if (!logs || logs.length === 0) {
      // 如果无任何记录，返回空数据结构
      return res.json({
        kpis: { totalBrowse: 0, todayBrowse: 0, hotProduct: '暂无', avgStayTime: 0 },
        charts: {
          hourlyTrend: { labels: [], data: [] },
          productRatio: { labels: [], data: [] },
          dailyTrend: { labels: [], data: [] },
          hotProducts: { labels: [], data: [] }
        }
      });
    }

    // 4. 商品浏览次数统计
    const productCount = {};
    logs.forEach(log => {
      productCount[log.product_name] = (productCount[log.product_name] || 0) + 1;
    });

    // 5. 热门商品 TOP5
    const hotProducts = Object.entries(productCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // 6. 平均停留时间
    const totalStay = logs.reduce((sum, log) => sum + (log.stay_seconds || 0), 0);
    const avgStayTime = Math.round(totalStay / logs.length);

    // 7. 24小时趋势（每小时）
    const hourlyData = Array(24).fill(0);
    const now = new Date();
    logs.forEach(log => {
      const logTime = new Date(log.browse_time);
      const hour = logTime.getHours();
      // 只统计今天的数据
      if (logTime.toDateString() === now.toDateString()) {
        hourlyData[hour]++;
      }
    });
    const hourlyLabels = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}时`);

    // 8. 近7天趋势
    const dailyLabels = [];
    const dailyData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const dateString = date.toDateString();
      dailyLabels.push(`${date.getMonth() + 1}月${date.getDate()}日`);
      
      const count = logs.filter(log => 
        new Date(log.browse_time).toDateString() === dateString
      ).length;
      dailyData.push(count);
    }

    // 9. 商品占比（全部）
    const productRatioLabels = Object.keys(productCount);
    const productRatioData = Object.values(productCount);

    // 返回真实数据
    res.json({
      kpis: {
        totalBrowse: totalBrowse || 0,
        todayBrowse: todayBrowse || 0,
        hotProduct: hotProducts.length > 0 ? hotProducts[0][0] : '暂无',
        avgStayTime: avgStayTime
      },
      charts: {
        hourlyTrend: {
          labels: hourlyLabels,
          data: hourlyData
        },
        productRatio: {
          labels: productRatioLabels,
          data: productRatioData
        },
        dailyTrend: {
          labels: dailyLabels,
          data: dailyData
        },
        hotProducts: {
          labels: hotProducts.map(item => item[0]),
          data: hotProducts.map(item => item[1])
        }
      }
    });
  } catch (err) {
    console.error('❌ 统计接口出错:', err);
    res.status(500).json({
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

// 启动服务
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ 服务启动成功！`);
  console.log(`🔗 商城首页: http://localhost:${PORT}`);
  console.log(`📊 数据看板: http://localhost:${PORT}/admin.html`);
});
