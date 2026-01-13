// 引入必要的模块
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const cors = require('cors'); // 新增：解决跨域问题

// 初始化Express应用
const app = express();

// 配置中间件
app.use(express.json());
app.use(cors()); // 允许跨域请求（可视化页面必备）
app.use(express.static(path.join(__dirname, '.'))); // 托管前端文件

// ====================== 替换为你的Supabase真实信息 ======================
const SUPABASE_URL = 'https://fulyzmmwivpwrvfoifdy.supabase.co'; // 你的URL
// ❗ 必须替换为Supabase控制台的「anon public」完整密钥（eyJhbGci开头）
const SUPABASE_KEY = '替换成你的完整anon public密钥'; 
// =====================================================================

// 初始化Supabase客户端
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 初始化：自动创建浏览记录表（首次运行执行）
async function initBrowseLogsTable() {
  try {
    await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS browse_logs (
          id SERIAL PRIMARY KEY,
          user_id TEXT NOT NULL,       -- 访问用户ID（模拟）
          product_id INTEGER NOT NULL, -- 浏览商品ID
          product_name TEXT NOT NULL,  -- 商品名称
          browse_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- 浏览时间
          stay_seconds INTEGER DEFAULT 0, -- 停留秒数（模拟）
          ip_address TEXT DEFAULT ''   -- IP地址（可选）
        );

        -- 确保products表存在（兼容原有商品功能）
        CREATE TABLE IF NOT EXISTS products (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          price INTEGER NOT NULL,
          desc TEXT,
          img TEXT
        );
      `
    });
    console.log('浏览记录表初始化成功');
  } catch (err) {
    console.log('浏览记录表已存在（或初始化失败）：', err.message);
  }
}
initBrowseLogsTable();

// 1. 根路由：返回可视化监控页面
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'browse-monitor.html'));
});

// 2. 原有功能：商品API接口
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

// 3. 新增：记录用户浏览行为（商品页调用此接口）
app.post('/api/record-browse', async (req, res) => {
  try {
    const { user_id, product_id, product_name, stay_seconds, ip_address } = req.body;
    // 验证必填参数
    if (!user_id || !product_id || !product_name) {
      return res.status(400).json({ error: '用户ID、商品ID、商品名称为必填' });
    }
    // 插入浏览记录到Supabase
    const { data, error } = await supabase
      .from('browse_logs')
      .insert([{
        user_id,
        product_id,
        product_name,
        stay_seconds: stay_seconds || Math.floor(Math.random() * 60 + 5), // 模拟停留时间
        ip_address: ip_address || req.ip
      }]);
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: '记录浏览行为失败：' + err.message });
  }
});

// 4. 新增：获取浏览数据统计（供可视化页面使用）
app.get('/api/browse-stats', async (req, res) => {
  try {
    // 1. 总浏览量
    const { count: totalBrowse } = await supabase
      .from('browse_logs')
      .select('*', { count: 'exact', head: true });

    // 2. 今日浏览量（按日期筛选）
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: todayBrowse } = await supabase
      .from('browse_logs')
      .select('*', { count: 'exact', head: true })
      .gte('browse_time', today.toISOString());

    // 3. 商品浏览占比（饼图）
    const { data: productBrowseData } = await supabase
      .from('browse_logs')
      .select('product_name, count(*) as count')
      .group('product_name');

    // 4. 24小时浏览趋势（折线图）
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

    // 5. 近7天浏览量（柱状图）
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

    // 6. 热门商品TOP5（横向柱状图）
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

    // 组装返回数据
    res.json({
      // KPI核心指标
      kpis: {
        totalBrowse: totalBrowse || 0,
        todayBrowse: todayBrowse || 0,
        hotProduct: hotProductData.length > 0 ? hotProductData[0].product_name : '无',
        avgStayTime: avgStayTime
      },
      // 图表数据
      charts: {
        // 24小时浏览趋势（折线图）
        hourlyTrend: {
          labels: hourlyStats.map(item => item.hour),
          data: hourlyStats.map(item => item.count)
        },
        // 商品浏览占比（饼图）
        productRatio: {
          labels: productBrowseData.map(item => item.product_name) || ['暂无数据'],
          data: productBrowseData.map(item => item.count) || [1]
        },
        // 近7天浏览量（柱状图）
        dailyTrend: {
          labels: dailyStats.map(item => item.date),
          data: dailyStats.map(item => item.count)
        },
        // 热门商品TOP5（横向柱状图）
        hotProducts: {
          labels: hotProductData.map(item => item.product_name) || ['暂无数据'],
          data: hotProductData.map(item => item.count) || [0]
        }
      }
    });
  } catch (err) {
    console.error('获取浏览统计失败：', err);
    // 无数据时返回模拟数据兜底
    res.json(getMockBrowseStats());
  }
});

// 辅助函数：生成模拟浏览数据（无真实数据时兜底）
function getMockBrowseStats() {
  return {
    kpis: {
      totalBrowse: 2580,
      todayBrowse: 326,
      hotProduct: '云端-高性能键盘',
      avgStayTime: 28
    },
    charts: {
      hourlyTrend: {
        labels: Array.from({ length: 24 }, (_, i) => `${i}时`),
        data: Array.from({ length: 24 }, (_, i) => i >= 8 && i <= 22 ? Math.floor(Math.random() * 50 + 10) : Math.floor(Math.random() * 10))
      },
      productRatio: {
        labels: ['云端-高性能键盘', '云端-无线耳机', '云端-电竞椅', '云端-4K显示器'],
        data: [850, 620, 580, 530]
      },
      dailyTrend: {
        labels: ['1月7日', '1月8日', '1月9日', '1月10日', '1月11日', '1月12日', '1月13日'],
        data: [280, 320, 290, 350, 410, 380, 326]
      },
      hotProducts: {
        labels: ['云端-高性能键盘', '云端-无线耳机', '云端-电竞椅', '云端-4K显示器'],
        data: [850, 620, 580, 530]
      }
    }
  };
}

// 配置端口（Render自动分配或本地3000）
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ 浏览监控服务启动成功！`);
  console.log(`🔗 监控页面：http://localhost:${PORT}`);
  console.log(`📊 统计接口：http://localhost:${PORT}/api/browse-stats`);
});
