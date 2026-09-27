<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DefaultLayout from './layouts/DefaultLayout.vue'
import BlankLayout from './layouts/BlankLayout.vue'
import ToastHost from './components/ToastHost.vue'
import AuthModal from './components/AuthModal.vue'
import { useUiStore } from './stores/ui'
import { useUserStore } from './stores/user'
import { useCartStore } from './stores/cart'
import { useFavoritesStore } from './stores/favorites'

const route = useRoute()
const router = useRouter()
const ui = useUiStore()
const user = useUserStore()
const cart = useCartStore()
const favorites = useFavoritesStore()

const layout = computed(() => (route.meta.layout === 'blank' ? BlankLayout : DefaultLayout))

const wmZhu = ref(null)
const wmMeng = ref(null)
let pointerX = 0
let pointerY = 0
let pointerFrame = 0
let reduceMotion = false

function onMove(event) {
    pointerX = event.clientX
    pointerY = event.clientY

    if (!pointerFrame) {
        pointerFrame = requestAnimationFrame(flushWatermark)
    }
}

function flushWatermark() {
    pointerFrame = 0
    const x = Math.round(pointerX)
    const y = Math.round(pointerY)

    if (!reduceMotion) {
        if (wmZhu.value) {
            wmZhu.value.style.transform =
                `translate3d(${(x / 60).toFixed(2)}px, ${(y / 82).toFixed(2)}px, 0)`
        }
        if (wmMeng.value) {
            wmMeng.value.style.transform =
                `translate3d(${(-x / 72).toFixed(2)}px, ${(-y / 96).toFixed(2)}px, 0)`
        }
    }
}

async function onAuthExpired() {
    user.reset()
    cart.reset()
    favorites.reset()
    if (route.meta.requiresAuth) {
        await router.replace({ name: 'login', query: { redirect: route.fullPath } })
    }
}

onMounted(async () => {
    reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!reduceMotion) {
        window.addEventListener('mousemove', onMove, { passive: true })
    }
    window.addEventListener('auth:expired', onAuthExpired)

    await user.bootstrap()
    if (user.isLoggedIn) {
        await Promise.all([cart.load(), favorites.load()])
    }
})

onBeforeUnmount(() => {
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('auth:expired', onAuthExpired)
    if (pointerFrame) cancelAnimationFrame(pointerFrame)
})
</script>

<template>
    <div class="watermark-layer" aria-hidden="true">
        <div class="watermark-word" id="wm-zhu" ref="wmZhu">筑</div>
        <div class="watermark-word" id="wm-meng" ref="wmMeng">梦</div>
    </div>

    <component :is="layout">
        <RouterView />
    </component>

    <AuthModal
        :open="ui.authOpen"
        :mode="ui.authMode"
        @close="ui.closeAuth()"
        @update:mode="ui.authMode = $event"
    />
    <ToastHost />
</template>
