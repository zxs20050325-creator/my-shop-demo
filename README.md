# 冀遗筑梦 - 河北非遗文化电商平台

冀遗筑梦是一个聚焦于河北非遗文化传承与推广的Web平台，旨在通过数字化手段连接用户与非遗产品，助力传统文化振兴。

## 项目结构

```
冀遗筑梦/
├── frontend/                 # 前端文件
│   ├── index.html           # 主页
│   ├── product-detail.HTML  # 商品详情页
│   ├── cart.html            # 购物车
│   ├── login.html           # 登录页
│   ├── register.html        # 注册页
│   ├── pay.html             # 支付页
│   ├── FAVORITES.HTML       # 收藏页
│   └── admin.html           # 管理员监控页
├── backend/                 # 后端文件
│   ├── server.js            # Express服务器
│   ├── package.json         # 项目依赖配置
│   └── package-lock.json    # 锁定依赖版本
├── images/                  # 图片资源
├── .github/                 # GitHub配置
├── .vscode/                 # VSCode配置
└── README.md                # 项目说明
```

## 技术栈

- **前端**: HTML/CSS/JavaScript (静态页面)
- **后端**: Node.js + Express
- **数据存储**: 本地文件存储 + Supabase (预留接口)

## 功能特性

- 用户注册/登录
- 商品浏览与搜索
- 购物车管理
- 商品收藏功能
- 订单支付流程
- 数据可视化管理后台

## 开发环境搭建

### 后端设置

1. 进入后端目录：
   ```bash
   cd backend
   ```

2. 安装依赖：
   ```bash
   npm install
   ```

3. 启动服务器：
   ```bash
   npm start
   # 或
   node server.js
   ```

服务器将在 `http://localhost:3000` 上运行。

### 前端开发

前端文件位于 `frontend/` 目录中，可以直接在浏览器中打开HTML文件预览，但需要后端服务才能使用完整功能。

## API 接口

服务器提供了以下API接口：

- `GET /api/products` - 获取商品列表
- `POST /api/register` - 用户注册
- `POST /api/login` - 用户登录
- `POST /api/cart/add` - 添加商品到购物车
- `GET /api/cart` - 获取购物车内容
- `POST /api/favorites/add` - 添加收藏
- `GET /api/favorites` - 获取收藏列表
- `GET /api/admin/stats` - 获取管理统计数据
- 更多接口请参见 [server.js](./backend/server.js)

## 部署

### 本地部署

1. 启动后端服务：`cd backend && node server.js`
2. 访问 `http://localhost:3000` 即可使用应用

### 生产部署

- 前端可部署在任何静态网站托管平台（如 Vercel、Netlify、GitHub Pages）
- 后端需部署在支持 Node.js 的服务器或平台（如 Render、Railway、AWS EC2）
- 注意配置正确的静态文件路径

## 项目特点

- 前后端分离架构，便于维护
- 针对河北非物质文化遗产的专门设计
- 完整的电商平台功能
- 实时数据可视化管理后台
- 响应式设计，支持多种设备访问