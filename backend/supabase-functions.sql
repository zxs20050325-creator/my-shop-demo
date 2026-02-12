-- 获取热门商品函数
CREATE OR REPLACE FUNCTION get_top_products(limit_count INTEGER DEFAULT 5)
RETURNS TABLE(product_name TEXT, count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        product->>'name' as product_name,
        COUNT(*) as count
    FROM carts 
    WHERE product->>'name' IS NOT NULL
    GROUP BY product->>'name'
    ORDER BY count DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- 获取用户行为分布函数
CREATE OR REPLACE FUNCTION get_action_distribution()
RETURNS TABLE(action_type TEXT, count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        action,
        COUNT(*) as count
    FROM user_logs
    GROUP BY action
    ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

-- 授予函数执行权限
GRANT EXECUTE ON FUNCTION get_top_products TO anon;
GRANT EXECUTE ON FUNCTION get_action_distribution TO anon;