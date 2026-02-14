# 商品名称更新完整指南

## 第一步：分析当前数据

在 Supabase 控制台执行以下查询，查看当前 user_logs 表中的商品名称：

```sql
-- 查看所有不同的商品名称
SELECT DISTINCT product FROM user_logs WHERE product IS NOT NULL ORDER BY product;

-- 查看每种商品的记录数量
SELECT product, COUNT(*) as count 
FROM user_logs 
WHERE product IS NOT NULL 
GROUP BY product 
ORDER BY count DESC;
```

## 第二步：根据实际数据创建映射

根据查询结果，您会看到类似以下的旧商品名称：
- 广惠寺华塔·微缩模型
- 赵州桥·石刻镇纸  
- 避暑山庄·全景画卷
- 正定古城·隐藏款
- 蔚县剪纸·窗花
- 唐山皮影·礼盒

## 第三步：执行更新

使用以下SQL语句进行更新（根据您的实际数据调整）：

```sql
-- 1. 冀筑华塔微藏盒
UPDATE user_logs SET product = '冀筑华塔微藏盒' WHERE product = '广惠寺华塔·微缩模型';

-- 2. 赵州桥榫卯奇盒
UPDATE user_logs SET product = '赵州桥榫卯奇盒' WHERE product = '赵州桥·石刻镇纸';

-- 3. 承德御苑宸景盒  
-- 4. 山海关雄关守盒
-- 5. 隆兴寺禅筑臻盒
-- 6. 开元寺塔料敌盒
-- 7-12. 根据实际查询结果添加更多映射
```

## 第四步：验证结果

```sql
-- 验证更新是否成功
SELECT DISTINCT product FROM user_logs WHERE product IS NOT NULL ORDER BY product;
```

## 注意事项

1. **备份建议**：在执行更新前，建议先导出 user_logs 表的数据作为备份
2. **新增商品**：如果您有12个新商品但只有6个旧商品，那么后6个新商品在日志中可能没有历史记录
3. **测试环境**：建议先在测试环境中验证SQL脚本的正确性
4. **逐步执行**：可以逐条执行UPDATE语句，确保每一步都正确

## 完整的12个新商品列表

1. 冀筑华塔微藏盒
2. 赵州桥榫卯奇盒  
3. 承德御苑宸景盒
4. 山海关雄关守盒
5. 隆兴寺禅筑臻盒
6. 开元寺塔料敌盒
7. 清西陵宫阙雅盒
8. 娲皇宫悬楼秘盒
9. 古莲花池苑趣盒
10. 紫荆关燕塞筑盒
11. 广府古城围合盒
12. 外八庙梵筑珍盒