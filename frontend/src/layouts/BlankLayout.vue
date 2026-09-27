<script setup>
// 无侧边栏、无顶栏的整屏布局。用于登录/注册/后台这类「独立页面」。
</script>

<template>
    <div class="blank-layout">
        <slot />
    </div>
</template>

<style scoped>
.blank-layout {
    min-height: 100vh;
    position: relative;
    z-index: 100;
}
</style>
