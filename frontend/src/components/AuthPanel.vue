<script setup>
import { ref, watch } from 'vue'
import { useUserStore } from '../stores/user'
import { useCartStore } from '../stores/cart'
import { useFavoritesStore } from '../stores/favorites'
import { useToastStore } from '../stores/toast'

const props = defineProps({
    mode: { type: String, default: 'login' }
})
const emit = defineEmits(['success', 'switch'])

const user = useUserStore()
const cart = useCartStore()
const favorites = useFavoritesStore()
const toast = useToastStore()

const username = ref('')
const password = ref('')
const confirm = ref('')
const nickname = ref('')
const error = ref('')
const busy = ref(false)

watch(() => props.mode, () => {
    error.value = ''
    password.value = ''
    confirm.value = ''
})

async function submit() {
    error.value = ''
    const name = username.value.trim()
    if (!name || !password.value) {
        error.value = '请填写用户名和密码'
        return
    }
    if (name.length < 3) {
        error.value = '用户名至少需要 3 个字符'
        return
    }
    if (!/^[a-zA-Z0-9_\u4e00-\u9fa5-]+$/.test(name)) {
        error.value = '用户名只能包含中文、字母、数字、下划线或横线'
        return
    }
    if (password.value.length < 6) {
        error.value = '密码至少需要 6 位'
        return
    }
    if (props.mode === 'register' && password.value !== confirm.value) {
        error.value = '两次输入的密码不一致'
        return
    }

    busy.value = true
    try {
        if (props.mode === 'register') {
            await user.register({ username: name, password: password.value, nickname: nickname.value })
        } else {
            await user.login({ username: name, password: password.value })
        }
        await Promise.all([cart.load(), favorites.load()])
        toast.ok(props.mode === 'register' ? '账号已创建' : '欢迎回来')
        emit('success')
    } catch (e) {
        error.value = e.message || '操作失败'
    } finally {
        busy.value = false
    }
}
</script>

<template>
    <form class="auth-panel" @submit.prevent="submit">
        <label class="ink-label" for="auth-user">用户名 / USERNAME</label>
        <input id="auth-user" v-model="username" class="ink-field" autocomplete="username" maxlength="32">

        <template v-if="mode === 'register'">
            <label class="ink-label" for="auth-nickname">昵称 / NICKNAME</label>
            <input id="auth-nickname" v-model="nickname" class="ink-field" maxlength="32">
        </template>

        <label class="ink-label" for="auth-pass">密码 / PASSWORD</label>
        <input id="auth-pass" v-model="password" class="ink-field" type="password"
               :autocomplete="mode === 'login' ? 'current-password' : 'new-password'">

        <template v-if="mode === 'register'">
            <label class="ink-label" for="auth-confirm">确认密码 / CONFIRM</label>
            <input id="auth-confirm" v-model="confirm" class="ink-field" type="password"
                   autocomplete="new-password">
        </template>

        <div class="form-error">{{ error }}</div>
        <button class="btn-reveal-all" type="submit" :disabled="busy">
            {{ busy ? '处理中…' : (mode === 'register' ? '创建账号' : '登录') }}
        </button>

        <button class="auth-switch" type="button"
                @click="emit('switch', mode === 'login' ? 'register' : 'login')">
            {{ mode === 'login' ? '还没有账号？去注册' : '已有账号？去登录' }}
        </button>
    </form>
</template>

<style scoped>
.auth-panel { display: flex; flex-direction: column; gap: 4px; }
.auth-panel .ink-field { margin-bottom: 12px; }
.auth-switch {
    margin-top: 14px; background: none; border: 0; color: var(--c-ink-soft);
    font-size: 12px; cursor: pointer;
}
</style>
