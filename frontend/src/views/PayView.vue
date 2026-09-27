<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api, imageUrl } from '../api'
import { useCartStore } from '../stores/cart'
import { useToastStore } from '../stores/toast'

const router = useRouter()
const cart = useCartStore()
const toast = useToastStore()

const addressId = ref(null)
const addresses = ref([])
const method = ref('wechat')
const paying = ref(false)
const done = ref(false)
const orderId = ref(null)
const error = ref('')

onMounted(async () => {
    const [cartResult, addressResult] = await Promise.all([
        cart.load(),
        api.users.listAddresses().catch(() => ({ items: [] }))
    ])
    addresses.value = addressResult.items || []
    addressId.value = addresses.value.find(item => item.is_default)?.id || addresses.value[0]?.id || null
    if (!cart.items.length) {
        toast.ok('博古架是空的，先去挑几件')
        router.replace('/')
    }
})

async function confirm() {
    error.value = ''
    if (!addressId.value) {
        error.value = '请先添加并选择收货地址'
        return
    }

    paying.value = true
    try {
        const order = await api.orders.create({
            addressId: addressId.value,
            paymentMethod: method.value
        })
        await api.orders.pay(order.orderId, method.value)
        orderId.value = order.orderId
        cart.clearLocal()
        done.value = true
    } catch (e) {
        error.value = e.message || '下单失败，请稍后重试'
    } finally {
        paying.value = false
    }
}
</script>

<template>
    <section class="page-section">
        <div class="page-head">
            <h2>结缘确权</h2>
            <span class="en">CONFIRM &amp; ACQUIRE</span>
            <div class="rule"></div>
        </div>

        <div class="pay-wrap">
            <div class="pay-main">
                <h3 class="block-title">订单摘要 / ORDER SUMMARY</h3>
                <div class="pay-items">
                    <div v-for="item in cart.items" :key="item.id" class="pay-item">
                        <img :src="imageUrl(item.sku.product.img)" :alt="item.sku.product.name">
                        <div class="pay-item-info">
                            <h4>{{ item.sku.product.name }}</h4>
                            <span>{{ item.sku.specText }} · ¥ {{ item.sku.price }} × {{ item.quantity }}</span>
                        </div>
                        <strong>¥ {{ (item.sku.price * item.quantity).toFixed(2) }}</strong>
                    </div>
                </div>

                <h3 class="block-title" style="margin-top:44px">收货地址 / DELIVERY</h3>
                <div v-if="addresses.length" class="address-options">
                    <label v-for="address in addresses" :key="address.id"
                           class="address-option" :class="{ active: Number(addressId) === Number(address.id) }">
                        <input v-model="addressId" type="radio" :value="address.id">
                        <span>
                            <strong>{{ address.recipient }} · {{ address.phone }}</strong>
                            <small>{{ address.province }} {{ address.city }} {{ address.district }} {{ address.detail }}</small>
                        </span>
                    </label>
                </div>
                <div v-else class="empty-address">
                    <p>还没有收货地址</p>
                    <RouterLink to="/addresses"><button class="btn-outline">添加地址</button></RouterLink>
                </div>

                <h3 class="block-title" style="margin-top:28px">支付方式 / PAYMENT</h3>
                <div class="methods">
                    <div class="method" :class="{ on: method === 'wechat' }" @click="method = 'wechat'">
                        <i class="fa fa-weixin"></i><span>微信支付</span>
                    </div>
                    <div class="method" :class="{ on: method === 'digital' }" @click="method = 'digital'">
                        <i class="fa fa-bitcoin"></i><span>数字货币</span>
                    </div>
                </div>
                <p class="demo-note">演示环境：不会发生真实扣款，支付后直接进入待发货状态。</p>
            </div>

            <aside class="pay-side">
                <div class="pay-side-box">
                    <span class="pay-side-label">结缘总计 / TOTAL</span>
                    <strong>¥ {{ cart.totalPrice.toFixed(2) }}</strong>
                    <span class="pay-side-count">{{ cart.totalQuantity }} 件藏品</span>
                    <div class="form-error">{{ error }}</div>
                    <button class="btn-reveal-all" style="width:100%"
                            :disabled="paying || !cart.items.length" @click="confirm">
                        {{ paying ? '处理中…' : '确权并结缘' }}
                    </button>
                    <RouterLink to="/cart" class="pay-back">返回修改清单</RouterLink>
                </div>
            </aside>
        </div>

        <div v-if="done" class="success-mask">
            <div class="success-box">
                <div class="success-seal">缘</div>
                <h3>结缘成功</h3>
                <p>订单已生成，编号 {{ orderId }}</p>
                <button class="btn-reveal-all" @click="router.replace(`/orders/${orderId}`)">查看订单详情</button>
            </div>
        </div>
    </section>
</template>

<style scoped>
.pay-wrap { display: grid; grid-template-columns: 1fr 340px; gap: 46px; align-items: start; }
.block-title { font-family: var(--f-mono); font-size: 12px; color: var(--c-ink-soft); margin-bottom: 18px; }
.pay-items { display: flex; flex-direction: column; gap: 14px; }
.pay-item { display: flex; align-items: center; gap: 16px; background: #fff; padding: 14px; border: 1px solid var(--c-grid); }
.pay-item img { width: 68px; height: 68px; object-fit: cover; }
.pay-item-info { flex: 1; }
.pay-item-info h4 { margin-bottom: 6px; }
.pay-item-info span { color: var(--c-ink-soft); font-size: 12px; }
.address-options { display: flex; flex-direction: column; gap: 10px; }
.address-option { display: flex; gap: 12px; padding: 16px; border: 1px solid var(--c-grid); background: #fff; cursor: pointer; }
.address-option.active { border-color: var(--c-primary); box-shadow: 4px 4px 0 rgba(193,162,104,.18); }
.address-option strong, .address-option small { display: block; }
.address-option small { margin-top: 6px; color: var(--c-ink-soft); }
.methods { display: flex; gap: 16px; }
.method { flex: 1; display: flex; justify-content: center; gap: 10px; padding: 18px; border: 1.5px solid var(--c-grid); background: #fff; }
.method.on { border-color: var(--c-primary); background: var(--c-primary); color: #fff; }
.demo-note { margin-top: 12px; font-size: 12px; color: var(--c-ink-soft); }
.pay-side-box { background: #fff; border: 2px solid var(--c-primary); padding: 30px; position: sticky; top: 110px; }
.pay-side-box strong { display: block; font-size: 34px; color: var(--c-danger); margin: 10px 0; }
.pay-side-count { color: var(--c-ink-soft); font-size: 12px; }
.pay-back { display: block; text-align: center; margin-top: 14px; font-size: 12px; }
.success-mask { position: fixed; inset: 0; display: grid; place-items: center; background: rgba(47,72,66,.72); z-index: 9000; }
.success-box { background: var(--c-bg); border: 3px solid var(--c-primary); padding: 48px; text-align: center; }
@media (max-width: 1000px) { .pay-wrap { grid-template-columns: 1fr; } .pay-side-box { position: static; } }
</style>
