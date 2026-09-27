import { createRouter, createWebHashHistory } from 'vue-router'
import { useUserStore } from '../stores/user'
import { useToastStore } from '../stores/toast'

const routes = [
    { path: '/', name: 'home', component: () => import('../views/HomeV3View.vue') },
    { path: '/home-current', name: 'home-current', component: () => import('../views/HomeView.vue') },
    { path: '/home-v1', name: 'home-v1', component: () => import('../views/HomeV1View.vue') },
    { path: '/home-v2', name: 'home-v2', component: () => import('../views/HomeV2View.vue') },
    { path: '/home-v3', redirect: '/' },
    { path: '/product/:id', name: 'product', component: () => import('../views/ProductDetailView.vue') },
    { path: '/search', name: 'search', component: () => import('../views/SearchView.vue') },
    { path: '/category/:name', name: 'category', component: () => import('../views/CategoryView.vue') },
    { path: '/cart', name: 'cart', component: () => import('../views/CartView.vue'), meta: { requiresAuth: true } },
    { path: '/favorites', name: 'favorites', component: () => import('../views/FavoritesView.vue'), meta: { requiresAuth: true } },
    { path: '/pay', name: 'pay', component: () => import('../views/PayView.vue'), meta: { requiresAuth: true } },
    { path: '/orders', name: 'orders', component: () => import('../views/OrdersView.vue'), meta: { requiresAuth: true } },
    { path: '/orders/:id', name: 'order-detail', component: () => import('../views/OrderDetailView.vue'), meta: { requiresAuth: true } },
    { path: '/refunds', name: 'refunds', component: () => import('../views/RefundsView.vue'), meta: { requiresAuth: true } },
    { path: '/profile', name: 'profile', component: () => import('../views/ProfileView.vue'), meta: { requiresAuth: true } },
    { path: '/user/:username', name: 'user-profile', component: () => import('../views/UserProfileView.vue') },
    { path: '/addresses', name: 'addresses', component: () => import('../views/AddressesView.vue'), meta: { requiresAuth: true } },
    { path: '/login', name: 'login', component: () => import('../views/LoginView.vue'), meta: { guestOnly: true, layout: 'blank' } },
    { path: '/register', name: 'register', component: () => import('../views/RegisterView.vue'), meta: { guestOnly: true, layout: 'blank' } },
    { path: '/admin', name: 'admin', component: () => import('../views/AdminView.vue'), meta: { layout: 'blank' } },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('../views/NotFoundView.vue') }
]

const router = createRouter({
    history: createWebHashHistory(),
    routes,
    scrollBehavior(to, _from, savedPosition) {
        if (savedPosition) return savedPosition
        if (to.hash) return { el: to.hash, behavior: 'smooth' }
        return { top: 0 }
    }
})

router.beforeEach(async (to) => {
    const user = useUserStore()
    await user.bootstrap()

    if (to.meta.requiresAuth && !user.isLoggedIn) {
        useToastStore().ok('请先登录')
        return { name: 'login', query: { redirect: to.fullPath } }
    }
    if (to.meta.guestOnly && user.isLoggedIn) {
        return { name: 'home' }
    }
})

router.afterEach((to) => {
    const titles = {
        home: '冀遗筑梦',
        'home-current': '经典主页',
        product: '藏品详情',
        search: '搜索',
        category: '分类浏览',
        cart: '选藏清单',
        favorites: '珍藏夹',
        pay: '结缘确权',
        orders: '我的订单',
        'order-detail': '订单详情',
        refunds: '我的退款',
        profile: '个人中心',
        'user-profile': '收藏家主页',
        addresses: '收货地址',
        login: '登录',
        register: '注册',
        admin: '管理后台',
        'not-found': '页面不存在'
    }
    document.title = `${titles[to.name] || '冀遗筑梦'} · 冀遗筑梦`
})

export default router
