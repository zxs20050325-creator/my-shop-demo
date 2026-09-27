<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api, imageUrl } from '../api'
import { useCartStore } from '../stores/cart'
import { useFavoritesStore } from '../stores/favorites'
import { useUserStore } from '../stores/user'
import { useUiStore } from '../stores/ui'

// 旧版这个页面（697 行）全站没有任何链接指向它 —— 首页卡片点击是原地翻牌，
// 收藏夹的唯一入口又在这个页面里，于是一起变成死页面。
// 现在它有两条入口：商品卡背面的箭头，以及收藏夹/订单里的商品名。

const route = useRoute()
const router = useRouter()
const cart = useCartStore()
const favorites = useFavoritesStore()
const user = useUserStore()
const ui = useUiStore()

const product = ref(null)
const loading = ref(true)
const notFound = ref(false)
const qty = ref(1)
const busy = ref(false)

const favorited = computed(() => product.value && favorites.isFavorited(product.value.id))

async function load(id) {
    loading.value = true
    notFound.value = false
    product.value = null
    try {
        product.value = await api.getProduct(id)
        qty.value = 1
        api.track(user.username || '游客', '查看商品详情', product.value.name).catch(() => {})
    } catch (e) {
        notFound.value = true
    } finally {
        loading.value = false
    }
}

onMounted(() => load(route.params.id))
watch(() => route.params.id, (id) => { if (id) load(id) })

async function onAdd() {
    if (!user.isLoggedIn) return ui.requireLogin()
    busy.value = true
    try {
        await cart.add(product.value, qty.value)
    } finally {
        busy.value = false
    }
}

async function onFav() {
    if (!user.isLoggedIn) return ui.requireLogin()
    await favorites.toggle(product.value)
}

function buyNow() {
    if (!user.isLoggedIn) return ui.requireLogin()
    onAdd().then(() => router.push('/cart'))
}
</script>

<template>
    <section class="page-section">
        <button class="back-link" @click="router.back()">
            <i class="fa fa-angle-left"></i> 返回
        </button>

        <div v-if="loading" class="detail-skeleton">
            <div class="sk-img" style="height:520px"></div>
            <div>
                <div class="sk-text" style="height:26px;width:60%"></div>
                <div class="sk-text" style="margin-top:18px"></div>
                <div class="sk-text" style="margin-top:12px;width:40%"></div>
            </div>
        </div>

        <div v-else-if="notFound" class="empty-state">
            <i class="fa fa-chain-broken"></i>
            <h3>藏品不存在或已下架</h3>
            <p>它可能被管理员下架了，或者链接不对</p>
            <RouterLink to="/"><button class="btn-reveal-all">回到首页</button></RouterLink>
        </div>

        <div v-else-if="product" class="detail-wrap">
            <div class="detail-visual">
                <img :src="imageUrl(product.img)" :alt="product.name"
                     @error="(e) => { e.target.src = imageUrl('') }">
            </div>

            <div class="detail-info">
                <span class="artifact-rarity">{{ product.category || '非遗手作' }}</span>
                <h1>{{ product.name }}</h1>
                <div class="detail-price">¥ {{ product.price }}</div>

                <p class="detail-desc">
                    本品属于「{{ product.category || '非遗手作' }}」序列。以河北古建筑为原型，
                    经毫米级数字化采集后重构而成，附独立编号。开盒即得数字化藏品凭证。
                </p>

                <dl class="detail-meta">
                    <div><dt>编号 / NO.</dt><dd>#{{ String(product.id).padStart(4, '0') }}</dd></div>
                    <div><dt>状态 / STATUS</dt><dd>{{ product.active === 1 ? '在架' : '已下架' }}</dd></div>
                </dl>

                <div class="qty-row">
                    <span class="qty-label">数量 / QTY</span>
                    <div class="qty-ctrl">
                        <button @click="qty = Math.max(1, qty - 1)" :disabled="qty <= 1">−</button>
                        <span>{{ qty }}</span>
                        <button @click="qty = Math.min(99, qty + 1)" :disabled="qty >= 99">+</button>
                    </div>
                </div>

                <div class="detail-actions">
                    <button class="btn-reveal-all" :disabled="busy" @click="onAdd">
                        {{ busy ? '加入中…' : '入博古架' }}
                    </button>
                    <button class="btn-outline" @click="buyNow">立即结缘</button>
                    <button class="icon-btn big" :class="{ active: favorited }" @click="onFav"
                            :title="favorited ? '移出珍藏' : '加入珍藏'">
                        <i class="fa" :class="favorited ? 'fa-heart' : 'fa-heart-o'"></i>
                    </button>
                </div>
            </div>
        </div>
    </section>
</template>

<style scoped>
.back-link {
    background: none; border: none; color: var(--c-ink-soft);
    font-family: var(--f-mono); font-size: 12px; letter-spacing: 2px;
    margin-bottom: 34px; transition: 0.2s;
}
.back-link:hover { color: var(--c-accent); }

.detail-wrap { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: start; }
.detail-visual {
    border: 1.5px solid var(--c-primary); background: #fafafa;
    box-shadow: 28px 28px 0 rgba(193, 162, 104, 0.14);
}
.detail-visual img { width: 100%; aspect-ratio: 3/4; object-fit: cover; }

.detail-info { padding-top: 10px; }
.detail-info h1 { font-size: 36px; font-weight: 900; line-height: 1.3; margin: 16px 0 18px; }
.detail-price { font-family: var(--f-mono); font-size: 34px; font-weight: 900; color: var(--c-danger); margin-bottom: 26px; }
.detail-desc { font-size: 15px; line-height: 2; opacity: 0.72; margin-bottom: 30px; }

.detail-meta { display: flex; gap: 46px; padding: 20px 0; border-top: 1px solid var(--c-grid); border-bottom: 1px solid var(--c-grid); margin-bottom: 30px; }
.detail-meta dt { font-family: var(--f-mono); font-size: 10px; letter-spacing: 2px; color: var(--c-ink-soft); margin-bottom: 6px; }
.detail-meta dd { font-family: var(--f-mono); font-size: 15px; font-weight: 700; }

.qty-row { display: flex; align-items: center; gap: 18px; margin-bottom: 26px; }
.qty-label { font-family: var(--f-mono); font-size: 11px; letter-spacing: 2px; color: var(--c-ink-soft); }
.qty-ctrl { display: flex; align-items: center; gap: 0; border: 1.5px solid var(--c-primary); }
.qty-ctrl button {
    width: 40px; height: 40px; background: none; border: none;
    color: var(--c-primary); font-size: 18px; line-height: 1;
}
.qty-ctrl button:hover:not(:disabled) { background: var(--c-primary); color: #fff; }
.qty-ctrl button:disabled { opacity: 0.3; cursor: not-allowed; }
.qty-ctrl span { min-width: 52px; text-align: center; font-family: var(--f-mono); font-weight: 900; }

.detail-actions { display: flex; gap: 12px; align-items: stretch; }
.icon-btn.big { width: 54px; height: auto; }

.detail-skeleton { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; }

@media (max-width: 1100px) {
    .detail-wrap, .detail-skeleton { grid-template-columns: 1fr; gap: 34px; }
    .detail-info h1 { font-size: 26px; }
}
</style>
