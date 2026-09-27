<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '../api'

const route = useRoute()
const profile = ref(null)
const loading = ref(true)
const error = ref('')

function formatDate(value) {
    if (!value) return '—'
    return new Date(value).toLocaleDateString('zh-CN')
}

onMounted(async () => {
    try {
        profile.value = await api.getPublicUser(route.params.username)
    } catch (e) {
        error.value = e.message
    } finally {
        loading.value = false
    }
})
</script>

<template>
    <section class="page-section user-profile-page">
        <div v-if="loading" class="loading-line">正在读取收藏家档案…</div>
        <div v-else-if="error" class="empty-state">
            <i class="fa fa-user-times"></i>
            <h3>用户档案不存在</h3>
            <p>{{ error }}</p>
        </div>

        <template v-else-if="profile">
            <header class="profile-hero">
                <div class="profile-avatar">{{ (profile.nickname || profile.username).slice(0, 1) }}</div>
                <div class="profile-copy">
                    <span class="archive-label">COLLECTOR ARCHIVE</span>
                    <h1>{{ profile.nickname }}</h1>
                    <p>冀遗筑梦数字收藏家 · @{{ profile.username }}</p>
                </div>
                <div class="profile-role">
                    <span>身份</span>
                    <strong>{{ profile.role === 'admin' ? '文化遗产管理员' : '古建珍藏家' }}</strong>
                </div>
            </header>

            <div class="profile-stats">
                <article><span>有效订单</span><strong>{{ profile.orderCount }}</strong></article>
                <article><span>珍藏藏品</span><strong>{{ profile.favoriteCount }}</strong></article>
                <article><span>加入天数</span><strong>{{ profile.joinedDays }}</strong></article>
                <article><span>加入日期</span><strong class="date">{{ formatDate(profile.createdAt) }}</strong></article>
            </div>

            <div class="profile-content">
                <section>
                    <span class="archive-label">COLLECTION IDENTITY</span>
                    <h2>收藏家档案</h2>
                    <p>该页面用于公开展示用户的基础收藏身份和统计信息，不包含手机号、收货地址、订单明细等隐私数据。</p>
                </section>
                <aside>
                    <div><span>数字档案号</span><strong>JY-U{{ String(profile.id).padStart(5, '0') }}</strong></div>
                    <div><span>用户名</span><strong>{{ profile.username }}</strong></div>
                    <div><span>账号状态</span><strong>正常收藏家</strong></div>
                </aside>
            </div>
        </template>
    </section>
</template>

<style scoped>
.loading-line { padding: 90px 0; text-align: center; color: var(--c-ink-soft); }
.profile-hero { display: grid; grid-template-columns: 110px 1fr auto; align-items: center; gap: 28px; padding: 38px; color: #fff; background: var(--c-primary); }
.profile-avatar { width: 96px; height: 96px; display: grid; place-items: center; border: 1px solid #e7d4a8; color: #e7d4a8; font-family: var(--f-art); font-size: 48px; background: rgba(255,255,255,.05); }
.profile-copy h1 { margin: 8px 0; font-size: 38px; }
.profile-copy p { color: rgba(255,255,255,.58); font-size: 12px; }
.profile-role { padding-left: 28px; border-left: 1px solid rgba(255,255,255,.18); }
.profile-role span, .profile-role strong { display: block; }
.profile-role span { color: rgba(255,255,255,.48); font-size: 10px; }
.profile-role strong { margin-top: 7px; color: #e7d4a8; }
.profile-stats { display: grid; grid-template-columns: repeat(4, 1fr); border: 1px solid var(--c-grid); border-top: 0; background: #fff; }
.profile-stats article { padding: 24px; border-right: 1px solid var(--c-grid); }
.profile-stats article:last-child { border-right: 0; }
.profile-stats span, .profile-stats strong { display: block; }
.profile-stats span { color: var(--c-ink-soft); font-size: 10px; }
.profile-stats strong { margin-top: 9px; color: #9b7a38; font-family: var(--f-mono); font-size: 28px; }
.profile-stats strong.date { font-size: 16px; }
.profile-content { display: grid; grid-template-columns: 1fr 340px; gap: 46px; margin-top: 50px; }
.profile-content h2 { margin: 10px 0 18px; font-size: 30px; }
.profile-content p { color: var(--c-ink-soft); line-height: 2; }
.profile-content aside { padding: 24px; background: #fff; border: 1px solid var(--c-grid); }
.profile-content aside div { display: flex; justify-content: space-between; gap: 20px; padding: 14px 0; border-bottom: 1px solid var(--c-grid); }
.profile-content aside span { color: var(--c-ink-soft); font-size: 11px; }
.profile-content aside strong { text-align: right; font-size: 12px; }
@media (max-width: 900px) {
    .profile-hero { grid-template-columns: 72px 1fr; padding: 26px; }
    .profile-avatar { width: 64px; height: 64px; font-size: 32px; }
    .profile-role { grid-column: 2; padding: 14px 0 0; border-left: 0; border-top: 1px solid rgba(255,255,255,.15); }
    .profile-stats { grid-template-columns: repeat(2, 1fr); }
    .profile-content { grid-template-columns: 1fr; }
}
</style>
