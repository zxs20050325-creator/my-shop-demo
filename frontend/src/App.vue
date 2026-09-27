<script setup>
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { useRoute } from 'vue-router'
import DefaultLayout from './layouts/DefaultLayout.vue'
import BlankLayout from './layouts/BlankLayout.vue'
import ToastHost from './components/ToastHost.vue'
import AuthModal from './components/AuthModal.vue'
import { useUiStore } from './stores/ui'
import { useUserStore } from './stores/user'
import { useCartStore } from './stores/cart'
import { useFavoritesStore } from './stores/favorites'

const route = useRoute()
const ui = useUiStore()
const user = useUserStore()
const cart = useCartStore()
const favorites = useFavoritesStore()

// 登录页/注册页/后台不套侧边栏与顶栏
const layout = computed(() => (route.meta.layout === 'blank' ? BlankLayout : DefaultLayout))

// ---- 自定义光标 + 「筑梦」水印视差 ----
// 旧版每个页面各自实现一遍这段逻辑（且只在 index.html 生效），
// 现在收在根组件里，全站统一。
const ring = ref(null)
const dot = ref(null)
const wmZhu = ref(null)
const wmMeng = ref(null)

let pointerFine = false

function onMove(e) {
    const { clientX: x, clientY: y } = e
    if (dot.value) dot.value.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`
    if (ring.value) ring.value.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`

    if (wmZhu.value) wmZhu.value.style.transform = `translate(${x / 60}px, ${y / 90}px)`
    if (wmMeng.value) wmMeng.value.style.transform = `translate(${-x / 70}px, ${-y / 110}px)`

    const target = e.target
    const interactive = target && target.closest &&
        target.closest('button, a, input, .blind-card, .series-node, .icon-btn, .page-node')
    document.body.classList.toggle('cursor-hover', !!interactive)
    if (ring.value) ring.value.classList.toggle('hover', !!interactive)
}

onMounted(() => {
    // 触屏设备没有悬停指针，开了反而看不到光标
    pointerFine = window.matchMedia('(pointer: fine)').matches
    if (pointerFine) {
        document.body.classList.add('has-custom-cursor')
        window.addEventListener('mousemove', onMove, { passive: true })
    }

    // 已登录则把服务端的购物车/收藏拉下来（刷新页面后保持一致）
    if (user.isLoggedIn) {
        cart.load()
        favorites.load()
    }
})

onBeforeUnmount(() => {
    window.removeEventListener('mousemove', onMove)
    document.body.classList.remove('has-custom-cursor')
})
</script>

<template>
    <div v-if="pointerFine" id="cursor-ring" ref="ring"></div>
    <div v-if="pointerFine" id="cursor-dot" ref="dot"></div>

    <div class="watermark-layer" aria-hidden="true">
        <div class="watermark-word" id="wm-zhu" ref="wmZhu">筑</div>
        <div class="watermark-word" id="wm-meng" ref="wmMeng">梦</div>
    </div>

    <component :is="layout">
        <RouterView v-slot="{ Component }">
            <component :is="Component" />
        </RouterView>
    </component>

    <!-- 登录弹窗挂在根上：任何页面、任何组件都能通过 ui store 唤起它 -->
    <AuthModal
        :open="ui.authOpen"
        :mode="ui.authMode"
        @close="ui.closeAuth()"
        @update:mode="ui.authMode = $event"
    />

    <ToastHost />
</template>
