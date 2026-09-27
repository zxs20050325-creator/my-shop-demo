import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 构建产物输出到 frontend/dist，由 backend/index.js 静态托管。
// base 用相对路径 './'：后台在 /#/admin 这类 hash 路由下刷新时，
// 绝对路径的资源引用在子路径部署场景下容易失效，相对路径最稳。
export default defineConfig({
    plugins: [vue()],
    base: './',
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        chunkSizeWarningLimit: 900
    },
    server: {
        port: 5173,
        // 开发时把后端接口和商品图片代理到本地 Node 服务，
        // 这样前端代码里一律写相对路径 /api/xxx，与线上完全一致。
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:3000',
                changeOrigin: true
            },
            '/images': {
                target: 'http://127.0.0.1:3000',
                changeOrigin: true
            },
            '/health': {
                target: 'http://127.0.0.1:3000',
                changeOrigin: true
            }
        }
    }
})
