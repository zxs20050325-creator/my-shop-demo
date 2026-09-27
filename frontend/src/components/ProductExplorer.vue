<script setup>
import { ref, watch, onMounted } from 'vue'
import { api } from '../api'
import ProductCard from './ProductCard.vue'
import Paginator from './Paginator.vue'

// 商品浏览的公共实现：首页、搜索结果页、分类页都是它。
// 旧版这三处（其实只有首页一处）各自实现分页，且页码写死成 [1,2]，
// 后端还忽略 ?page= —— 第 13 个商品在前台永远不出现。
const props = defineProps({
    q: { type: String, default: '' },
    category: { type: String, default: '' },
    sort: { type: String, default: 'default' },
    pageSize: { type: Number, default: 12 },
    emptyText: { type: String, default: '这里还没有藏品' }
})

const items = ref([])
const total = ref(0)
const page = ref(1)
const loading = ref(true)
const failed = ref(false)

async function load() {
    loading.value = true
    failed.value = false
    try {
        const res = await api.listProducts({
            q: props.q,
            category: props.category,
            sort: props.sort,
            page: page.value,
            pageSize: props.pageSize
        })
        items.value = res.items || []
        total.value = Number(res.total) || 0
    } catch (e) {
        // 后端接口出错时返回 HTTP 500，api 层会抛出来 —— 走这个分支，
        // 页面显示「藏品加载失败」。绝不能把失败当成「没有商品」，
        // 那会让人以为是自己搜错了词。
        console.error('商品加载失败', e)
        items.value = []
        total.value = 0
        failed.value = true
    } finally {
        loading.value = false
    }
}

function onPageChange(p) {
    page.value = p
    load()
}

// 搜索词/分类变化时回到第 1 页重新查
watch(() => [props.q, props.category, props.sort], () => {
    page.value = 1
    load()
})

onMounted(load)

defineExpose({ reload: load })
</script>

<template>
    <div class="product-grid">
        <template v-if="loading">
            <div v-for="i in pageSize" :key="'sk' + i" class="skeleton-card">
                <div class="sk-img"></div>
                <div class="sk-text"></div>
                <div class="sk-text" style="width:50%"></div>
            </div>
        </template>

        <ProductCard v-for="p in items" v-else :key="p.id" :product="p" />
    </div>

    <div v-if="!loading && !items.length" class="empty-state">
        <i class="fa" :class="failed ? 'fa-exclamation-triangle' : 'fa-inbox'"></i>
        <h3>{{ failed ? '藏品加载失败' : emptyText }}</h3>
        <p>{{ failed ? '接口返回了错误，请确认后端服务与数据库迁移是否就绪' : '换个关键词或分类试试' }}</p>
        <button v-if="failed" class="btn-reveal-all" @click="load">重试</button>
    </div>

    <Paginator
        v-if="!loading && items.length"
        :page="page"
        :page-size="pageSize"
        :total="total"
        @change="onPageChange"
    />
</template>
