<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { imageUrl, api } from '../api'
import { useCartStore } from '../stores/cart'
import { useUserStore } from '../stores/user'
import { useToastStore } from '../stores/toast'

// 结缘确权页。
//
// 旧版的双重死路：
//   ① cart.html 结算时先 removeItem('jiyi_cart') 再 location.href='pay.html'；
//   ② pay.html 的 loadOrder() 一看购物车是空的，立刻又 location.href='index.html'。
// 于是「确权并结缘」的成功遮罩永远看不到。
//
// 现在的顺序是：购物车不动 → 本页确认 → 真正下单（服务端写订单+明细）→ 显示成功 → 跳订单详情。
// 订单在这里创建，不在购物车页创建——这样中途关掉页面不会留下一笔空订单。

const router = useRouter()
const cart = useCartStore()
const user = useUserStore()
const toast = useToastStore()

const method = ref('wechat')
const address = ref('')
const phone = ref('')
const paying = ref(false)
const done = ref(false)
const orderId = ref(null)
const error = ref('')

onMounted(async () => {
    await cart.load()
    if (!cart.items.length && !done.value) {
        toast.ok('博古架是空的，先去挑几件')
        router.replace('/')
    }
})

async function confirm() {
    error.value = ''
    if (!address.value.trim()) { error.value = '请填写收货地址'; return }
    if (!/^1[3-9]\d{9}$/.test(phone.value.trim())) { error.value = '请填写正确的手机号'; return }

    paying.value = true
    try {
        const res = await api.checkout(user.username, {
            address: address.value.trim(),
            phone: phone.value.trim()
        })
        orderId.value = res.orderId
        cart.clearLocal()          // 服务端已清空，这里只清本地这面镜子
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
                    <div v-for="(it, i) in cart.items" :key="it.id ?? i" class="pay-item">
                        <img :src="imageUrl(it.img)" :alt="it.name"
                             @error="(e) => { e.target.src = imageUrl('') }">
                        <div class="pay-item-info">
                            <h4>{{ it.name }}</h4>
                            <span>{{ it.category }} · ¥ {{ it.price }} × {{ it.quantity || 1 }}</span>
                        </div>
                        <strong>¥ {{ (Number(it.price) * (it.quantity || 1)).toFixed(2) }}</strong>
                    </div>
                </div>

                <h3 class="block-title" style="margin-top:44px">收货信息 / DELIVERY</h3>
                <div class="delivery-form">
                    <div>
                        <label class="ink-label" for="pay-phone">手机号 / PHONE</label>
                        <input id="pay-phone" v-model="phone" class="ink-field" type="tel"
                               placeholder="11 位手机号" maxlength="11">
                    </div>
                    <div>
                        <label class="ink-label" for="pay-addr">收货地址 / ADDRESS</label>
                        <input id="pay-addr" v-model="address" class="ink-field" type="text"
                               placeholder="省 / 市 / 区 详细地址">
                    </div>
                </div>

                <h3 class="block-title" style="margin-top:14px">支付方式 / PAYMENT</h3>
                <div class="methods">
                    <div class="method" :class="{ on: method === 'wechat' }" @click="method = 'wechat'">
                        <i class="fa fa-weixin"></i><span>微信支付</span>
                    </div>
                    <div class="method" :class="{ on: method === 'digital' }" @click="method = 'digital'">
                        <i class="fa fa-bitcoin"></i><span>数字货币</span>
                    </div>
                </div>
                <p class="demo-note">
                    <i class="fa fa-info-circle"></i>
                    演示环境：不会发生真实扣款。「支付」后直接生成订单记录。
                </p>
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

        <!-- 成功遮罩：旧版永远走不到这里 -->
        <div v-if="done" class="success-mask">
            <div class="success-box">
                <div class="success-seal">缘</div>
                <h3>结缘成功</h3>
                <p>订单已生成，编号 {{ orderId }}</p>
                <button class="btn-reveal-all" @click="router.replace(`/orders/${orderId}`)">
                    查看订单详情
                </button>
                <RouterLink to="/" class="pay-back" style="margin-top:18px">继续逛逛</RouterLink>
            </div>
        </div>
    </section>
</template>

<style scoped>
.pay-wrap { display: grid; grid-template-columns: 1fr 340px; gap: 46px; align-items: start; }
.block-title { font-family: var(--f-mono); font-size: 12px; letter-spacing: 3px; color: var(--c-ink-soft); margin-bottom: 20px; font-weight: 400; }

.pay-items { display: flex; flex-direction: column; gap: 14px; }
.pay-item { display: flex; align-items: center; gap: 16px; background: #fff; padding: 14px; border: 1px solid var(--c-grid); }
.pay-item img { width: 68px; height: 68px; object-fit: cover; }
.pay-item-info { flex: 1; min-width: 0; }
.pay-item-info h4 { font-size: 14px; font-weight: 700; margin-bottom: 6px; }
.pay-item-info span { font-family: var(--f-mono); font-size: 11px; color: var(--c-ink-soft); }
.pay-item strong { font-family: var(--f-mono); font-size: 15px; color: var(--c-danger); }

.delivery-form { display: grid; grid-template-columns: 1fr 2fr; gap: 26px; }
.delivery-form .ink-field { margin-bottom: 6px; }

.methods { display: flex; gap: 16px; margin-bottom: 16px; }
.method {
    flex: 1; display: flex; align-items: center; justify-content: center; gap: 10px;
    padding: 20px; border: 1.5px solid var(--c-grid); background: #fff;
    color: var(--c-ink-soft); transition: 0.2s; font-size: 14px;
}
.method:hover { border-color: var(--c-accent); }
.method.on { border-color: var(--c-primary); background: var(--c-primary); color: #fff; box-shadow: 4px 4px 0 var(--c-accent); }
.method.on i { color: var(--c-accent); }

.demo-note { font-size: 12px; color: var(--c-ink-soft); display: flex; gap: 8px; align-items: center; margin-top: 8px; }

.pay-side-box {
    background: #fff; border: 2px solid var(--c-primary); padding: 30px;
    box-shadow: 14px 14px 0 rgba(193, 162, 104, 0.22); position: sticky; top: 110px;
}
.pay-side-label { font-family: var(--f-mono); font-size: 11px; letter-spacing: 2px; color: var(--c-ink-soft); display: block; }
.pay-side-box strong { font-family: var(--f-mono); font-size: 36px; color: var(--c-danger); display: block; margin: 10px 0 4px; }
.pay-side-count { font-family: var(--f-mono); font-size: 12px; color: var(--c-ink-soft); display: block; margin-bottom: 22px; }
.pay-back { display: block; text-align: center; margin-top: 14px; font-size: 12px; color: var(--c-ink-soft); }
.pay-back:hover { color: var(--c-accent); }

.success-mask {
    position: fixed; inset: 0; background: rgba(47, 72, 66, 0.72);
    backdrop-filter: blur(12px); z-index: 8500;
    display: flex; align-items: center; justify-content: center; padding: 20px;
}
.success-box {
    background: var(--c-bg); border: 3px solid var(--c-primary);
    box-shadow: 30px 30px 0 var(--c-accent); padding: 56px 50px;
    text-align: center; max-width: 420px; width: 100%;
    animation: modalPop 0.5s var(--trans-spring);
}
.success-seal {
    width: 92px; height: 92px; margin: 0 auto 26px;
    display: flex; align-items: center; justify-content: center;
    background: var(--c-danger); color: #fff; border-radius: 4px;
    font-family: var(--f-art); font-size: 46px;
    box-shadow: 6px 6px 0 var(--c-accent);
    animation: sealPop 0.6s var(--trans-spring);
}
@keyframes sealPop { from { transform: scale(0.4) rotate(-18deg); opacity: 0; } to { transform: scale(1) rotate(0); opacity: 1; } }
.success-box h3 { font-size: 28px; font-weight: 900; letter-spacing: 4px; margin-bottom: 12px; }
.success-box p { font-family: var(--f-mono); font-size: 12px; color: var(--c-ink-soft); margin-bottom: 30px; }

@media (max-width: 1100px) {
    .pay-wrap { grid-template-columns: 1fr; }
    .delivery-form { grid-template-columns: 1fr; }
    .pay-side-box { position: static; }
}
</style>
