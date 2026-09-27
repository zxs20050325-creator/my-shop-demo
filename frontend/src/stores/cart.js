import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { api } from '../api'
import { useToastStore } from './toast'

export const useCartStore = defineStore('cart', () => {
    const items = ref([])
    const loading = ref(false)
    const drawerOpen = ref(false)
    const error = ref('')

    const count = computed(() => items.value.length)
    const totalQuantity = computed(() =>
        items.value.reduce((sum, item) => sum + Number(item.quantity || 1), 0))
    const totalPrice = computed(() =>
        items.value.reduce(
            (sum, item) => sum + Number(item.sku?.priceCents || 0) * Number(item.quantity || 1),
            0
        ) / 100)

    function toggleDrawer(open) {
        drawerOpen.value = open === undefined ? !drawerOpen.value : !!open
    }

    async function load() {
        loading.value = true
        error.value = ''
        try {
            const result = await api.cart.list()
            items.value = result.items || []
        } catch (e) {
            items.value = []
            error.value = e.message || '购物车加载失败'
        } finally {
            loading.value = false
        }
    }

    async function add(skuId, quantity = 1) {
        const toast = useToastStore()
        try {
            const result = await api.cart.add(skuId, quantity)
            items.value = result.items || []
            toast.ok('已入博古架')
            return true
        } catch (e) {
            toast.error('加购失败：' + e.message)
            return false
        }
    }

    async function remove(itemId) {
        const toast = useToastStore()
        try {
            const result = await api.cart.remove(itemId)
            items.value = result.items || []
        } catch (e) {
            toast.error('移除失败：' + e.message)
        }
    }

    async function setQuantity(itemId, quantity) {
        const toast = useToastStore()
        const normalized = Math.max(1, Math.min(99, Math.floor(Number(quantity) || 1)))
        const index = items.value.findIndex(item => Number(item.id) === Number(itemId))
        if (index >= 0) items.value[index].quantity = normalized
        try {
            const result = await api.cart.update(itemId, { quantity: normalized })
            items.value = result.items || []
        } catch (e) {
            toast.error('修改数量失败：' + e.message)
            await load()
        }
    }

    async function clear() {
        const result = await api.cart.clear()
        items.value = result.items || []
    }

    function clearLocal() {
        items.value = []
    }

    function reset() {
        items.value = []
        error.value = ''
        drawerOpen.value = false
    }

    return {
        items,
        loading,
        drawerOpen,
        error,
        count,
        totalQuantity,
        totalPrice,
        toggleDrawer,
        load,
        add,
        remove,
        setQuantity,
        clear,
        clearLocal,
        reset
    }
})
