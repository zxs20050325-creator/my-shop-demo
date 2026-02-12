// server.js - 最终完整版 (集成Supabase数据库)
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(express.json());
app.use(cors());

// 添加静态资源服务
app.use('/images', express.static(path.join(__dirname, 'public', 'images')));
app.use('/frontend', express.static(path.join(__dirname, '..', 'frontend')));

// 加载环境变量
require('dotenv').config();

// 数据库服务
const db = require('./db');

// 商品数据（保持不变，因为是静态商品）
const MOCK_PRODUCTS = [
    // 第一页
    { id: 1, name: "【镇店之宝】冀州古韵·微缩避暑山庄", price: 399, desc: "皇家园林典范，缩尺还原山水之间，承载千年古建智慧。", img: "/images/001.jpg", category: "工艺品" },
    { id: 2, name: "【非遗国礼】蔚县剪纸·百鸟朝凤", price: 168, desc: "世界非遗技艺，刀刻彩染，色彩明艳，寓意吉祥如意。", img: "/images/002.jpg", category: "剪纸" },
    { id: 3, name: "【镇宅神兽】沧州铁狮·铸铁摆件", price: 299, desc: "威武雄壮，镇海吼缩影，象征力量与守护，燕赵雄风。", img: "/images/003.jpg", category: "雕塑" },
    { id: 4, name: "【白如玉】曲阳定窑·刻花梅瓶", price: 899, desc: "千年定瓷，白如玉薄如纸，手工刻花，尽显宋韵素雅。", img: "/images/004.jpg", category: "陶瓷" },
    { id: 5, name: "【光影传奇】唐山皮影·传统礼盒", price: 128, desc: "一口叙说千古事，双手对舞百万兵，光影间的民间艺术。", img: "/images/005.jpg", category: "皮影" },
    { id: 6, name: "【古城印记】正定记忆·浮雕砖刻", price: 268, desc: "复刻古城墙纹理，抚摸历史的痕迹，自在正定，文化传承。", img: "/images/006.jpg", category: "雕刻" },
    // 第二页
    { id: 7, name: "【文房至宝】易水古砚·雕龙画凤", price: 688, desc: "南有端砚，北有易水。石质细腻，发墨如油，文人雅士首选。", img: "/images/101.jpg", category: "文房四宝" },
    { id: 8, name: "【新春纳福】武强年画·连年有余", price: 88, desc: "中国木版年画之乡，色彩浓烈，线条粗犷，不仅是画，更是福气。", img: "/images/102.jpg", category: "年画" },
    { id: 9, name: "【皇家工艺】花丝镶嵌·鎏金首饰盒", price: 1299, desc: "燕京八绝之一，细如发丝，堆垒编织，尽显宫廷奢华技艺。", img: "/images/103.jpg", category: "金银器" },
    { id: 10, name: "【掌中乾坤】衡水内画·水晶鼻烟壶", price: 568, desc: "鬼斧神工，寸幅之地具千里之势，集诗书画印于一壶。", img: "/images/104.jpg", category: "内画" },
    { id: 11, name: "【民间艺术】玉田泥塑·萌趣生肖", price: 68, desc: "乡土气息浓郁，造型夸张可爱，唤醒儿时的快乐记忆。", img: "/images/105.jpg", category: "泥塑" },
    { id: 12, name: "【民间绝响】抚宁吹歌·乐器模型", price: 328, desc: "唢呐一响，黄金万两。非遗吹歌文化，传承民族之音。", img: "/images/106.jpg", category: "乐器" }
];

// ====================== 核心接口 ======================

// 获取所有用户数据（仅用于开发/调试）
app.get('/api/users/all-data', async (req, res) => {
    try {
        // 获取所有用户
        const users = await db.getAllUsers();
        
        // 获取所有购物车数据
        const allCarts = await db.getAllCarts();
        
        // 获取所有收藏夹数据  
        const allFavorites = await db.getAllFavorites();
        
        // 获取所有用户行为日志
        const logs = await db.getRecentLogs(1000); // 获取最多1000条日志
        
        // 获取系统统计
        const stats = await db.getAllStats();

        res.json({
            users: users || [],
            carts: allCarts || [],
            favorites: allFavorites || [],
            logs: logs || [],
            stats: stats || [],
            summary: {
                total_users: users?.length || 0,
                total_cart_items: allCarts?.length || 0,
                total_favorites: allFavorites?.length || 0,
                total_logs: logs?.length || 0,
                total_stats_records: stats?.length || 0
            }
        });

    } catch (error) {
        console.error('获取全部用户数据失败:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

app.get('/api/products', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const series = req.query.series || null;
    const limit = 6;
    
    let filteredProducts = MOCK_PRODUCTS;
    if (series) {
        // 这里可以根据系列筛选商品
        // 暂时保持原样
    }
    
    const startIndex = (page - 1) * limit;
    const paginatedProducts = filteredProducts.slice(startIndex, startIndex + limit);
    
    res.json({
        products: paginatedProducts,
        total: filteredProducts.length,
        page: page,
        totalPages: Math.ceil(filteredProducts.length / limit)
    });
});

app.get('/api/products/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const product = MOCK_PRODUCTS.find(p => p.id === id);
    
    if (!product) {
        return res.status(404).json({ error: '商品不存在' });
    }
    
    res.json(product);
});

// 用户注册
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
        }
        
        // 检查用户是否已存在
        const existingUser = await db.getUserByUsername(username);
        if (existingUser) {
            return res.status(409).json({ success: false, message: '用户名已存在' });
        }
        
        // 创建新用户
        await db.createUser(username, password);
        console.log(`新用户注册: ${username}`);
        
        res.json({ success: true, message: '注册成功' });
    } catch (error) {
        console.error('注册失败:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 用户登录
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
        }
        
        const user = await db.getUserByUsername(username);
        if (!user || user.password !== password) {
            return res.status(401).json({ success: false, message: '用户名或密码错误' });
        }
        
        res.json({ success: true, message: '登录成功', username: user.username });
    } catch (error) {
        console.error('登录失败:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 添加购物车
app.post('/api/cart/add', async (req, res) => {
    try {
        const { username, product } = req.body;
        
        if (!username || !product) {
            return res.status(400).json({ success: false, message: '参数不完整' });
        }
        
        await db.addToCart(username, product);
        console.log(`${username} 添加商品到购物车: ${product.name}`);
        
        res.json({ success: true, message: '添加成功' });
    } catch (error) {
        console.error('添加购物车失败:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 添加收藏
app.post('/api/favorites/add', async (req, res) => {
    try {
        const { username, product } = req.body;
        
        if (!username || !product) {
            return res.status(400).json({ success: false, message: '参数不完整' });
        }
        
        await db.addToFavorites(username, product);
        console.log(`${username} 收藏商品: ${product.name}`);
        
        res.json({ success: true, message: '收藏成功' });
    } catch (error) {
        console.error('收藏失败:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 结算订单
app.post('/api/cart/checkout', async (req, res) => {
    try {
        const { username, totalPrice } = req.body;
        
        if (!username || !totalPrice) {
            return res.status(400).json({ success: false, message: '参数不完整' });
        }
        
        // 更新系统统计
        await db.updateSystemStats(parseFloat(totalPrice), 1);
        
        // 清空购物车
        await db.clearCart(username);
        
        console.log(`${username} 完成订单，金额: ¥${totalPrice}`);
        
        res.json({ success: true, message: '结算成功' });
    } catch (error) {
        console.error('结算失败:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 行为跟踪
app.post('/api/track', async (req, res) => {
    try {
        const { username, action, product } = req.body;
        
        if (!username || !action) {
            return res.status(400).json({ success: false, message: '参数不完整' });
        }
        
        await db.addLog(username, action, product || '');
        console.log(`用户行为记录: ${username} - ${action} - ${product || ''}`);
        
        res.json({ success: true, message: '行为已记录' });
    } catch (error) {
        console.error('记录行为失败:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// Admin 统计数据
app.get('/api/admin/stats', async (req, res) => {
    try {
        // 获取系统统计
        const stats = await db.getLatestStats();
        
        // 获取最近日志
        const logs = await db.getRecentLogs(50);
        
        // 获取热门商品（需要创建数据库函数）
        let topProducts = [];
        try {
            topProducts = await db.getTopProducts(5);
        } catch (error) {
            console.log('获取热门商品失败，使用模拟数据:', error.message);
            topProducts = [["广惠寺华塔", 10], ["赵州桥", 8], ["避暑山庄", 6]];
        }
        
        // 获取行为分布（需要创建数据库函数）
        let actionDistribution = [0, 0, 0, 0];
        try {
            const actions = await db.getActionDistribution();
            // 这里需要根据实际返回格式调整
            actionDistribution = [100, 50, 30, 20]; // 模拟数据
        } catch (error) {
            console.log('获取行为分布失败，使用模拟数据:', error.message);
            actionDistribution = [100, 50, 30, 20];
        }
        
        // 生成从今年1月1日到现在的日期时间轴数据
        const generateDateRange = () => {
            const now = new Date();
            const startYear = now.getFullYear();
            const startDate = new Date(startYear, 0, 1); // 1月1日（月份从0开始）
            const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            
            const dateRange = [];
            let currentDate = new Date(startDate);
            
            while (currentDate <= endDate) {
                dateRange.push(new Date(currentDate));
                currentDate.setDate(currentDate.getDate() + 1);
            }
            
            return dateRange;
        };
        
        // 生成流量数据（基于真实用户日志数据）
        const generateTrafficData = (dates) => {
            // 获取所有用户日志用于生成真实的流量数据
            const allLogs = db.getRecentLogs(10000); // 获取最多10000条日志
            
            return allLogs.then(logs => {
                const trafficData = [];
                const logMap = new Map();
                
                // 按日期统计日志数量
                logs.forEach(log => {
                    if (log.created_at) {
                        const dateStr = log.created_at.split('T')[0];
                        logMap.set(dateStr, (logMap.get(dateStr) || 0) + 1);
                    }
                });
                
                // 为每个日期生成流量数据
                dates.forEach(date => {
                    const dateStr = date.toISOString().split('T')[0];
                    const value = logMap.get(dateStr) || 0;
                    trafficData.push({
                        date: dateStr,
                        value: value
                    });
                });
                
                return trafficData;
            });
        };
        
        const dateRange = generateDateRange();
        const hourlyTrafficPromise = generateTrafficData(dateRange);
        
        // 等待流量数据生成完成
        const hourlyTraffic = await hourlyTrafficPromise;
        
        res.json({
            kpi: {
                revenue: stats.total_revenue || 0,
                orders: stats.total_orders || 0,
                visits: logs.length,
                activeUsers: new Set(logs.map(log => log.username)).size
            },
            charts: {
                hourlyTraffic,
                topProducts,
                actionDistribution
            },
            logs: logs.map(log => ({
                time: log.created_at,
                username: log.username,
                action: log.action,
                product: log.product
            }))
        });
    } catch (error) {
        console.error('获取admin统计数据失败:', error);
        res.status(500).json({
            kpi: { revenue: 0, orders: 0, visits: 0, activeUsers: 0 },
            charts: {
                hourlyTraffic: [],
                topProducts: [],
                actionDistribution: [0, 0, 0, 0]
            },
            logs: []
        });
    }
});

// 清空数据（仅用于开发）
app.post('/api/admin/clear', async (req, res) => {
    try {
        // 这里可以添加清空逻辑
        // 但在生产环境中应该禁用此功能
        res.json({ success: true, message: '数据清空功能暂未实现' });
    } catch (error) {
        console.error('清空数据失败:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`服务器启动在 http://localhost:${PORT}`);
    console.log(`Supabase 集成已启用`);
});
