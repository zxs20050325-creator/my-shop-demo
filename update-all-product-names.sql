-- 更新 user_logs 表中的商品名称 - 完整12个商品映射
-- 在 Supabase 控制台的 SQL Editor 中执行此脚本

-- 1. 广惠寺华塔·微缩模型 → 冀筑华塔微藏盒
UPDATE user_logs 
SET product = '冀筑华塔微藏盒' 
WHERE product = '广惠寺华塔·微缩模型';

-- 2. 赵州桥·石刻镇纸 → 赵州桥榫卯奇盒
UPDATE user_logs 
SET product = '赵州桥榫卯奇盒' 
WHERE product = '赵州桥·石刻镇纸';

-- 3. 避暑山庄·全景画卷 → 承德御苑宸景盒
UPDATE user_logs 
SET product = '承德御苑宸景盒' 
WHERE product = '避暑山庄·全景画卷';

-- 4. 正定古城·隐藏款 → 山海关雄关守盒
UPDATE user_logs 
SET product = '山海关雄关守盒' 
WHERE product = '正定古城·隐藏款';

-- 5. 蔚县剪纸·窗花 → 隆兴寺禅筑臻盒
UPDATE user_logs 
SET product = '隆兴寺禅筑臻盒' 
WHERE product = '蔚县剪纸·窗花';

-- 6. 唐山皮影·礼盒 → 开元寺塔料敌盒
UPDATE user_logs 
SET product = '开元寺塔料敌盒' 
WHERE product = '唐山皮影·礼盒';

-- 7-12. 如果日志中有其他旧商品名称，添加对应的映射
-- 请根据实际的旧商品名称调整以下映射

-- 示例：如果有其他旧商品名称，按以下格式添加
-- UPDATE user_logs 
-- SET product = '清西陵宫阙雅盒' 
-- WHERE product = '旧商品名称7';

-- UPDATE user_logs 
-- SET product = '娲皇宫悬楼秘盒' 
-- WHERE product = '旧商品名称8';

-- UPDATE user_logs 
-- SET product = '古莲花池苑趣盒' 
-- WHERE product = '旧商品名称9';

-- UPDATE user_logs 
-- SET product = '紫荆关燕塞筑盒' 
-- WHERE product = '旧商品名称10';

-- UPDATE user_logs 
-- SET product = '广府古城围合盒' 
-- WHERE product = '旧商品名称11';

-- UPDATE user_logs 
-- SET product = '外八庙梵筑珍盒' 
-- WHERE product = '旧商品名称12';

-- 清理空值或无效商品名称（可选）
-- UPDATE user_logs 
-- SET product = NULL 
-- WHERE product = '' OR product IS NULL;

-- 验证更新结果
SELECT DISTINCT product FROM user_logs WHERE product IS NOT NULL ORDER BY product;