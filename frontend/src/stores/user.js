import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { api } from '../api'

export const useUserStore = defineStore('user', () => {
    const user = ref(null)
    const ready = ref(false)
    const loading = ref(false)

    const isLoggedIn = computed(() => !!user.value)
    const isAdmin = computed(() => user.value?.role === 'admin')
    const username = computed(() => user.value?.username || '')

    async function bootstrap() {
        if (ready.value) return user.value
        try {
            user.value = await api.auth.me()
        } catch {
            user.value = null
        } finally {
            ready.value = true
        }
        return user.value
    }

    async function login(credentials) {
        user.value = await api.auth.login(credentials)
        ready.value = true
        return user.value
    }

    async function register(payload) {
        user.value = await api.auth.register(payload)
        ready.value = true
        return user.value
    }

    async function logout() {
        try {
            await api.auth.logout()
        } finally {
            user.value = null
            ready.value = true
        }
    }

    function reset() {
        user.value = null
        ready.value = false
    }

    return {
        user,
        ready,
        loading,
        isLoggedIn,
        isAdmin,
        username,
        bootstrap,
        login,
        register,
        logout,
        reset
    }
})
