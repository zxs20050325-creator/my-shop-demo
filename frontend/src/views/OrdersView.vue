<script setup>
import { ref, onMounted } from 'vue'
import { api, imageUrl } from '../api'
import { useUserStore } from '../stores/user'

// 旧版根本没有「我的订单」这个入口 —— 用户下完单就再也看不到自己买过什么。
// 后端在此之前也只有管理员能查订单（/api/admin/orders）。

const user = useUserStore()

const orders = ref([])
const loading = ref(true)
const error = ref('')

const STATUS_CLASS = {
    待发货: 'tag-pending',
    已发货: 'tag-shipped',
    已完成: 'tag-done',
    已取消: 'tag-cancel'
}
const statusClass = (s) => STATUS_CLASS[s] || 'tag-pending'

onMounted(async () => {
    try {
        orders.value = await api.listOrders(user.username)
    } catch (e) {
        error.value = e.message || '订单加载失败'
    } finally {
        loading.value = false
    }
})

function fmtTime(t) {
    if (!t) return '—'
    // 后端返回 ISO 字符串，转成本地可读格式
    const d = new Date(t)
    if (isNaN(d)) return String(t).slice(0, 19).replace('T', ' ')
    const p = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
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
            <i class="fa fa-exclamation-triangle"></i>
            <h3>订单加载失败</h3>
            <p>{{ error }}</p>
        </div>

        <div v-else-if="!orders.length" class="empty-state">
            <i class="fa fa-file-text-o"></i>
            <h3>还没有结缘记录</h3>
            <p>去首页揭开一个盲盒，结缘后订单会出现在这里</p>
            <RouterLink to="/"><button class="btn-reveal-all">去逛逛</button></RouterLink>
        </div>

        <div v-else class="order-list">
            <article v-for="o in orders" :key="o.id" class="order-card">
                <header class="order-head">
                    <div class="order-no">
                        <span class="mono-label">订单号 / NO.</span>
                        <strong>{{ o.order_no || ('#' + String(o.id).padStart(6, '0')) }}</strong>
                    </div>
                    <div class="order-time">
                        <span class="mono-label">下单时间 / TIME</span>
                        <strong>{{ fmtTime(o.created_at) }}</strong>
                    </div>
                    <span class="tag" :class="statusClass(o.status)">{{ o.status || '待发货' }}</span>
                </header>

                <div class="order-thumbs">
                    <img v-for="(it, i) in (o.items || []).slice(0, 5)" :key="it.id ?? i"
                         :src="imageUrl(it.img)" :alt="it.name" :title="it.name"
                         @error="(e) => { e.target.src = imageUrl('') }">
                    <span v-if="(o.items || []).length > 5" class="more-thumb">
                        +{{ o.items.length - 5 }}
                    </span>
                    <span v-if="!(o.items || []).length" class="no-items">
                        该订单无明细记录（早期数据）
                    </span>
                </div>

                <footer class="order-foot">
                    <span class="order-count">
                        共 {{ (o.items || []).reduce((s, it) => s + (Number(it.quantity) || 1), 0) }} 件藏品
                    </span>
                    <div class="order-right">
                        <span class="order-total">¥ {{ Number(o.total).toFixed(2) }}</span>
                        <RouterLink :to="`/orders/${o.id}`">
                            <button class="btn-outline btn-sm">查看详情</button>
                        </RouterLink>
                    </div>
                </footer>
            </article>
        </div>
    </section>
</template>

<style scoped>
.loading-line { padding: 80px 0; text-align: center; font-family: var(--f-mono); font-size: 13px; opacity: 0.5; }

.order-list { display: flex; flex-direction: column; gap: 22px; }
.order-card {
    background: #fff; border: 1.5px solid var(--c-grid); padding: 26px 28px;
    transition: 0.25s;
}
.order-card:hover { border-color: var(--c-primary); box-shadow: 10px 10px 0 rgba(193, 162, 104, 0.16); }

.order-head { display: flex; align-items: center; gap: 34px; padding-bottom: 20px; border-bottom: 1px dashed var(--c-grid); flex-wrap: wrap; }
.mono-label { font-family: var(--f-mono); font-size: 10px; letter-spacing: 2px; color: var(--c-ink-soft); display: block; margin-bottom: 5px; }
.order-no strong, .order-time strong { font-family: var(--f-mono); font-size: 14px; }
.order-head .tag { margin-left: auto; }

.order-thumbs { display: flex; align-items: center; gap: 12px; padding: 22px 0; flex-wrap: wrap; }
.order-thumbs img { width: 62px; height: 62px; object-fit: cover; border: 1px solid var(--c-grid); }
.more-thumb {
    width: 62px; height: 62px; display: flex; align-items: center; justify-content: center;
    border: 1px dashed var(--c-grid); font-family: var(--f-mono); font-size: 11px; color: var(--c-ink-soft);
}
.no-items { font-family: var(--f-mono); font-size: 11px; color: var(--c-ink-soft); opacity: 0.7; }

.order-foot { display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap; }
.order-count { font-family: var(--f-mono); font-size: 11px; color: var(--c-ink-soft); letter-spacing: 1px; }
.order-right { display: flex; align-items: center; gap: 22px; }
.order-total { font-family: var(--f-mono); font-size: 22px; font-weight: 900; color: var(--c-danger); }
</style>
