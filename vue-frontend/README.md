# 冀遗筑梦 - 非遗文化电商平台 (Vue 3版本)

这是一个基于Vue 3构建的河北非遗文化电商平台，专注于展示和推广河北地区的非物质文化遗产产品。

## 项目特性

- Vue 3 Composition API
- 响应式设计，支持移动端和桌面端
- 侘寂风格UI设计
- 完整的电商功能（商品浏览、购物车、收藏、支付等）
- 适合部署到Render等云平台

## 项目结构

```
vue-frontend/
├── public/                 # 静态资源
├── src/                    # 源代码
│   ├── assets/             # 静态资源
│   ├── components/         # 组件
│   ├── views/              # 页面视图
│   ├── router/             # 路由配置
│   ├── App.vue             # 主应用组件
│   └── main.js             # 应用入口
├── .env                    # 环境变量配置
├── .env.production         # 生产环境变量配置
├── render.yaml             # Render部署配置
└── package.json            # 项目依赖和脚本
```

## 安装和运行

### 开发环境

1. 安装依赖:
```bash
npm install
```

2. 启动开发服务器:
```bash
npm run serve
```

3. 在浏览器中打开 `http://localhost:8080` 查看应用

### 生产环境构建

```bash
npm run build
```

构建完成后，会在 `dist/` 目录中生成生产环境代码。

## 部署到Render

本项目已配置好Render部署，只需执行以下步骤：

1. 将代码推送到GitHub仓库
2. 在Render Dashboard中创建新Web Service
3. 连接到你的GitHub仓库
4. Render会自动检测到 `render.yaml` 配置文件并完成部署

## 环境变量

- `VUE_APP_API_BASE_URL`: API服务器的基础URL（开发环境默认为 `http://localhost:8080`，生产环境为空）

## 项目依赖

- Vue 3
- Vue Router 4
- @vue/cli
- 以及其他开发依赖

## API接口

前端与后端API通信，后端服务需要运行在指定的API服务器上。

## 自定义配置

参考 [Vue CLI文档](https://cli.vuejs.org/config/) 进行更多自定义配置。