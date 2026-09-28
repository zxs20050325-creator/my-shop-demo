const { start } = require('./src/server');

start().catch(error => {
    console.error('服务启动失败：', error.message);
    process.exit(1);
});

module.exports = { start };
