<script setup>
import { ref, watch } from 'vue'
import { useUserStore } from '../stores/user'
import { useCartStore } from '../stores/cart'
import { useFavoritesStore } from '../stores/favorites'
import { useToastStore } from '../stores/toast'

// 全站唯一的登录/注册表单实现。
// 旧版有三份互不一致的副本：首页的内嵌模态框、login.html、register.html。
// 现在 LoginView / RegisterView / AuthModal 都复用这一个组件。
const props = defineProps({
    mode: { type: String, default: 'login' }   // 'login' | 'register'
})
const emit = defineEmits(['success', 'switch'])

const user = useUserStore()
const cart = useCartStore()
const favorites = useFavoritesStore()
const toast = useToastStore()

const username = ref('')
const password = ref('')
const confirm = ref('')
const error = ref('')
const busy = ref(false)

const isRegister = () => props.mode === 'register'

watch(() => props.mode, () => { error.value = ''; password.value = ''; confirm.value = '' })

async function submit() {
    error.value = ''

    const u = username.value.trim()
    const p = password.value

    if (!u || !p) { error.value = '用户名和密码都要填'; return }
    if (isRegister()) {
        if (p.length < 6) { error.value = '密码至少 6 位'; return }
        if (p !== confirm.value) { error.value = '两次输入的密码不一致'; return }
    }

    busy.value = true
    try {
        if (isRegister()) {
            await user.register(u, p)
            toast.ok(`欢迎，${u}`)
        } else {
            await user.login(u, p)
            toast.ok(`欢迎回来，${u}`)
        }
        // 登录后把服务端的购物车/收藏拉下来，覆盖本地这面镜子
        await Promise.all([cart.load(), favorites.load()])
        emit('success', u)
    } catch (e) {
        error.value = e.status === 401 ? '用户名或密码错误'
            : e.status === 409 ? '该用户名已被占用'
            : (e.message || '操作失败，请稍后再试')
    } finally {
        busy.value = false
    }
}
</script>

<template>
    <form class="auth-panel" @submit.prevent="submit">
        <h3>{{ isRegister() ? '创建账户' : '开启盲盒' }}</h3>
        <span class="sub">{{ isRegister() ? 'CREATE ACCOUNT' : 'CONNECT THE CIPHER' }}</span>

        <label class="ink-label" for="auth-username">用户名 / USERNAME</label>
        <input
            id="auth-username"
            v-model="username"
            class="ink-field"
            type="text"
            autocomplete="username"
            placeholder="请输入用户名"
        >

        <label class="ink-label" for="auth-password">密码 / PASSWORD</label>
        <input
            id="auth-password"
            v-model="password"
            class="ink-field"
            type="password"
            :autocomplete="isRegister() ? 'new-password' : 'current-password'"
            placeholder="请输入密码"
        >

        <template v-if="isRegister()">
            <label class="ink-label" for="auth-confirm">确认密码 / CONFIRM</label>
            <input
                id="auth-confirm"
                v-model="confirm"
                class="ink-field"
                type="password"
                autocomplete="new-password"
                placeholder="请再输入一次"
            >
        </template>

        <div class="form-error">{{ error }}</div>

        <button class="btn-reveal-all" type="submit" :disabled="busy" style="width:100%">
            {{ busy ? '处理中…' : (isRegister() ? '创建账户' : '开启盲盒') }}
        </button>

        <p class="modal-switch">
            {{ isRegister() ? '已经有账户了？' : '还没有账户？' }}
            <button type="button" @click="emit('switch', isRegister() ? 'login' : 'register')">
                {{ isRegister() ? '去登录' : '去注册' }}
            </button>
        </p>
    </form>
</template>

<style scoped>
.auth-panel { width: 100%; }
</style>
