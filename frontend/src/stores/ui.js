import { defineStore } from 'pinia'
import { ref } from 'vue'

// 全局 UI 状态：登录弹窗由根组件统一渲染。
// 这样任意深度的组件（商品卡、购物车、收藏夹、结算按钮）都能直接要求登录，
// 不必逐层 emit 事件——旧版就是因为没有这层，首页内嵌模态框和 login.html
// 各写各的，行为还不一致。
export const useUiStore = defineStore('ui', () => {
    const authOpen = ref(false)
    const authMode = ref('login')   // 'login' | 'register'

    function requireLogin(mode = 'login') {
        authMode.value = mode
        authOpen.value = true
    }

    function closeAuth() { authOpen.value = false }

    return { authOpen, authMode, requireLogin, closeAuth }
})
