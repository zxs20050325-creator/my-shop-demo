// db.js - 数据库操作层 (完整版)
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// 初始化 Supabase 客户端
// 确保你的 .env 文件里有 SUPABASE_URL 和 SUPABASE_KEY
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

class DatabaseService {
    
    // --- 1. 用户相关 ---

    async createUser(username, password) {
        const { data, error } = await supabase
            .from('users')
            .insert([{ username, password }])
            .select();
        if (error) throw error;
        return data[0];
    }

    async getUserByUsername(username) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .single();
        // 忽略"未找到"错误，返回 null
        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }

    async getAllUsers() {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    }

    // --- 2. 购物车相关 ---

    async addToCart(username, product) {
        // 这里的 product 对象需要包含 name, price, img 等
        const { data, error } = await supabase
            .from('carts') // 确保数据库表名叫 carts
            .insert([{ 
                username, 
                product_id: product.id,
                product_name: product.name,
                price: product.price,
                img: product.img
            }])
            .select();
        if (error) throw error;
        return data[0];
    }

    async getAllCarts() {
        const { data, error } = await supabase
            .from('carts')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    }

    async clearCart(username) {
        const { error } = await supabase
            .from('carts')
            .delete()
            .eq('username', username);
        if (error) throw error;
    }

    // --- 3. 收藏夹相关 ---

    async addToFavorites(username, product) {
        const { data, error } = await supabase
            .from('favorites')
            .insert([{ 
                username, 
                product_id: product.id,
                product_name: product.name,
                img: product.img
            }])
            .select();
        if (error) throw error;
        return data[0];
    }

    async getAllFavorites() {
        const { data, error } = await supabase
            .from('favorites')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    }

    // --- 4. 用户行为日志 (核心数据源) ---

    async addLog(username, action, product = '') {
        const { data, error } = await supabase
            .from('user_logs') // 确保表名叫 user_logs
            .insert([{ username, action, product }])
            .select();
        if (error) throw error;
        return data[0];
    }

    // 获取最近日志 (用于生成图表)
    async getRecentLogs(limit = 2000) {
        const { data, error } = await supabase
            .from('user_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);
        if (error) throw error;
        return data || [];
    }

    async clearAllLogs() {
        const { error } = await supabase
            .from('user_logs')
            .delete()
            .neq('id', 0); // 删除所有
        if (error) throw error;
    }

    // --- 5. 系统统计 (KPI) ---

    // 获取最新的统计概览 (如果没有记录则实时计算)
    async getLatestStats() {
        // 尝试从 user_logs 实时聚合总营收和订单
        // 假设 "支付" 或 "结算" 行为代表一笔订单
        const { count, error } = await supabase
            .from('user_logs')
            .select('*', { count: 'exact', head: true })
            .or('action.ilike.%支付%,action.ilike.%结算%');

        if (error) return { total_revenue: 0, total_orders: 0 };

        return {
            total_orders: count || 0,
            total_revenue: (count || 0) * 199 // 假设客单价199
        };
    }
}

module.exports = new DatabaseService();
