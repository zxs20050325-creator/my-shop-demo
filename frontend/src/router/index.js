import { createRouter, createWebHashHistory } from 'vue-router'
import { useUserStore } from '../stores/user'
import { useToastStore } from '../stores/toast'

// 用 hash 模式（地址形如 /#/orders）而不是 history 模式，理由：
//   ① 不用给 Express 加 catch-all 重写，后端一行都不用动；
//   ② 深链接刷新不会 404；
//   ③ 不会与后端的 /api/* 和已有的 /admin 路由打架。
//
// meta.requiresAuth → 未登录会被守卫送去登录页（登录后回到原地址）
// meta.guestOnly    → 已登录的人不该再看到登录/注册页
// meta.layout       → 'blank' 表示不套侧边栏+顶栏（登录页、后台用）

const routes = [
    { path: '/', name: 'home', component: () => import('../views/HomeView.vue') },

    { path: '/product/:id', name: 'product', component: () => import('../views/ProductDetailView.vue') },
    { path: '/search', name: 'search', component: () => import('../views/SearchView.vue') },
    { path: '/category/:name', name: 'category', component: () => import('../views/CategoryView.vue') },

    { path: '/cart', name: 'cart', component: () => import('../views/CartView.vue'), meta: { requiresAuth: true } },
    { path: '/favorites', name: 'favorites', component: () => import('../views/FavoritesView.vue'), meta: { requiresAuth: true } },
    { path: '/pay', name: 'pay', component: () => import('../views/PayView.vue'), meta: { requiresAuth: true } },
    { path: '/orders', name: 'orders', component: () => import('../views/OrdersView.vue'), meta: { requiresAuth: true } },
    { path: '/orders/:id', name: 'order-detail', component: () => import('../views/OrderDetailView.vue'), meta: { requiresAuth: true } },
    { path: '/profile', name: 'profile', component: () => import('../views/ProfileView.vue'), meta: { requiresAuth: true } },

    { path: '/login', name: 'login', component: () => import('../views/LoginView.vue'), meta: { guestOnly: true, layout: 'blank' } },
    { path: '/register', name: 'register', component: () => import('../views/RegisterView.vue'), meta: { guestOnly: true, layout: 'blank' } },

    { path: '/admin', name: 'admin', component: () => import('../views/AdminView.vue'), meta: { layout: 'blank' } },

    // 兜底：旧版没有 404 页，只有后端返回的 JSON 版 404
    { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('../views/NotFoundView.vue') }
]

const router = createRouter({
    history: createWebHashHistory(),
    routes,
    scrollBehavior(to, from, savedPosition) {
        if (savedPosition) return savedPosition
        if (to.hash) return { el: to.hash, behavior: 'smooth' }
        return { top: 0 }
    }
})

router.beforeEach((to) => {
    const user = useUserStore()

    if (to.meta.requiresAuth && !user.isLoggedIn) {
        useToastStore().ok('请先登录')
        // 带上 redirect，登录成功后能回到原本要去的页面
        return { name: 'login', query: { redirect: to.fullPath } }
    }

    if (to.meta.guestOnly && user.isLoggedIn) {
        return { name: 'home' }
    }
})

router.afterEach((to) => {
    const titles = {
        home: '冀遗筑梦 | 全球首个古建筑载体盲盒平台',
        product: '藏品详情',
        search: '搜索',
        category: '分类浏览',
        cart: '选藏清单',
        favorites: '珍藏夹',
        pay: '结缘确权',
        orders: '我的订单',
        'order-detail': '订单详情',
        profile: '个人中心',
        login: '开启盲盒',
        register: '创建账号',
        admin: '管理后台',
        'not-found': '页面不存在'
    }
    const t = titles[to.name]
    document.title = t ? `${t} · 冀遗筑梦` : '冀遗筑梦'
})

export default router
