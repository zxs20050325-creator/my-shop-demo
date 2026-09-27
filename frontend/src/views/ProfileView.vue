<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../api'
import { useUserStore } from '../stores/user'
import { useCartStore } from '../stores/cart'
import { useFavoritesStore } from '../stores/favorites'
import { useToastStore } from '../stores/toast'

// 个人中心。旧版完全没有这一页：用户登录后唯一能做的就是「退出」，
// 改密码、看自己注册了多久、清点收藏和购物车，都没有地方。
//
// 注意后端 /api/user/profile 只回 username + created_at，**不回密码字段**；
// 而 /api/admin/users-data 是会把密码哈希吐给浏览器的 —— 那是后台的事，
// 这里不该复制那个做法。

const router = useRouter()
const user = useUserStore()
const cart = useCartStore()
const favorites = useFavoritesStore()
const toast = useToastStore()

const profile = ref(null)
const loading = ref(true)

const oldPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const pwdError = ref('')
const pwdOk = ref('')
const changing = ref(false)

const orderCount = ref(0)

onMounted(async () => {
    try {
        profile.value = await api.profile(user.username)
    } catch (e) {
        // 资料拉不到不该让整页空掉 —— 用户名本地就有
        console.error('资料加载失败', e)
    } finally {
        loading.value = false
    }
    cart.load()
    favorites.load()
    try {
        const os = await api.listOrders(user.username)
        orderCount.value = os.length
    } catch { /* 统计失败就显示 0，不打断页面 */ }
})

async function submitPassword() {
    pwdError.value = ''
    pwdOk.value = ''

    if (!oldPassword.value) { pwdError.value = '请输入当前密码'; return }
    if (newPassword.value.length < 6) { pwdError.value = '新密码至少 6 位'; return }
    if (newPassword.value !== confirmPassword.value) { pwdError.value = '两次输入的新密码不一致'; return }
    if (newPassword.value === oldPassword.value) { pwdError.value = '新密码不能与当前密码相同'; return }

    changing.value = true
    try {
        await api.changePassword(user.username, oldPassword.value, newPassword.value)
        pwdOk.value = '密码已更新'
        toast.ok('密码已更新')
        oldPassword.value = newPassword.value = confirmPassword.value = ''
    } catch (e) {
        pwdError.value = e.message || '修改失败'
    } finally {
        changing.value = false
    }
}

function fmtDate(t) {
    if (!t) return '—'
    const d = new Date(t)
    if (isNaN(d)) return String(t).slice(0, 10)
    const p = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function doLogout() {
    user.logout()
    cart.reset()
    favorites.reset()
    toast.ok('已退出登录')
    router.push('/')
}
</script>

<template>
    <section class="page-section">
        <div class="page-head">
            <h2>个人中心</h2>
            <span class="en">PROFILE // {{ user.username }}</span>
            <div class="rule"></div>
        </div>

        <div class="profile-grid">
            <div class="profile-main">
                <div class="id-card">
                    <div class="id-seal">{{ (user.username || '客')[0] }}</div>
                    <div class="id-info">
                        <h3>{{ user.username }}</h3>
                        <span class="id-sub">
                            注册于 {{ loading ? '…' : fmtDate(profile && profile.created_at) }}
                        </span>
                    </div>
                </div>

                <div class="stat-row">
                    <RouterLink to="/orders" class="stat">
                        <strong>{{ orderCount }}</strong>
                        <span>订单 / ORDERS</span>
                    </RouterLink>
                    <RouterLink to="/favorites" class="stat">
                        <strong>{{ favorites.count }}</strong>
                        <span>珍藏 / SAVED</span>
                    </RouterLink>
                    <RouterLink to="/cart" class="stat">
                        <strong>{{ cart.totalQuantity }}</strong>
                        <span>博古架 / CART</span>
                    </RouterLink>
                </div>

                <h3 class="block-title">修改密码 / CHANGE PASSWORD</h3>
                <form class="pwd-form" @submit.prevent="submitPassword">
                    <div>
                        <label class="ink-label" for="p-old">当前密码</label>
                        <input id="p-old" v-model="oldPassword" class="ink-field" type="password"
                               autocomplete="current-password" placeholder="••••••">
                    </div>
                    <div>
                        <label class="ink-label" for="p-new">新密码</label>
                        <input id="p-new" v-model="newPassword" class="ink-field" type="password"
                               autocomplete="new-password" placeholder="至少 6 位">
                    </div>
                    <div>
                        <label class="ink-label" for="p-confirm">确认新密码</label>
                        <input id="p-confirm" v-model="confirmPassword" class="ink-field" type="password"
                               autocomplete="new-password" placeholder="再输一次">
                    </div>

                    <div class="form-error">{{ pwdError }}</div>
                    <div v-if="pwdOk" class="form-ok">{{ pwdOk }}</div>

                    <button class="btn-reveal-all" type="submit" :disabled="changing">
                        {{ changing ? '提交中…' : '更新密码' }}
                    </button>
                </form>
            </div>

            <aside class="profile-side">
                <h3 class="block-title">账号 / ACCOUNT</h3>
                <dl class="info-list">
                    <div><dt>用户名</dt><dd>{{ user.username }}</dd></div>
                    <div><dt>身份</dt><dd>收藏家</dd></div>
                    <div><dt>登录状态</dt><dd>已登录</dd></div>
                </dl>

                <button class="btn-danger-outline" style="width:100%" @click="doLogout">
                    退出登录
                </button>

                <p class="sec-note">
                    <i class="fa fa-shield"></i>
                    演示环境提示：当前登录态是浏览器本地保存的一个用户名，
                    服务端并不校验身份，请勿使用真实密码。
                </p>
            </aside>
        </div>
    </section>
</template>

<style scoped>
.profile-grid { display: grid; grid-template-columns: 1fr 320px; gap: 50px; align-items: start; }
.block-title { font-family: var(--f-mono); font-size: 12px; letter-spacing: 3px; color: var(--c-ink-soft); margin-bottom: 20px; font-weight: 400; }

.id-card { display: flex; align-items: center; gap: 24px; margin-bottom: 34px; }
.id-seal {
    width: 78px; height: 78px; flex-shrink: 0; display: flex; align-items: center; justify-content: center;
    background: var(--c-primary); color: var(--c-accent); font-family: var(--f-art); font-size: 40px;
    box-shadow: 6px 6px 0 var(--c-accent);
}
.id-info h3 { font-size: 26px; font-weight: 900; letter-spacing: 1px; }
.id-sub { font-family: var(--f-mono); font-size: 11px; letter-spacing: 1px; color: var(--c-ink-soft); }

.stat-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 50px; }
.stat {
    background: #fff; border: 1.5px solid var(--c-grid); padding: 24px 20px;
    display: flex; flex-direction: column; gap: 8px; transition: 0.25s;
}
.stat:hover { border-color: var(--c-primary); box-shadow: 8px 8px 0 rgba(193, 162, 104, 0.18); }
.stat strong { font-family: var(--f-mono); font-size: 30px; color: var(--c-primary); }
.stat span { font-family: var(--f-mono); font-size: 10px; letter-spacing: 2px; color: var(--c-ink-soft); }

.pwd-form { max-width: 420px; }
.pwd-form .ink-field { margin-bottom: 14px; }

.info-list { border-top: 1px solid var(--c-grid); margin-bottom: 24px; }
.info-list > div { display: flex; justify-content: space-between; gap: 14px; padding: 13px 0; border-bottom: 1px solid var(--c-grid); }
.info-list dt { font-family: var(--f-mono); font-size: 11px; color: var(--c-ink-soft); }
.info-list dd { font-size: 13px; font-weight: 700; }

.sec-note {
    margin-top: 22px; font-size: 11.5px; line-height: 1.9; color: var(--c-ink-soft);
    border-left: 3px solid var(--c-accent); padding-left: 12px;
}
.sec-note i { color: var(--c-accent); margin-right: 6px; }

@media (max-width: 1100px) {
    .profile-grid { grid-template-columns: 1fr; }
    .stat-row { grid-template-columns: 1fr; }
}
</style>
