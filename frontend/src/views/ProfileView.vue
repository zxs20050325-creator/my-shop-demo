<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../api'
import { useUserStore } from '../stores/user'
import { useCartStore } from '../stores/cart'
import { useFavoritesStore } from '../stores/favorites'
import { useToastStore } from '../stores/toast'

const router = useRouter()
const user = useUserStore()
const cart = useCartStore()
const favorites = useFavoritesStore()
const toast = useToastStore()

const nickname = ref('')
const phone = ref('')
const oldPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const orderCount = ref(0)
const savingProfile = ref(false)
const changingPassword = ref(false)

onMounted(async () => {
    await user.bootstrap()
    user.user = await api.auth.me()
    nickname.value = user.user?.nickname || ''
    phone.value = user.user?.phone || ''
    await Promise.all([cart.load(), favorites.load()])
    const orders = await api.orders.list({ pageSize: 1 }).catch(() => ({ total: 0 }))
    orderCount.value = orders.total || 0
})

async function saveProfile() {
    savingProfile.value = true
    try {
        const updated = await api.users.updateProfile({
            nickname: nickname.value.trim(),
            phone: phone.value.trim()
        })
        user.user = updated
        toast.ok('资料已更新')
    } catch (e) {
        toast.error(e.message)
    } finally {
        savingProfile.value = false
    }
}

async function changePassword() {
    if (newPassword.value.length < 6) return toast.error('新密码至少 6 位')
    if (newPassword.value !== confirmPassword.value) return toast.error('两次输入的新密码不一致')

    changingPassword.value = true
    try {
        await api.users.changePassword(oldPassword.value, newPassword.value)
        oldPassword.value = newPassword.value = confirmPassword.value = ''
        toast.ok('密码已更新，请重新登录')
        await user.logout()
        cart.reset()
        favorites.reset()
        await router.push('/login')
    } catch (e) {
        toast.error(e.message)
    } finally {
        changingPassword.value = false
    }
}

async function logout() {
    await user.logout()
    cart.reset()
    favorites.reset()
    await router.push('/')
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
            <div>
                <div class="stat-row">
                    <RouterLink to="/orders" class="stat"><strong>{{ orderCount }}</strong><span>订单</span></RouterLink>
                    <RouterLink to="/favorites" class="stat"><strong>{{ favorites.count }}</strong><span>珍藏</span></RouterLink>
                    <RouterLink to="/cart" class="stat"><strong>{{ cart.totalQuantity }}</strong><span>博古架</span></RouterLink>
                </div>

                <h3 class="block-title">基本资料</h3>
                <div class="profile-form">
                    <label class="ink-label">用户名</label>
                    <input class="ink-field" :value="user.username" disabled>
                    <label class="ink-label">昵称</label>
                    <input v-model="nickname" class="ink-field" maxlength="32">
                    <label class="ink-label">手机号</label>
                    <input v-model="phone" class="ink-field" maxlength="11">
                    <button class="btn-reveal-all" :disabled="savingProfile" @click="saveProfile">
                        {{ savingProfile ? '保存中…' : '保存资料' }}
                    </button>
                </div>

                <h3 class="block-title" style="margin-top:38px">修改密码</h3>
                <div class="profile-form">
                    <input v-model="oldPassword" class="ink-field" type="password" placeholder="当前密码">
                    <input v-model="newPassword" class="ink-field" type="password" placeholder="新密码，至少 6 位">
                    <input v-model="confirmPassword" class="ink-field" type="password" placeholder="确认新密码">
                    <button class="btn-outline" :disabled="changingPassword" @click="changePassword">
                        {{ changingPassword ? '提交中…' : '更新密码' }}
                    </button>
                </div>
            </div>

            <aside>
                <dl class="info-list">
                    <div><dt>身份</dt><dd>{{ user.isAdmin ? '管理员' : '收藏家' }}</dd></div>
                    <div><dt>注册时间</dt><dd>{{ user.user?.created_at?.slice(0, 10) || '—' }}</dd></div>
                </dl>
                <RouterLink to="/addresses"><button class="btn-outline" style="width:100%;margin-bottom:12px">管理收货地址</button></RouterLink>
                <RouterLink to="/refunds"><button class="btn-outline" style="width:100%;margin-bottom:12px">退款记录</button></RouterLink>
                <button class="btn-danger-outline" style="width:100%" @click="logout">退出登录</button>
            </aside>
        </div>
    </section>
</template>

<style scoped>
.profile-grid { display: grid; grid-template-columns: 1fr 320px; gap: 50px; align-items: start; }
.stat-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 40px; }
.stat { border: 1px solid var(--c-grid); background: #fff; padding: 22px; }
.stat strong { display: block; color: var(--c-primary); font-size: 28px; }
.stat span { color: var(--c-ink-soft); font-size: 11px; }
.block-title { margin-bottom: 16px; color: var(--c-ink-soft); }
.profile-form { display: grid; gap: 10px; max-width: 480px; }
.profile-form .ink-field { margin: 0; }
.info-list > div { display: flex; justify-content: space-between; padding: 13px 0; border-bottom: 1px solid var(--c-grid); }
.info-list dt { color: var(--c-ink-soft); }
@media (max-width: 900px) { .profile-grid { grid-template-columns: 1fr; } .stat-row { grid-template-columns: 1fr; } }
</style>
