
// 修改为只输出必要的信息
console.log(`服务器启动在 http://localhost:${PORT}`);
console.log(`当前数据：用户 ${users.length} 个，购物车 ${Object.keys(userCarts).length} 个，收藏 ${Object.keys(userFavorites).length} 个，日志 ${browseLogs.length} 条`);

// 修改入口文件名以匹配Render配置
// 原始文件名为 index.js，需要确保与Render配置一致
module.exports = app; // 确保正确导出应用实例
