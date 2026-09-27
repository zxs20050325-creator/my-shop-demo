<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../api'
import { useUserStore } from '../stores/user'
import { useCartStore } from '../stores/cart'
import { useFavoritesStore } from '../stores/favorites'
import { useUiStore } from '../stores/ui'
import CartDrawer from '../components/CartDrawer.vue'

const route = useRoute()
const router = useRouter()
const user = useUserStore()
const cart = useCartStore()
const favorites = useFavoritesStore()
const ui = useUiStore()

const keyword = ref('')
const categories = ref([])
const menuOpen = ref(false)
const sidebarExpanded = ref(true)
const categoryOpen = ref(false)
const pad = (index) => String(index + 1).padStart(2, '0')
const categoryIcons = {
    数字藏品: 'fa-cubes',
    文创周边: 'fa-gift',
    数字画作: 'fa-picture-o',
    典藏精品: 'fa-diamond',
    非遗手作: 'fa-hand-paper-o'
}
const totalCatalog = computed(() =>
    categories.value.reduce((sum, item) => sum + Number(item.count || 0), 0))
const categoryMax = computed(() =>
    Math.max(1, ...categories.value.map(item => Number(item.count || 0))))
const categoryBars = computed(() =>
    categories.value.slice(0, 4).map(item => ({
        ...item,
        progress: Math.max(8, Math.round(Number(item.count || 0) / categoryMax.value * 100))
    })))
const quickLinks = computed(() => [
    { to: '/', icon: 'fa-home', label: '首页档案', badge: '' },
    { to: '/favorites', icon: 'fa-heart-o', label: '我的珍藏', badge: favorites.count || '' },
    { to: '/orders', icon: 'fa-file-text-o', label: '我的订单', badge: '' },
    { to: '/profile', icon: 'fa-user-o', label: '个人中心', badge: '' }
])
const iconFor = (category) => categoryIcons[category] || 'fa-cube'

function onSearch() {
    const q = keyword.value.trim()
    if (q) router.push({ name: 'search', query: { q } })
}

async function logout() {
    menuOpen.value = false
    await user.logout()
    cart.reset()
    favorites.reset()
    if (route.meta.requiresAuth) router.push('/')
}

function onDocClick() {
    menuOpen.value = false
}

function toggleCategories() {
    if (!sidebarExpanded.value) {
        sidebarExpanded.value = true
        localStorage.setItem('jiyi_sidebar_expanded', 'true')
    }
    categoryOpen.value = !categoryOpen.value
}

function isQuickActive(link) {
    if (link.to === '/') return route.path === '/'
    return route.path.startsWith(link.to)
}

onMounted(async () => {
    document.addEventListener('click', onDocClick)
    sidebarExpanded.value = window.innerWidth > 1100
    try {
        categories.value = (await api.listCategories()).items || []
    } catch {
        categories.value = []
    }
})

onBeforeUnmount(() => document.removeEventListener('click', onDocClick))
</script>

<template>
    <aside class="sidebar" :class="{ compact: !sidebarExpanded }">
        <div class="sidebar-top">
            <RouterLink to="/" class="brand-seal" title="冀遗筑梦">
                <span class="brand-mark">冀</span>
                <span class="brand-copy"><strong>冀遗筑梦</strong><small>数字非遗档案</small></span>
            </RouterLink>
            <div class="archive-status">
                <span class="status-dot"></span>
                <span class="archive-status-text">数字档案在线</span>
            </div>
        </div>

        <nav class="sidebar-primary">
            <span class="side-section-label">主要内容</span>
            <button class="sidebar-quick" :class="{ active: cart.drawerOpen }"
                    @click="cart.toggleDrawer(true)">
                <i class="fa fa-shopping-bag"></i>
                <span>博古架</span>
                <em v-if="cart.count">{{ cart.count }}</em>
            </button>
            <RouterLink v-for="link in quickLinks" :key="link.to"
                        class="sidebar-quick"
                        :class="{ active: isQuickActive(link) }"
                        :to="link.to">
                <i class="fa" :class="link.icon"></i>
                <span>{{ link.label }}</span>
                <em v-if="link.badge">{{ link.badge }}</em>
            </RouterLink>
        </nav>

        <div class="sidebar-spacer"></div>

        <section class="sidebar-categories" :class="{ open: categoryOpen }">
            <button class="category-toggle" @click="toggleCategories">
                <i class="fa fa-th-large"></i>
                <span>藏品分类</span>
                <em>{{ categories.length }}</em>
                <i class="fa" :class="categoryOpen ? 'fa-angle-up' : 'fa-angle-down'"></i>
            </button>
            <div class="category-list">
                <RouterLink v-for="item in categories" :key="item.category"
                            class="series-node"
                            :class="{ active: route.name === 'category' && route.params.name === item.category }"
                            :to="`/category/${encodeURIComponent(item.category)}`">
                    <i class="fa" :class="iconFor(item.category)"></i>
                    <span class="node-text">{{ item.category }}</span>
                    <span class="node-count">{{ item.count }}</span>
                </RouterLink>
                <div class="category-bars">
                    <div v-for="item in categoryBars" :key="item.category">
                        <span><em>{{ item.category }}</em><strong>{{ item.count }}</strong></span>
                        <i><b :style="{ width: item.progress + '%' }"></b></i>
                    </div>
                </div>
            </div>
        </section>

        <div class="sidebar-footer">
            <div class="sidebar-metrics">
                <div><span>藏品总数</span><strong>{{ totalCatalog }}</strong></div>
                <div><span>档案分类</span><strong>{{ categories.length }}</strong></div>
            </div>

            <RouterLink v-if="user.isLoggedIn" class="sidebar-user"
                        :to="`/user/${encodeURIComponent(user.username)}`">
                <span>{{ (user.user?.nickname || user.username || '客').slice(0, 1) }}</span>
                <div><strong>{{ user.user?.nickname || user.username }}</strong><small>{{ user.isAdmin ? '管理员' : '数字收藏家' }}</small></div>
            </RouterLink>
            <div v-else class="sidebar-user guest" @click="ui.requireLogin('login')">
                <span>客</span>
                <div><strong>登录账号</strong><small>同步收藏与订单</small></div>
            </div>
        </div>
    </aside>

    <div class="main-content">
        <header class="top-bar">
            <div class="search-engine">
                <i class="fa fa-search"></i>
                <input v-model="keyword" placeholder="SEARCH..." @keyup.enter="onSearch">
            </div>

            <RouterLink class="top-nav-item" to="/favorites">
                <i class="fa fa-heart-o"></i><span>珍藏夹</span>
                <span v-if="favorites.count" id="cartBadge">{{ favorites.count }}</span>
            </RouterLink>
            <RouterLink class="top-nav-item" to="/orders">
                <i class="fa fa-file-text-o"></i><span>订单</span>
            </RouterLink>
            <div class="cart-trigger" @click="cart.toggleDrawer(true)">
                <i class="fa fa-shopping-cart"></i><span>购物车</span>
                <span id="cartBadge">{{ cart.count }}</span>
            </div>

            <div v-if="user.isLoggedIn" class="user-menu" @click.stop>
                <div class="auth-btn" @click="menuOpen = !menuOpen">
                    <i class="fa fa-user-o"></i><span>{{ user.username }}</span>
                </div>
                <div v-if="menuOpen" class="user-dropdown">
                    <RouterLink to="/profile" @click="menuOpen = false">个人中心</RouterLink>
                    <RouterLink to="/addresses" @click="menuOpen = false">收货地址</RouterLink>
                    <RouterLink to="/orders" @click="menuOpen = false">我的订单</RouterLink>
                    <RouterLink to="/refunds" @click="menuOpen = false">退款记录</RouterLink>
                    <RouterLink v-if="user.isAdmin" to="/admin" @click="menuOpen = false">管理后台</RouterLink>
                    <button @click="logout">退出登录</button>
                </div>
            </div>
            <div v-else class="auth-btn" @click="ui.requireLogin('login')">
                <i class="fa fa-user-o"></i><span>SIGN IN / JOIN</span>
            </div>
        </header>

        <main><slot /></main>
        <footer class="site-footer">© 2026 JIYI ZHUMENG DIGITAL TECHNOLOGY. ALL RIGHTS RESERVED.</footer>
    </div>
    <CartDrawer />
</template>

<style scoped>
.sidebar {
    width: 236px;
    align-items: stretch;
    padding: 18px 10px;
    transition: width .28s ease, padding .28s ease;
    overflow-x: hidden;
}

.sidebar.compact {
    width: 72px;
    align-items: center;
    padding-inline: 8px;
}

.sidebar + .main-content {
    margin-left: 236px;
    transition: margin-left .28s ease;
}

.sidebar.compact + .main-content {
    margin-left: 72px;
}

.sidebar-top {
    position: relative;
    width: 100%;
    display: grid;
    justify-items: center;
    gap: 10px;
    flex-shrink: 0;
}

.sidebar.compact .brand-seal {
    justify-content: center;
}

.sidebar-top .brand-seal {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 12px;
    width: 100%;
    min-height: 52px;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
    overflow: hidden;
}

.sidebar-top .brand-seal::after {
    display: none;
}

.brand-mark {
    flex: 0 0 auto;
    width: 42px;
    height: 42px;
    display: grid;
    place-items: center;
    border-radius: 4px;
    background: #a33b32;
    color: #fff;
    font-family: var(--f-art);
    font-size: 24px;
    line-height: 1;
    box-shadow: 4px 4px 0 rgba(193,162,104,.3);
}

.brand-copy {
    display: none;
    min-width: 0;
    text-align: left;
}

.brand-copy strong,
.brand-copy small {
    display: block;
}

.brand-copy strong {
    letter-spacing: 2px;
    font-size: 14px;
    color: var(--c-primary);
}

.brand-copy small {
    margin-top: 4px;
    color: var(--c-ink-soft);
    font-size: 9px;
    font-weight: 400;
}

.archive-status {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    color: var(--c-ink-soft);
    font-size: 9px;
}

.status-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #3f9a67;
    box-shadow: 0 0 0 4px rgba(63,154,103,.12);
}

.archive-status-text {
    display: none;
    white-space: nowrap;
}

.sidebar-primary {
    width: 100%;
    display: grid;
    gap: 5px;
    padding: 18px 8px 10px;
    border-top: 1px solid var(--c-grid);
    margin-top: 16px;
}

.sidebar-spacer {
    flex: 1;
    min-height: 24px;
}

.sidebar-categories {
    width: 100%;
    padding: 8px;
    border-top: 1px solid var(--c-grid);
}

.category-toggle {
    width: 100%;
    min-height: 40px;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 12px;
    border: 0;
    border-radius: 7px;
    background: rgba(47,72,66,.04);
    color: var(--c-primary);
}

.category-toggle:hover {
    background: rgba(193,162,104,.12);
}

.category-toggle > span {
    display: none;
    white-space: nowrap;
    font-size: 11px;
    font-weight: 700;
}

.category-toggle > em {
    display: none;
    margin-left: auto;
    min-width: 22px;
    padding: 2px 7px;
    border-radius: 999px;
    background: rgba(47,72,66,.09);
    color: var(--c-ink-soft);
    font-family: var(--f-mono);
    font-size: 9px;
    font-style: normal;
}

.category-toggle > i:last-child {
    display: none;
    margin-left: 4px;
}

.category-list {
    max-height: 0;
    opacity: 0;
    overflow: hidden;
    transition: max-height .24s ease, opacity .18s ease;
}

.sidebar-categories.open .category-list {
    max-height: 360px;
    opacity: 1;
    overflow-y: auto;
}

.sidebar-categories .series-node {
    margin-top: 5px;
}

.side-section-label {
    display: none;
    padding: 6px 10px;
    color: var(--c-ink-soft);
    font-family: var(--f-mono);
    font-size: 8px;
    letter-spacing: 1.5px;
    text-align: left;
}

.series-node {
    min-height: 42px;
    justify-content: flex-start;
    gap: 12px;
    padding: 10px 13px;
    border-radius: 7px;
}

.series-node i {
    width: 18px;
    flex: 0 0 18px;
    color: currentColor;
    text-align: center;
    font-size: 14px;
}

.node-count {
    display: none;
    margin-left: auto;
    min-width: 24px;
    padding: 2px 7px;
    border-radius: 999px;
    background: rgba(47,72,66,.09);
    font-family: var(--f-mono);
    font-size: 9px;
    text-align: center;
}

.series-node.active .node-count {
    background: rgba(255,255,255,.16);
}

.category-bars {
    display: none;
    gap: 10px;
    padding: 14px 10px 6px;
    border-top: 1px solid var(--c-grid);
    margin-top: 8px;
}

.category-bars > div > span {
    display: flex;
    justify-content: space-between;
    margin-bottom: 6px;
    color: var(--c-ink-soft);
    font-size: 9px;
}

.category-bars em {
    font-style: normal;
}

.category-bars i {
    display: block;
    height: 4px;
    overflow: hidden;
    border-radius: 999px;
    background: rgba(47,72,66,.09);
}

.category-bars b {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: var(--c-accent);
}

.sidebar-footer {
    width: 100%;
    display: grid;
    gap: 5px;
    padding: 8px;
    border-top: 1px solid var(--c-grid);
    flex-shrink: 0;
}

.sidebar-quick {
    width: 100%;
    min-height: 40px;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 9px 13px;
    border: 0;
    border-radius: 7px;
    background: transparent;
    color: var(--c-primary);
    text-align: left;
}

.sidebar-quick:hover {
    background: rgba(193,162,104,.12);
}

.sidebar-quick i {
    width: 18px;
    flex: 0 0 18px;
    text-align: center;
}

.sidebar-quick > span {
    display: none;
    white-space: nowrap;
    font-size: 11px;
    font-weight: 700;
}

.sidebar-quick em {
    display: none;
    margin-left: auto;
    padding: 2px 7px;
    border-radius: 999px;
    background: var(--c-cinnabar, #b23a32);
    color: #fff;
    font-family: var(--f-mono);
    font-size: 9px;
    font-style: normal;
}

.sidebar-metrics {
    display: none;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    padding: 12px 6px;
}

.sidebar-metrics div {
    padding: 10px;
    background: rgba(47,72,66,.045);
}

.sidebar-metrics span,
.sidebar-metrics strong {
    display: block;
}

.sidebar-metrics span {
    color: var(--c-ink-soft);
    font-size: 8px;
}

.sidebar-metrics strong {
    margin-top: 4px;
    font-family: var(--f-mono);
    font-size: 17px;
}

.sidebar-user {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 10px 7px;
    cursor: pointer;
}

.sidebar-user > span {
    width: 32px;
    height: 32px;
    flex: 0 0 32px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: var(--c-primary);
    color: #fff;
    font-family: var(--f-art);
}

.sidebar-user > div {
    display: none;
    min-width: 0;
    text-align: left;
}

.sidebar-user strong,
.sidebar-user small {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.sidebar-user strong {
    font-size: 11px;
}

.sidebar-user small {
    margin-top: 3px;
    color: var(--c-ink-soft);
    font-size: 8px;
}

.sidebar:not(.compact) .sidebar-top {
    justify-items: stretch;
}

.sidebar:not(.compact) .sidebar-top .brand-seal {
    width: 100%;
    justify-content: flex-start;
    padding: 10px 14px;
}

.sidebar:not(.compact) .brand-copy,
.sidebar:not(.compact) .archive-status-text,
.sidebar:not(.compact) .side-section-label,
.sidebar:not(.compact) .node-text,
.sidebar:not(.compact) .node-count,
.sidebar:not(.compact) .sidebar-quick > span,
.sidebar:not(.compact) .sidebar-quick em,
.sidebar:not(.compact) .sidebar-user > div {
    display: block;
}

.sidebar:not(.compact) .archive-status {
    justify-content: flex-start;
    padding-left: 16px;
}

.sidebar:not(.compact) .category-toggle > span,
.sidebar:not(.compact) .category-toggle > em,
.sidebar:not(.compact) .category-toggle > i:last-child {
    display: block;
}

.sidebar:not(.compact) .category-toggle > i:last-child {
    margin-left: auto;
}

.sidebar-categories.open .category-bars,
.sidebar:not(.compact) .sidebar-metrics {
    display: grid;
}

.sidebar:not(.compact) .sidebar-user {
    justify-content: flex-start;
}

@media (max-width: 760px) {
    .sidebar,
    .sidebar:not(.compact) {
        width: 72px;
        align-items: center;
        padding-inline: 8px;
    }
    .sidebar + .main-content,
    .sidebar.compact + .main-content {
        margin-left: 72px;
    }
    .sidebar:not(.compact) .brand-copy,
    .sidebar:not(.compact) .archive-status-text,
    .sidebar:not(.compact) .side-section-label,
    .sidebar:not(.compact) .node-text,
    .sidebar:not(.compact) .node-count,
    .sidebar:not(.compact) .sidebar-quick > span,
    .sidebar:not(.compact) .sidebar-quick em,
    .sidebar:not(.compact) .category-bars,
    .sidebar:not(.compact) .sidebar-metrics,
    .sidebar:not(.compact) .sidebar-user > div {
        display: none;
    }
}
</style>
