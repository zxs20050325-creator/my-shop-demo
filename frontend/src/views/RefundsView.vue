<script setup>
import { onMounted, ref } from 'vue'
import { api } from '../api'

const items = ref([])
const loading = ref(true)
const error = ref('')

onMounted(async () => {
    try {
        const result = await api.orders.listRefunds()
        items.value = result.items || []
    } catch (e) {
        error.value = e.message
    } finally {
        loading.value = false
    }
})
</script>

<template>
    <section class="page-section">
        <div class="page-head">
            <h2>退款记录</h2>
            <span class="en">REFUND REQUESTS</span>
            <div class="rule"></div>
        </div>
        <div v-if="loading" class="loading-line">正在读取退款记录…</div>
        <div v-else-if="error" class="empty-state">{{ error }}</div>
        <div v-else-if="!items.length" class="empty-state">
            <h3>暂无退款记录</h3>
        </div>
        <div v-else class="refund-cards">
            <article v-for="item in items" :key="item.id">
                <header><strong>{{ item.orderNo }}</strong><span>{{ item.status }}</span></header>
                <p>{{ item.reason }}</p>
                <small>¥ {{ item.amount.toFixed(2) }}</small>
                <p v-if="item.adminNote">管理员备注：{{ item.adminNote }}</p>
            </article>
        </div>
    </section>
</template>

<style scoped>
.refund-cards { display: grid; gap: 16px; }
.refund-cards article { border: 1px solid var(--c-grid); background: #fff; padding: 20px; }
.refund-cards header { display: flex; justify-content: space-between; margin-bottom: 10px; }
.refund-cards small { color: var(--c-danger); }
</style>
