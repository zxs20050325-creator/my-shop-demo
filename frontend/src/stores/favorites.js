import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { api } from '../api'
import { useToastStore } from './toast'

export const useFavoritesStore = defineStore('favorites', () => {
    const items = ref([])
    const loading = ref(false)
    const error = ref('')

    const count = computed(() => items.value.length)
    const products = computed(() => items.value.map(item => item.product).filter(Boolean))
    const isFavorited = (productId) =>
        items.value.some(item => String(item.productId) === String(productId))

    async function load() {
        loading.value = true
        error.value = ''
        try {
            const result = await api.favorites.list()
            items.value = result.items || []
        } catch (e) {
            items.value = []
            error.value = e.message || '收藏加载失败'
        } finally {
            loading.value = false
        }
    }

    async function add(productId) {
        const toast = useToastStore()
        try {
            const result = await api.favorites.add(productId)
            items.value = result.items || []
            toast.ok('已入珍藏夹')
            return true
        } catch (e) {
            toast.error('收藏失败：' + e.message)
            return false
        }
    }

    async function remove(productId) {
        const toast = useToastStore()
        try {
            const result = await api.favorites.remove(productId)
            items.value = result.items || []
            toast.ok('已移出珍藏')
        } catch (e) {
            toast.error('移除失败：' + e.message)
        }
    }

    async function toggle(product) {
        return isFavorited(product.id) ? remove(product.id) : add(product.id)
    }

    function reset() {
        items.value = []
        error.value = ''
    }

    return { items, products, loading, error, count, isFavorited, load, add, remove, toggle, reset }
})
