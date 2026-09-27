<script setup>
import { onMounted, ref } from 'vue'
import { api, imageUrl } from '../api'
import { useToastStore } from '../stores/toast'

const toast = useToastStore()
const orders = ref([])
const loading = ref(true)
const error = ref('')

const statusClass = (status) => ({
    待付款: 'tag-pending',
    待发货: 'tag-shipped',
    已发货: 'tag-shipped',
    已完成: 'tag-done',
    已取消: 'tag-cancel'
}[status] || 'tag-pending')

async function load() {
    loading.value = true
    error.value = ''
    try {
        const result = await api.orders.list({ pageSize: 50 })
        orders.value = result.items || []
    } catch (e) {
        error.value = e.message
    } finally {
        loading.value = false
    }
}

async function pay(order) {
    try {
        await api.orders.pay(order.id, order.paymentMethod || 'wechat')
        toast.ok('演示支付成功')
        await load()
    } catch (e) {
        toast.error(e.message)
    }
}

async function cancel(order) {
    if (!window.confirm('确定取消这笔待付款订单？')) return
    try {
        await api.orders.cancel(order.id)
        toast.ok('订单已取消')
        await load()
    } catch (e) {
        toast.error(e.message)
    }
}

function fmtTime(value) {
    return new Date(value).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
}

onMounted(load)
</script>

<template>
    <section class="page-section">
        <div class="page-head">
            <h2>我的订单</h2>
            <span class="en">MY ORDERS // {{ orders.length }} RECORDS</span>
            <div class="rule"></div>
        </div>

        <div v-if="loading" class="loading-line">正在调取订单簿…</div>
        <div v-else-if="error" class="empty-state">
            <p>{{ error }}</p>
            <button class="btn-reveal-all" @click="load">重试</button>
        </div>
        <div v-else-if="!orders.length" class="empty-state">
            <h3>还没有结缘记录</h3>
            <RouterLink to="/"><button class="btn-reveal-all">去逛逛</button></RouterLink>
        </div>

        <div v-else class="order-list">
            <article v-for="order in orders" :key="order.id" class="order-card">
                <header class="order-head">
                    <div>
                        <span class="mono-label">订单号 / NO.</span>
                        <strong>{{ order.orderNo }}</strong>
                    </div>
                    <div>
                        <span class="mono-label">下单时间 / TIME</span>
                        <strong>{{ fmtTime(order.createdAt) }}</strong>
                    </div>
                    <span class="tag" :class="statusClass(order.status)">{{ order.status }}</span>
                </header>

                <div class="order-thumbs">
                    <img v-for="item in order.items.slice(0, 5)" :key="item.id"
                         :src="imageUrl(item.img)" :alt="item.name">
                </div>

                <footer class="order-foot">
                    <span>共 {{ order.items.reduce((sum, item) => sum + item.quantity, 0) }} 件藏品</span>
                    <div class="order-right">
                        <strong class="order-total">¥ {{ order.amount.toFixed(2) }}</strong>
                        <button v-if="order.actions.canPay" class="btn-reveal-all btn-sm" @click="pay(order)">演示支付</button>
                        <button v-if="order.actions.canCancel" class="btn-danger-outline btn-sm" @click="cancel(order)">取消订单</button>
                        <RouterLink :to="`/orders/${order.id}`"><button class="btn-outline btn-sm">查看详情</button></RouterLink>
                    </div>
                </footer>
            </article>
        </div>
    </section>
</template>

<style scoped>
.loading-line { padding: 70px 0; text-align: center; color: var(--c-ink-soft); }
.order-list { display: flex; flex-direction: column; gap: 20px; }
.order-card { background: #fff; border: 1.5px solid var(--c-grid); padding: 24px; }
.order-head { display: flex; align-items: center; gap: 34px; padding-bottom: 18px; border-bottom: 1px dashed var(--c-grid); }
.order-head .tag { margin-left: auto; }
.mono-label { display: block; color: var(--c-ink-soft); font-size: 10px; margin-bottom: 5px; }
.order-thumbs { display: flex; gap: 12px; padding: 20px 0; }
.order-thumbs img { width: 62px; height: 62px; object-fit: cover; border: 1px solid var(--c-grid); }
.order-foot { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
.order-right { display: flex; align-items: center; gap: 12px; }
.order-total { color: var(--c-danger); font-size: 22px; }
@media (max-width: 760px) { .order-foot, .order-head { align-items: flex-start; flex-direction: column; } }
</style>
