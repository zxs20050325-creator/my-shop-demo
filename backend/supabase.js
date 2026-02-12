require('dotenv').config(); // 添加dotenv支持
const { createClient } = require('@supabase/supabase-js');

// 从环境变量获取 Supabase 配置
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase configuration missing. Please check your .env file.');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

module.exports = supabase;