import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '../api'
import { useToastStore } from './toast'
import { useUserStore } from './user'

// 购物车：以服务端为准。
//
// 旧版是「先写 localStorage，再 fire-and-forget POST」，本地和服务端必然分叉；
// 结算时更是直接 removeItem('jiyi_cart') 把本地清掉就跳走，服务端清没清根本不知道。
// 现在每次增删改都等接口返回后重新拉取，保证屏幕上看到的就是数据库里的。
//
// 数量模型：同一商品只有一行，quantity 表示件数（旧版是重复插行 + 下标删除，
// 且 cart.html 的合计完全忽略数量）。
export const useCartStore = defineStore('cart', () => {
    const items = ref([])
    const loading = ref(false)
    const drawerOpen = ref(false)
    // 加载失败时必须留痕：把「服务端报错」显示成「空购物车」会让用户
    // 以为自己的东西没了，然后重新加一遍
    const error = ref('')

    // 徽标显示「商品种类数」，与旧版 updateCartCount() 的行为保持一致
    const count = computed(() => items.value.length)
    const totalQuantity = computed(() =>
        items.value.reduce((s, it) => s + (Number(it.quantity) || 1), 0))
    const totalPrice = computed(() =>
        items.value.reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.quantity) || 1), 0))

    function toggleDrawer(open) {
        drawerOpen.value = open === undefined ? !drawerOpen.value : !!open
    }

    async function load() {
        const user = useUserStore()
        if (!user.isLoggedIn) { items.value = []; error.value = ''; return }
        loading.value = true
        error.value = ''
        try {
            items.value = (await api.getCart(user.username)).items || []
        } catch (e) {
            console.error('购物车加载失败', e)
            items.value = []
            error.value = e.message || '购物车加载失败'
        } finally {
            loading.value = false
        }
    }

    // 返回 true 表示已成功加购；false 表示未登录（调用方负责弹登录框）
    async function add(product, quantity = 1) {
        const user = useUserStore()
        const toast = useToastStore()
        if (!user.isLoggedIn) return false

        try {
            await api.addToCart(user.username, product, quantity)
            await load()
            toast.ok(`已入博古架 · ${product.name}`)
            return true
        } catch (e) {
            toast.error('加购失败：' + e.message)
            return false
        }
    }

    async function remove(index) {
        const user = useUserStore()
        const toast = useToastStore()
        if (!user.isLoggedIn) return
        try {
            await api.removeFromCart(user.username, index)
            await load()
        } catch (e) {
            toast.error('移除失败：' + e.message)
        }
    }

    // 数量最小为 1；要减到 0 请用 remove（后端也会拒绝 <1 的值）
    async function setQuantity(index, quantity) {
        const user = useUserStore()
        const toast = useToastStore()
        if (!user.isLoggedIn) return
        const n = Math.max(1, Math.min(99, Math.floor(Number(quantity) || 1)))
        if (items.value[index]) items.value[index].quantity = n   // 先动起来，避免点按迟钝
        try {
            await api.setCartQuantity(user.username, index, n)
        } catch (e) {
            toast.error('修改数量失败：' + e.message)
            await load()   // 失败就回到服务端的真实状态
        }
    }

    function reset() { items.value = []; error.value = '' }

    // 仅清空本地镜像（结算成功后调用；服务端此时已经清过了）
    function clearLocal() { items.value = [] }

    return {
        items, loading, drawerOpen, error,
        count, totalQuantity, totalPrice,
        load, add, remove, setQuantity, reset, clearLocal, toggleDrawer
    }
})
