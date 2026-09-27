<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api, imageUrl } from '../api'

// 订单详情：这是「买了什么」终于能被看到的地方。
// 旧版 orders 表只有 id/username/total/created_at 四列 —— 结算时购物车里
// 有什么根本没落库，所以哪怕做了订单列表也只能显示一个总额。
// order_items 是本次迁移新建的表，配合 create_order RPC 一次事务写入。

const route = useRoute()
const router = useRouter()

const order = ref(null)
const loading = ref(true)
const notFound = ref(false)
// 区分「订单真的不存在」(404) 和「服务端坏了」(500)。
// 后端已经把两种情况分成不同状态码，这里不能又合并成一个「订单不存在」。
const error = ref('')

const STEPS = ['待发货', '已发货', '已完成']
const STATUS_CLASS = { 待发货: 'tag-pending', 已发货: 'tag-shipped', 已完成: 'tag-done', 已取消: 'tag-cancel' }
const stepClass = (s) => STATUS_CLASS[s] || 'tag-pending'

function stepIndex() {
    const s = order.value && order.value.status
    if (s === '已取消') return -1
    const i = STEPS.indexOf(s)
    return i < 0 ? 0 : i
}

async function load(id) {
    loading.value = true
    notFound.value = false
    error.value = ''
    try {
        order.value = await api.getOrder(id)
    } catch (e) {
        if (e.status === 404) notFound.value = true
        else error.value = e.message || '订单加载失败'
    } finally {
        loading.value = false
    }
}

onMounted(() => load(route.params.id))

function fmtTime(t) {
    if (!t) return '—'
    const d = new Date(t)
    if (isNaN(d)) return String(t).slice(0, 19).replace('T', ' ')
    const p = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

const subtotalOf = (it) => Number(it.price) * (Number(it.quantity) || 1)
</script>

<template>
    <section class="page-section">
        <button class="back-link" @click="router.back()">
            <i class="fa fa-angle-left"></i> 返回
        </button>

        <div v-if="loading" class="loading-line">正在调取订单…</div>

        <div v-else-if="notFound" class="empty-state">
            <i class="fa fa-chain-broken"></i>
            <h3>订单不存在</h3>
            <p>它可能已被删除，或者链接不对</p>
            <RouterLink to="/orders"><button class="btn-reveal-all">回到我的订单</button></RouterLink>
        </div>

        <div v-else-if="error" class="empty-state">
            <i class="fa fa-exclamation-triangle"></i>
            <h3>订单没能取回来</h3>
            <p>{{ error }}</p>
            <button class="btn-reveal-all" @click="load(route.params.id)">重试</button>
        </div>

        <template v-else-if="order">
            <div class="page-head">
                <h2>订单详情</h2>
                <span class="en">ORDER // {{ order.order_no || ('#' + String(order.id).padStart(6, '0')) }}</span>
                <div class="rule"></div>
            </div>

            <!-- 状态流转 -->
            <div v-if="order.status !== '已取消'" class="steps">
                <div v-for="(s, i) in STEPS" :key="s" class="step" :class="{ done: i <= stepIndex(), now: i === stepIndex() }">
                    <div class="step-dot"><i class="fa" :class="i <= stepIndex() ? 'fa-check' : 'fa-circle-o'"></i></div>
                    <span>{{ s }}</span>
                    <div v-if="i < STEPS.length - 1" class="step-line" :class="{ done: i < stepIndex() }"></div>
                </div>
            </div>
            <div v-else class="cancel-banner">
                <i class="fa fa-ban"></i> 该订单已取消
            </div>

            <div class="detail-grid">
                <div class="detail-main">
                    <h3 class="block-title">商品明细 / ITEMS</h3>
                    <table class="ink-table">
                        <thead>
                            <tr>
                                <th style="width:80px">藏品</th>
                                <th>名称</th>
                                <th style="width:110px">单价</th>
                                <th style="width:80px">数量</th>
                                <th style="width:120px">小计</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(it, i) in (order.items || [])" :key="it.id ?? i">
                                <td>
                                    <img class="row-img" :src="imageUrl(it.img)" :alt="it.name"
                                         @error="(e) => { e.target.src = imageUrl('') }">
                                </td>
                                <td>
                                    <RouterLink v-if="it.product_id" class="row-name" :to="`/product/${it.product_id}`">
                                        {{ it.name }}
                                    </RouterLink>
                                    <span v-else class="row-name">{{ it.name }}</span>
                                </td>
                                <td class="mono">¥ {{ Number(it.price).toFixed(2) }}</td>
                                <td class="mono">× {{ it.quantity || 1 }}</td>
                                <td class="mono strong">¥ {{ subtotalOf(it).toFixed(2) }}</td>
                            </tr>
                        </tbody>
                    </table>

                    <p v-if="!(order.items || []).length" class="no-items">
                        这笔订单没有商品明细（早于 order_items 表建立的历史数据）。
                    </p>

                    <div class="total-row">
                        <span>结缘总计 / TOTAL</span>
                        <strong>¥ {{ Number(order.total).toFixed(2) }}</strong>
                    </div>
                </div>

                <aside class="detail-side">
                    <h3 class="block-title">订单信息 / INFO</h3>
                    <dl class="info-list">
                        <div><dt>订单号</dt><dd>{{ order.order_no || ('#' + String(order.id).padStart(6, '0')) }}</dd></div>
                        <div><dt>下单账号</dt><dd>{{ order.username }}</dd></div>
                        <div><dt>下单时间</dt><dd>{{ fmtTime(order.created_at) }}</dd></div>
                        <div><dt>订单状态</dt><dd><span class="tag" :class="stepClass(order.status)">{{ order.status || '待发货' }}</span></dd></div>
                        <div><dt>收货人手机</dt><dd>{{ order.phone || '—' }}</dd></div>
                        <div><dt>收货地址</dt><dd>{{ order.address || '—' }}</dd></div>
                    </dl>

                    <RouterLink to="/orders">
                        <button class="btn-outline" style="width:100%">全部订单</button>
                    </RouterLink>
                </aside>
            </div>
        </template>
    </section>
</template>

<style scoped>
.back-link {
    background: none; border: none; color: var(--c-ink-soft);
    font-family: var(--f-mono); font-size: 12px; letter-spacing: 2px;
    margin-bottom: 34px; transition: 0.2s;
}
.back-link:hover { color: var(--c-accent); }
.loading-line { padding: 80px 0; text-align: center; font-family: var(--f-mono); font-size: 13px; opacity: 0.5; }

.steps { display: flex; align-items: flex-start; gap: 0; margin-bottom: 50px; max-width: 620px; }
.step { display: flex; flex-direction: column; align-items: center; gap: 10px; position: relative; flex: 1; }
.step-dot {
    width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
    border: 2px solid var(--c-grid); background: #fff; color: var(--c-grid); transition: 0.3s; z-index: 2;
}
.step.done .step-dot { border-color: var(--c-primary); background: var(--c-primary); color: var(--c-accent); }
.step.now .step-dot { box-shadow: 0 0 0 6px rgba(193, 162, 104, 0.22); }
.step span { font-family: var(--f-mono); font-size: 11px; letter-spacing: 1px; color: var(--c-ink-soft); }
.step.done span { color: var(--c-primary); font-weight: 700; }
.step-line {
    position: absolute; top: 22px; left: 50%; width: 100%; height: 2px;
    background: var(--c-grid); z-index: 1;
}
.step-line.done { background: var(--c-primary); }

.cancel-banner {
    padding: 18px; border: 1.5px solid var(--c-danger); color: var(--c-danger);
    font-family: var(--f-mono); font-size: 13px; letter-spacing: 1px; margin-bottom: 44px;
    display: flex; align-items: center; gap: 10px;
}

.detail-grid { display: grid; grid-template-columns: 1fr 330px; gap: 46px; align-items: start; }
.block-title { font-family: var(--f-mono); font-size: 12px; letter-spacing: 3px; color: var(--c-ink-soft); margin-bottom: 20px; font-weight: 400; }

.row-img { width: 56px; height: 56px; object-fit: cover; border: 1px solid var(--c-grid); }
.row-name { font-weight: 700; font-size: 14px; transition: 0.2s; }
a.row-name:hover { color: var(--c-accent); }
.mono { font-family: var(--f-mono); }
.strong { font-weight: 900; color: var(--c-danger); }
.no-items { font-family: var(--f-mono); font-size: 12px; color: var(--c-ink-soft); padding: 24px 0; }

.total-row {
    display: flex; align-items: baseline; justify-content: flex-end; gap: 22px;
    margin-top: 26px; padding-top: 22px; border-top: 2px solid var(--c-primary);
}
.total-row span { font-family: var(--f-mono); font-size: 11px; letter-spacing: 2px; color: var(--c-ink-soft); }
.total-row strong { font-family: var(--f-mono); font-size: 32px; color: var(--c-danger); }

.info-list { border-top: 1px solid var(--c-grid); margin-bottom: 26px; }
.info-list > div { display: flex; justify-content: space-between; gap: 18px; padding: 14px 0; border-bottom: 1px solid var(--c-grid); }
.info-list dt { font-family: var(--f-mono); font-size: 11px; letter-spacing: 1px; color: var(--c-ink-soft); flex-shrink: 0; }
.info-list dd { font-size: 13px; font-weight: 700; text-align: right; word-break: break-all; }

@media (max-width: 1100px) {
    .detail-grid { grid-template-columns: 1fr; }
    .steps { max-width: 100%; }
}
</style>
