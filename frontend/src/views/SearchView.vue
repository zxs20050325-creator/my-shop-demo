<script setup>
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ProductExplorer from '../components/ProductExplorer.vue'
import { api } from '../api'
import { useUserStore } from '../stores/user'

// 旧版首页的搜索框只 console.log（源码里那句注释写着
// 「这里可以添加实际的搜索逻辑」），而收藏夹和详情页的搜索框连事件都没绑。
// 后端也没有任何搜索参数。这个页面是整站第一次真正能搜出东西。

const route = useRoute()
const router = useRouter()
const user = useUserStore()

const q = computed(() => (typeof route.query.q === 'string' ? route.query.q : ''))
const sort = computed(() => (typeof route.query.sort === 'string' ? route.query.sort : 'default'))

function changeSort(e) {
    router.replace({ name: 'search', query: { ...route.query, sort: e.target.value } })
}

onMounted(() => {
    // 埋点沿用旧版的行为字符串，后台「行为分布」的口径不变
    api.track(user.username || '游客', '浏览商品', q.value).catch(() => {})
})
</script>

<template>
    <section class="page-section">
        <div class="page-head">
            <h2>搜索 · {{ q || '全部藏品' }}</h2>
            <span class="en">SEARCH RESULT // QUERY: {{ q ? q.toUpperCase() : 'ALL' }}</span>
            <div class="rule"></div>
        </div>

        <div class="toolbar">
            <span class="toolbar-label">排序 / SORT</span>
            <select class="ink-select" :value="sort" @change="changeSort">
                <option value="default">默认（按编号）</option>
                <option value="price_asc">价格从低到高</option>
                <option value="price_desc">价格从高到低</option>
                <option value="newest">最新上架</option>
            </select>
        </div>

        <ProductExplorer
            :key="q + '|' + sort"
            :q="q"
            :sort="sort"
            :page-size="12"
            :empty-text="q ? `没有找到与「${q}」相关的藏品` : '还没有上架的藏品'"
        />
    </section>
</template>

<style scoped>
.toolbar { display: flex; align-items: center; gap: 14px; margin-bottom: 34px; }
.toolbar-label { font-family: var(--f-mono); font-size: 11px; letter-spacing: 2px; color: var(--c-ink-soft); }
.ink-select {
    padding: 9px 14px; border: 1.5px solid var(--c-primary); background: transparent;
    color: var(--c-primary); font-size: 13px; outline: none;
}
.ink-select:focus { border-color: var(--c-accent); }
</style>
