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
        if (product) return { ...product, placeholder: false, catalogIndex: index }
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
    event.currentTarget.style.setProperty('--tilt-x', `${(-y * 4).toFixed(2)}deg`)
    event.currentTarget.style.setProperty('--tilt-y', `${(x * 5).toFixed(2)}deg`)
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
                <div class="feature-archive-art">
                    <div class="blueprint-grid"></div>
                    <div class="reference-collage">
                        <article class="reference-crop crop-render">
                            <img :src="'/images/model-render.jpg'" alt="广惠寺华塔数字模型">
                            <span>数字建模 / 3D RECONSTRUCTION</span>
                            <strong>建筑结构独立复原</strong>
                        </article>
                        <article class="reference-crop crop-photo">
                            <img :src="'/images/huata-real.jpg'" alt="广惠寺华塔实景">
                            <span>实景档案 / REAL SCENE</span>
                            <strong>广惠寺华塔历史环境</strong>
                        </article>
                    </div>
                    <div class="archive-watermark">筑</div>
                    <div class="archive-crosshair crosshair-a"></div>
                    <div class="archive-crosshair crosshair-b"></div>
                    <div class="feature-scan"></div>
                    <div class="archive-legend">
                        <span>DIGITAL MODEL → REAL ARCHITECTURE</span>
                        <strong>数字复原与实景档案对照</strong>
                    </div>
                </div>
                <span class="featured-code">FEATURED RECORD · {{ formatCode(activeProduct?.id) }}</span>
            </div>
            <div class="featured-info">
                <div class="featured-title">
                    <div>
                        <span class="archive-label">本期主展品档案</span>
                        <h2>{{ activeProduct?.name || '广惠寺华塔数字档案' }}</h2>
                    </div>
                    <span class="document-seal">典藏</span>
                </div>
                <p>{{ activeProduct?.subtitle || '以河北古建筑为原型的数字化重构与数字收藏凭证。' }}</p>
                <div class="archive-quote">
                    以建筑编号、内容分类和数字确权为线索，逐步展开每一件藏品的文化来源与收藏价值。
                </div>
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
                <p>沿建筑编号、内容分类与文化主题展开浏览，每件档案均关联实时价格与库存。</p>
            </header>

            <div class="catalog-list">
                <template v-for="(item, index) in pagedItems" :key="item.id">
                    <article v-if="!item.placeholder"
                             class="catalog-item"
                             :class="{ active: activeIndex === item.catalogIndex }"
                             @mouseenter="activeIndex = item.catalogIndex">
                        <div class="catalog-thumb"
                             @mousemove="handleArtifactMove"
                             @mouseleave="resetArtifact">
                            <img :src="imageUrl(item.img)" :alt="item.name">
                        </div>
                        <div class="catalog-content">
                            <div class="catalog-topline">
                                <span>NO. {{ formatCode(item.id) }}</span>
                                <span>{{ item.category }}</span>
                            </div>
                            <h3>{{ item.name }}</h3>
                            <p>{{ item.subtitle || '河北古建筑数字化重构藏品' }}</p>
                            <div class="catalog-data">
                                <div><span>结缘价</span><strong>¥ {{ item.price }}</strong></div>
                                <div><span>库存</span><strong>{{ item.stock }}</strong></div>
                            </div>
                            <RouterLink :to="`/product/${item.id}`" @click.stop>
                                查看档案 <i class="fa fa-long-arrow-right"></i>
                            </RouterLink>
                        </div>
                    </article>

                    <article v-else class="catalog-item placeholder-catalog">
                        <div class="placeholder-thumb">
                            <PlaceholderCard label="待编目" note="图片与档案内容待补充" ratio="1 / 1" />
                        </div>
                        <div class="catalog-content">
                            <div class="catalog-topline"><span>NO. {{ item.code }}</span><span>待编目</span></div>
                            <h3>{{ item.name }}</h3>
                            <p>{{ item.subtitle }}</p>
                        </div>
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
.hero-seal { align-self: flex-end; width: 88px; height: 88px; display: grid; place-items: center; border: 1px solid rgba(193,162,104,.75); background: rgba(255,253,248,.88); }
.hero-seal span { font-family: var(--f-art); color: #a33b32; font-size: 42px; line-height: 1; }
.hero-seal small { color: var(--c-ink-soft); font-size: 8px; letter-spacing: 1px; }
.archive-metrics { position: relative; z-index: 2; display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; max-width: 1440px; margin: 0 auto; padding: 0 54px 58px; }
.archive-metrics article { padding: 22px; background: rgba(255,255,255,.82); border: 1px solid var(--c-grid); }
.archive-metrics span, .archive-metrics small { display: block; color: var(--c-ink-soft); font-size: 9px; letter-spacing: 1px; }
.archive-metrics strong { display: block; margin: 10px 0 6px; color: #9b7a38; font-family: var(--f-mono); font-size: 28px; }

.featured-record { display: grid; grid-template-columns: 1.08fr .92fr; min-height: 620px; background: #fffdf8; border-top: 1px solid var(--c-grid); border-bottom: 1px solid var(--c-grid); }
.featured-visual { position: relative; min-height: 620px; overflow: hidden; background: #e8ece9; perspective: 1000px; }
.feature-archive-art { position: absolute; inset: 0; overflow: hidden; transform: rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg)); transition: transform .15s ease; background: radial-gradient(circle at 62% 42%, #fffdf8 0 18%, #dce8e2 48%, #b9cfc6 100%); }
.blueprint-grid { position: absolute; inset: 0; opacity: .42; background-image: linear-gradient(rgba(47,72,66,.2) 1px, transparent 1px), linear-gradient(90deg, rgba(47,72,66,.2) 1px, transparent 1px); background-size: 42px 42px; }
.reference-collage {
    position: absolute;
    inset: 64px 38px 104px;
    z-index: 3;
    display: grid;
    grid-template-columns: 1.12fr .88fr;
    grid-template-rows: 1fr;
    gap: 20px;
}
.reference-crop {
    position: relative;
    overflow: hidden;
    min-height: 0;
    border: 1px solid rgba(255,255,255,.72);
    background: #dfe8e4;
    box-shadow: 0 10px 26px rgba(31,52,47,.13);
}
.reference-crop::before {
    content: "";
    position: absolute;
    width: 800px;
    height: 450px;
    background-image: url('/images/archive-reference.jpg');
    background-repeat: no-repeat;
    background-size: 800px 450px;
}
.reference-crop > img {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
}
.crop-render > img { object-position: 50% 48%; }
.crop-photo > img { object-position: 50% 52%; }
.crop-render::before,
.crop-photo::before {
    display: none;
}
.crop-render::before { left: -34px; top: -122px; }
.crop-wireframe::before { left: -268px; top: -122px; }
.crop-qr::before { left: -625px; top: -108px; }
.crop-photo::before { left: -605px; top: -226px; }
.reference-crop::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(to top, rgba(21,38,34,.72), transparent 58%);
}
.reference-crop > span,
.reference-crop > strong {
    position: absolute;
    left: 12px;
    z-index: 2;
    color: #fff;
}
.reference-crop > span {
    bottom: 28px;
    color: #e7d4a8;
    font-family: var(--f-mono);
    font-size: 8px;
    letter-spacing: 1px;
}
.reference-crop > strong {
    bottom: 10px;
    font-size: 11px;
}
.reference-collage::after {
    content: "→";
    position: absolute;
    left: calc(56% - 14px);
    top: 50%;
    z-index: 5;
    width: 32px;
    height: 32px;
    display: grid;
    place-items: center;
    transform: translateY(-50%);
    border: 1px solid rgba(255,255,255,.75);
    background: #31544d;
    color: #e7d4a8;
    box-shadow: 0 8px 18px rgba(31,52,47,.2);
}
.tower-blueprint { position: absolute; left: 50%; bottom: 14%; width: 240px; height: 360px; transform: translateX(-50%); filter: drop-shadow(14px 18px 0 rgba(193,162,104,.22)); }
.tower-blueprint i { position: absolute; left: 50%; transform: translateX(-50%); display: block; background: rgba(49,84,77,.82); border: 2px solid #d3b66f; }
.tower-spire { bottom: 314px; width: 16px; height: 46px; clip-path: polygon(50% 0, 100% 100%, 0 100%); }
.tower-floor { border-radius: 4px; }
.floor-one { bottom: 220px; width: 160px; height: 90px; }
.floor-two { bottom: 122px; width: 210px; height: 94px; }
.tower-base { bottom: 12px; width: 250px; height: 108px; }
.archive-watermark { position: absolute; right: 6%; top: 9%; color: rgba(163,59,50,.12); font-family: var(--f-art); font-size: 180px; line-height: 1; }
.archive-crosshair { position: absolute; width: 46px; height: 46px; border: 1px solid rgba(49,84,77,.45); }
.archive-crosshair::before, .archive-crosshair::after { content: ""; position: absolute; background: rgba(49,84,77,.45); }
.archive-crosshair::before { left: 50%; top: -8px; width: 1px; height: 62px; }
.archive-crosshair::after { top: 50%; left: -8px; width: 62px; height: 1px; }
.crosshair-a { left: 12%; top: 22%; }
.crosshair-b { right: 18%; bottom: 19%; }
.feature-scan { position: absolute; left: 0; right: 0; height: 18%; background: linear-gradient(to bottom, transparent, rgba(231,212,168,.4), rgba(255,255,255,.35), transparent); animation: featureScan 4.2s linear infinite; }
@keyframes featureScan { from { top: -20%; } to { top: 105%; } }
.archive-legend { position: absolute; left: 24px; bottom: 22px; display: grid; gap: 5px; padding: 10px 12px; color: #f1dda9; background: rgba(47,72,66,.82); }
.archive-legend span { font-family: var(--f-mono); font-size: 8px; letter-spacing: 1px; }
.archive-legend strong { font-size: 11px; letter-spacing: 1px; }
.featured-code { position: absolute; top: 22px; left: 22px; z-index: 2; padding: 7px 10px; color: #f1dda9; background: rgba(47,72,66,.82); font-family: var(--f-mono); font-size: 9px; }
.featured-info { display: flex; flex-direction: column; justify-content: center; padding: 70px; }
.featured-title { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; }
.featured-title h2 { margin: 14px 0 0; font-size: 42px; line-height: 1.25; }
.document-seal { width: 54px; height: 54px; flex: 0 0 54px; display: grid; place-items: center; border: 1px solid #a33b32; color: #a33b32; font-family: var(--f-art); font-size: 13px; transform: rotate(-4deg); }
.featured-info > p { margin-top: 20px; color: var(--c-ink-soft); line-height: 1.9; }
.archive-quote { margin: 22px 0; padding: 15px 18px; border-left: 3px solid #c1a268; background: #f7f4ed; color: #7d7568; font-size: 12px; line-height: 1.8; }
.featured-info dl { margin: 0 0 24px; border-top: 1px solid var(--c-grid); }
.featured-info dl div { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--c-grid); }
.featured-info dt { color: var(--c-ink-soft); font-size: 11px; }
.featured-info dd { color: #7f642f; font-family: var(--f-mono); font-size: 12px; }
.record-button { align-self: flex-start; padding: 13px 18px; border: 1px solid var(--c-primary); }

.collection-section { max-width: 1440px; margin: 0 auto; padding: 78px 54px 90px; }
.collection-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 32px; margin-bottom: 30px; }
.collection-head h2 { margin-top: 8px; font-size: 42px; }
.collection-head p { max-width: 480px; color: var(--c-ink-soft); line-height: 1.8; }
.catalog-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.catalog-item { display: grid; grid-template-columns: 150px 1fr; min-height: 190px; border: 1px solid var(--c-grid); background: #fff; transition: border-color .18s ease, transform .18s ease, box-shadow .18s ease; }
.catalog-item:hover, .catalog-item.active { border-color: #c1a268; transform: translateY(-2px); box-shadow: 7px 8px 0 rgba(193,162,104,.14); }
.catalog-thumb, .placeholder-thumb { position: relative; overflow: hidden; background: #eef1ed; perspective: 700px; }
.catalog-thumb img { width: 100%; height: 100%; object-fit: cover; transform: rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg)) scale(1.02); transition: transform .15s ease; }
.catalog-content { display: flex; flex-direction: column; padding: 14px 16px; min-width: 0; }
.catalog-topline { display: flex; justify-content: space-between; gap: 10px; color: #9b7a38; font-family: var(--f-mono); font-size: 8px; letter-spacing: .7px; }
.catalog-content h3 { margin: 10px 0 6px; font-size: 16px; }
.catalog-content > p { min-height: 32px; color: var(--c-ink-soft); font-size: 10px; line-height: 1.6; }
.catalog-data { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: auto 0 10px; padding-top: 10px; border-top: 1px solid var(--c-grid); }
.catalog-data span, .catalog-data strong { display: block; }
.catalog-data span { color: var(--c-ink-soft); font-size: 8px; }
.catalog-data strong { margin-top: 4px; color: #855e20; font-family: var(--f-mono); font-size: 12px; }
.catalog-content > a { display: flex; justify-content: space-between; align-items: center; font-size: 10px; }
.placeholder-catalog { min-height: 190px; }
.placeholder-thumb :deep(.placeholder-card) { height: 100%; border: 0; }
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
    .catalog-list { grid-template-columns: 1fr; }
    .featured-info { padding: 48px 24px; }
}
@media (max-width: 680px) {
    .archive-metrics, .brand-statement { grid-template-columns: 1fr; }
    .catalog-item { grid-template-columns: 112px 1fr; }
    .collection-head { align-items: flex-start; flex-direction: column; }
    .brand-statement { padding: 42px 24px; }
    .page-jump { width: 100%; justify-content: center; margin-left: 0; }
}
</style>
