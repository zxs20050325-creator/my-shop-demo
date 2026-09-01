-- 清理user_logs表中的非商品数据
-- 删除product字段为'首页'或其他非商品名称的记录

DELETE FROM user_logs 
WHERE product = '首页'
   OR product LIKE '%详情页%'
   OR product LIKE '%登录%'
   OR product LIKE '%注册%'
   OR product LIKE '%购物车%'
   OR product LIKE '%收藏夹%'
   OR product LIKE '%支付%'
   OR product LIKE '%admin%'
   OR product LIKE '%管理%';

-- 验证清理结果
SELECT COUNT(*) as remaining_non_product_logs
FROM user_logs 
WHERE product = '首页'
   OR product LIKE '%详情页%'
   OR product LIKE '%登录%'
   OR product LIKE '%注册%'
   OR product LIKE '%购物车%'
   OR product LIKE '%收藏夹%'
   OR product LIKE '%支付%'
   OR product LIKE '%admin%'
   OR product LIKE '%管理%';