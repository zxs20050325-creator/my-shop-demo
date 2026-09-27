<script setup>
defineProps({
    current: { type: String, required: true }
})

const variants = [
    { id: 'v3', label: '已选 · 数字档案', to: '/' },
    { id: 'v1', label: '方案一 · 策展长卷', to: '/home-v1' },
    { id: 'v2', label: '方案二 · 非遗市集', to: '/home-v2' },
    { id: 'classic', label: '旧版主页', to: '/home-current' }
]
</script>

<template>
    <nav class="variant-switcher">
        <span>首页方案</span>
        <RouterLink v-for="item in variants" :key="item.id"
                    :to="item.to"
                    :class="{ active: current === item.id }">
            {{ item.label }}
        </RouterLink>
    </nav>
</template>

<style scoped>
.variant-switcher {
    position: sticky;
    top: 94px;
    z-index: 3000;
    display: flex;
    align-items: center;
    gap: 8px;
    width: fit-content;
    max-width: calc(100% - 32px);
    margin: 18px auto 0;
    padding: 8px;
    overflow-x: auto;
    background: rgba(255, 253, 248, .94);
    border: 1px solid var(--c-grid);
    box-shadow: 0 10px 28px rgba(31,52,47,.1);
    backdrop-filter: blur(14px);
}
.variant-switcher > span {
    padding: 0 8px;
    color: var(--c-ink-soft);
    font-size: 11px;
    font-weight: 800;
    white-space: nowrap;
}
.variant-switcher a {
    padding: 8px 12px;
    border: 1px solid transparent;
    color: var(--c-ink-soft);
    font-size: 11px;
    white-space: nowrap;
}
.variant-switcher a:hover,
.variant-switcher a.active {
    border-color: var(--c-primary);
    background: var(--c-primary);
    color: #fff;
}
@media (max-width: 760px) {
    .variant-switcher { top: 88px; justify-content: flex-start; }
    .variant-switcher > span { display: none; }
}
</style>
