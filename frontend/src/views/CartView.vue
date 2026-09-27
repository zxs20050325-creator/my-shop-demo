<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { imageUrl } from '../api'
import { useCartStore } from '../stores/cart'

const cart = useCartStore()
const router = useRouter()

onMounted(() => cart.load())

function goPay() {
    // 结算动作放在支付页完成 —— 旧版是这里先 removeItem('jiyi_cart') 再跳 pay.html，
    // 结果 pay.html 一加载发现购物车空，立刻又把你弹回首页，
    // 「结缘确权」的成功动画从来没被看到过。
    router.push('/pay')
}
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
            <i class="fa fa-exclamation-triangle"></i>
            <h3>博古架没能取回来</h3>
            <p>{{ cart.error }}</p>
            <button class="btn-reveal-all" @click="cart.load()">重试</button>
        </div>

        <div v-else-if="!cart.items.length" class="empty-state">
            <i class="fa fa-shopping-bag"></i>
            <h3>博古架还空着</h3>
            <p>去首页揭开一个盲盒，看看里面是什么</p>
            <RouterLink to="/"><button class="btn-reveal-all">去逛逛</button></RouterLink>
        </div>

        <template v-else>
            <table class="ink-table">
                <thead>
                    <tr>
                        <th style="width:90px">藏品</th>
                        <th>名称</th>
                        <th style="width:120px">单价</th>
                        <th style="width:170px">数量</th>
                        <th style="width:130px">小计</th>
                        <th style="width:90px"></th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(it, i) in cart.items" :key="it.id ?? i">
                        <td>
                            <img class="row-img" :src="imageUrl(it.img)" :alt="it.name"
                                 @error="(e) => { e.target.src = imageUrl('') }">
                        </td>
                        <td>
                            <RouterLink class="row-name" :to="`/product/${it.id}`">{{ it.name }}</RouterLink>
                            <div class="row-cat">{{ it.category }}</div>
                        </td>
                        <td class="mono">¥ {{ it.price }}</td>
                        <td>
                            <div class="qty-ctrl">
                                <button @click="cart.setQuantity(i, (it.quantity || 1) - 1)"
                                        :disabled="(it.quantity || 1) <= 1">−</button>
                                <span>{{ it.quantity || 1 }}</span>
                                <button @click="cart.setQuantity(i, (it.quantity || 1) + 1)"
                                        :disabled="(it.quantity || 1) >= 99">+</button>
                            </div>
                        </td>
                        <!-- 旧版这里是 total += parseFloat(item.price)，把数量完全丢掉了 -->
                        <td class="mono strong">
                            ¥ {{ (Number(it.price) * (it.quantity || 1)).toFixed(2) }}
                        </td>
                        <td>
                            <button class="btn-danger-outline btn-sm" @click="cart.remove(i)">移除</button>
                        </td>
                    </tr>
                </tbody>
            </table>

            <div class="cart-foot">
                <div class="cart-sum">
                    <span>共 {{ cart.totalQuantity }} 件藏品</span>
                    <div class="cart-total">
                        <span>结缘总计 / TOTAL</span>
                        <strong>¥ {{ cart.totalPrice.toFixed(2) }}</strong>
                    </div>
                </div>
                <button class="btn-reveal-all" @click="goPay">结缘遗珍 (CHECKOUT)</button>
            </div>
        </template>
    </section>
</template>

<style scoped>
.loading-line { padding: 80px 0; text-align: center; font-family: var(--f-mono); font-size: 13px; opacity: 0.5; }
.row-img { width: 64px; height: 64px; object-fit: cover; border: 1px solid var(--c-grid); }
.row-name { font-weight: 700; font-size: 15px; transition: 0.2s; }
.row-name:hover { color: var(--c-accent); }
.row-cat { font-family: var(--f-mono); font-size: 11px; color: var(--c-ink-soft); margin-top: 5px; }
.mono { font-family: var(--f-mono); }
.strong { font-weight: 900; color: var(--c-danger); font-size: 16px; }

.qty-ctrl { display: inline-flex; align-items: center; border: 1.5px solid var(--c-primary); }
.qty-ctrl button { width: 34px; height: 34px; background: none; border: none; color: var(--c-primary); font-size: 16px; line-height: 1; }
.qty-ctrl button:hover:not(:disabled) { background: var(--c-primary); color: #fff; }
.qty-ctrl button:disabled { opacity: 0.25; cursor: not-allowed; }
.qty-ctrl span { min-width: 44px; text-align: center; font-family: var(--f-mono); font-weight: 900; }

.cart-foot {
    margin-top: 46px; padding-top: 30px; border-top: 2px solid var(--c-primary);
    display: flex; justify-content: space-between; align-items: flex-end; gap: 30px; flex-wrap: wrap;
}
.cart-sum { display: flex; flex-direction: column; gap: 8px; }
.cart-sum > span { font-family: var(--f-mono); font-size: 12px; color: var(--c-ink-soft); letter-spacing: 1px; }
.cart-total { display: flex; align-items: baseline; gap: 16px; }
.cart-total span { font-family: var(--f-mono); font-size: 11px; letter-spacing: 2px; color: var(--c-ink-soft); }
.cart-total strong { font-family: var(--f-mono); font-size: 34px; color: var(--c-danger); }
</style>
