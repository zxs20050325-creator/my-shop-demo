
// 修改为只输出必要的信息
console.log(`服务器启动在 http://localhost:${PORT}`);
console.log(`当前数据：用户 ${users.length} 个，购物车 ${Object.keys(userCarts).length} 个，收藏 ${Object.keys(userFavorites).length} 个，日志 ${browseLogs.length} 条`);
