const supabase = require('./supabase');

class DatabaseService {
    // 用户相关操作
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
        
        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }

    // 购物车相关操作
    async addToCart(username, product) {
        const { data, error } = await supabase
            .from('carts')
            .insert([{ username, product }])
            .select();
        
        if (error) throw error;
        return data[0];
    }

    async getCartByUsername(username) {
        const { data, error } = await supabase
            .from('carts')
            .select('*')
            .eq('username', username);
        
        if (error) throw error;
        return data;
    }

    async clearCart(username) {
        const { error } = await supabase
            .from('carts')
            .delete()
            .eq('username', username);
        
        if (error) throw error;
    }

    // 收藏夹相关操作
    async addToFavorites(username, product) {
        const { data, error } = await supabase
            .from('favorites')
            .insert([{ username, product }])
            .select();
        
        if (error) throw error;
        return data[0];
    }

    async getFavoritesByUsername(username) {
        const { data, error } = await supabase
            .from('favorites')
            .select('*')
            .eq('username', username);
        
        if (error) throw error;
        return data;
    }

    // 用户行为日志
    async addLog(username, action, product = '') {
        const { data, error } = await supabase
            .from('user_logs')
            .insert([{ username, action, product }])
            .select();
        
        if (error) throw error;
        return data[0];
    }

    async getRecentLogs(limit = 100) {
        const { data, error } = await supabase
            .from('user_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);
        
        if (error) throw error;
        return data;
    }

    // 系统统计
    async updateSystemStats(revenue = 0, orders = 0) {
        // 获取当前统计
        const { data: currentData, error: selectError } = await supabase
            .from('system_stats')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
        
        if (selectError && selectError.code !== 'PGRST116') throw selectError;
        
        let newRevenue = revenue;
        let newOrders = orders;
        
        if (currentData) {
            newRevenue += currentData.total_revenue;
            newOrders += currentData.total_orders;
        }
        
        // 插入新的统计记录
        const { data, error } = await supabase
            .from('system_stats')
            .insert([{ total_revenue: newRevenue, total_orders: newOrders }])
            .select();
        
        if (error) throw error;
        return data[0];
    }

    async getLatestStats() {
        const { data, error } = await supabase
            .from('system_stats')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        return data || { total_revenue: 0, total_orders: 0 };
    }

    // 获取热门商品统计
    async getTopProducts(limit = 5) {
        const { data, error } = await supabase
            .rpc('get_top_products', { limit_count: limit });
        
        if (error) throw error;
        return data;
    }

    // 获取用户行为分布
    async getActionDistribution() {
        const { data, error } = await supabase
            .rpc('get_action_distribution');
        
        if (error) throw error;
        return data;
    }

    // 新增方法：获取所有用户
    async getAllUsers() {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data;
    }

    // 新增方法：获取所有购物车数据
    async getAllCarts() {
        const { data, error } = await supabase
            .from('carts')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data;
    }

    // 新增方法：获取所有收藏夹数据
    async getAllFavorites() {
        const { data, error } = await supabase
            .from('favorites')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data;
    }

    // 新增方法：获取所有系统统计记录
    async getAllStats() {
        const { data, error } = await supabase
            .from('system_stats')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data;
    }
}

module.exports = new DatabaseService();