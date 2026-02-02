// 正确配置：将 backend/images 目录映射到 /images 路径
app.use('/images', express.static(path.join(__dirname, 'backend/images')));