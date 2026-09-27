# 冀遗筑梦

数字化非遗盲盒电商 SPA 平台，面向课程设计、软件著作权申报和答辩演示。

## 技术栈

- 前端：Vue 3、Vite、Pinia、Vue Router、Chart.js
- 后端：Node.js、Express、JWT、Zod、Helmet、express-rate-limit
- 数据库：Supabase PostgreSQL
- 部署：Render 单服务，Express 同时托管 API、图片和前端构建产物

## 已实现能力

### 用户与安全

- 注册、登录、刷新令牌、退出登录
- JWT 放入 `HttpOnly` Cookie，前端不再保存裸用户名
- 普通用户与管理员角色区分
- 用户私有数据只从 JWT 推导，禁止请求参数传入 `username`
- 登录、注册接口限流
- 管理员账号存入数据库，密码使用 `scrypt` 哈希
- 管理员初始化脚本不会在代码或 Render 配置中保存明文密码

### 商品与库存

- 商品分类、搜索、排序和分页
- 商品详情与多规格 SKU
- 每个 SKU 拥有独立价格、库存和上下架状态
- 后台商品、SKU、库存管理
- 首页保留盲盒翻牌动画

### 购物与订单

- 服务端购物车和收藏
- 后端从数据库实时读取价格与库存，不信任前端价格快照
- 下单、订单明细、扣库存、清空购物车和日志使用同一数据库事务
- 订单状态：`待付款 -> 待发货 -> 已发货 -> 已完成`
- 支持待付款取消
- 支持已付款订单申请退款和管理员审核
- 支持演示支付，不接入真实第三方支付

### 用户中心

- 修改昵称、手机号和密码
- 多收货地址管理
- 默认收货地址
- 订单、退款、收藏和购物车入口

### 管理后台

- 交易 KPI 与近 30 日趋势
- 商品销量排行
- 商品、SKU、库存管理
- 订单状态管理
- 退款审核
- 用户信息查看
- 行为日志查看、CSV 导出和清空

## 目录结构

```text
backend/
  migrations/        Supabase 迁移和事务函数
  scripts/           管理员初始化、迁移检查、演示数据
  src/
    config/           环境配置
    database/         Supabase 客户端和仓库层
    middleware/       鉴权、校验、限流、异常
    modules/          auth/users/catalog/cart/favorites/orders/admin
    shared/           安全工具、响应格式、错误类型
  tests/
frontend/
  src/
    api/              统一 HTTP 客户端
    components/       UI 组件
    layouts/          前后台布局
    router/           路由和鉴权守卫
    stores/           Pinia 状态
    views/            业务页面
  tests/
docs/
  部署与运维手册.md
  答辩专用文稿.md
```

## 本地启动

### 1. 安装依赖

```powershell
npm run install:all
```

### 2. 初始化数据库

在 Supabase SQL Editor 中按顺序执行：

```text
backend/migrations/001_auth_and_users.sql
backend/migrations/002_catalog_and_inventory.sql
backend/migrations/003_cart_and_favorites.sql
backend/migrations/004_orders_and_refunds.sql
backend/migrations/005_analytics_and_indexes.sql
backend/migrations/006_transaction_functions.sql
```

也可以配置 `DATABASE_URL` 后自动执行：

```powershell
npm run migrate --prefix backend
```

### 3. 配置环境变量

复制 `backend/.env.example` 为 `backend/.env`，填写：

```text
DATABASE_URL=postgresql://postgres:密码@连接池域名:5432/postgres
JWT_SECRET=至少 32 位随机字符串
```

### 4. 创建管理员

```powershell
npm run create-admin --prefix backend
```

也可以一次性传入环境变量：

```powershell
$env:ADMIN_USERNAME="admin"
$env:ADMIN_INITIAL_PASSWORD="替换为强密码"
npm run create-admin --prefix backend
```

### 5. 启动

终端一：

```powershell
npm run dev:backend
```

终端二：

```powershell
npm run dev:frontend
```

访问 `http://localhost:5173`。

## 测试与构建

```powershell
npm test
npm run build
```

后端 `npm run verify-migrations --prefix backend` 可用于检查生产数据库迁移。

## 核心安全模型

- Access Token 有效期 2 小时。
- Refresh Token 有效期 7 天，数据库只保存 SHA-256 哈希。
- 刷新令牌轮换，退出登录后撤销当前会话。
- 所有用户私有接口使用服务端 `req.user.id`。
- 订单详情、支付、取消和退款接口均校验订单所属用户。
- 后端使用 PostgreSQL 直连 Supabase，浏览器无法获得数据库凭证。
- 所有写请求校验 Origin，所有输入使用 Zod 校验。
- 管理员用户列表只返回业务资料和订单数，不返回密码哈希。

## Supabase RPC

| RPC | 作用 |
| --- | --- |
| `search_products_v2` | 商品搜索、分类、排序、分页 |
| `create_order_from_cart` | 原子创建订单、明细、扣库存、清购物车、写日志 |
| `demo_pay_order` | 演示支付并流转为待发货 |
| `cancel_unpaid_order` | 取消未付款订单并恢复库存 |
| `admin_update_order_status` | 管理员订单状态流转 |
| `request_order_refund` | 用户申请退款 |
| `handle_order_refund` | 管理员审核退款 |
| `adjust_sku_stock` | 调整 SKU 库存并写库存流水 |
| `get_admin_dashboard` | 统一交易 KPI 和趋势统计 |

## 演示支付说明

本项目不会调用任何真实支付渠道。`demo_pay_order` 只生成演示支付流水并更新订单状态，适合课程设计和答辩展示。
