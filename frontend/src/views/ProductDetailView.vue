<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api, imageUrl } from '../api'
import { useCartStore } from '../stores/cart'
import { useFavoritesStore } from '../stores/favorites'
import { useUserStore } from '../stores/user'
import { useUiStore } from '../stores/ui'

const route = useRoute()
const router = useRouter()
const cart = useCartStore()
const favorites = useFavoritesStore()
const user = useUserStore()
const ui = useUiStore()

const product = ref(null)
const selectedSkuId = ref(null)
const loading = ref(true)
const notFound = ref(false)
const qty = ref(1)
const busy = ref(false)

const selectedSku = computed(() =>
    product.value?.skus?.find(sku => Number(sku.id) === Number(selectedSkuId.value)) || null)
const favorited = computed(() => product.value && favorites.isFavorited(product.value.id))

async function load(id) {
    loading.value = true
    notFound.value = false
    product.value = null
    try {
        product.value = await api.getProduct(id)
        selectedSkuId.value = product.value.skus?.[0]?.id || null
        qty.value = 1
        api.track('查看商品详情', product.value.name)
    } catch {
        notFound.value = true
    } finally {
        loading.value = false
    }
}

function selectSku(sku) {
    if (sku.stock <= 0) return
    selectedSkuId.value = sku.id
    qty.value = Math.min(qty.value, sku.stock)
}

async function onAdd() {
    if (!user.isLoggedIn) return ui.requireLogin()
    if (!selectedSku.value) return
    busy.value = true
    try {
        await cart.add(selectedSku.value.id, qty.value)
    } finally {
        busy.value = false
    }
}

async function onFav() {
    if (!user.isLoggedIn) return ui.requireLogin()
    await favorites.toggle(product.value)
}

async function buyNow() {
    if (!user.isLoggedIn) return ui.requireLogin()
    const ok = await onAdd()
    if (ok !== false) router.push('/cart')
}

onMounted(() => load(route.params.id))
watch(() => route.params.id, (id) => id && load(id))
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
            </div>
        </div>

        <div v-else-if="notFound" class="empty-state">
            <i class="fa fa-chain-broken"></i>
            <h3>藏品不存在或已下架</h3>
            <RouterLink to="/"><button class="btn-reveal-all">回到首页</button></RouterLink>
        </div>

        <div v-else-if="product" class="detail-wrap">
            <div class="detail-visual">
                <img :src="imageUrl(product.img)" :alt="product.name"
                     @error="event => { event.target.src = imageUrl('') }">
            </div>

            <div class="detail-info">
                <span class="artifact-rarity">{{ product.category }}</span>
                <h1>{{ product.name }}</h1>
                <div class="detail-price">¥ {{ selectedSku?.price ?? product.price }}</div>

                <p class="detail-desc">
                    {{ product.description || `本品属于「${product.category}」序列。以河北古建筑为原型，经数字化采集后重构而成，开盒即得数字化藏品凭证。` }}
                </p>

                <h3 class="block-title">选择规格 / SELECT SPEC</h3>
                <div class="sku-list">
                    <button v-for="sku in product.skus" :key="sku.id"
                            class="sku-btn"
                            :class="{ active: Number(selectedSkuId) === Number(sku.id), disabled: sku.stock <= 0 }"
                            :disabled="sku.stock <= 0"
                            @click="selectSku(sku)">
                        <span>{{ sku.specText }}</span>
                        <small>¥ {{ sku.price }} · 库存 {{ sku.stock }}</small>
                    </button>
                </div>

                <dl class="detail-meta">
                    <div><dt>编号 / NO.</dt><dd>#{{ String(product.id).padStart(4, '0') }}</dd></div>
                    <div><dt>库存 / STOCK</dt><dd>{{ selectedSku?.stock || 0 }}</dd></div>
                </dl>

                <div class="qty-row">
                    <span class="qty-label">数量 / QTY</span>
                    <div class="qty-ctrl">
                        <button @click="qty = Math.max(1, qty - 1)" :disabled="qty <= 1">−</button>
                        <span>{{ qty }}</span>
                        <button @click="qty = Math.min(selectedSku?.stock || 1, qty + 1)"
                                :disabled="qty >= (selectedSku?.stock || 1)">+</button>
                    </div>
                </div>

                <div class="detail-actions">
                    <button class="btn-reveal-all" :disabled="busy || !selectedSku?.stock" @click="onAdd">
                        {{ busy ? '加入中…' : '入博古架' }}
                    </button>
                    <button class="btn-outline" :disabled="!selectedSku?.stock" @click="buyNow">立即结缘</button>
                    <button class="icon-btn big" :class="{ active: favorited }" @click="onFav">
                        <i class="fa" :class="favorited ? 'fa-heart' : 'fa-heart-o'"></i>
                    </button>
                </div>
            </div>
        </div>
    </section>
</template>

<style scoped>
.back-link { background: none; border: none; color: var(--c-ink-soft); margin-bottom: 34px; }
.detail-wrap { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: start; }
.detail-visual { border: 1.5px solid var(--c-primary); background: #fafafa; box-shadow: 28px 28px 0 rgba(193, 162, 104, .14); }
.detail-visual img { width: 100%; aspect-ratio: 3/4; object-fit: cover; }
.detail-info h1 { font-size: 36px; margin: 16px 0 18px; }
.detail-price { font-family: var(--f-mono); font-size: 34px; color: var(--c-danger); margin-bottom: 24px; }
.detail-desc { line-height: 2; opacity: .72; margin-bottom: 28px; }
.block-title { font-family: var(--f-mono); font-size: 12px; color: var(--c-ink-soft); margin-bottom: 12px; }
.sku-list { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 24px; }
.sku-btn { border: 1.5px solid var(--c-grid); background: #fff; padding: 12px 16px; text-align: left; }
.sku-btn small { display: block; margin-top: 5px; color: var(--c-ink-soft); }
.sku-btn.active { border-color: var(--c-primary); background: var(--c-primary); color: #fff; }
.sku-btn.active small { color: rgba(255,255,255,.75); }
.sku-btn.disabled { opacity: .35; text-decoration: line-through; }
.detail-meta { display: flex; gap: 46px; padding: 20px 0; border-top: 1px solid var(--c-grid); margin-bottom: 24px; }
.detail-meta dt { font-size: 10px; color: var(--c-ink-soft); }
.qty-row { display: flex; align-items: center; gap: 18px; margin-bottom: 26px; }
.qty-ctrl { display: flex; border: 1.5px solid var(--c-primary); }
.qty-ctrl button { width: 40px; height: 40px; border: 0; background: none; }
.qty-ctrl span { min-width: 52px; text-align: center; line-height: 40px; }
.detail-actions { display: flex; gap: 12px; }
.detail-skeleton { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; }
@media (max-width: 1100px) {
    .detail-wrap, .detail-skeleton { grid-template-columns: 1fr; gap: 34px; }
}
</style>
