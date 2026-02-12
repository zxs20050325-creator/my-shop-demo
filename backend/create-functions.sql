-- 删除可能存在的旧函数
DROP FUNCTION IF EXISTS get_top_products(integer);
DROP FUNCTION IF EXISTS get_action_distribution();

-- 创建获取热门商品的函数
CREATE OR REPLACE FUNCTION get_top_products(limit_count INTEGER)
RETURNS TABLE (
    product_name TEXT,
    count BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        product::TEXT,
        COUNT(*) as count
    FROM user_logs
    WHERE product IS NOT NULL AND product != ''
    GROUP BY product
    ORDER BY count DESC
    LIMIT limit_count;
END;
$$;

-- 授予执行权限
GRANT EXECUTE ON FUNCTION get_top_products TO anon;

-- 创建获取用户行为分布的函数
CREATE OR REPLACE FUNCTION get_action_distribution()
RETURNS TABLE (
    action_type TEXT,
    count BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        action::TEXT,
        COUNT(*) as count
    FROM user_logs
    GROUP BY action
    ORDER BY count DESC;
END;
$$;

-- 授予执行权限
GRANT EXECUTE ON FUNCTION get_action_distribution TO anon;

-- 测试函数是否正常工作
SELECT * FROM get_top_products(5);