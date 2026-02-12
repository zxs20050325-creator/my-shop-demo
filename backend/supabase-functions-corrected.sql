-- 删除可能存在的旧函数
DROP FUNCTION IF EXISTS get_top_products(integer);
DROP FUNCTION IF EXISTS get_action_distribution();

-- 创建获取热门商品的函数（从 user_logs 表中获取）
CREATE OR REPLACE FUNCTION get_top_products(limit_count INTEGER DEFAULT 5)
RETURNS TABLE(product_name TEXT, count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        product as product_name,
        COUNT(*) as count
    FROM user_logs 
    WHERE product IS NOT NULL AND product != ''
    GROUP BY product
    ORDER BY count DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- 创建获取用户行为分布函数
CREATE OR REPLACE FUNCTION get_action_distribution()
RETURNS TABLE(action_type TEXT, count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        action as action_type,
        COUNT(*) as count
    FROM user_logs
    WHERE action IS NOT NULL
    GROUP BY action
    ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

-- 授予函数执行权限
GRANT EXECUTE ON FUNCTION get_top_products TO anon;
GRANT EXECUTE ON FUNCTION get_action_distribution TO anon;

-- 测试函数
SELECT * FROM get_top_products(5);