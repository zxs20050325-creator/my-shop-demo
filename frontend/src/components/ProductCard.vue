<script setup>
import { ref, computed } from 'vue'
import { imageUrl } from '../api'
import { useCartStore } from '../stores/cart'
import { useFavoritesStore } from '../stores/favorites'
import { useUserStore } from '../stores/user'
import { useUiStore } from '../stores/ui'

const props = defineProps({
    product: { type: Object, required: true }
})

const cart = useCartStore()
const favorites = useFavoritesStore()
const user = useUserStore()
// 未登录时不做跳转，直接弹全站统一的登录框——避免用户正在浏览就被踢到别的页面
const ui = useUiStore()

// 旧版首页的卡片是「点一下原地翻牌」，翻过来之后再没有任何出路——
// 697 行的商品详情页因此全站没有入口。现在卡片背面有明确的「查看藏品」链接。
const revealed = ref(false)
const busy = ref(false)

const favorited = computed(() => favorites.isFavorited(props.product.id))

function reveal() {
    revealed.value = true
}

async function onAdd(e) {
    e.stopPropagation()
    if (!user.isLoggedIn) return ui.requireLogin()

    busy.value = true
    try {
        // 旧版这里写的是 addToCart(p, (product) => {...})，
        // 回调被传给了 common.js:316 的第 2 个形参 quantity，
        // 于是 quantity 变成一个函数（JSON 序列化时被丢弃），
        // 而 onSuccess 恒为 null ——「已入博古架」的提示从来没弹出来过。
        await cart.add(props.product, 1)
    } finally {
        busy.value = false
    }
}

async function onFav(e) {
    e.stopPropagation()
    if (!user.isLoggedIn) return ui.requireLogin()
    await favorites.toggle(props.product)
}
</script>

<template>
    <div class="blind-card" :class="{ 'is-revealed': revealed }" @click="reveal">
        <!-- 正面：未拆封 -->
        <div class="card-front">
            <div class="seal-character">冀</div>
            <span class="hint">TAP TO REVEAL</span>
            <span class="price-tag">¥ {{ product.price }}</span>
        </div>

        <!-- 背面：拆开后 -->
        <div class="card-back">
            <div class="artifact-visual">
                <img
                    class="artifact-img"
                    :src="imageUrl(product.img)"
                    :alt="product.name"
                    loading="lazy"
                    @error="(e) => { e.target.src = imageUrl('') }"
                >
            </div>

            <div class="artifact-info">
                <span class="artifact-rarity">{{ product.category || '非遗手作' }}</span>
                <h3 class="artifact-name">{{ product.name }}</h3>
                <div class="artifact-price">¥ {{ product.price }}</div>

                <div class="artifact-actions">
                    <button
                        class="btn-reveal-all"
                        :disabled="busy"
                        @click="onAdd"
                    >{{ busy ? '...' : '入博古架' }}</button>

                    <button
                        class="icon-btn"
                        :class="{ active: favorited }"
                        :title="favorited ? '移出珍藏' : '加入珍藏'"
                        @click="onFav"
                    >
                        <i class="fa" :class="favorited ? 'fa-heart' : 'fa-heart-o'"></i>
                    </button>

                    <!-- 详情页的入口。旧版从首页点卡片只能原地翻牌，永远进不去详情页。 -->
                    <RouterLink
                        class="icon-btn"
                        :to="`/product/${product.id}`"
                        title="查看藏品详情"
                        @click.stop
                    >
                        <i class="fa fa-long-arrow-right"></i>
                    </RouterLink>
                </div>
            </div>
        </div>
    </div>
</template>
