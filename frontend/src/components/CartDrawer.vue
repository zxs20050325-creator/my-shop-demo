<script setup>
import { useRouter } from 'vue-router'
import { imageUrl } from '../api'
import { useCartStore } from '../stores/cart'

const cart = useCartStore()
const router = useRouter()

function goCart() {
    cart.toggleDrawer(false)
    router.push('/cart')
}

function goDetail(productId) {
    cart.toggleDrawer(false)
    router.push(`/product/${productId}`)
}
</script>

<template>
    <div class="drawer-mask" :class="{ active: cart.drawerOpen }" @click="cart.toggleDrawer(false)"></div>
    <aside class="surprise-drawer" :class="{ open: cart.drawerOpen }">
        <button class="drawer-close" @click="cart.toggleDrawer(false)" aria-label="关闭">&times;</button>
        <div class="drawer-head">
            <span class="en">SELECTED COLLECTION</span>
            <h3>博古架</h3>
        </div>

        <div v-if="!cart.items.length" class="drawer-empty">还没有选藏</div>

        <div v-for="item in cart.items" :key="item.id" class="drawer-item">
            <img :src="imageUrl(item.sku.product.img)" :alt="item.sku.product.name"
                 @click="goDetail(item.sku.product.id)">
            <div>
                <strong>{{ item.sku.product.name }}</strong>
                <span>{{ item.sku.specText }} · ¥ {{ item.sku.price }}</span>
                <div class="drawer-qty">
                    <button @click="cart.setQuantity(item.id, item.quantity - 1)">−</button>
                    <span>{{ item.quantity }}</span>
                    <button @click="cart.setQuantity(item.id, item.quantity + 1)">+</button>
                    <button class="rm" @click="cart.remove(item.id)">移除</button>
                </div>
            </div>
        </div>

        <div v-if="cart.items.length" class="drawer-foot">
            <div><span>合计</span><strong>¥ {{ cart.totalPrice.toFixed(2) }}</strong></div>
            <button class="btn-reveal-all" style="width:100%" @click="goCart">
                查看选藏清单
            </button>
        </div>
    </aside>
</template>

<style scoped>
.drawer-head { padding: 34px 28px 18px; border-bottom: 1px solid var(--c-grid); }
.drawer-head h3 { font-size: 24px; }
.drawer-empty { padding: 50px 28px; color: var(--c-ink-soft); text-align: center; }
.drawer-item { display: flex; gap: 14px; padding: 16px 24px; border-bottom: 1px solid var(--c-grid); }
.drawer-item img { width: 70px; height: 70px; object-fit: cover; cursor: pointer; }
.drawer-item > div { flex: 1; min-width: 0; }
.drawer-item strong { display: block; font-size: 13px; }
.drawer-item span { display: block; margin-top: 5px; color: var(--c-ink-soft); font-size: 11px; }
.drawer-qty { display: flex; align-items: center; gap: 8px; margin-top: 9px; }
.drawer-qty button { border: 1px solid var(--c-grid); background: #fff; min-width: 28px; height: 28px; }
.drawer-qty .rm { border: 0; color: var(--c-danger); }
.drawer-foot { padding: 22px 24px; border-top: 1px solid var(--c-grid); }
.drawer-foot > div { display: flex; justify-content: space-between; margin-bottom: 14px; }
.drawer-foot strong { color: var(--c-danger); }
</style>
