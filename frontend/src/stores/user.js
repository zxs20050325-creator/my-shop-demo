import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '../api'

// ⚠️ 身份模型（与旧版一致，本轮未改）：
// localStorage 里存的只是「一个裸用户名」，不是 token、无过期、无签名。
// 服务端 /api/login 验证密码后也只回 {success:true}，不发任何凭证；
// 之后所有请求的用户名都是前端明文提供的，服务端不核验。
// 演示够用，但这不构成可上线的鉴权——见计划文件「明确不做」一节。
const KEY = 'jiyi_user'

export const useUserStore = defineStore('user', () => {
    const username = ref(localStorage.getItem(KEY) || '')
    const isLoggedIn = computed(() => !!username.value)

    function persist(name) {
        username.value = name || ''
        if (name) localStorage.setItem(KEY, name)
        else localStorage.removeItem(KEY)
    }

    async function login(u, p) {
        await api.login(u, p)
        persist(u)
        return username.value
    }

    async function register(u, p) {
        await api.register(u, p)
        persist(u)
        return username.value
    }

    // 登出要清干净。旧版 syncSession() 清了 jiyi_user + jiyi_cart，
    // 唯独漏了 jiyi_favorites —— 换个账号登录会串到上一个人的收藏。
    // 现在收藏也由服务端为准，这里只需清本地这面镜子。
    function logout() {
        persist('')
        localStorage.removeItem('jiyi_cart')
        localStorage.removeItem('jiyi_favorites')
    }

    return { username, isLoggedIn, login, register, logout }
})
