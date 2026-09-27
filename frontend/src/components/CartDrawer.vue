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

function goDetail(id) {
    cart.toggleDrawer(false)
    router.push(`/product/${id}`)
}
</script>

<template>
    <div class="drawer-mask" :class="{ active: cart.drawerOpen }" @click="cart.toggleDrawer(false)"></div>

    <aside class="surprise-drawer" :class="{ open: cart.drawerOpen }">
        <div class="drawer-head">
            <h2>BAG / COLLECTION</h2>
            <button class="drawer-close" @click="cart.toggleDrawer(false)" aria-label="关闭">&times;</button>
        </div>

        <div v-if="!cart.items.length" class="drawer-empty">
            <i class="fa fa-shopping-bag"></i>
            <p>博古架还空着</p>
        </div>

        <div v-else class="drawer-list">
            <div v-for="(it, i) in cart.items" :key="it.id ?? i" class="drawer-item">
                <img :src="imageUrl(it.img)" :alt="it.name" @click="goDetail(it.id)">
                <div class="drawer-item-info">
                    <h4 @click="goDetail(it.id)">{{ it.name }}</h4>
                    <span class="drawer-item-price">¥ {{ it.price }} × {{ it.quantity || 1 }}</span>
                    <div class="drawer-item-ops">
                        <button @click="cart.setQuantity(i, (it.quantity || 1) - 1)">−</button>
                        <span>{{ it.quantity || 1 }}</span>
                        <button @click="cart.setQuantity(i, (it.quantity || 1) + 1)">+</button>
                        <button class="rm" @click="cart.remove(i)">移除</button>
                    </div>
                </div>
            </div>
        </div>

        <div class="drawer-foot">
            <div class="drawer-total">
                <span>结缘总计 / TOTAL</span>
                <strong>¥ {{ cart.totalPrice.toFixed(2) }}</strong>
            </div>
            <!-- 旧版首页这个按钮只有 HTML、没有 onclick，点了完全没反应 -->
            <button class="btn-reveal-all" style="width:100%" :disabled="!cart.items.length" @click="goCart">
                结缘遗珍 (CHECKOUT)
            </button>
        </div>
    </aside>
</template>

<style scoped>
.drawer-head {
    display: flex; justify-content: space-between; align-items: center;
    border-bottom: 2px solid var(--c-primary); padding-bottom: 18px; margin-bottom: 28px;
}
.drawer-head h2 { font-size: 22px; font-weight: 900; font-family: var(--f-eng); letter-spacing: 2px; }
.drawer-close { background: none; border: none; font-size: 30px; line-height: 1; color: var(--c-primary); opacity: 0.6; }
.drawer-close:hover { opacity: 1; color: var(--c-danger); }

.drawer-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; opacity: 0.4; }
.drawer-empty i { font-size: 44px; }

.drawer-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 18px; padding-right: 4px; }
.drawer-item { display: flex; gap: 14px; background: #fff; padding: 12px; border: 1px solid var(--c-grid); }
.drawer-item img { width: 74px; height: 74px; object-fit: cover; flex-shrink: 0; cursor: pointer; }
.drawer-item-info { flex: 1; display: flex; flex-direction: column; justify-content: space-between; gap: 6px; min-width: 0; }
.drawer-item-info h4 { font-size: 13px; font-weight: 700; cursor: pointer; }
.drawer-item-info h4:hover { color: var(--c-accent); }
.drawer-item-price { font-family: var(--f-mono); font-size: 12px; color: var(--c-danger); }
.drawer-item-ops { display: flex; align-items: center; gap: 8px; font-family: var(--f-mono); font-size: 13px; }
.drawer-item-ops button {
    width: 26px; height: 26px; border: 1px solid var(--c-primary);
    background: none; color: var(--c-primary); line-height: 1; transition: 0.2s;
}
.drawer-item-ops button:hover { background: var(--c-primary); color: #fff; }
.drawer-item-ops .rm { width: auto; padding: 0 10px; font-size: 11px; border-color: var(--c-danger); color: var(--c-danger); margin-left: auto; }
.drawer-item-ops .rm:hover { background: var(--c-danger); color: #fff; }

.drawer-foot { padding-top: 22px; border-top: 2px solid var(--c-primary); margin-top: 20px; }
.drawer-total { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 18px; }
.drawer-total span { font-family: var(--f-mono); font-size: 11px; letter-spacing: 2px; color: var(--c-ink-soft); }
.drawer-total strong { font-family: var(--f-mono); font-size: 24px; color: var(--c-danger); }
</style>
