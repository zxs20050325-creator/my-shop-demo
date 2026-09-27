<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { imageUrl } from '../api'
import { useCartStore } from '../stores/cart'

const cart = useCartStore()
const router = useRouter()

onMounted(() => cart.load())
</script>

<template>
    <section class="page-section">
        <div class="page-head">
            <h2>选藏清单</h2>
            <span class="en">SELECTED COLLECTION // {{ cart.count }} ITEMS</span>
            <div class="rule"></div>
        </div>

        <div v-if="cart.loading" class="loading-line">正在取回你的博古架…</div>
        <div v-else-if="cart.error" class="empty-state">
            <p>{{ cart.error }}</p>
            <button class="btn-reveal-all" @click="cart.load()">重试</button>
        </div>
        <div v-else-if="!cart.items.length" class="empty-state">
            <i class="fa fa-shopping-basket"></i>
            <h3>博古架还是空的</h3>
            <RouterLink to="/"><button class="btn-reveal-all">去挑选藏品</button></RouterLink>
        </div>

        <template v-else>
            <div class="cart-list">
                <article v-for="item in cart.items" :key="item.id" class="cart-row">
                    <img :src="imageUrl(item.sku.product.img)" :alt="item.sku.product.name">
                    <div class="cart-name">
                        <RouterLink :to="`/product/${item.sku.product.id}`">{{ item.sku.product.name }}</RouterLink>
                        <span>{{ item.sku.specText }}</span>
                    </div>
                    <strong class="cart-price">¥ {{ item.sku.price }}</strong>
                    <div class="cart-qty">
                        <button @click="cart.setQuantity(item.id, item.quantity - 1)">−</button>
                        <span>{{ item.quantity }}</span>
                        <button @click="cart.setQuantity(item.id, item.quantity + 1)">+</button>
                    </div>
                    <strong class="cart-subtotal">¥ {{ (item.sku.price * item.quantity).toFixed(2) }}</strong>
                    <button class="btn-danger-outline btn-sm" @click="cart.remove(item.id)">移除</button>
                </article>
            </div>

            <div class="cart-total">
                <span>共 {{ cart.totalQuantity }} 件藏品</span>
                <strong>¥ {{ cart.totalPrice.toFixed(2) }}</strong>
                <button class="btn-reveal-all" @click="router.push('/pay')">去结算</button>
            </div>
        </template>
    </section>
</template>

<style scoped>
.loading-line { padding: 70px 0; text-align: center; color: var(--c-ink-soft); }
.cart-list { display: flex; flex-direction: column; border-top: 1px solid var(--c-grid); }
.cart-row { display: grid; grid-template-columns: 90px 1fr 100px 130px 120px 72px; align-items: center; gap: 18px; padding: 18px 0; border-bottom: 1px solid var(--c-grid); }
.cart-row img { width: 84px; height: 84px; object-fit: cover; }
.cart-name a { display: block; font-weight: 700; }
.cart-name span { display: block; margin-top: 7px; color: var(--c-ink-soft); font-size: 12px; }
.cart-price, .cart-subtotal { font-family: var(--f-mono); }
.cart-qty { display: flex; align-items: center; gap: 10px; }
.cart-qty button { width: 30px; height: 30px; border: 1px solid var(--c-grid); background: #fff; }
.cart-total { display: flex; align-items: center; justify-content: flex-end; gap: 28px; margin-top: 28px; }
.cart-total strong { color: var(--c-danger); font-size: 28px; font-family: var(--f-mono); }
@media (max-width: 900px) {
    .cart-row { grid-template-columns: 70px 1fr; }
    .cart-row img { width: 64px; height: 64px; }
    .cart-price, .cart-subtotal { grid-column: 2; }
}
</style>
