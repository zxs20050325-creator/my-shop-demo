import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '../api'
import { useToastStore } from './toast'
import { useUserStore } from './user'

// 收藏：同样以服务端为准。
//
// 旧版有两个毛病：
//  ① 后端根本没有取消收藏的接口，favorites.html 只改 localStorage ——
//     刷新或换设备后收藏会「复活」。
//  ② 本地存的类型还不统一：商品详情页 push 的是 product.id（数字），
//     服务端同步下来的是完整对象 —— 两种形状混在同一个数组里。
//     现在统一存完整商品对象。
export const useFavoritesStore = defineStore('favorites', () => {
    const items = ref([])
    const loading = ref(false)
    // 同 cart：加载失败不能伪装成「没有收藏」
    const error = ref('')

    const count = computed(() => items.value.length)

    const isFavorited = (productId) =>
        items.value.some(it => String(it.id) === String(productId))

    async function load() {
        const user = useUserStore()
        if (!user.isLoggedIn) { items.value = []; error.value = ''; return }
        loading.value = true
        error.value = ''
        try {
            items.value = (await api.getFavorites(user.username)).items || []
        } catch (e) {
            console.error('收藏加载失败', e)
            items.value = []
            error.value = e.message || '收藏加载失败'
        } finally {
            loading.value = false
        }
    }

    // 返回 true = 已收藏，false = 已取消（或未登录时返回 null 表示需要登录）
    async function toggle(product) {
        const user = useUserStore()
        const toast = useToastStore()
        if (!user.isLoggedIn) return null

        const existed = isFavorited(product.id)
        try {
            if (existed) {
                await api.removeFromFavorites(user.username, product.id)
                await load()
                toast.ok('已移出珍藏')
            } else {
                await api.addToFavorites(user.username, product)
                await load()
                toast.ok('已入珍藏夹')
            }
            return !existed
        } catch (e) {
            toast.error('操作失败：' + e.message)
            await load()
            return existed
        }
    }

    async function remove(productId) {
        const user = useUserStore()
        const toast = useToastStore()
        if (!user.isLoggedIn) return
        try {
            await api.removeFromFavorites(user.username, productId)
            await load()
            toast.ok('已移出珍藏')
        } catch (e) {
            toast.error('移除失败：' + e.message)
        }
    }

    function reset() { items.value = []; error.value = '' }

    return { items, loading, error, count, isFavorited, load, toggle, remove, reset }
})
