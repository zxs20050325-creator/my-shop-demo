-- 获取热门商品函数
CREATE OR REPLACE FUNCTION get_top_products(limit_count INTEGER DEFAULT 5)
RETURNS TABLE(product_name TEXT, count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        product as product_name,
        COUNT(*) as count
    FROM user_logs 
    WHERE product IS NOT NULL 
      AND product != ''
      AND product != '首页'
      AND product NOT LIKE '%详情页%'
      AND product NOT LIKE '%登录%'
      AND product NOT LIKE '%注册%'
      AND product NOT LIKE '%购物车%'
      AND product NOT LIKE '%收藏夹%'
      AND product NOT LIKE '%支付%'
      AND product NOT LIKE '%admin%'
      AND product NOT LIKE '%管理%'
    GROUP BY product
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