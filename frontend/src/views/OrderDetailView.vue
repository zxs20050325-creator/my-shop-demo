<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api, imageUrl } from '../api'
import { useToastStore } from '../stores/toast'

const route = useRoute()
const router = useRouter()
const toast = useToastStore()

const order = ref(null)
const loading = ref(true)
const error = ref('')
const refundReason = ref('')
const refunding = ref(false)

const steps = ['待付款', '待发货', '已发货', '已完成']
const stepIndex = () => Math.max(0, steps.indexOf(order.value?.status))

async function load() {
    loading.value = true
    error.value = ''
    try {
        order.value = await api.orders.get(route.params.id)
    } catch (e) {
        error.value = e.message
    } finally {
        loading.value = false
    }
}

async function pay() {
    try {
        await api.orders.pay(order.value.id, order.value.paymentMethod)
        toast.ok('演示支付成功')
        await load()
    } catch (e) {
        toast.error(e.message)
    }
}

async function cancel() {
    if (!window.confirm('确定取消该订单？')) return
    try {
        await api.orders.cancel(order.value.id)
        toast.ok('订单已取消')
        await load()
    } catch (e) {
        toast.error(e.message)
    }
}

async function requestRefund() {
    if (refundReason.value.trim().length < 2) {
        toast.error('请填写退款原因')
        return
    }
    refunding.value = true
    try {
        await api.orders.requestRefund(order.value.id, refundReason.value.trim())
        toast.ok('退款申请已提交')
        refundReason.value = ''
        await load()
    } catch (e) {
        toast.error(e.message)
    } finally {
        refunding.value = false
    }
}

function fmtTime(value) {
    return value ? new Date(value).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : '—'
}

onMounted(load)
</script>

<template>
    <section class="page-section">
        <button class="back-link" @click="router.back()"><i class="fa fa-angle-left"></i> 返回</button>
        <div v-if="loading" class="loading-line">正在调取订单…</div>
        <div v-else-if="error" class="empty-state">
            <p>{{ error }}</p>
            <button class="btn-reveal-all" @click="load">重试</button>
        </div>

        <template v-else-if="order">
            <div class="page-head">
                <h2>订单详情</h2>
                <span class="en">{{ order.orderNo }}</span>
                <div class="rule"></div>
            </div>

            <div class="steps">
                <div v-for="(step, index) in steps" :key="step"
                     class="step" :class="{ done: index <= stepIndex(), now: index === stepIndex() }">
                    <i class="fa" :class="index <= stepIndex() ? 'fa-check-circle' : 'fa-circle-o'"></i>
                    <span>{{ step }}</span>
                </div>
            </div>

            <div class="detail-grid">
                <div>
                    <table class="ink-table">
                        <thead><tr><th>藏品</th><th>规格</th><th>单价</th><th>数量</th><th>小计</th></tr></thead>
                        <tbody>
                            <tr v-for="item in order.items" :key="item.id">
                                <td><img class="row-img" :src="imageUrl(item.img)" :alt="item.name"></td>
                                <td>{{ item.name }}<small>{{ item.specText }}</small></td>
                                <td>¥ {{ item.price.toFixed(2) }}</td>
                                <td>× {{ item.quantity }}</td>
                                <td>¥ {{ item.subtotal.toFixed(2) }}</td>
                            </tr>
                        </tbody>
                    </table>
                    <div class="total-row"><span>结缘总计</span><strong>¥ {{ order.amount.toFixed(2) }}</strong></div>
                </div>

                <aside>
                    <dl class="info-list">
                        <div><dt>状态</dt><dd>{{ order.status }}</dd></div>
                        <div><dt>支付状态</dt><dd>{{ order.paymentStatus }}</dd></div>
                        <div><dt>收货人</dt><dd>{{ order.receiver.name }}</dd></div>
                        <div><dt>手机</dt><dd>{{ order.receiver.phone }}</dd></div>
                        <div><dt>地址</dt><dd>{{ order.receiver.province }} {{ order.receiver.city }} {{ order.receiver.district }} {{ order.receiver.detail }}</dd></div>
                        <div><dt>下单时间</dt><dd>{{ fmtTime(order.createdAt) }}</dd></div>
                    </dl>

                    <div class="order-actions">
                        <button v-if="order.actions.canPay" class="btn-reveal-all" @click="pay">演示支付</button>
                        <button v-if="order.actions.canCancel" class="btn-danger-outline" @click="cancel">取消订单</button>
                    </div>

                    <div v-if="order.actions.canRequestRefund" class="refund-box">
                        <h3>申请退款</h3>
                        <textarea v-model="refundReason" class="ink-field" rows="3" maxlength="200"
                                  placeholder="请填写退款原因"></textarea>
                        <button class="btn-outline" :disabled="refunding" @click="requestRefund">
                            {{ refunding ? '提交中…' : '提交退款申请' }}
                        </button>
                    </div>

                    <div v-if="order.refunds?.length" class="refund-list">
                        <h3>退款记录</h3>
                        <div v-for="refund in order.refunds" :key="refund.id">
                            <span>{{ refund.status }}</span>
                            <p>{{ refund.reason }}</p>
                            <small v-if="refund.adminNote">管理员：{{ refund.adminNote }}</small>
                        </div>
                    </div>
                </aside>
            </div>
        </template>
    </section>
</template>

<style scoped>
.back-link { background: none; border: 0; margin-bottom: 28px; }
.loading-line { padding: 70px 0; text-align: center; }
.steps { display: flex; gap: 12px; margin-bottom: 34px; }
.step { display: flex; align-items: center; gap: 8px; color: var(--c-ink-soft); }
.step.done { color: var(--c-primary); font-weight: 700; }
.detail-grid { display: grid; grid-template-columns: 1fr 340px; gap: 44px; align-items: start; }
.row-img { width: 56px; height: 56px; object-fit: cover; }
.row-img + small { display: block; }
td small { display: block; color: var(--c-ink-soft); }
.total-row { display: flex; justify-content: flex-end; gap: 20px; margin-top: 22px; }
.total-row strong { color: var(--c-danger); font-size: 28px; }
.info-list > div { display: flex; justify-content: space-between; gap: 18px; padding: 13px 0; border-bottom: 1px solid var(--c-grid); }
.info-list dt { color: var(--c-ink-soft); }
.info-list dd { text-align: right; }
.order-actions { display: flex; gap: 10px; margin-top: 18px; }
.refund-box, .refund-list { margin-top: 26px; padding-top: 20px; border-top: 1px solid var(--c-grid); }
.refund-box textarea { width: 100%; margin: 12px 0; }
.refund-list > div { padding: 12px 0; border-bottom: 1px dashed var(--c-grid); }
@media (max-width: 900px) { .detail-grid { grid-template-columns: 1fr; } .steps { flex-wrap: wrap; } }
</style>
