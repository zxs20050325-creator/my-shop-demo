<script setup>
import { useRoute, useRouter } from 'vue-router'
import AuthPanel from '../components/AuthPanel.vue'

const route = useRoute()
const router = useRouter()

function onSuccess() {
    const target = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    router.replace(target)
}

function toLogin() {
    router.push({ name: 'login', query: route.query })
}
</script>

<template>
    <div class="auth-page">
        <div class="auth-card">
            <RouterLink to="/" class="auth-back">
                <i class="fa fa-angle-left"></i> 返回首页
            </RouterLink>
            <AuthPanel mode="register" @success="onSuccess" @switch="toLogin" />
        </div>
    </div>
</template>

<style scoped>
.auth-page {
    min-height: 100vh; display: flex; align-items: center; justify-content: center;
    padding: 40px 20px; position: relative;
}
.auth-card {
    width: 100%; max-width: 440px; background: var(--c-bg);
    border: 3px solid var(--c-primary); box-shadow: 30px 30px 0 var(--c-accent);
    padding: 50px; position: relative;
}
.auth-back {
    font-family: var(--f-mono); font-size: 12px; letter-spacing: 2px;
    color: var(--c-ink-soft); display: inline-block; margin-bottom: 26px; transition: 0.2s;
}
.auth-back:hover { color: var(--c-accent); }
</style>
