<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../api'
import { useUserStore } from '../stores/user'
import { useCartStore } from '../stores/cart'
import { useFavoritesStore } from '../stores/favorites'
import { useUiStore } from '../stores/ui'
import CartDrawer from '../components/CartDrawer.vue'

// 全站唯一的侧边栏 + 顶栏。
// 旧版每个页面各复制一份（index 用 series-node/series-axis，cart/favorites 用
// dynasty-mark/time-ruler，class 名都不一样），改一处要改 9 个文件。
const route = useRoute()
const router = useRouter()
const user = useUserStore()
const cart = useCartStore()
const favorites = useFavoritesStore()
const ui = useUiStore()

const keyword = ref('')
const categories = ref([])
const menuOpen = ref(false)

const sidebarTitle = computed(() => {
    if (route.name === 'category') return `分类 · ${route.params.name}`
    return null
})

function onSearch() {
    const q = keyword.value.trim()
    if (!q) return
    router.push({ name: 'search', query: { q } })
}

function logout() {
    menuOpen.value = false
    user.logout()
    cart.reset()
    favorites.reset()
    if (route.meta.requiresAuth) router.push('/')
}

// 点击空白处收起用户菜单
function onDocClick() { menuOpen.value = false }
onMounted(async () => {
    document.addEventListener('click', onDocClick)
    try {
        // 侧边栏的「品类轴」接真实分类。
        // 旧版这 4 个节点写死成地名（正定华塔/避暑山庄/赵州古桥/史诗典藏），
        // 点击只改背景色 + 埋点，后端根本不收分类参数——所谓筛选是纯装饰。
        categories.value = (await api.listCategories()).items || []
    } catch (e) {
        console.error('分类加载失败', e)
    }
})
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))

const pad = (i) => String(i + 1).padStart(2, '0')
</script>

<template>
    <aside class="sidebar">
        <RouterLink to="/" class="brand-seal" title="冀遗筑梦">
            <div class="brand-vertical">冀遗筑梦</div>
        </RouterLink>

        <nav class="series-axis">
            <RouterLink
                v-for="(c, i) in categories"
                :key="c.category"
                class="series-node"
                :class="{ active: route.name === 'category' && route.params.name === c.category }"
                :to="`/category/${encodeURIComponent(c.category)}`"
            >
                <span class="node-num">{{ pad(i) }}</span>
                <span class="node-text">{{ c.category }} ({{ c.count }})</span>
            </RouterLink>

            <span v-if="!categories.length" class="node-num" style="opacity:.3">—</span>
        </nav>

        <div class="social-footer">
            <i class="fa fa-weixin"></i>
            <i class="fa fa-weibo"></i>
        </div>
    </aside>

    <div class="main-content">
        <header class="top-bar">
            <div class="search-engine">
                <i class="fa fa-search"></i>
                <input
                    v-model="keyword"
                    type="text"
                    placeholder="SEARCH..."
                    @keyup.enter="onSearch"
                >
            </div>

            <!-- 珍藏夹 / 我的订单：旧版首页侧边栏没有收藏夹入口，
                 而唯一的入口在「从来打不开的」商品详情页里。
                 订单则干脆没有任何用户侧页面。 -->
            <RouterLink class="top-nav-item" to="/favorites" title="我的珍藏">
                <i class="fa fa-heart-o"></i>
                <span>珍藏夹</span>
                <span v-if="favorites.count" id="cartBadge">{{ favorites.count }}</span>
            </RouterLink>

            <RouterLink class="top-nav-item" to="/orders" title="我的订单">
                <i class="fa fa-file-text-o"></i>
                <span>订单</span>
            </RouterLink>

            <div class="cart-trigger" @click="cart.toggleDrawer(true)">
                <i class="fa fa-shopping-cart"></i>
                <span>CART</span>
                <span id="cartBadge">{{ cart.count }}</span>
            </div>

            <div v-if="user.isLoggedIn" class="user-menu" @click.stop>
                <div class="auth-btn" @click="menuOpen = !menuOpen">
                    <i class="fa fa-user-o"></i>
                    <span>{{ user.username }}</span>
                </div>
                <div v-if="menuOpen" class="user-dropdown">
                    <RouterLink to="/profile" @click="menuOpen = false">个人中心</RouterLink>
                    <RouterLink to="/orders" @click="menuOpen = false">我的订单</RouterLink>
                    <RouterLink to="/favorites" @click="menuOpen = false">我的珍藏</RouterLink>
                    <button @click="logout">退出登录</button>
                </div>
            </div>

            <div v-else class="auth-btn" @click="ui.requireLogin('login')">
                <i class="fa fa-user-o"></i>
                <span>SIGN IN / JOIN</span>
            </div>
        </header>

        <main>
            <slot />
        </main>

        <footer class="site-footer">
            © 2026 JIYI ZHUMENG DIGITAL TECHNOLOGY. ALL RIGHTS RESERVED.
        </footer>
    </div>

    <CartDrawer />
</template>
