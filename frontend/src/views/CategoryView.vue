<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ProductExplorer from '../components/ProductExplorer.vue'

// 按分类浏览。DB 里 products.category 一直存在（数字藏品/文创周边/数字画作/
// 典藏精品/非遗手作），但旧版没有任何入口能按它浏览——侧边栏那 4 个节点
// 写死成地名，点击只改背景色，后端根本不收分类参数。

const route = useRoute()
const router = useRouter()

const name = computed(() => (typeof route.params.name === 'string' ? route.params.name : ''))
const sort = computed(() => (typeof route.query.sort === 'string' ? route.query.sort : 'default'))

function changeSort(e) {
    router.replace({ query: { ...route.query, sort: e.target.value } })
}
</script>

<template>
    <section class="page-section">
        <div class="page-head">
            <h2>{{ name }}</h2>
            <span class="en">CATEGORY COLLECTION</span>
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
            :key="name + '|' + sort"
            :category="name"
            :sort="sort"
            :page-size="12"
            :empty-text="`「${name}」分类下暂时没有藏品`"
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
