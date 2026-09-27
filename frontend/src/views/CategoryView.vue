<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../api'
import ProductExplorer from '../components/ProductExplorer.vue'

const route = useRoute()
const router = useRouter()
const categoryData = ref([])
const viewMode = ref('comfortable')

const name = computed(() => (typeof route.params.name === 'string' ? route.params.name : ''))
const sort = computed(() => (typeof route.query.sort === 'string' ? route.query.sort : 'default'))
const count = computed(() =>
    categoryData.value.find(item => item.category === name.value)?.count || 0)
const descriptions = {
    数字藏品: '将古建筑结构与纹样转译为拥有独立编号的数字收藏。',
    文创周边: '把燕赵建筑意象延伸到日常器物与礼赠场景。',
    数字画作: '以数字绘画重述建筑、园林和地域文化记忆。',
    典藏精品: '面向重点藏品的精细化数字复原与限量展示。',
    非遗手作: '连接传统工艺、地方材料与当代审美。'
}
const categoryDescription = computed(() =>
    descriptions[name.value] || '以数字方式保存和传播河北地方文化遗产。')

function changeSort(event) {
    router.replace({ query: { ...route.query, sort: event.target.value } })
}

onMounted(async () => {
    try {
        categoryData.value = (await api.listCategories()).items || []
    } catch {
        categoryData.value = []
    }
})
</script>

<template>
    <section class="category-page">
        <nav class="breadcrumb">
            <RouterLink to="/">数字档案</RouterLink>
            <span>/</span>
            <strong>{{ name }}</strong>
        </nav>

        <header class="category-hero">
            <div class="category-copy">
                <span class="section-kicker">CATEGORY ARCHIVE</span>
                <h1>{{ name }}</h1>
                <p>{{ categoryDescription }}</p>
                <div class="category-meta">
                    <span><strong>{{ count }}</strong> 件在售藏品</span>
                    <span><i class="fa fa-database"></i> 数字档案实时同步</span>
                </div>
            </div>
            <div class="category-visual">
                <img :src="'/images/00' + (Math.min(count || 1, 6)) + '.jpg'" :alt="name">
                <span>{{ name }} · DIGITAL COLLECTION</span>
            </div>
        </header>

        <div class="category-toolbar">
            <div class="toolbar-left">
                <span>排序 / SORT</span>
                <select class="ink-select" :value="sort" @change="changeSort">
                    <option value="default">默认编号</option>
                    <option value="price_asc">价格从低到高</option>
                    <option value="price_desc">价格从高到低</option>
                    <option value="newest">最新上架</option>
                </select>
            </div>
            <div class="density-switch">
                <button :class="{ active: viewMode === 'comfortable' }"
                        title="图片更大，三列浏览" @click="viewMode = 'comfortable'">
                    <i class="fa fa-th-large"></i><span>舒适</span>
                </button>
                <button :class="{ active: viewMode === 'compact' }"
                        title="一屏显示更多商品" @click="viewMode = 'compact'">
                    <i class="fa fa-th"></i><span>紧凑</span>
                </button>
            </div>
        </div>

        <ProductExplorer
            :key="name + '|' + sort"
            :category="name"
            :sort="sort"
            :view-mode="viewMode"
            :min-pages="60"
            :page-size="12"
            :empty-text="`「${name}」分类下暂时没有藏品`"
        />

        <aside class="category-note">
            <span>专题说明</span>
            <p>本分类用于组织同一文化主题下的数字藏品。每个商品拥有独立 SKU、价格与库存，下单时会由服务端重新校验。</p>
            <div class="placeholder-strip">
                <span></span><span></span><span></span>
            </div>
        </aside>
    </section>
</template>

<style scoped>
.category-page { width: 100%; max-width: 1440px; margin: 0 auto; padding: 28px 54px 100px; box-sizing: border-box; }
.category-page > * { width: 100%; }
.category-page :deep(.product-grid) { width: 100%; align-items: stretch; }
.category-page :deep(.blind-card),
.category-page :deep(.placeholder-product-card) { width: 100%; }
.breadcrumb { display: flex; gap: 10px; margin-bottom: 22px; color: var(--c-ink-soft); font-size: 11px; }
.breadcrumb strong { color: var(--c-primary); }
.category-hero { position: relative; display: grid; grid-template-columns: 1fr .8fr; min-height: 400px; margin-bottom: 26px; background: var(--c-primary); color: #fff; overflow: hidden; }
.category-hero::before { content: ""; position: absolute; inset: 0; z-index: 1; pointer-events: none; opacity: .16; background-image: linear-gradient(rgba(231,212,168,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(231,212,168,.3) 1px, transparent 1px); background-size: 42px 42px; }
.category-hero::after { content: ""; position: absolute; left: 0; right: 0; top: -28%; height: 26%; z-index: 1; pointer-events: none; background: linear-gradient(to bottom, transparent, rgba(231,212,168,.45), rgba(255,255,255,.2), transparent); box-shadow: 0 0 32px rgba(193,162,104,.35); animation: categoryScan 5.2s linear infinite; }
@keyframes categoryScan { from { top: -28%; } to { top: 108%; } }
.category-copy { position: relative; z-index: 2; display: flex; flex-direction: column; justify-content: center; padding: 54px 58px; }
.section-kicker { color: var(--c-accent-light, #e7d4a8); font-family: var(--f-mono); font-size: 10px; letter-spacing: 2px; }
.category-copy h1 { margin: 14px 0 18px; font-size: clamp(42px, 5vw, 76px); }
.category-copy > p { max-width: 620px; color: rgba(255,255,255,.64); line-height: 2; }
.category-meta { display: flex; gap: 28px; margin-top: 30px; color: rgba(255,255,255,.66); font-size: 11px; }
.category-meta strong { color: #e7d4a8; font-family: var(--f-mono); font-size: 22px; }
.category-visual { position: relative; z-index: 2; min-height: 400px; }
.category-visual img { width: 100%; height: 100%; object-fit: cover; opacity: .78; }
.category-visual::after { content: ""; position: absolute; inset: 18px; border: 1px solid rgba(255,255,255,.28); }
.category-visual span { position: absolute; left: 28px; bottom: 28px; z-index: 2; padding: 7px 10px; background: rgba(10,20,18,.78); color: #e7d4a8; font-family: var(--f-mono); font-size: 9px; letter-spacing: 1px; }
.category-toolbar { position: sticky; top: 86px; z-index: 2500; display: flex; justify-content: space-between; align-items: center; gap: 18px; margin-bottom: 32px; padding: 13px 16px; background: rgba(255,253,248,.94); border: 1px solid var(--c-grid); backdrop-filter: blur(14px); }
.toolbar-left { display: flex; align-items: center; gap: 14px; }
.toolbar-left > span { color: var(--c-ink-soft); font-family: var(--f-mono); font-size: 10px; letter-spacing: 1px; }
.ink-select { padding: 8px 12px; border: 1px solid var(--c-grid); background: #fff; color: var(--c-primary); outline: none; }
.density-switch { display: flex; gap: 4px; }
.density-switch button { min-width: 72px; height: 36px; display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 0 11px; border: 1px solid var(--c-grid); background: #fff; color: var(--c-ink-soft); }
.density-switch button span { font-size: 10px; }
.density-switch button.active { border-color: var(--c-primary); background: var(--c-primary); color: #fff; }
.category-note { display: grid; grid-template-columns: 150px 1fr 160px; gap: 28px; align-items: center; margin-top: 70px; padding: 30px; background: #fff; border: 1px solid var(--c-grid); }
.category-note > span { color: var(--c-accent); font-family: var(--f-mono); font-size: 10px; letter-spacing: 2px; }
.category-note p { color: var(--c-ink-soft); line-height: 1.9; font-size: 12px; }
.placeholder-strip { display: flex; justify-content: flex-end; gap: 8px; }
.placeholder-strip span { width: 34px; height: 58px; border: 1px dashed var(--c-grid); background: rgba(193,162,104,.06); }
@media (max-width: 1000px) {
    .category-page { padding: 24px; }
    .category-hero { grid-template-columns: 1fr; }
    .category-visual { min-height: 320px; }
    .category-note { grid-template-columns: 1fr; }
    .placeholder-strip { justify-content: flex-start; }
}
@media (max-width: 680px) {
    .category-copy { padding: 38px 24px; }
    .category-meta, .category-toolbar { align-items: flex-start; flex-direction: column; }
    .category-toolbar { top: 78px; }
}
</style>
