<script setup>
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ProductExplorer from '../components/ProductExplorer.vue'
import { api } from '../api'

const route = useRoute()
const router = useRouter()
const q = computed(() => typeof route.query.q === 'string' ? route.query.q : '')
const sort = computed(() => typeof route.query.sort === 'string' ? route.query.sort : 'default')

function changeSort(event) {
    router.replace({ name: 'search', query: { ...route.query, sort: event.target.value } })
}

onMounted(() => api.track('浏览商品', q.value))
</script>

<template>
    <section class="page-section">
        <div class="page-head">
            <h2>搜索结果</h2>
            <span class="en">SEARCH // {{ q }}</span>
            <div class="rule"></div>
        </div>
        <div class="filter-row">
            <select :value="sort" class="ink-field" @change="changeSort">
                <option value="default">默认排序</option>
                <option value="price_asc">价格从低到高</option>
                <option value="price_desc">价格从高到低</option>
                <option value="newest">最新上架</option>
            </select>
        </div>
        <ProductExplorer :q="q" :sort="sort" :page-size="12"
                         :empty-text="q ? `没有找到与「${q}」相关的藏品` : '还没有上架的藏品'" />
    </section>
</template>
