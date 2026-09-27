<script setup>
import { computed, onMounted, ref } from 'vue'
import { api, imageUrl } from '../api'
import PlaceholderCard from '../components/PlaceholderCard.vue'

const PAGE_SIZE = 6
const TOTAL_PAGES = 60

const products = ref([])
const activeIndex = ref(0)
const currentPage = ref(1)
const jumpPage = ref(1)

const activeProduct = computed(() => products.value[activeIndex.value] || products.value[0] || null)
const totalCatalogSlots = TOTAL_PAGES * PAGE_SIZE
const formatCode = (id) => `JY-${String(id || 1).padStart(4, '0')}`

const catalogItems = computed(() =>
    Array.from({ length: totalCatalogSlots }, (_, index) => {
        const product = products.value[index]
        if (product) {
            return { ...product, placeholder: false, catalogIndex: index }
        }
        return {
            id: `placeholder-${index + 1}`,
            placeholder: true,
            catalogIndex: index,
            code: `JY-${String(index + 1).padStart(4, '0')}`,
            name: `待编目藏品 ${String(index + 1).padStart(3, '0')}`,
            category: '待编目',
            subtitle: '图片、规格与档案内容后续补充'
        }
    })
)

const pagedItems = computed(() => {
    const start = (currentPage.value - 1) * PAGE_SIZE
    return catalogItems.value.slice(start, start + PAGE_SIZE)
})

const pageNumbers = computed(() => {
    const current = currentPage.value
    const values = new Set([1, TOTAL_PAGES, current - 1, current, current + 1])
    return [...values].filter(value => value >= 1 && value <= TOTAL_PAGES).sort((a, b) => a - b)
})

function goPage(page) {
    currentPage.value = Math.min(TOTAL_PAGES, Math.max(1, Number(page) || 1))
    jumpPage.value = currentPage.value
    const firstReal = pagedItems.value.find(item => !item.placeholder)
    if (firstReal) activeIndex.value = firstReal.catalogIndex
}

function submitJump() {
    goPage(jumpPage.value)
}

function handleArtifactMove(event) {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - rect.left) / rect.width - 0.5
    const y = (event.clientY - rect.top) / rect.height - 0.5
    event.currentTarget.style.setProperty('--tilt-x', `${(-y * 5).toFixed(2)}deg`)
    event.currentTarget.style.setProperty('--tilt-y', `${(x * 6).toFixed(2)}deg`)
}

function resetArtifact(event) {
    event.currentTarget.style.setProperty('--tilt-x', '0deg')
    event.currentTarget.style.setProperty('--tilt-y', '0deg')
}

const scrollToCollection = () =>
    document.getElementById('collection')?.scrollIntoView({ behavior: 'smooth' })

onMounted(async () => {
    products.value = (await api.listProducts({ pageSize: 12 })).items || []
})
</script>

<template>
    <section class="digital-home">
        <div class="digital-home-bg"></div>
        <header class="digital-hero">
            <div class="hero-left">
                <span class="archive-eyebrow">JIYI DIGITAL ARCHIVE · S01</span>
                <h1>河北古建筑<br><em>数字典藏计划</em></h1>
                <p>以广惠寺华塔为起点，将燕赵古建筑、传统工艺和地方文化记忆，整理为可浏览、可收藏、可确权的数字档案。</p>
                <div class="hero-actions">
                    <button class="primary-action" @click="scrollToCollection">浏览本期典藏</button>
                    <RouterLink to="/search" class="text-action">进入藏品检索 <i class="fa fa-arrow-right"></i></RouterLink>
                </div>
            </div>
            <div class="hero-right">
                <div class="hero-catalog">
                    <span>本年度主题</span>
                    <strong>燕赵古建 · 数字化复刻</strong>
                    <small>ARCHITECTURE / CRAFT / MEMORY</small>
                </div>
                <div class="hero-seal">
                    <span>冀</span>
                    <small>数字非遗档案</small>
                </div>
            </div>
        </header>

        <div class="archive-metrics">
            <article><span>ARCHIVE ITEMS</span><strong>12</strong><small>已上线数字藏品</small></article>
            <article><span>CATALOGUE SLOTS</span><strong>{{ totalCatalogSlots }}</strong><small>藏品编目位</small></article>
            <article><span>CATALOGUE PAGES</span><strong>{{ TOTAL_PAGES }}</strong><small>可分页浏览</small></article>
            <article><span>CERTIFICATION</span><strong>ON</strong><small>订单确权链路在线</small></article>
        </div>

        <section class="featured-record">
            <div class="featured-visual"
                 @mousemove="handleArtifactMove"
                 @mouseleave="resetArtifact">
                <img :src="imageUrl(activeProduct?.img || '/images/001.jpg')"
                     :alt="activeProduct?.name || '数字藏品'">
                <div class="feature-scan"></div>
                <span class="featured-code">FEATURED RECORD · {{ formatCode(activeProduct?.id) }}</span>
            </div>
            <div class="featured-info">
                <span class="archive-label">本期主展品</span>
                <h2>{{ activeProduct?.name || '广惠寺华塔数字档案' }}</h2>
                <p>{{ activeProduct?.subtitle || '以河北古建筑为原型的数字化重构与数字收藏凭证。' }}</p>
                <dl>
                    <div><dt>藏品档案号</dt><dd>{{ formatCode(activeProduct?.id) }}</dd></div>
                    <div><dt>内容分类</dt><dd>{{ activeProduct?.category || '数字藏品' }}</dd></div>
                    <div><dt>结缘价格</dt><dd>¥ {{ activeProduct?.price || '--' }}</dd></div>
                    <div><dt>当前库存</dt><dd>{{ activeProduct?.stock || 0 }} 件可结缘</dd></div>
                </dl>
                <RouterLink v-if="activeProduct" :to="`/product/${activeProduct.id}`" class="record-button">
                    查看完整藏品档案
                </RouterLink>
            </div>
        </section>

        <section class="collection-section" id="collection">
            <header class="collection-head">
                <div>
                    <span class="archive-label">COLLECTION CATALOGUE</span>
                    <h2>本期典藏图谱</h2>
                </div>
                <p>共 {{ TOTAL_PAGES }} 页、{{ totalCatalogSlots }} 个藏品编目位。已有图片显示真实商品，未配置图片的条目使用统一占位符。</p>
            </header>

            <div class="artifact-grid">
                <template v-for="(item, index) in pagedItems" :key="item.id">
                    <article v-if="!item.placeholder"
                             class="artifact-card"
                             :class="{ active: activeIndex === item.catalogIndex }"
                             @mouseenter="activeIndex = item.catalogIndex">
                        <div class="artifact-image"
                             @mousemove="handleArtifactMove"
                             @mouseleave="resetArtifact">
                            <img :src="imageUrl(item.img)" :alt="item.name">
                            <span class="artifact-code">NO. {{ formatCode(item.id) }}</span>
                            <span class="artifact-category">{{ item.category }}</span>
                        </div>
                        <div class="artifact-plate">
                            <div class="plate-head"><span>JIYI COLLECTION</span><i class="fa fa-diamond"></i></div>
                            <h3>{{ item.name }}</h3>
                            <p>{{ item.subtitle || '河北古建筑数字化重构藏品' }}</p>
                            <div class="artifact-meta">
                                <div><small>结缘价</small><strong>¥ {{ item.price }}</strong></div>
                                <div><small>库存</small><strong>{{ item.stock }}</strong></div>
                            </div>
                            <RouterLink :to="`/product/${item.id}`" @click.stop>
                                查看档案 <i class="fa fa-long-arrow-right"></i>
                            </RouterLink>
                        </div>
                    </article>

                    <article v-else class="placeholder-artifact">
                        <div class="placeholder-code">NO. {{ item.code }}</div>
                        <PlaceholderCard :label="item.name" :note="item.subtitle" ratio="4 / 5" />
                    </article>
                </template>
            </div>

            <nav class="catalogue-pagination">
                <button :disabled="currentPage === 1" @click="goPage(1)">首页</button>
                <button :disabled="currentPage === 1" @click="goPage(currentPage - 1)">上一页</button>
                <template v-for="(number, index) in pageNumbers" :key="number">
                    <span v-if="index && number - pageNumbers[index - 1] > 1">…</span>
                    <button :class="{ active: currentPage === number }" @click="goPage(number)">{{ number }}</button>
                </template>
                <button :disabled="currentPage === TOTAL_PAGES" @click="goPage(currentPage + 1)">下一页</button>
                <button :disabled="currentPage === TOTAL_PAGES" @click="goPage(TOTAL_PAGES)">末页</button>
                <form class="page-jump" @submit.prevent="submitJump">
                    <span>跳至</span>
                    <input v-model.number="jumpPage" type="number" min="1" :max="TOTAL_PAGES">
                    <span>页</span>
                    <button type="submit">确定</button>
                </form>
            </nav>
        </section>

        <section class="brand-statement">
            <div class="statement-seal">遗</div>
            <p>不只是一件商品，而是一份被重新整理、数字化和持续讲述的地方文化档案。</p>
            <RouterLink to="/search">探索全部分类</RouterLink>
        </section>
    </section>
</template>

<style scoped>
.digital-home { position: relative; min-height: 100vh; overflow: hidden; background: #f7f5f0; color: var(--c-primary); }
.digital-home-bg { position: absolute; inset: 0 0 auto; height: 720px; pointer-events: none; opacity: .45; background-image: linear-gradient(rgba(47,72,66,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(47,72,66,.07) 1px, transparent 1px); background-size: 64px 64px; mask-image: linear-gradient(to bottom, #000 70%, transparent); }
.digital-hero { position: relative; z-index: 2; display: grid; grid-template-columns: 1.25fr .75fr; gap: 60px; max-width: 1440px; margin: 0 auto; padding: 82px 54px 54px; }
.archive-eyebrow, .archive-label { color: #9b7a38; font-family: var(--f-mono); font-size: 10px; letter-spacing: 2px; }
.digital-hero h1 { margin: 22px 0 24px; font-size: clamp(48px, 6vw, 86px); line-height: 1.08; letter-spacing: -1px; }
.digital-hero h1 em { color: #9b7a38; font-style: normal; }
.digital-hero p { max-width: 760px; color: var(--c-ink-soft); font-size: 15px; line-height: 2; }
.hero-actions { display: flex; align-items: center; gap: 26px; margin-top: 34px; }
.primary-action { padding: 14px 22px; background: var(--c-primary); color: #fff; border: 1px solid var(--c-primary); box-shadow: inset 0 -3px 0 #c1a268; }
.text-action { color: var(--c-primary); font-size: 12px; border-bottom: 1px solid var(--c-primary); padding-bottom: 3px; }
.hero-right { display: flex; flex-direction: column; justify-content: flex-end; align-items: flex-end; gap: 16px; }
.hero-catalog { display: grid; gap: 7px; padding: 22px; width: 100%; background: rgba(255,255,255,.78); border: 1px solid var(--c-grid); }
.hero-catalog span { color: var(--c-ink-soft); font-size: 10px; }
.hero-catalog strong { font-size: 18px; }
.hero-catalog small { color: #9b7a38; font-family: var(--f-mono); font-size: 9px; letter-spacing: 1px; }
.hero-seal { align-self: flex-end; width: 88px; height: 88px; display: grid; grid-template-columns: 1fr; place-items: center; border: 1px solid rgba(193,162,104,.75); background: rgba(255,253,248,.88); }
.hero-seal span { font-family: var(--f-art); color: #a33b32; font-size: 42px; line-height: 1; }
.hero-seal small { color: var(--c-ink-soft); font-size: 8px; letter-spacing: 1px; }
.archive-metrics { position: relative; z-index: 2; display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; max-width: 1440px; margin: 0 auto; padding: 0 54px 58px; }
.archive-metrics article { padding: 22px; background: rgba(255,255,255,.82); border: 1px solid var(--c-grid); }
.archive-metrics span, .archive-metrics small { display: block; color: var(--c-ink-soft); font-size: 9px; letter-spacing: 1px; }
.archive-metrics strong { display: block; margin: 10px 0 6px; color: #9b7a38; font-family: var(--f-mono); font-size: 28px; }
.featured-record { display: grid; grid-template-columns: 1.08fr .92fr; min-height: 620px; background: #fffdf8; border-top: 1px solid var(--c-grid); border-bottom: 1px solid var(--c-grid); }
.featured-visual { position: relative; min-height: 620px; overflow: hidden; background: #e8ece9; perspective: 1000px; }
.featured-visual img { width: 100%; height: 100%; object-fit: cover; opacity: .96; transform: rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg)) scale(1.02); transition: transform .15s ease; }
.feature-scan { position: absolute; left: 0; right: 0; height: 22%; pointer-events: none; background: linear-gradient(to bottom, transparent, rgba(231,212,168,.35), rgba(255,255,255,.35), transparent); box-shadow: 0 0 24px rgba(193,162,104,.28); animation: featureScan 4.2s linear infinite; }
@keyframes featureScan { from { top: -24%; } to { top: 104%; } }
.featured-code { position: absolute; top: 22px; left: 22px; z-index: 2; padding: 7px 10px; color: #f1dda9; background: rgba(47,72,66,.82); font-family: var(--f-mono); font-size: 9px; }
.featured-info { display: flex; flex-direction: column; justify-content: center; padding: 72px; }
.featured-info h2 { margin: 14px 0; font-size: 44px; line-height: 1.3; }
.featured-info > p { color: var(--c-ink-soft); line-height: 1.9; }
.featured-info dl { margin: 26px 0; border-top: 1px solid var(--c-grid); }
.featured-info dl div { display: flex; justify-content: space-between; padding: 13px 0; border-bottom: 1px solid var(--c-grid); }
.featured-info dt { color: var(--c-ink-soft); font-size: 11px; }
.featured-info dd { color: #7f642f; font-family: var(--f-mono); font-size: 12px; }
.record-button { align-self: flex-start; padding: 13px 18px; border: 1px solid var(--c-primary); }
.collection-section { max-width: 1440px; margin: 0 auto; padding: 78px 54px 90px; }
.collection-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 32px; margin-bottom: 30px; }
.collection-head h2 { margin-top: 8px; font-size: 42px; }
.collection-head p { max-width: 480px; color: var(--c-ink-soft); line-height: 1.8; }
.artifact-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
.artifact-card { background: #fff; border: 1px solid var(--c-grid); transition: transform .2s ease, border-color .2s ease, box-shadow .2s ease; }
.artifact-card:hover, .artifact-card.active { transform: translateY(-6px); border-color: var(--c-accent); box-shadow: 10px 12px 0 rgba(193,162,104,.18); }
.artifact-image { position: relative; aspect-ratio: 4/5; overflow: hidden; background: #e8ece9; perspective: 900px; }
.artifact-image img { width: 100%; height: 100%; object-fit: cover; transform: rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg)) scale(1.02); transition: transform .15s ease; }
.artifact-code { position: absolute; top: 10px; left: 10px; padding: 5px 7px; color: #f1dda9; background: rgba(47,72,66,.82); font-family: var(--f-mono); font-size: 8px; }
.artifact-category { position: absolute; right: 10px; bottom: 10px; padding: 5px 8px; color: var(--c-primary); background: rgba(255,253,248,.88); font-size: 9px; }
.artifact-plate { padding: 16px; }
.plate-head { display: flex; justify-content: space-between; align-items: center; color: #9b7a38; font-family: var(--f-mono); font-size: 8px; letter-spacing: 1px; }
.artifact-plate h3 { margin: 11px 0 6px; font-size: 17px; }
.artifact-plate > p { min-height: 38px; color: var(--c-ink-soft); font-size: 11px; line-height: 1.7; }
.artifact-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 14px 0; padding: 12px 0; border-top: 1px solid var(--c-grid); border-bottom: 1px solid var(--c-grid); }
.artifact-meta small, .artifact-meta strong { display: block; }
.artifact-meta small { color: var(--c-ink-soft); font-size: 8px; }
.artifact-meta strong { margin-top: 5px; color: #8b682c; font-family: var(--f-mono); font-size: 13px; }
.artifact-plate > a { display: flex; justify-content: space-between; align-items: center; font-size: 11px; }
.placeholder-artifact { position: relative; min-height: 100%; }
.placeholder-code { position: absolute; top: 10px; left: 10px; z-index: 2; padding: 5px 7px; color: #7f642f; background: rgba(255,253,248,.9); font-family: var(--f-mono); font-size: 8px; }
.catalogue-pagination { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 7px; margin-top: 38px; }
.catalogue-pagination > button, .page-jump button { min-width: 38px; height: 38px; padding: 0 11px; border: 1px solid rgba(47,72,66,.2); border-radius: 4px; background: #fff; color: var(--c-primary); }
.catalogue-pagination > button.active { background: var(--c-primary); border-color: var(--c-primary); color: #fff; box-shadow: inset 0 -3px 0 #c1a268; }
.catalogue-pagination > button:disabled { opacity: .35; }
.catalogue-pagination > span { color: var(--c-ink-soft); }
.page-jump { display: flex; align-items: center; gap: 7px; margin-left: 8px; color: var(--c-ink-soft); font-size: 11px; }
.page-jump input { width: 64px; height: 38px; padding: 0 8px; border: 1px solid var(--c-grid); background: #fff; text-align: center; }
.brand-statement { display: grid; grid-template-columns: 86px 1fr auto; align-items: center; gap: 34px; padding: 56px 54px; color: #fff; background: #31544d; }
.statement-seal { width: 70px; height: 70px; display: grid; place-items: center; border: 1px solid #e7d4a8; color: #e7d4a8; font-family: var(--f-art); font-size: 34px; }
.brand-statement p { max-width: 900px; font-size: 22px; line-height: 1.7; }
.brand-statement a { color: #e7d4a8; border-bottom: 1px solid currentColor; padding-bottom: 4px; white-space: nowrap; }
@media (max-width: 1120px) {
    .digital-hero, .featured-record { grid-template-columns: 1fr; }
    .digital-hero { padding: 54px 24px 40px; }
    .hero-right { align-items: flex-start; }
    .archive-metrics { grid-template-columns: repeat(2, 1fr); padding: 0 24px 46px; }
    .collection-section { padding: 56px 24px 70px; }
    .artifact-grid { grid-template-columns: repeat(2, 1fr); }
    .featured-info { padding: 48px 24px; }
}
@media (max-width: 680px) {
    .archive-metrics, .artifact-grid, .brand-statement { grid-template-columns: 1fr; }
    .collection-head { align-items: flex-start; flex-direction: column; }
    .brand-statement { padding: 42px 24px; }
    .page-jump { width: 100%; justify-content: center; margin-left: 0; }
}
</style>
