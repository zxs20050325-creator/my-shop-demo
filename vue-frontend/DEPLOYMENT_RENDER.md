# 部署到Render指南

本指南将指导您如何将冀遗筑梦Vue 3前端应用部署到Render云平台。

## 步骤1: 准备后端API服务

在部署前端应用之前，您需要有一个运行中的后端API服务。

如果您还没有后端API服务，请先部署后端服务：
1. 将 `backend` 目录部署为一个 Render Web Service
2. 记下后端服务的URL，格式类似 `https://your-backend.onrender.com`

## 步骤2: 配置前端环境变量

在部署前端之前，您需要配置API基础URL：

1. 编辑 `.env.production` 文件，将后端API的URL添加进去：
   ```
   VUE_APP_API_BASE_URL=https://your-backend.onrender.com
   ```

## 步骤3: 部署前端应用到Render

1. 将代码推送到GitHub仓库
2. 登录 Render.com 账户
3. 点击 "New +" 按钮，选择 "Web Service"
4. 连接到您的GitHub仓库
5. 选择包含前端代码的分支
6. Render会自动检测到 `render.yaml` 配置文件并使用以下配置：
   - 环境: Static Site
   - 构建命令: `npm install && npm run render-build`
   - 静态发布路径: `./dist`
7. 点击 "Create Web Service" 开始部署

## 步骤4: 验证部署

部署完成后：
1. 访问您应用的URL
2. 确认所有页面都能正常加载
3. 测试API功能（注册、登录、购物车等）

## 环境变量说明

- `VUE_APP_API_BASE_URL`: 指向后端API服务的URL，在生产环境中必须设置

## 常见问题

### API请求失败
- 检查后端服务是否正常运行
- 确认前端的 `VUE_APP_API_BASE_URL` 环境变量设置正确
- 确认后端服务允许来自前端域名的跨域请求

### 静态资源加载失败
- 确认图片等静态资源已部署到正确的后端路径
- 检查图片URL路径是否正确

### 路由问题
- Vue Router使用history模式，确保服务器配置正确处理客户端路由
- 所有非API请求都应返回index.html文件

## 更新部署

当您需要更新应用时：
1. 修改代码并提交到GitHub
2. Render会自动检测到代码变更并重新构建部署
3. 您也可以在Render控制台手动触发重新部署

## 自定义域名

您可以在Render控制台为您的应用配置自定义域名：
1. 在Render控制台打开您的服务
2. 点击 "Settings" 选项卡
3. 在 "Custom domains" 部分添加您的域名
4. 按照提示配置DNS记录