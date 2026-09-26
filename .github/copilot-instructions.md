# Copilot Instructions for 冀遗筑梦 - 数字化非遗盲盒平台

## 项目概述
本项目是全球首个非遗盲盒平台，结合传统文化与现代电商体验。主要分为前端和后端两部分，前端使用HTML、CSS和JavaScript，后端使用Node.js和Express框架。

## 主要组件
- **前端**: 负责用户界面和交互，主要文件在`frontend/`目录下。
- **后端**: 处理业务逻辑和数据存储，主要文件在`backend/`目录下。

## 关键工作流
- **启动后端服务**: 使用命令 `npm run start` 启动后端服务，或使用 `npm run dev` 进行开发模式启动。
- **数据库初始化**: 在Supabase控制台执行 `backend/supabase-init.sql` 和 `backend/supabase-functions.sql` 来设置数据库结构和函数。

## 项目特定约定
- **文件结构**: 前端和后端分开，前端文件在`frontend/`，后端文件在`backend/`。
- **状态管理**: 使用`localStorage`来管理用户状态，相关函数在`frontend/common.js`中定义。

## 集成点
- **数据库**: 使用Supabase作为后端数据库，所有数据库操作通过SQL脚本进行。
- **跨组件通信**: 前端通过API与后端进行数据交互，后端使用Express处理请求。

## 重要文件
- [frontend/index.html](../frontend/index.html): 前端首页。
- [backend/index.js](../backend/index.js): 后端服务入口文件。
- [backend/package.json](../backend/package.json): 后端依赖和脚本管理。

## 其他注意事项
- 确保Node.js版本在22.5.0及以上。
- 使用`nodemon`进行开发时，确保安装相关依赖。