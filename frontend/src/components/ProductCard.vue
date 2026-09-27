<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { imageUrl } from '../api'
import { useFavoritesStore } from '../stores/favorites'
import { useUserStore } from '../stores/user'
import { useUiStore } from '../stores/ui'

const props = defineProps({
    product: { type: Object, required: true }
})

const router = useRouter()
const favorites = useFavoritesStore()
const user = useUserStore()
const ui = useUiStore()

const revealed = ref(false)
const favorited = computed(() => favorites.isFavorited(props.product.id))

function reveal() {
    revealed.value = true
}

function openDetail() {
    if (props.product.placeholder) return
    router.push(`/product/${props.product.id}`)
}

async function onFav(event) {
    event.stopPropagation()
    if (!user.isLoggedIn) return ui.requireLogin()
    await favorites.toggle(props.product)
}
</script>

<template>
    <div v-if="product.placeholder" class="placeholder-product-card">
        <div class="placeholder-product-mark">
            <span></span><span></span><span></span>
        </div>
        <strong>{{ product.name }}</strong>
        <small>{{ product.code }}</small>
        <p>图片、规格和档案内容待补充</p>
    </div>

    <div v-else class="blind-card" :class="{ 'is-revealed': revealed }" @click="reveal">
        <div class="card-front">
            <div class="seal-character">冀</div>
            <span class="hint">TAP TO REVEAL</span>
            <span class="price-tag">¥ {{ product.price }}</span>
        </div>

        <div class="card-back">
            <div class="artifact-visual">
                <img class="artifact-img" :src="imageUrl(product.img)" :alt="product.name"
                     loading="lazy" @error="event => { event.target.src = imageUrl('') }">
            </div>

            <div class="artifact-info">
                <span class="artifact-rarity">{{ product.category || '非遗手作' }}</span>
                <h3 class="artifact-name">{{ product.name }}</h3>
                <div class="artifact-price">
                    ¥ {{ product.price }}
                    <small>{{ product.stock > 0 ? `库存 ${product.stock}` : '暂时缺货' }}</small>
                </div>

                <div class="artifact-actions">
                    <button class="btn-reveal-all" :disabled="product.stock <= 0" @click.stop="openDetail">
                        {{ product.stock > 0 ? '选择规格' : '已售罄' }}
                    </button>
                    <button class="icon-btn" :class="{ active: favorited }"
                            :title="favorited ? '移出珍藏' : '加入珍藏'" @click="onFav">
                        <i class="fa" :class="favorited ? 'fa-heart' : 'fa-heart-o'"></i>
                    </button>
                    <button class="icon-btn" title="查看详情" @click.stop="openDetail">
                        <i class="fa fa-long-arrow-right"></i>
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.placeholder-product-card {
    aspect-ratio: 3/4;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 24px;
    text-align: center;
    color: var(--c-ink-soft);
    border: 1px dashed rgba(47,72,66,.34);
    background:
        linear-gradient(135deg, rgba(193,162,104,.1), rgba(47,72,66,.03)),
        repeating-linear-gradient(-45deg, transparent 0 10px, rgba(47,72,66,.025) 10px 11px);
}
.placeholder-product-mark { display: flex; gap: 6px; }
.placeholder-product-mark span {
    width: 8px;
    height: 8px;
    transform: rotate(45deg);
    background: var(--c-accent);
    opacity: .5;
}
.placeholder-product-card strong { color: var(--c-primary); font-size: 15px; }
.placeholder-product-card small { font-family: var(--f-mono); font-size: 9px; letter-spacing: 1px; }
.placeholder-product-card p { max-width: 180px; font-size: 11px; line-height: 1.7; }
</style>
