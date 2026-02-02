// 确保图片资源路径正确指向 backend/images 目录
app.use('/images', express.static(path.join(__dirname, './images')));